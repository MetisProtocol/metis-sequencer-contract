const {
    ethers,
    upgrades
} = require("hardhat");

const web3 = require("web3");
const utils = require('./utils');

let signerPubkey = "0x2d905ff3831bb3e3bec873544cd8da2796b5a3a699f0e8dbe86e811322e77cfbaa8ea790e0af28a640f9efb5ba72afab13bbae9b5767d99e3d28a62ec02491bd"

// params for goerli
// pubkey should not have the leading 04 prefix
let testPri1 = "0x1f9a552c0aad1f104401316375f0737bba5fba0b34a83b0069f2a02c57514a0c"
let testPub1 = "0xeeef8d4d35c9dc2d64df24af6bb4be3b08557a995b2907d97039c536f96477fecbd56bb78fdcde962ccaa579dcc75376e7839f6211cf62cea8b2871b84106674"
let addr1 = "0x70fb083ab9bc2ed3c4cebe08054e82827368ed1e"

let testPri2 = "0x87f4f773ff72685f05494c4d2f4b484d9ac958f9d010b9abda174e9ce1266e05"
let testPub2 = "0xde61a8a5e89510a7dcbcf9ec79aa4ae502341f001b53c0fdb08f4d16adff9c1848b7301f8f616a45a3aad950a68235e41a122fd8f213b1b7f98f661c91acefc2"
let addr2 = "0x57114948f79fa1c2be29b814ff19957c1fe8f64a"

let testPri3 = "0xa94c90ff67050eb2881287a24df98e3e20612e46531a783e66bf7410d68410fc"
let testPub3 = "0x46e8a59b9483fe4697bc2c966ec3365e17d7ab3c5073e0aadf10814f281fbe577ee9dcd53067196cce6503939651edd2458137dcd0e537806fae8827153df9f6"
let addr3 = "0xc1ada63f72fa305111455b5dbede8a42a7d2dc70"

let node0Pub = "0xb4d09126c7fa5c6167e7b509e65a9d73dcff4e62558fbd8be49eb397356733612280dd7f42b83e4f3b4136dbe6415354784a8d7e4585016660b6ef22d5d943f6"
let node0Addr = "0xAB8F231D80FAAEA9E8A2C061890D15B10E4524C7"

let randomPri = "0x4d34e29fdf62d17101adfa58ddb93c30d63d0705219ac9e2494e06ddb6bfaa50"
let randomPub = "0xdf742b5cb27ce5b89fd85b48a35be4dda9f509f600b038dc72bb7cc191ce163957325cfafe9cddf96cb85995f097302ace68991aa4c562f65f0c60b62b9ef34b"
let randomAddr = "0x1E0F769C150947CBECFE37705D08B57B94B4E7CA"

// params for localhost
// let testPri1 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
// let testPub1 = "0x8318535b54105d4a7aae60c08fc45f9687181b4fdfc625bd1a753fa7397fed753547f11ca8696646f2f3acb08e31016afac23e630c5d11f59f61fef57b0d2aa5"
// let addr1 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

// let testPri2 = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
// let testPub2 = "0xba5734d8f7091719471e7f7ed6b9df170dc70cc661ca05e688601ad984f068b0d67351e5f06073092499336ab0839ef8a521afd334e53807205fa2f08eec74f4"
// let addr2 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

// let testPri3 = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
// let testPub3 = "0x9d9031e97dd78ff8c15aa86939de9b1e791066a0224e331bc962a2099a7b1f0464b8bbafe1535f2301c72c2cb3535b172da30b02686ab0393d348614f157fbdb"
// let addr3 = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"


const main = async () => {
    const accounts = await ethers.getSigners();
    signer = accounts[0].address;
    console.log("signer address:%s", signer);

    const contractAddresses = utils.getContractAddresses();
    console.log("contractAddresses:", contractAddresses)

    const stakeManager = await ethers.getContractFactory("StakeManager");
    const stakeManagerObj = await stakeManager.attach(contractAddresses.contracts.StakingManagerProxy);

    console.log('unstake now...')
    let validatorId = 11;
    let unStakeTx = await stakeManagerObj.unstake(validatorId);
    console.log("unstake tx ", unStakeTx.hash);
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