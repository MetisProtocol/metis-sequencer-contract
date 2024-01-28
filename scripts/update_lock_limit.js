 const {
     ethers
 } = require("hardhat");

 const web3 = require("web3");
 const utils = require('./utils');
 let lockingPoolAddress;

 const lockMax = "100000";
 const lockMin = "20000";

 const main = async () => {
     const accounts = await ethers.getSigners();
     let signer = accounts[0];
     console.log("tx sender:", signer.address);

     const contractAddresses = utils.getContractAddresses();
     console.log("contractAddresses:", contractAddresses);
     lockingPoolAddress = contractAddresses.contracts.LockingPoolProxy;
     console.log("lockingPoolAddress address:", lockingPoolAddress);

    const LockingPool = await ethers.getContractFactory("LockingPool");
    const LockingPoolObj = await LockingPool.attach(contractAddresses.contracts.LockingPoolProxy);


    let lockMaxAmont = web3.utils.toWei(lockMax);
    let updateLockMaxTx = await LockingPoolObj.updateMaxAmounts(lockMaxAmont);
    await updateLockMaxTx.wait();
    console.log("updateLockMax:", updateLockMaxTx.hash);

    let lockMinAmont = web3.utils.toWei(lockMin);
    let updateLockMinTx = await LockingPoolObj.updateMinAmounts(lockMinAmont);
    await updateLockMinTx.wait();
    console.log("updateLockMin:", updateLockMinTx.hash);
 }

 main()
     .then(() => process.exit(0))
     .catch((error) => {
         console.error(error);
         process.exit(1);
     });