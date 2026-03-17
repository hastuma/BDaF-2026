import { expect } from "chai";
import { ethers } from "hardhat";
import { Token03 } from "../typechain-types"; // 確保你已經執行過 npx hardhat compile
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Token03 Permit Flow", function () {
    let token: Token03;
    let owner: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;

    const TOTAL_SUPPLY = ethers.parseEther("100000000");
    const TEST_AMOUNT = ethers.parseEther("100");

    beforeEach(async function () {
        // 取得測試帳號
        [owner, alice, bob] = await ethers.getSigners();

        // 部署合約
        const TokenFactory = await ethers.getContractFactory("Token03");
        token = await TokenFactory.deploy();
        await token.waitForDeployment();

        // Step 1: Alice receives tokens (從 Owner 轉給 Alice)
        await token.transfer(alice.address, TEST_AMOUNT);
    });

    it("Should complete the full permit and transferFrom flow", async function () {
        // --- 準備簽名參數 ---
        const spender = bob.address;
        const value = TEST_AMOUNT;
        const nonce = await token.nonces(alice.address);
        const deadline = Math.floor(Date.now() / 1000) + 3600; // 1小時後過期
        const contractAddress = await token.getAddress();

        // --- Step 2: Alice signs the message off-chain ---
        // 注意：這裡的打包順序必須與 Solidity 中的 abi.encodePacked 完全一致
        const messageHash = ethers.solidityPackedKeccak256(
            ["address", "address", "uint256", "uint256", "uint256", "address"],
            [alice.address, spender, value, nonce, deadline, contractAddress]
        );

        // 使用 signMessage 時，ethers 會自動加上 "\x19Ethereum Signed Message:\n32" 前綴
        // 這對應到你合約裡的 MessageHashUtils.toEthSignedMessageHash
        const signature = await alice.signMessage(ethers.getBytes(messageHash));

        // --- Step 3: Bob submits permit() using Alice's signature ---
        // 雖然是 Alice 的簽名，但這筆交易是由 Bob 支付 Gas 發送的
        await expect(
            token.connect(bob).permit(
                alice.address,
                spender,
                value,
                nonce,
                deadline,
                signature
            )
        ).to.emit(token, "Approval");

        // 檢查：此時 Bob 的 allowance 應該已經變成了 TEST_AMOUNT
        expect(await token.allowance(alice.address, bob.address)).to.equal(TEST_AMOUNT);

        // --- Step 4: Bob calls transferFrom() ---
        // Bob 現在可以拿走 Alice 的錢了
        await token.connect(bob).transferFrom(alice.address, bob.address, TEST_AMOUNT);

        // 最終檢查
        expect(await token.balanceOf(bob.address)).to.equal(TEST_AMOUNT);
        expect(await token.balanceOf(alice.address)).to.equal(0);
        
        console.log("✅ Permit & TransferFrom Flow Success!");
    });
});