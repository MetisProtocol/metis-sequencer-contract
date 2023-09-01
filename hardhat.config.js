require("dotenv").config();
require("hardhat-deploy");
require("@nomiclabs/hardhat-waffle");
require("hardhat-watcher");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("@openzeppelin/hardhat-upgrades");
require('solidity-coverage');

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            runs: 200,
            enabled: true
          }
        }
      },
    ],
  },
  mocha: {
    timeout: 600000,
  },

  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      chainId: 5,
      gas: 5000000,
      // loggingEnabled:true,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    mainnet: {
      url: process.env.MAINNET_RPC !== undefined ? process.env.MAINNET_RPC : "",
      accounts: process.env.DEVNET_PRIVKEY !== undefined ? [process.env.DEVNET_PRIVKEY] : [],
    },
    goerli: {
      url: process.env.GOERLI_RPC !== undefined ? process.env.GOERLI_RPC : "",
      accounts: process.env.DEVNET_PRIVKEY !== undefined ? [process.env.DEVNET_PRIVKEY] : [],
    }
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      goerli: process.env.ETHERSCAN_API_KEY
    }
  },
  watcher: {
    compilation: {
      tasks: ["compile"],
    },
    test: {
      tasks: ["test"],
      files: ["./test/*"],
    },
  },
};
