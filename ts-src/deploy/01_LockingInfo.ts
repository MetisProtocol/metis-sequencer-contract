import { DeployFunction } from "hardhat-deploy/types";
import { LockingInfoContractName } from "../utils/constant";

const l2ChainIdMap: { [key: string]: number } = {
  mainnet: 1088,
  sepolia: 59902,
  holesky: 59903,
  devnet: Number(process.env["DEVBNET_L2_CHAINID"]),
};

const l1BridgeMap: { [key: string]: string } = {
  mainnet: "0x3980c9ed79d2c191A89E02Fa3529C60eD6e9c04b",
  sepolia: "0x9848dE505e6Aa301cEecfCf23A0a150140fc996e",
  holesky: "0x890D4Ef96551C9904e7D4E73d2C22D3F207F5CFb",
  devnet: process.env["DEVBNET_METIST_L1_BRIDGE"] as string,
};

const l1MetisMap: { [key: string]: string } = {
  mainnet: "0x9e32b13ce7f2e80a01932b42553652e053d6ed8e",
  sepolia: "0x7f49160EB9BB068101d445fe77E17ecDb37D0B47",
  holesky: "0xaf8e5B10c69c983204505cDCD56Ec2aC2280D08e",
  devnet: process.env["DEVBNET_METIST_TOKEN"] as string,
};

const func: DeployFunction = async function (hre) {
  const networkName = hre.network.name;

  if (!hre.network.tags["l1"]) {
    throw new Error(`current network ${networkName} is not an L1`);
  }

  const { deployer } = await hre.getNamedAccounts();

  const bridgeAddr = l1BridgeMap[networkName];
  if (!hre.ethers.isAddress(bridgeAddr)) {
    throw new Error(`Not set bridge address for ${networkName}`);
  }

  const l1MetisAddr = l1MetisMap[networkName];
  if (!hre.ethers.isAddress(l1MetisAddr)) {
    throw new Error(`Not set metis token for ${networkName}`);
  }

  const metisToken = await hre.ethers.getContractAt("TestERC20", l1MetisAddr);

  const symbol = await metisToken.symbol();
  if (networkName === "mainnet") {
    if (symbol != "Metis") {
      throw new Error(`${l1MetisAddr} is not METIS token on mainnet`);
    }
  } else {
    if (symbol != "METIS") {
      throw new Error(`${l1MetisAddr} is not METIS token on testnet`);
    }
  }

  const bridge = await hre.ethers.getContractAt("TestBridge", bridgeAddr);
  if ((await bridge.metis()).toLowerCase() != l1MetisAddr.toLowerCase()) {
    throw new Error(`${l1MetisAddr} is not METIS token`);
  }

  if (
    (await bridge.l2TokenBridge()) !=
    "0x4200000000000000000000000000000000000010"
  ) {
    throw new Error(`${bridgeAddr} doesn't seem to be a valid bridge address`);
  }

  const l2ChainId = l2ChainIdMap[networkName];
  if (!l2ChainId) {
    throw new Error(`L2ChainId not set for ${networkName}`);
  }

  const l2Metis = "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000";

  console.log(
    "using",
    "bridge",
    bridgeAddr,
    "l1Metis",
    l1MetisAddr,
    "l2ChainId",
    l2ChainId,
  );

  await hre.deployments.deploy(LockingInfoContractName, {
    from: deployer,
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        init: {
          methodName: "initialize",
          args: [bridgeAddr, l1MetisAddr, l2Metis, l2ChainId],
        },
      },
    },
    waitConfirmations: 3,
    log: true,
  });
};

func.tags = [LockingInfoContractName, "l1"];

export default func;
