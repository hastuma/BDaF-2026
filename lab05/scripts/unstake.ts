import { ethers } from "hardhat";

const STAKE_FOR_NFT = "0xa73caE55DF45E8902c5A9df832D1705d6232f61E";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Account:", deployer.address);

  const stakeForNFT = await ethers.getContractAt(
    ["function unstake() external"],
    STAKE_FOR_NFT
  );

  try {
    const tx = await stakeForNFT.unstake();
    const receipt = await tx.wait();
    console.log("unstake() succeeded. tx:", tx.hash);
    console.log("Receipt status:", receipt?.status);
  } catch (err: any) {
    console.log("unstake() reverted or failed:", err.message ?? err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
