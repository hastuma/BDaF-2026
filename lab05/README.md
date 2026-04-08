# BDaF 2026 Lab05 

## Write-up

### What happened when you called `unstake`? Did you get your tokens back?

The `unstake()` transaction was mined successfully (status 1) . But the tokens were **not** returned, the balance of `StakeForNFT` remained at 1000 MTK after the call. The on-chain bytecode behaves differently from `StakeForNFT.sol` it does nothing with the tokens.

### How did you retrieve your tokens?

the ERC20 was deployed behind a UUPS proxy that we own, we could upgrade the implementation at will. I deployed `MyTokenV2`, which adds an `adminBurn(address from, uint256 amount) onlyOwner` function, and upgraded the proxy to point to it.Then call `adminBurn(StakeForNFT, 1000e18)` to burn the tokens held by the contract, reducing its balance to 0. With the balance check satisfied, `mint()` succeeded and the NFT was received.

### What does this teach you about interacting with unverified contracts?

Never trust a contract's displayed source code as the ground truth for what it will do. Etherscan source code only proves that the source compiles to the same bytecode at deployment time. The contract owner can later upgrade a proxy to different logic, or the provided source may simply not match the deployed bytecode at all. Always audit the actual bytecode, check for proxy patterns, and treat any unverified contract as potentially hostile before sending funds or relying on its behavior.
