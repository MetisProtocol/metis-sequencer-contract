import { DeployFunction } from "hardhat-deploy/types";
import {
  LockingInfoContractName,
  LockingPoolContractName,
} from "../utils/constant";

const func: DeployFunction = async function (hre) {
  const networkName = hre.network.name;

  if (!hre.network.tags["l1"]) {
    throw new Error(`current network ${networkName} is not an L1`);
  }

  const { deployer } = await hre.getNamedAccounts();

  const { address: LockingInfoAddress } = await hre.deployments.get(
    LockingInfoContractName,
  );

  const proxyAdmin =
    process.env[`${networkName}_proxy_admin`.toUpperCase()] || deployer;

  await hre.deployments.deploy(LockingPoolContractName, {
    from: deployer,
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
      owner: proxyAdmin,
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
