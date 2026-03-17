import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// 載入 .env 檔案中的變數
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      // 重要：針對 OpenZeppelin v5.1+，必須指定 cancun 以支援 mcopy 指令
      evmVersion: "cancun", 
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    zircuit: {
      url: "https://garfield-testnet.zircuit.com", 
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 48898 
    }
  },
  // 按照 Zircuit 官方建議，使用 Sourcify 進行驗證
  etherscan: {
    enabled: false 
  },
  sourcify: {
    enabled: true,
    apiUrl: "https://sourcify.dev/server",
    browserUrl: "https://sourcify.dev",
  }
};

export default config;