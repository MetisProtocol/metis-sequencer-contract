import { DeployFunction } from "hardhat-deploy/types";

const ctName = "LockingManager";

const func: DeployFunction = async function (hre) {
  if (!hre.network.tags["l1"]) {
    throw new Error(`current network ${hre.network.name} is not an L1`);
  }

  const { deployer } = await hre.getNamedAccounts();

  const { address: LockingEscrowAddress } =
    await hre.deployments.get("LockingEscrow");

  await hre.deployments.deploy(ctName, {
    from: deployer,
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        init: {
          methodName: "initialize",
          args: [LockingEscrowAddress],
        },
      },
    },
    waitConfirmations: 3,
    log: true,
  });
};

func.tags = [ctName, "l1"];

export default func;
