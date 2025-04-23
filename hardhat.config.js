require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // Local development network for testing
    localhost: {
      url: "http://127.0.0.1:8545/",
      chainId: 31337,
      gasMultiplier: 1.2,
      timeout: 60000 // 1 minute timeout
    },
    // Hardhat network configuration
    hardhat: {
      chainId: 31337,
      mining: {
        auto: true,
        interval: 0 // Mine transactions immediately
      },
      gasPrice: 0, // Free gas
      initialBaseFeePerGas: 0, // Free gas
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        accountsBalance: "10000000000000000000000" // 10000 ETH per account
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  // Add more logging for debugging
  mocha: {
    timeout: 120000 // 2 minutes for tests
  }
};
