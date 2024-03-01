import { DeployFunction } from "hardhat-deploy/types";
import {
  LockingInfoContractName,
  LockingPoolContractName,
} from "../utils/constant";

const func: DeployFunction = async function (hre) {
  if (!hre.network.tags["l1"]) {
    throw new Error(`current network ${hre.network.name} is not an L1`);
  }

  const { address: LockingInfoAddress } = await hre.deployments.get(
    LockingInfoContractName,
  );

  const { address: LockingPoolAddress } = await hre.deployments.get(
    LockingPoolContractName,
  );

  const lockingInfo = await hre.ethers.getContractAt(
    LockingInfoContractName,
    LockingInfoAddress,
  );

  if ((await lockingInfo.manager()) == hre.ethers.ZeroAddress) {
    console.log("updating manager address for LockingInfo");
    const tx = await lockingInfo.initManager(LockingPoolAddress);
    await tx.wait(1);
    console.log(`done block=${tx.blockNumber} tx=${tx.hash}`);
  }
};

func.tags = ["l1"];

export default func;
