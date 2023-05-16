const {
    ethers,
    upgrades
} = require("hardhat");
const web3 = require("web3");

let govAddress = "0xa21BDa94809C25c99037BdB29F3BA6387eD96a75";
let govProxyAddress = "0xA3e0D0A99C9738a10f72BE5CBdBBEa447E23DF00";
let registryAddress = "0x53901288c5c61c9B53cedcB7d5bDF04240BE0eaF";
let validatorShareFactoryAddress = "0xa915D351873105b9535481a7d760dbF537E659B6";
let stakingInfoAddress = "0xA2d73dE85C529fE33972DC844d2ADA7849597228";
let stakingNftAddress = "0x837614e99F5F8275C1773F004e6a48fFC1AC33D0";
let metisTokenAddress = "0x837614e99F5F8275C1773F004e6a48fFC1AC33D0";
let testTokenAddress = "0x384d2a29acBf54F375939D0Ea6FD85969a628D74";
let stakeManagerAddress = "0xeCdDe811546A0B6027D710bfCD07C5e89E719ABf";
let stakeManagerProxyAddress = "0x7a91d5924Bfb185fd17cCd06bb1496876190a8DF";
let stakeManagerExtensionAddress = "0x1a0F9Ca280B3c0a78515397EDDE47c05D0A76956";
let slashingManagerAddress = "0x4595cB3099F709C8F470Ac9Ad04Bd4e00eb74054";

const main = async () => {
    // let stakeManagerHash = web3.utils.keccak256('stakeManager');
    // console.log("stakeManagerHash: ", stakeManagerHash)

    const govProxy = await hre.ethers.getContractFactory("GovernanceProxy");
    const govProxyObj = await govProxy.attach(govProxyAddress);
    let tx =  await updateContractMap(
            govProxyObj,
            registryAddress,
             web3.utils.keccak256('stakeManager'),
            stakeManagerProxyAddress
        )
        console.log("updateContractMap tx:", tx.hash)
        
    // await updateContractMap(
    //     govProxyObj,
    //     registryAddress,
    //      web3.utils.keccak256('slashingManager'),
    //     slashingManager.address
    // )

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

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
