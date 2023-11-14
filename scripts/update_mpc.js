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


     const govProxyObj = await hre.ethers.getContractAt("Proxy", contractAddresses.contracts.GovProxy);
     console.log("govProxyObj address:", govProxyObj.address);

     //  updateMpc
     let updateMpcTx = await updateMpc(govProxyObj, "0x4835bd266b19887d56972474ec22fa769fd2a77b");
     await updateMpcTx.wait();
     console.log("updateMpcTx:", updateMpcTx.hash);
 }

 async function updateMpc(govObj, newMpc) {
     let ABI = [
         "function updateMpc(address _newMpc)"
     ];
     let iface = new ethers.utils.Interface(ABI);
     let updateMpcData = iface.encodeFunctionData("updateMpc", [
         newMpc
     ])
     console.log("updateMpc: ", updateMpcData)

     return govObj.update(
         lockingPoolAddress,
         updateMpcData
     )
 }


 main()
     .then(() => process.exit(0))
     .catch((error) => {
         console.error(error);
         process.exit(1);
     });