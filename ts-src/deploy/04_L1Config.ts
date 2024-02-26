import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre) {
  if (!hre.network.tags["l1"]) {
    throw new Error(`current network ${hre.network.name} is not an L1`);
  }

  const { address: LockingEscrowAddress } =
    await hre.deployments.get("LockingEscrow");

  const { address: LockingManagerAddress } =
    await hre.deployments.get("LockingEscrow");

  const lockingEscrow = await hre.ethers.getContractAt(
    "LockingEscrow",
    LockingEscrowAddress,
  );

  console.log("updating manager address for LockingEscrow");
  if ((await lockingEscrow.manager()) != hre.ethers.ZeroAddress) {
    const tx = await lockingEscrow.initManager(LockingManagerAddress);
    console.log(`done block=${tx.blockNumber} tx=${tx.hash}`);
  }
};

func.tags = ["l1"];

export default func;
