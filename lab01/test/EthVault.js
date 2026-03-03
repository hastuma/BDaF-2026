const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EthVault", function () {
  async function deployVaultFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    const EthVault = await ethers.getContractFactory("EthVault");
    const vault = await EthVault.deploy();
    return { vault, owner, otherAccount };
  }

  // Test Group A — Deposits
  describe("Deposits", function () {
    it("Should increase balance and emit Deposit event", async function () {
      const { vault, otherAccount } = await deployVaultFixture();
      const amount = ethers.parseEther("1.0");

      await expect(otherAccount.sendTransaction({ to: await vault.getAddress(), value: amount }))
        .to.emit(vault, "Deposit")
        .withArgs(otherAccount.address, amount);

      expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(amount);
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

      // 非 Owner 呼叫，不應 revert
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