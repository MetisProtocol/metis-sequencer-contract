 const {
     ethers
 } = require("hardhat");

 const web3 = require("web3");
 const utils = require('./utils');
 let lockingPoolAddress;

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

    //  updateMpc
    let updateMpcTx = await LockingPoolObj.updateMpc(sequencerSigner);
    await updateMpcTx.wait();
    console.log("updateMpc:", updateMpcTx.hash);
 }

 main()
     .then(() => process.exit(0))
     .catch((error) => {
         console.error(error);
         process.exit(1);
     });