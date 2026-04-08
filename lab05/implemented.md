# Lab05 Implementation Notes

## What Was Done

### Part 1 — Upgradeable ERC20 Deployment

**`contracts/MyTokenV1.sol`**  
An upgradeable ERC20 using OpenZeppelin v5's upgradeable contracts library:
- Inherits `ERC20Upgradeable`, `OwnableUpgradeable`, `UUPSUpgradeable`, and `Initializable`
- Constructor calls `_disableInitializers()` to prevent the bare implementation from being initialized
- `initialize(name, symbol, initialSupply)` sets token metadata and mints the full supply to the deployer
- `_authorizeUpgrade` is guarded by `onlyOwner`, so only the owner can push a new implementation

Deployed behind an `ERC1967Proxy` from `@openzeppelin/contracts`. The proxy address is the canonical token address; the implementation address is an internal detail.

**`scripts/deploy.ts`**  
Deploys the V1 implementation, encodes the `initialize` call, then deploys `ERC1967Proxy`. Prints the proxy address for use in subsequent scripts.

---

### Part 2 — Stake Tokens

**`scripts/stake.ts`**  
1. Calls `approve(StakeForNFT, amount)` on the ERC20 proxy
2. Calls `stake(proxyAddress, amount, studentId)` on the deployed `StakeForNFT` contract

---

### Part 3 — Unstake Attempt

**`scripts/unstake.ts`**  
Calls `unstake()` on the live `StakeForNFT` contract and captures the result.

**What happened:** The on-chain `unstake()` did not return tokens. The function call did not revert (transaction was mined), but the token balance of `StakeForNFT` remained unchanged — tokens were **not** transferred back.  
This demonstrates that an unverified contract's published source code can differ from the actual deployed bytecode. The function signature matches, but the behavior was different.

---

### Part 4 — Retrieve Tokens & Mint NFT

**`contracts/MyTokenV2.sol`**  
Extends `MyTokenV1` with a single additional function:
```solidity
function adminBurn(address from, uint256 amount) external onlyOwner {
    _burn(from, amount);
}
```
This lets the proxy owner forcibly burn tokens held by any address — including `StakeForNFT`.

**`scripts/upgrade.ts`**  
Deploys the V2 implementation and calls `upgradeToAndCall(implV2, "0x")` via the proxy (as owner). After this, the proxy now routes calls to V2 while preserving all state (balances, owner, etc.).

**`scripts/solve.ts`**  
1. Reads `StakeForNFT`'s token balance via the V2 proxy
2. Calls `adminBurn(StakeForNFT, balance)` — burns those tokens, making the balance 0
3. Calls `StakeForNFT.mint()` — the balance check passes, NFT is minted

**Key insight:** Because we own the proxy, we could upgrade the ERC20's logic at will. The upgrade added an admin backdoor to burn from arbitrary addresses — something that was impossible with V1. This is both the power and the risk of upgradeable contracts.

---

### Tests

**`test/Lab05.ts`**  
Covers the complete lab flow on a local Hardhat network:
- Part 1: Token name/symbol/decimals, initial supply, owner, upgrade access control
- Part 2: Stake transfers tokens to contract, revert cases (zero amount, empty student ID)
- Part 3: Unstake behavior with provided source (tokens returned), edge cases
- Part 4: V1→V2 upgrade, adminBurn drains balance, mint succeeds, double-mint revert

---

### Execution Order (Sepolia)

```bash
# 1. Fill in .env (copy from .env.example)
cp .env.example .env

# 2. Deploy the upgradeable ERC20
npx hardhat run scripts/deploy.ts --network sepolia
# → copy PROXY_ADDRESS into .env

# 3. Edit scripts/stake.ts: set STUDENT_ID to your student ID, then:
npx hardhat run scripts/stake.ts --network sepolia

# 4. Attempt unstake (observe behavior)
npx hardhat run scripts/unstake.ts --network sepolia

# 5. Upgrade proxy to V2
npx hardhat run scripts/upgrade.ts --network sepolia

# 6. Drain balance + mint NFT
npx hardhat run scripts/solve.ts --network sepolia
```

---

## What This Teaches About Unverified Contracts

When a contract on-chain is unverified (or even when it is), the Etherscan-displayed source code is not authoritative — only the deployed bytecode is. A contract can expose a function that looks like it does one thing but does something entirely different. Always audit bytecode (or use verified + audited contracts) before sending funds or trusting return behavior.
