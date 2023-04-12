require("dotenv").config();
require("hardhat-deploy");
require("@nomiclabs/hardhat-waffle");
require("hardhat-watcher");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("@openzeppelin/hardhat-upgrades");

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.5.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.2",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  mocha: {
    timeout: 600000,
  },

  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    localhost: {
      url: "http://localhost:8545",
    },
    mainnet: {
      url: process.env.MAINNET_RPC !== undefined ? process.env.MAINNET_RPC : "",
      accounts: process.env.DEVNET_PRIVKEY !== undefined ? [process.env.DEVNET_PRIVKEY] : [],
    },
    rinkeby: {
      url: process.env.RINKEBY_RPC !== undefined ? process.env.RINKEBY_RPC : "",
      accounts: process.env.DEVNET_PRIVKEY !== undefined ? [process.env.DEVNET_PRIVKEY] : [],
    },
    goerli: {
      url: process.env.GOERLI_RPC !== undefined ? process.env.GOERLI_RPC : "",
      accounts: process.env.DEVNET_PRIVKEY !== undefined ? [process.env.DEVNET_PRIVKEY] : [],
    },
    arbitrumOne: {
      url: process.env.ARBITRUM_ONE_RPC!== undefined ? process.env.ARBITRUM_ONE_RPC : "",
      accounts: process.env.DEVNET_PRIVKEY !== undefined ? [process.env.DEVNET_PRIVKEY] : [],
    },
    arbitrumOneTestnet: {
      url: process.env.ARBITRUM_TESTNET_RPC !== undefined ? process.env.ARBITRUM_TESTNET_RPC : "",
      accounts: process.env.DEVNET_PRIVKEY !== undefined ? [process.env.DEVNET_PRIVKEY] : [],
    },
    bsc: {
      url: process.env.BSC_MAINNET_PRC  !== undefined ? process.env.BSC_MAINNET_PRC : "",
      accounts: process.env.DEVNET_PRIVKEY !== undefined ? [process.env.DEVNET_PRIVKEY] : [],
    },
    bscTestnet: {
      url: process.env.BSC_TESTNET_PRC !== undefined ? process.env.BSC_TESTNET_PRC : "" ,
      accounts: process.env.DEVNET_PRIVKEY !== undefined ? [process.env.DEVNET_PRIVKEY] : [],
    },
    polygon: {
      url: process.env.MATIC_RPC !== undefined ? process.env.MATIC_RPC : "",
      accounts: process.env.DEVNET_PRIVKEY !== undefined ? [process.env.DEVNET_PRIVKEY] : [],
    }
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      rinkeby: process.env.ETHERSCAN_API_KEY,
      goerli: process.env.ETHERSCAN_API_KEY,
      arbitrumOne: process.env.ARBISCAN_API_KEY,
      arbitrumTestnet: process.env.ARBISCAN_API_KEY,
      bsc: process.env.BSC_API_KEY,
      // bscMainnet: '8MVZUIQXS1AIGTFT4ICQYDYQXKB5FJ3TND',
      bscTestnet: process.env.BSC_API_KEY,
      polygon: process.env.MATIC_API_KEY,
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
