import { DeployFunction } from "hardhat-deploy/types";
import { LockingInfoContractName } from "../utils/constant";

const func: DeployFunction = async function (hre) {
  if (!hre.network.tags["l1"]) {
    throw new Error(`current network ${hre.network.name} is not an L1`);
  }

  const { deployer } = await hre.getNamedAccounts();

  const bridgeAddr = process.env.METIS_BRIDGE;
  if (!hre.ethers.isAddress(bridgeAddr)) {
    throw new Error(`METIS_BRIDGE env is not set or it's not an address`);
  }

  const l1MetisAddr = process.env.MEITS_L1_TOKEN;
  if (!hre.ethers.isAddress(l1MetisAddr)) {
    throw new Error(`MEITS_L1_TOKEN env is not set or it's not an address`);
  }

  const metisToken = await hre.ethers.getContractAt("TestERC20", l1MetisAddr);
  if ((await metisToken.symbol()).toUpperCase() != "METIS") {
    throw new Error(`${l1MetisAddr} is not METIS token`);
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

  const l2Chainid = parseInt(process.env.METIS_L2_CHAINID as string, 0);
  if (!l2Chainid) {
    throw new Error(`METIS_L2_CHAINID env should be valid chainId`);
  }

  const l2Metis = "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000";

  console.log(
    "using",
    bridgeAddr,
    "bridge",
    "l1Metis",
    l1MetisAddr,
    "l2ChainId",
    l2Chainid,
  );

  await hre.deployments.deploy(LockingInfoContractName, {
    from: deployer,
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        init: {
          methodName: "initialize",
          args: [bridgeAddr, l1MetisAddr, l2Metis, l2Chainid],
        },
      },
    },
    waitConfirmations: 3,
    log: true,
  });
};

func.tags = [LockingInfoContractName, "l1"];

export default func;
