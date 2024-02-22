import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";

import "./ts-src/tasks/l1";
import "./ts-src/tasks/l2";

import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 800,
      },
      evmVersion: "berlin",
      metadata: {
        bytecodeHash: "none",
      },
    },
  },
  networks: {
    hardhat: {
      saveDeployments: false,
      tags: ["l1", "l2"], // testing only
    },
    mainnet: {
      url: process.env.MAINNET_RPC || "https://eth.llamarpc.com",
      accounts: [process.env.DEPLOYER_KEY as string],
      tags: ["l1", "mainnet"],
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC || "https://1rpc.io/sepolia",
      accounts: [process.env.DEPLOYER_KEY as string],
      tags: ["l1", "testnet"],
    },
    holesky: {
      url: process.env.HOLESKY_RPC || "https://1rpc.io/holesky",
      accounts: [process.env.DEPLOYER_KEY as string],
      tags: ["l1", "testnet"],
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
      tags: ["l2", "mainnet"],
      verify: {
        etherscan: {
          apiKey: "placeholder",
          apiUrl: "https://sepolia.explorer.metisdevops.link",
        },
      },
    },
    "metis-sepolia": {
      url:
        process.env.METIS_SEPOLIA_RPC || "https://sepolia.rpc.metisdevops.link",
      accounts: [process.env.DEPLOYER_KEY as string],
      tags: ["l2", "testnet"],
      verify: {
        etherscan: {
          apiKey: "placeholder",
          apiUrl: "https://sepolia.explorer.metisdevops.link",
        },
      },
    },
    "metis-holesky": {
      url: process.env.METIS_HOLESKY_RPC || "https://holesky.metisdevops.link",
      accounts: [process.env.DEPLOYER_KEY as string],
      tags: ["l2", "testnet"],
      verify: {
        etherscan: {
          apiKey: "placeholder",
          apiUrl: "https://explorer.holesky.metisdevops.link",
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
