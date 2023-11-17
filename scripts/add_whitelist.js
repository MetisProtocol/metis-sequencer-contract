 const {
     ethers
 } = require("hardhat");

 const web3 = require("web3");
 const utils = require('./utils');
 let lockingPoolAddress;

 const sequencerSigner = "0xf3da13DdCCC5B6676a33A1859F303306f4863A89";

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

    
     let setWitheAddressTx = await setWitheAddress(govProxyObj, contractAddresses.contracts.LockingPoolProxy, sequencerSigner);
     await setWitheAddressTx.wait();
     console.log("setWitheAddress:", setWitheAddressTx.hash);
 }



async function setWitheAddress(govObj, lockingPoolProxyAddress, user) {
    let ABI = [
        "function setWhiteListAddress(address user, bool verified)"
    ];
    let iface = new ethers.utils.Interface(ABI);
    let setWhiteAddressEncodeData = iface.encodeFunctionData("setWhiteListAddress", [
        user, true
    ])
    console.log("setWitheAddress: ", setWhiteAddressEncodeData)

    return govObj.update(
        lockingPoolProxyAddress,
        setWhiteAddressEncodeData
    )
}



 main()
     .then(() => process.exit(0))
     .catch((error) => {
         console.error(error);
         process.exit(1);
     });