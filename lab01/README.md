## Project Description
A Solidity contract that allows users to deposit ETH.
Only the contract owner can withdraw amount lesser than current balance, unauthorized user trying to withdraw will be logged.

## Setup Instructions
Install the required dependencies:
```bash
npm install
```
## Test instructions
```bash
npx hardhat compile
npx hardhat test
```

## Solidity version
`0.8.28`

## Framework used
* Hardhat: Development environment.
* Ethers.js: Blockchain interaction library.
* Mocha/Chai: Testing framework.