const {
    ethers,
    upgrades
} = require("hardhat");

const utils = require('./utils');

let node4Pri = "0x3a0fe52ef061967717b393f3ebb781aaa4581620f0a85f8e7a89b87412e83825"
let node4Pub = "0xdb96f5eabd8caf8e7e73059b3e17f82501a82f2ab88e8d9358423f77079d585243ef831acb67be8dc1609bd963a648548ce1997d241928c109bcd3c420f317d3"
let node4Addr = "0x3Aaa9A42d1B7Ee6661466947a74Cf45009e63A4f"

let recevierPri = "0x5b3749b365d2745b7b49b08575f782083a3a477d7afbdb564bd68a4e20c2a911"
let receiverPub = "0xc17815e183e03fd7bdaa398d2d4b8cb1c665e7f86445470f35468af2d982324ad4e2ee5947d0ac5b49938c30c8eb3f3b5ef13a1133dd70af4b2e47fc77dc7aff"

const main = async () => {
    const accounts = await ethers.getSigners();
    let signer = accounts[0];
    console.log("tx sender:", signer.address);

    const contractAddresses = utils.getContractAddresses();
    console.log("contractAddresses:", contractAddresses);

    const LockingPool = await ethers.getContractFactory("LockingPool");
    const LockingPoolObj = await LockingPool.attach(contractAddresses.contracts.LockingPoolProxy);

    let latestSignerUpdateBatch = await LockingPoolObj.latestSignerUpdateBatch(1);
    console.log("latestSignerUpdateBatch:", latestSignerUpdateBatch)

    const LockingNFT = await ethers.getContractFactory("LockingNFT");
    const LockingNFTObj = await LockingNFT.attach(contractAddresses.contracts.LockingNFT);

     // NFT approve
     const testUser = new ethers.Wallet(recevierPri, ethers.provider);
    //  let tokenId = await LockingPoolObj.getSequencerId(node4Addr);
     // console.log("tokenId:", tokenId);
     await LockingNFTObj.connect(testUser).approve(contractAddresses.contracts.LockingPoolProxy, 1);

    const gov = await hre.ethers.getContractFactory("Governance");
    const govProxyObj = await gov.attach(contractAddresses.contracts.GovernanceProxy);

    // updateSignerUpdateLimit
    // let updateSignerUpdateLimitTx = await updateSignerUpdateLimit(govProxyObj, contractAddresses.contracts.LockingPoolProxy);
    // console.log("updateSignerUpdateLimitTx:", updateSignerUpdateLimitTx.hash);

    let signerUpdateLimitValue = await LockingPoolObj.signerUpdateLimit();
    console.log("signerUpdateLimitValue:", signerUpdateLimitValue);

     let currentBatch = await LockingPoolObj.currentBatch();
     console.log("currentBatch:", currentBatch);

    if (currentBatch < latestSignerUpdateBatch + signerUpdateLimitValue){
        await setCurrentBatch(govProxyObj, contractAddresses.contracts.LockingPoolProxy, latestSignerUpdateBatch + signerUpdateLimitValue)
    }

    // update signer
    let updateSignerTx = await LockingPoolObj.connect(testUser).updateSigner(1, "0xb548c2a036db2b5cdeb9501ff6c73e4653b691e3365e345bdddeb20145fa2f50f8a527550211b4b0664127a36f370d91c2adc33b14423327097f411c4c68ee96");
    console.log("updateSigner tx ", updateSignerTx.hash);
}

async function updateSignerUpdateLimit(govObj,lockingPoolAddress) {
    let ABI = [
        "function updateSignerUpdateLimit(uint256 newLimit) "
    ];
    let iface = new ethers.utils.Interface(ABI);
    let updateSignerUpdateLimitData = iface.encodeFunctionData("updateSignerUpdateLimit", [
        1,
    ])
    console.log("updateSignerUpdateLimit: ", updateSignerUpdateLimitData)

    return govObj.update(
        lockingPoolAddress,
        updateSignerUpdateLimitData
    )
}

async function setCurrentBatch(govObj, lockingPoolAddress,batch) {
    let ABI = [
        "function setCurrentBatch(uint256 newBatch) "
    ];
    let iface = new ethers.utils.Interface(ABI);
    let setCurrentBatchData = iface.encodeFunctionData("setCurrentBatch", [
        batch,
    ])
    console.log("setCurrentBatch: ", setCurrentBatchData)

    return govObj.update(
        lockingPoolAddress,
        setCurrentBatchData
    )
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });