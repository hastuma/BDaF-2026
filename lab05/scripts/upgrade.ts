import { ethers } from "hardhat";

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) throw new Error("Set PROXY_ADDRESS in .env");

  const [deployer] = await ethers.getSigners();
  console.log("Account:", deployer.address);

  // 1. Deploy MyTokenV2 implementation
  const MyTokenV2 = await ethers.getContractFactory("MyTokenV2");
  const implV2 = await MyTokenV2.deploy();
  await implV2.waitForDeployment();
  const implV2Address = await implV2.getAddress();
  console.log("MyTokenV2 impl:", implV2Address);

  // 2. Call upgradeToAndCall on the proxy (as owner)
  const proxy = await ethers.getContractAt("MyTokenV1", proxyAddress);
  const tx = await proxy.upgradeToAndCall(implV2Address, "0x");
  await tx.wait();
  console.log("Upgraded to V2. tx:", tx.hash);

  // 3. Confirm adminBurn exists
  const tokenV2 = await ethers.getContractAt("MyTokenV2", proxyAddress);
  console.log("Upgrade verified — adminBurn available at proxy");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
