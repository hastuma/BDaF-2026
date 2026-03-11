require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.28",
  networks: {
    zircuit: {
      url: "https://garfield-testnet.zircuit.com", // 測試網路
      accounts: [process.env.PRIVATE_KEY],
      chainId: 48898 // Garfield 測試網的正確 ID
    }
  },
  // 這是 Zircuit 官方建議的驗證設定
  etherscan: {
    enabled: false // Zircuit 不使用 Etherscan 進行驗證
  },
  sourcify: {
    enabled: true,
    apiUrl: "https://sourcify.dev/server",
    browserUrl: "https://sourcify.dev",
  }
};