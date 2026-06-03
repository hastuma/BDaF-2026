require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
require("hardhat-gas-reporter");
module.exports = {
  solidity: "0.8.28",
  gasReporter: { enabled: true }
};
