Lab 03: ERC20 Permit & Off-chain Signatures
📋 Overview
本實驗實作了基於 EIP-2612 概念的 ERC20 代幣擴展功能：permit()。透過 ECDSA 離線簽名技術，使用者（Alice）可以授權第三方（Bob）動用其代幣，而不需要親自發送 approve() 交易，進而實現 Gasless 的授權體驗。

🛠️ Key Features
Off-chain Signing: 利用 ethers.js 產生符合以太坊標準的 \x19Ethereum Signed Message 簽名。

Replay Attack Protection:

Nonce: 確保每一組簽名僅能使用一次。

Domain Binding: 在 Hash 中加入 address(this)，防止簽名在不同合約間被重用。

On-chain Verification: 合約內使用 OpenZeppelin 的 ECDSA 與 MessageHashUtils 進行簽名還原與身分驗證。

📂 Project Structure
contracts/Token03.sol: 核心 ERC20 合約，包含 permit 邏輯。

test/: TypeScript 測試腳本，驗證簽名與轉帳流程。

scripts/deploy.ts: 部署合約至 Zircuit Garfield 測試網。

scripts/executeFlow.ts: 模擬完整作業流程並輸出交易雜湊（Transaction Hashes）。

🚀 Execution
Bash
# 安裝依賴
npm install

# 編譯合約 (EVM target: Cancun)
npx hardhat compile

# 執行本地測試
npx hardhat test

# 部署與執行演示流程
npx hardhat run scripts/executeFlow.ts --network zircuit
🔗 Deployment Information
Network: Zircuit Garfield Testnet (Chain ID: 48898)

Contract Address: 0x4dB6826C980DC2E1b28C52B3e3466f9763B2e60C

Explorer: View on Zircuit Explorer