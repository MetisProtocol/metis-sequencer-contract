import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";

import "./ts-src/tasks/l1";
import "./ts-src/tasks/l2";
import "./ts-src/tasks/dev";

import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 800,
          },
          evmVersion: "shanghai",
          metadata: {
            bytecodeHash: "none",
            useLiteralContent: true,
          },
        },
      },
    ],
    overrides: {
      // Metis is berlin now
      "contracts/SequencerSet.sol": {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 800,
          },
          evmVersion: "berlin",
          metadata: {
            bytecodeHash: "none",
            useLiteralContent: true,
          },
        },
      },
    },
  },
  networks: {
    hardhat: {
      saveDeployments: false,
    },
    mainnet: {
      url: process.env.MAINNET_RPC || "https://eth.llamarpc.com",
      accounts: [process.env.DEPLOYER_KEY as string],
      tags: ["l1"],
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC || "https://1rpc.io/sepolia",
      accounts: [process.env.DEPLOYER_KEY as string],
      tags: ["l1"],
    },
    holesky: {
      url: process.env.HOLESKY_RPC || "https://1rpc.io/holesky",
      accounts: [process.env.DEPLOYER_KEY as string],
      tags: ["l1"],
      verify: {
        etherscan: {
          apiKey: process.env.ETHERSCAN_API_KEY,
          apiUrl: "https://api-holesky.etherscan.io",
        },
      },
    },
    "metis-andromeda": {
      url: process.env.MAINNET_RPC || "https://andromeda.metis.io",
      accounts: [process.env.DEPLOYER_KEY as string],
      tags: ["l2"],
      verify: {
        etherscan: {
          apiKey: "placeholder",
          apiUrl: "https://sepolia.explorer.metisdevops.link",
        },
      },
    },
    "metis-sepolia": {
      url: process.env.METIS_SEPOLIA_RPC || "https://sepolia.metisdevops.link",
      accounts: [process.env.DEPLOYER_KEY as string],
      tags: ["l2"],
      verify: {
        etherscan: {
          apiKey: "placeholder",
          apiUrl: "https://sepolia-explorer-api.metisdevops.link",
        },
      },
    },
    // metis holesky is not a public testnet developers
    // it's only for internal testing and chain state can be updated and rollbacked at any time
    "metis-holesky": {
      url: process.env.METIS_HOLESKY_RPC || "https://holesky.metisdevops.link",
      accounts: [process.env.DEPLOYER_KEY as string],
      tags: ["l2"],
      verify: {
        etherscan: {
          apiKey: "placeholder",
          apiUrl: "https://holesky-explorer-api.metisdevops.link",
        },
      },
    },
  },
  namedAccounts: {
    deployer: 0,
  },
  paths: {
    tests: "./ts-src/test",
    deploy: "./ts-src/deploy",
  },
};

export default config;
