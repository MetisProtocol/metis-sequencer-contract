const {
    ethers,
    upgrades
} = require("hardhat");

const utils = require('./utils');

const main = async () => {
    const accounts = await ethers.getSigners();
    signer = accounts[0].address;
    console.log("signer address:%s", signer);

    const contractAddresses = utils.getContractAddresses();
    console.log("contractAddresses:", contractAddresses)

   const LockingPool = await ethers.getContractFactory("LockingPool");
   const LockingPoolObj = await LockingPool.attach(contractAddresses.contracts.LockingPoolProxy);

   let unlockTx = await LockingPoolObj.unlock(1);
   await unlockTx.await();
   console.log("unlock tx ", unlockTx.hash);
}

function delay(s) {
    return new Promise(resolve => setTimeout(resolve, s * 1000));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });