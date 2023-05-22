const {
    ethers,
    upgrades
} = require("hardhat");
const web3 = require("web3");
const utils = require('./utils');
const contractAddresses = utils.getContractAddresses();

const main = async () => {
    // await updateNftOwner();
   
    console.log("contractAddresses:", contractAddresses)

    const govProxy = await hre.ethers.getContractFactory("Governance");
    const govProxyObj = await govProxy.attach(contractAddresses.contracts.GovernanceProxy);

    let tx =  await updateContractMap(
            govProxyObj,
            contractAddresses.contracts.Registry,
            web3.utils.keccak256('stakeManager'),
            contractAddresses.contracts.StakingManagerProxy
        )
    console.log("updateContractMap tx:", tx.hash)
        
    tx = await updateContractMap(
         govProxyObj,
         contractAddresses.contracts.Registry, 
         web3.utils.keccak256('eventsHub'),
         contractAddresses.contracts.EventHubProxy
     )
     console.log("updateContractMap tx:", tx.hash)


    // let tx = await updateStakeManagerContractAddress(govProxyObj)
    //  console.log("updateStakeManagerContractAddress tx:", tx.hash)

    // let tx = await updateStakeManagerReward(govProxyObj)
    // console.log("updateStakeManagerReward tx:", tx.hash)
}

async function updateContractMap(govObj, registryAddress, key, value) {
     let ABI = [
         "function updateContractMap(bytes32 _key, address _address)"
     ];
     let iface = new ethers.utils.Interface(ABI);
     let encodeData = iface.encodeFunctionData("updateContractMap", [
         key,
         value,
     ])
     console.log("encodeData: ", encodeData)

    return govObj.update(
        registryAddress,
        encodeData
    )
}

async function updateNftOwner() {
     const nft = await hre.ethers.getContractFactory("StakingNFT");
     const nftObj = await nft.attach(contractAddresses.contracts.StakingNft);
     let updateOwnerTx = await nftObj.transferOwnership(contractAddresses.contracts.StakingManagerProxy);
     console.log("nft update owner to stakeManagerProxy ",updateOwnerTx.hash)
}

async function updateStakeManagerContractAddress(govObj) {
    let ABI = [
        "function reinitialize(address _NFTContract, address _stakingLogger, address _validatorShareFactory, address _extensionCode)"
     ];
    let iface = new ethers.utils.Interface(ABI);
    let reinitializeEncodeData = iface.encodeFunctionData("reinitialize", [
          contractAddresses.contracts.StakingNft,
          contractAddresses.contracts.StakingInfo,
          contractAddresses.contracts.ValidatorShareFactory,
          contractAddresses.contracts.StakeManagerExtensionAddress,
        ])
    console.log("reinitializeEncodeData: ", reinitializeEncodeData)

    return govObj.update(
        contractAddresses.contracts.StakingManagerProxy,
        reinitializeEncodeData
    )
}

async function updateStakeManagerReward(govObj) {
    let ABI = [
        "function batchSubmitRewards(uint256 fromEpoch,uint256 endEpoch,address[] memory validators, uint256[] memory finishedBlocks,bytes memory signature)"
    ];
    let iface = new ethers.utils.Interface(ABI);
    let reinitializeEncodeData = iface.encodeFunctionData("batchSubmitRewards", [
        1,
        100,
        ["0x70fb083ab9bc2ed3c4cebe08054e82827368ed1e"],
        [100],
        "0x00"
    ])
    console.log("reinitializeEncodeData: ", reinitializeEncodeData)

    return govObj.update(
        stakeManagerProxyAddress,
        reinitializeEncodeData
    )
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
