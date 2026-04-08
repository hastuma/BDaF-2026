import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

// ---------------------------------------------------------------------------
// Fixture: deploy everything once and snapshot for each test
// ---------------------------------------------------------------------------
async function deployFixture() {
  const [owner, user] = await ethers.getSigners();

  // --- Deploy MyTokenV1 implementation ---
  const MyTokenV1 = await ethers.getContractFactory("MyTokenV1");
  const implV1 = await MyTokenV1.deploy();
  await implV1.waitForDeployment();

  // --- Deploy ERC1967Proxy with initialize ---
  const initData = MyTokenV1.interface.encodeFunctionData("initialize", [
    "MyToken",
    "MTK",
    ethers.parseEther("1000000"),
  ]);
  const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
  const proxy = await ERC1967Proxy.deploy(await implV1.getAddress(), initData);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();

  // Attach V1 ABI to proxy address
  const token = MyTokenV1.attach(proxyAddress) as any;

  // --- Deploy local StakeForNFT ---
  const StakeForNFT = await ethers.getContractFactory("StakeForNFT");
  const stakeForNFT = await StakeForNFT.deploy();
  await stakeForNFT.waitForDeployment();

  const stakeForNFTAddress = await stakeForNFT.getAddress();
  const stakeAmount = ethers.parseEther("1000");

  return {
    owner,
    user,
    token,
    proxyAddress,
    implV1,
    stakeForNFT,
    stakeForNFTAddress,
    stakeAmount,
    MyTokenV1,
  };
}

// ---------------------------------------------------------------------------
// Part 1: Upgradeable ERC20 Deployment
// ---------------------------------------------------------------------------
describe("Part 1 — Deploy Upgradeable ERC20", function () {
  it("proxy has correct name and symbol", async function () {
    const { token } = await loadFixture(deployFixture);
    expect(await token.name()).to.equal("MyToken");
    expect(await token.symbol()).to.equal("MTK");
  });

  it("has 18 decimals", async function () {
    const { token } = await loadFixture(deployFixture);
    expect(await token.decimals()).to.equal(18);
  });

  it("mints initial supply to deployer", async function () {
    const { token, owner } = await loadFixture(deployFixture);
    expect(await token.balanceOf(owner.address)).to.equal(
      ethers.parseEther("1000000")
    );
  });

  it("implementation cannot be initialized (disableInitializers guard)", async function () {
    const { implV1 } = await loadFixture(deployFixture);
    await expect(
      implV1.initialize("Bad", "BAD", 1)
    ).to.be.revertedWithCustomError(implV1, "InvalidInitialization");
  });

  it("owner is the deployer", async function () {
    const { token, owner } = await loadFixture(deployFixture);
    expect(await token.owner()).to.equal(owner.address);
  });

  it("non-owner cannot upgrade", async function () {
    const { token, user } = await loadFixture(deployFixture);
    const MyTokenV2 = await ethers.getContractFactory("MyTokenV2");
    const implV2 = await MyTokenV2.deploy();
    await implV2.waitForDeployment();
    await expect(
      token.connect(user).upgradeToAndCall(await implV2.getAddress(), "0x")
    ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
  });
});

// ---------------------------------------------------------------------------
// Part 2: Stake Tokens
// ---------------------------------------------------------------------------
describe("Part 2 — Stake Tokens", function () {
  it("approve + stake transfers tokens to StakeForNFT", async function () {
    const { token, owner, stakeForNFT, stakeForNFTAddress, stakeAmount, proxyAddress } =
      await loadFixture(deployFixture);

    await token.approve(stakeForNFTAddress, stakeAmount);
    await stakeForNFT.stake(proxyAddress, stakeAmount, "313551116");

    expect(await token.balanceOf(stakeForNFTAddress)).to.equal(stakeAmount);
    expect(await stakeForNFT.stakedToken(owner.address)).to.equal(proxyAddress);
    expect(await stakeForNFT.stakedAmount(owner.address)).to.equal(stakeAmount);
    expect(await stakeForNFT.studentId(owner.address)).to.equal("313551116");
  });

  it("stake reverts with zero amount", async function () {
    const { stakeForNFT, proxyAddress } = await loadFixture(deployFixture);
    await expect(
      stakeForNFT.stake(proxyAddress, 0, "313551116")
    ).to.be.revertedWith("Amount must be > 0");
  });

  it("stake reverts with empty student ID", async function () {
    const { token, stakeForNFT, proxyAddress, stakeForNFTAddress, stakeAmount } =
      await loadFixture(deployFixture);
    await token.approve(stakeForNFTAddress, stakeAmount);
    await expect(
      stakeForNFT.stake(proxyAddress, stakeAmount, "")
    ).to.be.revertedWith("Student ID required");
  });
});

// ---------------------------------------------------------------------------
// Part 3: Try to Unstake
// NOTE: The *provided* StakeForNFT.sol does return tokens on unstake.
//       The *deployed on-chain* contract behaves differently (it does not).
//       These tests document both behaviors.
// ---------------------------------------------------------------------------
describe("Part 3 — Unstake Behavior", function () {
  async function stakeFixture() {
    const base = await deployFixture();
    const { token, stakeForNFT, stakeForNFTAddress, proxyAddress, stakeAmount } = base;
    await token.approve(stakeForNFTAddress, stakeAmount);
    await stakeForNFT.stake(proxyAddress, stakeAmount, "313551116");
    return base;
  }

  it("(provided source) unstake returns tokens to caller", async function () {
    const { token, owner, stakeForNFT, stakeForNFTAddress, stakeAmount } =
      await loadFixture(stakeFixture);

    const before = await token.balanceOf(owner.address);
    await stakeForNFT.unstake();
    const after = await token.balanceOf(owner.address);

    expect(after - before).to.equal(stakeAmount);
    expect(await token.balanceOf(stakeForNFTAddress)).to.equal(0n);
  });

  it("(provided source) stakedToken remains registered after unstake", async function () {
    const { owner, stakeForNFT, proxyAddress } = await loadFixture(stakeFixture);
    await stakeForNFT.unstake();
    // stakedToken is NOT cleared — only stakedAmount is zeroed
    expect(await stakeForNFT.stakedToken(owner.address)).to.equal(proxyAddress);
    expect(await stakeForNFT.stakedAmount(owner.address)).to.equal(0n);
  });

  it("unstake reverts if nothing is staked", async function () {
    const { stakeForNFT, user } = await loadFixture(deployFixture);
    await expect(stakeForNFT.connect(user).unstake()).to.be.revertedWith(
      "Nothing staked"
    );
  });
});

// ---------------------------------------------------------------------------
// Part 4: Upgrade to V2 + adminBurn + Mint NFT
// ---------------------------------------------------------------------------
describe("Part 4 — Get Tokens Back & Mint NFT (Challenge Solution)", function () {
  async function stakeFixture() {
    const base = await deployFixture();
    const { token, stakeForNFT, stakeForNFTAddress, proxyAddress, stakeAmount } = base;
    await token.approve(stakeForNFTAddress, stakeAmount);
    await stakeForNFT.stake(proxyAddress, stakeAmount, "313551116");
    return base;
  }

  it("upgrades proxy from V1 to V2 (owner only)", async function () {
    const { token, proxyAddress } = await loadFixture(stakeFixture);
    const MyTokenV2 = await ethers.getContractFactory("MyTokenV2");
    const implV2 = await MyTokenV2.deploy();
    await implV2.waitForDeployment();

    await token.upgradeToAndCall(await implV2.getAddress(), "0x");

    // adminBurn should now be callable
    const tokenV2 = MyTokenV2.attach(proxyAddress) as any;
    expect(await tokenV2.name()).to.equal("MyToken"); // state preserved
  });

  it("adminBurn drains StakeForNFT balance to 0", async function () {
    const { token, proxyAddress, stakeForNFTAddress, stakeAmount } =
      await loadFixture(stakeFixture);

    const MyTokenV2 = await ethers.getContractFactory("MyTokenV2");
    const implV2 = await MyTokenV2.deploy();
    await implV2.waitForDeployment();
    await token.upgradeToAndCall(await implV2.getAddress(), "0x");

    const tokenV2 = MyTokenV2.attach(proxyAddress) as any;
    const balance = await tokenV2.balanceOf(stakeForNFTAddress);
    expect(balance).to.equal(stakeAmount);

    await tokenV2.adminBurn(stakeForNFTAddress, balance);
    expect(await tokenV2.balanceOf(stakeForNFTAddress)).to.equal(0n);
  });

  it("non-owner cannot call adminBurn", async function () {
    const { token, proxyAddress, stakeForNFTAddress, stakeAmount, user } =
      await loadFixture(stakeFixture);

    const MyTokenV2 = await ethers.getContractFactory("MyTokenV2");
    const implV2 = await MyTokenV2.deploy();
    await implV2.waitForDeployment();
    await token.upgradeToAndCall(await implV2.getAddress(), "0x");

    const tokenV2 = MyTokenV2.attach(proxyAddress) as any;
    await expect(
      tokenV2.connect(user).adminBurn(stakeForNFTAddress, stakeAmount)
    ).to.be.revertedWithCustomError(tokenV2, "OwnableUnauthorizedAccount");
  });

  it("mint() succeeds after balance is 0 — NFT is received", async function () {
    const { token, proxyAddress, stakeForNFT, stakeForNFTAddress, stakeAmount, owner } =
      await loadFixture(stakeFixture);

    // Upgrade
    const MyTokenV2 = await ethers.getContractFactory("MyTokenV2");
    const implV2 = await MyTokenV2.deploy();
    await implV2.waitForDeployment();
    await token.upgradeToAndCall(await implV2.getAddress(), "0x");

    // Drain
    const tokenV2 = MyTokenV2.attach(proxyAddress) as any;
    await tokenV2.adminBurn(stakeForNFTAddress, stakeAmount);

    // Mint NFT
    await expect(stakeForNFT.mint())
      .to.emit(stakeForNFT, "Transfer")
      .withArgs(ethers.ZeroAddress, owner.address, 0n);

    expect(await stakeForNFT.balanceOf(owner.address)).to.equal(1n);
    expect(await stakeForNFT.hasMinted(owner.address)).to.be.true;
  });

  it("mint() reverts if balance is still > 0", async function () {
    const { stakeForNFT } = await loadFixture(stakeFixture);
    await expect(stakeForNFT.mint()).to.be.revertedWith("Token balance must be 0");
  });

  it("cannot mint twice", async function () {
    const { token, proxyAddress, stakeForNFT, stakeForNFTAddress, stakeAmount } =
      await loadFixture(stakeFixture);

    const MyTokenV2 = await ethers.getContractFactory("MyTokenV2");
    const implV2 = await MyTokenV2.deploy();
    await implV2.waitForDeployment();
    await token.upgradeToAndCall(await implV2.getAddress(), "0x");

    const tokenV2 = MyTokenV2.attach(proxyAddress) as any;
    await tokenV2.adminBurn(stakeForNFTAddress, stakeAmount);
    await stakeForNFT.mint();

    await expect(stakeForNFT.mint()).to.be.revertedWith("Already minted");
  });
});
