const {
    ethers,
    upgrades
} = require("hardhat");

const utils = require('./utils');

const main = async () => {
    const accounts = await ethers.getSigners();
    let signer = accounts[0];
    console.log("tx sender:", signer.address);

    const contractAddresses = utils.getContractAddresses();
    console.log("contractAddresses:", contractAddresses);

    const LockingPool = await ethers.getContractFactory("LockingPool");
    const LockingPoolObj = await LockingPool.attach(contractAddresses.contracts.LockingPoolProxy);
  
    let withdrawRewardsTx = await LockingPoolObj.withdrawRewards(1, true);
    await withdrawRewardsTx.await();
    console.log("withdrawRewards tx ", withdrawRewardsTx.hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });