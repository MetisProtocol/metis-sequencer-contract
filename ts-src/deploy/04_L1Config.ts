import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre) {
  if (!hre.network.tags["l1"]) {
    throw new Error(`current network ${hre.network.name} is not an L1`);
  }

  const { address: LockingPoolAddress } =
    await hre.deployments.get("LockingPool");
  const { address: LockingNFTAddress } =
    await hre.deployments.get("LockingNFT");
  const { address: LockingInfoAddress } =
    await hre.deployments.get("LockingInfo");

  const lockingNFT = await hre.ethers.getContractAt(
    "LockingNFT",
    LockingNFTAddress,
  );

  // update the owner
  if ((await lockingNFT.owner()) != LockingPoolAddress) {
    console.log("transfering owner of LockingNFT to LockingPool");
    const tx = await lockingNFT.transferOwnership(LockingPoolAddress);
    await tx.wait(3);
  }

  const lockingPool = await hre.ethers.getContractAt(
    "LockingPool",
    LockingPoolAddress,
  );

  if ((await lockingPool.logger()) !== LockingInfoAddress) {
    console.log("setting logger address");
    const tx = await lockingPool.updateLockingInfo(LockingInfoAddress);
    await tx.wait(3);
  }
};

func.tags = ["l1"];

export default func;
