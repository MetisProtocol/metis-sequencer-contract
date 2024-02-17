const {
    ethers,
    upgrades
} = require("hardhat");

const utils = require('./utils');
const l2Gas = 2000000;
const sequencerId = 5;

const main = async () => {
    const accounts = await ethers.getSigners();
    signer = accounts[0].address;
    console.log("signer address:%s", signer);

    const contractAddresses = utils.getContractAddresses();
    console.log("contractAddresses:", contractAddresses)

   const LockingPool = await ethers.getContractFactory("LockingPool");
   const LockingPoolObj = await LockingPool.attach(contractAddresses.contracts.LockingPoolProxy);

   let forceUnlockTx = await LockingPoolObj.forceUnlock(sequencerId,l2Gas);
   await forceUnlockTx.await();
   console.log("forceUnlock tx ", forceUnlockTx.hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });