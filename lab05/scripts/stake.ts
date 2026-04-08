import { ethers } from "hardhat";

const STAKE_FOR_NFT = "0xa73caE55DF45E8902c5A9df832D1705d6232f61E";
const STUDENT_ID = "314552038"; 

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) throw new Error("Set PROXY_ADDRESS in .env");

  const [deployer] = await ethers.getSigners();
  console.log("Account:", deployer.address);

  const token = await ethers.getContractAt("MyTokenV1", proxyAddress);
  const stakeAmount = ethers.parseEther("1000");

  // 1. Approve StakeForNFT to spend tokens
  const approveTx = await token.approve(STAKE_FOR_NFT, stakeAmount);
  await approveTx.wait();
  console.log("Approved. tx:", approveTx.hash);

  // 2. Stake
  const stakeForNFT = await ethers.getContractAt(
    [
      "function stake(address token, uint256 amount, string studentId) external",
    ],
    STAKE_FOR_NFT
  );
  const stakeTx = await stakeForNFT.stake(proxyAddress, stakeAmount, STUDENT_ID);
  await stakeTx.wait();
  console.log("Staked. tx:", stakeTx.hash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
