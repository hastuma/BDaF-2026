import { ethers } from "hardhat";

const STAKE_FOR_NFT = "0xa73caE55DF45E8902c5A9df832D1705d6232f61E";

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) throw new Error("Set PROXY_ADDRESS in .env");

  const [deployer] = await ethers.getSigners();
  console.log("Account:", deployer.address);

  const tokenV2 = await ethers.getContractAt("MyTokenV2", proxyAddress);

  // 1. Check how many tokens StakeForNFT holds
  const balance = await tokenV2.balanceOf(STAKE_FOR_NFT);
  console.log("StakeForNFT token balance:", ethers.formatEther(balance));

  if (balance === 0n) {
    console.log("Balance already 0 — skipping adminBurn");
  } else {
    // 2. Burn those tokens (only owner can call this)
    const burnTx = await tokenV2.adminBurn(STAKE_FOR_NFT, balance);
    await burnTx.wait();
    console.log("adminBurn tx:", burnTx.hash);

    const newBalance = await tokenV2.balanceOf(STAKE_FOR_NFT);
    console.log("StakeForNFT balance after burn:", ethers.formatEther(newBalance));
  }

  // 3. Call mint() to receive the NFT
  const stakeForNFT = await ethers.getContractAt(
    ["function mint() external"],
    STAKE_FOR_NFT
  );
  const mintTx = await stakeForNFT.mint();
  await mintTx.wait();
  console.log("NFT minted! tx:", mintTx.hash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
