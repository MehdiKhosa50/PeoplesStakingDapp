require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  
  networks: {
    // Local Hardhat network configuration
    hardhat: {
      chainId: 1337, // Set the chain ID for consistency
    },
  }
}