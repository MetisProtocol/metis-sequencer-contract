import { DeployFunction } from "hardhat-deploy/types";

const ctName = "LockingNFT";

const func: DeployFunction = async function (hre) {
  if (!hre.network.tags["l1"]) {
    throw new Error(`current network ${hre.network.name} is not an L1`);
  }

  const { deployer } = await hre.getNamedAccounts();

  const lockingNftName = "Metis Sequencer";
  const lockingNftSymbol = "MS";

  await hre.deployments.deploy(ctName, {
    from: deployer,
    args: [lockingNftName, lockingNftSymbol],
    waitConfirmations: 3,
    log: true,
  });
};

func.tags = [ctName, "l1"];

export default func;
