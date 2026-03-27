# BDAF Lab 04 

## How to Compile and Run Tests

1. Install dependencies

2. Compile the contract:
   npx hardhat compile

3. Run the test suite and view the Gas Profiling report:
   npx hardhat test

---

## Gas Profiling Results
| Action | Gas Used |
| :--- | :--- |
| `addMember` (single call) | 47,859 |
| `addMember` x1000 (total estimated) | ~ 47,859,000 |
| `batchAddMembers` (all 1,000 split into 4 batches) | ~ 24,542,816 (Avg 6,135,704 per batch) |
| `setMerkleRoot` | 47,570 |
| `verifyMemberByMapping` | 24,337 |
| `verifyMemberByProof` | 35,520 |

---

## Questions & Answers

### 1. Storage cost comparison
**Q: What is the total gas cost of registering all 1,000 members for each of the three approaches (`addMember` x1000, `batchAddMembers`, `setMerkleRoot`)? Which is cheapest and why?**

* **`addMember` x1000**: ~ 47.85 million gas.
* **`batchAddMembers`**: ~ 24.54 million gas.
* **`setMerkleRoot`**: **47,570 gas.**

**The cheapest is `setMerkleRoot`.In the EVM, writing to storage (`SSTORE`) is the most expensive operation. The first two methods write a boolean value to the state mapping 1,000 times. In contrast, `setMerkleRoot` only stores a single 32-byte variable (`bytes32 merkleRoot`) on-chain, regardless of whether the member list contains 100 or 1,000,000 addresses.

### 2. Verification cost comparison
**Q: What is the gas cost of verifying a single member using the mapping vs. the Merkle proof? Which is cheaper and why?**

* **Mapping Verification**: 24,337 gas.
* **Merkle Proof Verification**: 35,520 gas.

**The mapping verification is cheaper.**
 Mapping requires only a simple storage read (`SLOAD`), which is cheap. Verifying via Merkle proof needs to execute multiple `keccak256` in a loop which needs more gas .

### 3. Trade-off analysis
**Q: In what scenarios would you prefer the mapping approach over the Merkle tree approach, and vice versa?**

* **Mapping:**
    If the membership list changes constantly, updating a mapping is much simpler. Updating a Merkle Tree requires recalculating the entire tree off-chain and paying gas to update the root on-chain every time.
* **Merkle Tree:**
   Use it when you have a massive list of users that is already finalized and will not change.

### 4. Batch size experimentation
**Q: Try different batch sizes for `batchAddMembers` (e.g., 50, 100, 250, 500). How does the per-member gas cost change with batch size? Is there a sweet spot?**
experiment results are shown below:

| Batch Size | Total Gas Used | Per-Member Gas Cost |
| :--- | :--- | :--- |
| **50** | 1,246,520 | ~ 24,930 |
| **100** | 2,468,816 | ~ 24,688 |
| **250** | 6,135,704 | ~ 24,543 |
| **500** | 12,247,196 | ~ 24,494 |

* **How it changes:** As the batch size increases, the **per-member gas cost decreases**. This happens because the base transaction fee and the function call overhead are shared across more members in a single transaction.
* **The Sweet Spot:** The sweet spot is  500 members. Larger batches will have lower per-member costs, but I discovered that 1,000 members in a single batch causes the transaction to revert with a `transaction gas limit is greater than the cap` error. Therefore, 500 is the ideal number.