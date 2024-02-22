import { DeployFunction } from "hardhat-deploy/types";

const ctName = "LockingInfo";

const func: DeployFunction = async function (hre) {
  if (!hre.network.tags["l1"]) {
    throw new Error(`current network ${hre.network.name} is not an L1`);
  }

  const { deployer } = await hre.getNamedAccounts();

  const { address: LockingPoolAddress } =
    await hre.deployments.get("LockingPool");

  await hre.deployments.deploy(ctName, {
    from: deployer,
    args: [LockingPoolAddress],
    waitConfirmations: 3,
    log: true,
  });
};

func.tags = [ctName, "l1", "proxy"];

export default func;
