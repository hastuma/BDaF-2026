import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1. Deploy the V1 implementation
  const MyTokenV1 = await ethers.getContractFactory("MyTokenV1");
  const impl = await MyTokenV1.deploy();
  await impl.waitForDeployment();
  console.log("MyTokenV1 impl:", await impl.getAddress());

  // 2. Encode initialize call
  const initData = MyTokenV1.interface.encodeFunctionData("initialize", [
    "MyToken",
    "MTK",
    ethers.parseEther("1000000"),
  ]);

  // 3. Deploy ERC1967Proxy
  const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
  const proxy = await ERC1967Proxy.deploy(await impl.getAddress(), initData);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  console.log("ERC1967Proxy (use this address):", proxyAddress);

  // 4. Verify via proxy
  const token = MyTokenV1.attach(proxyAddress) as any;
  console.log("Token name:", await token.name());
  console.log("Token symbol:", await token.symbol());
  console.log(
    "Deployer balance:",
    ethers.formatEther(await token.balanceOf(deployer.address))
  );

  console.log("\nUpdate your .env: PROXY_ADDRESS=" + proxyAddress);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
