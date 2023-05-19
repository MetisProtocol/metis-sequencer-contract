const {
    ethers,
    upgrades
} = require("hardhat");
const web3 = require("web3");

let govProxyAddress = "0x937aaFF6b2aDdD3593CaE0d135530f4EDD6e4b65";
let registryAddress = "0x9Ebe9b50C08617158267654F893f8859991fd806";
let validatorShareAddress = "0xDCe59b3B2f90D71614435D0E979A04260b51C24B";
let validatorShareFactoryAddress = "0xEB9A0FC56c1a372AB198c18eD29B3D662975209A";
let stakingInfoAddress = "0x934b77c79bCD81510de51e61da58bE29Bce91497";
let stakingNftAddress = "0x8Cc705ccAe9a16566573BBc3405b347751e30992";
let metisTokenAddress = "0xD331E3CA3e51d3dd6712541CB01d7100E24DAdD1";
let testTokenAddress = "0x384d2a29acBf54F375939D0Ea6FD85969a628D74";
let stakeManagerProxyAddress = "0x95f54194847bEECC0b6af1C7D6C6cD4cddeE62A6";
let stakeManagerExtensionAddress = "0x81955bcCA0f852C072c877D1CCA1eD1b14c0E5eB";
let slashingManagerAddress = "0x2B3a174C812f550B58CAD89A23345d3867e99367";
let eventHubProxyAddress = "0xF7Ee63689b05B062Ebd15327CD80Cf81cC133fd0";
let stakingNftName = "Metis Sequencer";
let stakingNftSymbol = "MS";
let metisTokenName = "Metis ERC20";
let metisTokenSymbol = "METIS";
let testTokenName = "Test ERC20";
let testTokenSymbol = "TEST20";
let validatorShareTokenName = "Validator Share Token";
let validatorShareTokenSymbol = "VST";

const main = async () => {
    // await updateNftOwner();
    // return
    // let stakeManagerHash = web3.utils.keccak256('stakeManager');
    // console.log("stakeManagerHash: ", stakeManagerHash)

    const govProxy = await hre.ethers.getContractFactory("Governance");
    const govProxyObj = await govProxy.attach(govProxyAddress);


    // let tx =  await updateContractMap(
    //         govProxyObj,
    //         registryAddress,
    //          web3.utils.keccak256('stakeManager'),
    //         stakeManagerProxyAddress
    //     )
    // console.log("updateContractMap tx:", tx.hash)
        
    // let tx = await updateContractMap(
    //     govProxyObj,
    //     registryAddress,
    //     web3.utils.keccak256('slashingManager'),
    //     slashingManagerAddress
    // )
    // console.log("updateContractMap tx:", tx.hash)

    //  let tx = await updateContractMap(
    //      govProxyObj,
    //      registryAddress,
    //      web3.utils.keccak256('eventsHub'),
    //      eventHubProxyAddress
    //  )
    //  console.log("updateContractMap tx:", tx.hash)

    //  let tx = await updateContractMap(
    //      govProxyObj,
    //      registryAddress,
    //      web3.utils.keccak256('validatorShare'),
    //      validatorShareAddress
    //  )
    //  console.log("updateContractMap tx:", tx.hash)

    let tx = await updateStakeManagerContractAddress(govProxyObj)
     console.log("updateStakeManagerContractAddress tx:", tx.hash)
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
     const nftObj = await nft.attach(stakingNftAddress);
     let updateOwnerTx = await nftObj.transferOwnership(stakeManagerProxyAddress);
     console.log("nft update owner to stakeManagerProxy ",updateOwnerTx.hash)
}


async function updateStakeManagerContractAddress(govObj) {
    let ABI = [
        "function reinitialize(address _NFTContract, address _stakingLogger, address _validatorShareFactory, address _extensionCode)"
     ];
    let iface = new ethers.utils.Interface(ABI);
    let reinitializeEncodeData = iface.encodeFunctionData("reinitialize", [
          stakingNftAddress,
          stakingInfoAddress,
          validatorShareFactoryAddress,
          stakeManagerExtensionAddress
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
