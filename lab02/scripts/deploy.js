const hre = require("hardhat");

async function main() {
  console.log("正在開始部署合約到 Zircuit...");

  // 1. 部署 TokenA
  const TokenA = await hre.ethers.deployContract("TokenA");
  await TokenA.waitForDeployment();
  console.log(`TokenA 部署成功，地址: ${await TokenA.getAddress()}`);

  // 2. 部署 TokenB
  const TokenB = await hre.ethers.deployContract("TokenB");
  await TokenB.waitForDeployment();
  console.log(`TokenB 部署成功，地址: ${await TokenB.getAddress()}`);

  // 3. 部署 TradeContract (或其他 Lab 指定的名稱)

  // 取得剛剛部署成功的地址
  const tokenAAddress = await TokenA.getAddress();
  const tokenBAddress = await TokenB.getAddress();

  // 部署時「傳入」這兩個地址
  const TradeContract = await hre.ethers.deployContract("TradeContract", [
    tokenAAddress, 
    tokenBAddress
  ]);

  await TradeContract.waitForDeployment();
  console.log(`TradeContract 部署成功，地址: ${await TradeContract.getAddress()}`);

  console.log("\n恭喜！所有合約已部署完成。請複製以上地址填入報告。");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


// TokenA 部署成功，地址: 0x3f639e5FB8f34D80C4838c78ae109CEc798EFb6f
// TokenB 部署成功，地址: 0x921BE095e0057a55A773aAF3DED03D070f041421
// TradeContract 部署成功，地址: 0x6A9cdF1B44C99b10CDA1982DF5d0F194FA4099f7
