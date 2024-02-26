import { DeployFunction } from "hardhat-deploy/types";
import {
  LockingEscrowContractName,
  LockingManagerContractName,
} from "../utils/constant";

const func: DeployFunction = async function (hre) {
  if (!hre.network.tags["l1"]) {
    throw new Error(`current network ${hre.network.name} is not an L1`);
  }

  const { deployer } = await hre.getNamedAccounts();

  const { address: LockingEscrowAddress } = await hre.deployments.get(
    LockingEscrowContractName,
  );

  await hre.deployments.deploy(LockingManagerContractName, {
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

func.tags = [LockingManagerContractName, "l1"];

export default func;
