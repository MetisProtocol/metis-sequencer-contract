import { DeployFunction } from "hardhat-deploy/types";

const ctName = "LockingPool";

const func: DeployFunction = async function (hre) {
  if (!hre.network.tags["l1"]) {
    throw new Error(`current network ${hre.network.name} is not an L1`);
  }

  const { deployer } = await hre.getNamedAccounts();

  const bridge = process.env.METIS_BRIDGE;
  if (!hre.ethers.isAddress(bridge)) {
    throw new Error(`METIS_BRIDGE env is not set or it's not an address`);
  }

  const l1Metis = process.env.MEITS_L1_TOKEN;
  if (!hre.ethers.isAddress(l1Metis)) {
    throw new Error(`MEITS_L1_TOKEN env is not set or it's not an address`);
  }

  const { address: LockingNFTAddress } =
    await hre.deployments.get("LockingNFT");
  const l2Chainid = parseInt(process.env.METIS_L2_CHAINID as string, 0);
  if (!l2Chainid) {
    throw new Error(`METIS_L2_CHAINID env should be valid chainId`);
  }

  const l2Metis = "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000";

  console.log(
    "using",
    bridge,
    "bridge",
    "l1Metis",
    l1Metis,
    "l2ChainId",
    l2Chainid,
  );

  await hre.deployments.deploy(ctName, {
    from: deployer,
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        init: {
          methodName: "initialize",
          args: [
            bridge,
            l1Metis,
            l2Metis,
            LockingNFTAddress,
            deployer,
            l2Chainid,
          ],
        },
      },
    },
    waitConfirmations: 3,
    log: true,
  });
};

func.tags = [ctName, "l1"];

export default func;
