import { DeployFunction } from "hardhat-deploy/types";
import {
  LockingInfoContractName,
  LockingPoolContractName,
} from "../utils/constant";

const func: DeployFunction = async function (hre) {
  if (!hre.network.tags["l1"]) {
    throw new Error(`current network ${hre.network.name} is not an L1`);
  }

  const { deployer } = await hre.getNamedAccounts();

  const { address: LockingInfoAddress } = await hre.deployments.get(
    LockingInfoContractName,
  );

  await hre.deployments.deploy(LockingPoolContractName, {
    from: deployer,
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        init: {
          methodName: "initialize",
          args: [LockingInfoAddress],
        },
      },
    },
    waitConfirmations: 3,
    log: true,
  });
};

func.tags = [LockingPoolContractName, "l1"];

export default func;
