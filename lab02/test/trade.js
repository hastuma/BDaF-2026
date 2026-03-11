const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TradeContract Tests", function () {
  let TokenA, TokenB, TradeContract;
  let tokenA, tokenB, tradeContract;
  let owner, alice, bob;

  // 定義輔助函數：處理 18 位小數 (這就像是在 C++ 裡處理大數乘法)
  const parse = (amount) => ethers.parseUnits(amount.toString(), 18);

  // beforeEach 就像 C++ 測試裡的 setUp()，每個測試開始前都會執行一次
  beforeEach(async function () {
    // 1. 取得測試帳號
    [owner, alice, bob] = await ethers.getSigners();

    // 2. 部署 TokenA 與 TokenB
    TokenA = await ethers.getContractFactory("TokenA"); 
    tokenA = await TokenA.deploy();

    TokenB = await ethers.getContractFactory("TokenB"); 
    tokenB = await TokenB.deploy();

    // 3. 部署 TradeContract (傳入兩個 Token 的地址)
    TradeContract = await ethers.getContractFactory("TradeContract");
    tradeContract = await TradeContract.deploy(tokenA.target, tokenB.target);

    // 4. 初始化資產：老闆發錢給 Alice 和 Bob 讓他們有錢交易
    // 老闆給 Alice 1,000 顆 TokenA
    await tokenA.transfer(alice.address, parse("1000"));
    // 老闆給 Bob 1,000 顆 TokenB
    await tokenB.transfer(bob.address, parse("1000"));
  });

  describe("Lab Flow: Setup, Settle, Withdraw", function () {
    it("Alice sets up a trade successfully", async function () {
      const sellAmount = parse("100"); // 賣 100 顆 A 幣
      const askAmount = parse("50");   // 想換 50 顆 B 幣
      const expiry = (await time.latest()) + 3600; // 1 小時後過期

      // [核心步驟]：Alice 必須先 Approve (授權) 交易合約動用她的 TokenA
      await tokenA.connect(alice).approve(tradeContract.target, sellAmount);

      // Alice 呼叫 setupTrade
      await expect(
        tradeContract.connect(alice).setupTrade(tokenA.target, sellAmount, askAmount, expiry)
      )
        .to.emit(tradeContract, "SetupTrade") // 檢查有沒有正確發送 Event
        .withArgs(alice.address, tokenA.target, sellAmount, askAmount, expiry, 0); // 檢查 Event 參數 (tradeId 應該是 0)

      // 檢查合約有沒有把 Alice 的錢鎖起來
      expect(await tokenA.balanceOf(tradeContract.target)).to.equal(sellAmount);
    });

    it("Bob settles the trade successfully and Owner withdraws fee", async function () {
      // --- 前置作業：Alice 先掛單 ---
      const sellAmount = parse("100");
      const askAmount = parse("50");
      const expiry = (await time.latest()) + 3600;
      await tokenA.connect(alice).approve(tradeContract.target, sellAmount);
      await tradeContract.connect(alice).setupTrade(tokenA.target, sellAmount, askAmount, expiry);

      // --- Bob 準備成交 (Settle Trade) ---
      // Bob 授權合約扣他的 TokenB
      await tokenB.connect(bob).approve(tradeContract.target, askAmount);

      // 紀錄 Alice 成交前的 TokenB 餘額 (應該是 0)
      const aliceBalanceBefore = await tokenB.balanceOf(alice.address);

      // Bob 呼叫 settleTrade (剛剛 Alice 掛的單 tradeId 是 0)
      await expect(tradeContract.connect(bob).settleTrade(0))
        .to.emit(tradeContract, "SettleTrade")
        .withArgs(0, bob.address);

      // --- 驗證金錢流向 ---
      // 1. Bob 應該拿到 100 顆 TokenA
      expect(await tokenA.balanceOf(bob.address)).to.equal(sellAmount);

      // 2. 計算手續費 (0.1%)
      const fee = askAmount / 1000n; // 在 JS 裡用 n 代表 BigInt
      const sellerReceive = askAmount - fee;

      // 3. Alice 應該拿到扣除手續費後的 TokenB
      const aliceBalanceAfter = await tokenB.balanceOf(alice.address);
      expect(aliceBalanceAfter - aliceBalanceBefore).to.equal(sellerReceive);

      // 4. 合約內部應該紀錄了這筆 B 幣的手續費
      expect(await tradeContract.feeBalance_B()).to.equal(fee);

      // --- Owner 提款 (Withdraw Fee) ---
      const ownerBalanceBefore = await tokenB.balanceOf(owner.address);
      
      // 老闆呼叫 withdrawFee
      await tradeContract.connect(owner).withdrawFee();

      // 老闆的錢包應該多出了那筆手續費
      const ownerBalanceAfter = await tokenB.balanceOf(owner.address);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(fee);
      
      // 合約內的帳本應該歸零
      expect(await tradeContract.feeBalance_B()).to.equal(0n);
    });
    it("Alice can cancel her own trade and get her tokens back", async function () {
      const sellAmount = parse("100");
      const askAmount = parse("50");
      const expiry = (await time.latest()) + 3600;

      await tokenA.connect(alice).approve(tradeContract.target, sellAmount);
      await tradeContract.connect(alice).setupTrade(tokenA.target, sellAmount, askAmount, expiry);

      // 紀錄 Alice 撤回前的餘額 (應該少了 100 顆)
      const balanceBefore = await tokenA.balanceOf(alice.address);

      // Alice 決定不賣了
      await tradeContract.connect(alice).cancelTrade(0);

      // 1. 檢查餘額：100 顆應該要回到 Alice 手上
      const balanceAfter = await tokenA.balanceOf(alice.address);
      expect(balanceAfter - balanceBefore).to.equal(sellAmount);

      // 2. 檢查狀態：isActive 應該變成 false
      const trade = await tradeContract.trades(0);
      expect(trade.isActive).to.equal(false);
    });

    it("Security Check: Bob should NOT be able to cancel Alice's trade", async function () {
      const sellAmount = parse("100");
      const expiry = (await time.latest()) + 3600;

      await tokenA.connect(alice).approve(tradeContract.target, sellAmount);
      await tradeContract.connect(alice).setupTrade(tokenA.target, sellAmount, parse("50"), expiry);

      // 嘗試讓 Bob 去取消 Alice 的掛單，預期會報錯
      await expect(
        tradeContract.connect(bob).cancelTrade(0)
      ).to.be.revertedWith("Only seller can cancel");
    });

    it("Security Check: Should NOT settle an expired trade", async function () {
      const sellAmount = parse("100");
      const askAmount = parse("50");
      const expiry = (await time.latest()) + 3600;

      await tokenA.connect(alice).approve(tradeContract.target, sellAmount);
      await tradeContract.connect(alice).setupTrade(tokenA.target, sellAmount, askAmount, expiry);

      // 快進時間：快轉 2 小時，讓交易過期
      await time.increase(7200);

      // Bob 嘗試成交已過期的訂單
      await tokenB.connect(bob).approve(tradeContract.target, askAmount);
      await expect(
        tradeContract.connect(bob).settleTrade(0)
      ).to.be.revertedWith("Trade has expired");
    });
  });
});