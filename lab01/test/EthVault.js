const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EthVault", function () {
  async function deployVaultFixture() {
    const [owner, otherAccount] = await ethers.getSigners();       //之後用來測試ovwner 跟other 
    const EthVault = await ethers.getContractFactory("EthVault"); // 取一個可以部署合約的工廠 
    const vault = await EthVault.deploy();              // 拿上面那行的工廠 部署合約
    return { vault, owner, otherAccount }; 
  }

  // Test Group A — Deposits
  describe("Deposits", function () { // describe 代表一組測試 下面那行的it 是一筆測資 
    it("Should increase balance and emit Deposit event", async function () {
      const { vault, otherAccount } = await deployVaultFixture();
      const amount = ethers.parseEther("1.0"); // 這裡是把 1.0 轉成 wei 單位 因為合約裡面是用 wei 單位的 , 1eth = 10^18 wei

      await expect(otherAccount.sendTransaction({ to: await vault.getAddress(), value: amount }))
        .to.emit(vault, "Deposit") //expect(...).to.emit(vault, "Deposit")代表要求監控這個transaction 看合約有沒有噴出一個叫做 Deposit 的Event
        .withArgs(otherAccount.address, amount); // 然後近一步檢查sender 跟amount 是不是我們模擬傳進去的
      expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(amount);// 直接去查這個node裡面的餘額跟我傳進去的amount 一步一樣
    });
  });

  // Test Group B — Owner Withdrawal
  describe("Owner Withdrawal", function () {
    it("Should allow owner to withdraw and decrease balance", async function () {
      const { vault, owner } = await deployVaultFixture();
      const amount = ethers.parseEther("1.0");
      
      await owner.sendTransaction({ to: await vault.getAddress(), value: amount });
      await expect(vault.withdraw(amount))
        .to.emit(vault, "Weethdraw")
        .withArgs(owner.address, amount);

      expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(0);
    });
  });

  // Test Group C — Unauthorized Withdrawal
  describe("Unauthorized Withdrawal", function () {
    it("Should NOT revert on non-owner call, but emit event", async function () {
      const { vault, otherAccount } = await deployVaultFixture();
      const amount = ethers.parseEther("1.0");
      // 不是Owner 呼叫，不revert
      const tx = await vault.connect(otherAccount).withdraw(amount);
      const receipt = await tx.wait();
      
      expect(receipt.status).to.equal(1); // 交易成功
      await expect(tx).to.emit(vault, "UnauthorizedWithdrawAttempt")
                      .withArgs(otherAccount.address, amount);
    });
  });

  // Test Group D — Edge Cases
  describe("Edge Cases", function () {
    it("Should revert if withdrawing more than balance", async function () {
      const { vault, owner } = await deployVaultFixture();
      await expect(vault.withdraw(ethers.parseEther("1.0")))
        .to.be.revertedWith("Insufficient balance");
    });
  });
});