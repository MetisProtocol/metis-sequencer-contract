import { DeployFunction } from "hardhat-deploy/types";
import { LockingInfoContractName } from "../utils/constant";
import { l1BridgeMap, l1MetisMap, l2ChainIdMap } from "../utils/address";

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
