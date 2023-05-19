const { ethers, upgrades } = require("hardhat");
require("@nomiclabs/hardhat-etherscan");
const fs = require('fs')

const verifyStr = "npx hardhat verify --network";

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

const ZeroAddress = '0x0000000000000000000000000000000000000000';

const main = async () => {
  const accounts = await hre.ethers.getSigners();
  signer = accounts[0].address;
  console.log("signer address:%s", signer, new Date().toTimeString());

  // deploy v1 contract
  // const V1contract = await ethers.getContractFactory("V1");
  // console.log("Deploying V1contract...");
  // const v1contract = await upgrades.deployProxy(V1contract, [10]);
  // await v1contract.deployed();
  // console.log("V1 Contract deployed to:", v1contract.address);


  // upgrade to v2
  //  const V2Contract = await ethers.getContractFactory("V2");
  //  console.log("Upgrading V1Contract...");
  //  let upgrade = await upgrades.upgradeProxy(v1ProxyAddress, V2Contract);
  //  console.log("V1 Upgraded to V2");
  //  console.log("V2 Contract Deployed To:", upgrade.address)
  // return;

  console.log('deploying contracts...');

  // deploy gov and gov proxy
  // const gov = await hre.ethers.getContractFactory("Governance");
  // const govProxy = await upgrades.deployProxy(gov, [signer]);
  // await govProxy.deployed();
  // console.log("gov proxy deployed to:", govProxy.address);

  // govProxyAddress = govProxy.address;
  // console.log(verifyStr, process.env.HARDHAT_NETWORK, govProxy.address);
  // await delay(3000);
  // return 

  // deploy registry
  // const registry = await hre.ethers.getContractFactory("Registry");
  // let registryDeployed = await registry.deploy();
  // console.log("registry deployed to:", registryDeployed.address);
  // registryAddress = registryDeployed.address;
  // await delay(3000);

  // // registry init
  // let registryInitTx = await registryDeployed.initialize(govProxyAddress);
  // console.log("registry initialize tx:", registryInitTx.hash);


  // const ValidatorShare = await hre.ethers.getContractFactory("ValidatorShare");
  // validatorShareDeployed = await ValidatorShare.deploy(validatorShareTokenName, validatorShareTokenSymbol);
  // console.log("ValidatorShare deployed to:", validatorShareDeployed.address);
  // validatorShareAddress = validatorShareDeployed.address;
  // await delay(3000);
  // return;

  // deploy validator share factory
  const ValidatorShareFactory = await hre.ethers.getContractFactory("ValidatorShareFactory");
  validatorShareFactoryDeployed = await ValidatorShareFactory.deploy();
  console.log("ValidatorShareFactory deployed to:", validatorShareFactoryDeployed.address);
  validatorShareFactoryAddress = validatorShareFactoryDeployed.address;
  await delay(3000);
  return


  // deploy staking info
  // const StakingInfo = await hre.ethers.getContractFactory("StakingInfo");
  // stakingInfoDeployed = await StakingInfo.deploy(registryAddress);
  // console.log("StakingInfo deployed to:", stakingInfoDeployed.address);
  // stakingInfoAddress = stakingInfoDeployed.address;
  // await delay(3000);


  // deploy staking nft
  // const StakingNFT = await hre.ethers.getContractFactory("StakingNFT");
  // stakingNFTDeployed = await StakingNFT.deploy(stakingNftName, stakingNftSymbol);
  // console.log("StakingNFT deployed to:", stakingNFTDeployed.address);
  // stakingNftAddress = stakingNFTDeployed.address;
  // await delay(3000);


  console.log('deploying tokens...');
  // await deployMetisToken(metisTokenName, metisTokenSymbol);
  // await deployTestToken(testTokenName, testTokenSymbol);
  // await deployStakeManagerExtension();

  // deploy stake manager and proxy
  // const stakeManager = await hre.ethers.getContractFactory("StakeManager");
  // const stakeManagerProxy = await upgrades.deployProxy(stakeManager, 
  //           [
  //             govProxyAddress,
  //             registryAddress,
  //             metisTokenAddress,
  //             stakingNftAddress,
  //             stakingInfoAddress,
  //             validatorShareFactoryAddress,
  //             signer,
  //             stakeManagerExtensionAddress
  //           ],
  //           {
  //             initializer: 'initialize(address,address,address,address,address,address,address,address)'
  //           });
  // await stakeManagerProxy.deployed();
  // console.log("StakeManager deployed to:", stakeManagerProxy.address);
  // stakeManagerProxyAddress = stakeManagerProxy.address;

  const stakeManagerUpgrade = await hre.ethers.getContractFactory("StakeManager");
  let upgrade = await upgrades.upgradeProxy(stakeManagerProxyAddress, stakeManagerUpgrade);
  console.log("StakeManager deployed to:", upgrade.address);
  return

  // const StakingNFT = await hre.ethers.getContractFactory("StakingNFT");
  // const StakingNFTObj = await StakingNFT.attach(stakingNftAddress);
  // let tx = await StakingNFTObj.transferOwnership(stakeManagerProxyAddress);
  // console.log("StakingNFT transferOwnership tx:", tx.hash);
  // await delay(3000);

  // await deploySlashingManager(registryAddress, stakingInfoAddress, process.env.THEMIS_ID);
  // await delay(3000);

  // deploy event hub
  // const EventsHub = await hre.ethers.getContractFactory("EventsHub");
  // const EventsHubProxy = await upgrades.deployProxy(EventsHub, [registryAddress])
  // await EventsHubProxy.deployed();
  // console.log("EventsHub deployed to :", EventsHubProxy.address);
  // eventHubProxyAddress = EventsHubProxy.address;
  // await delay(3000);
  
  console.log('writing contract addresses to file...')
  const contractAddresses = {
    root: {
      Registry: registryAddress,
      GovernanceProxy: govProxyAddress,
      StakingManagerProxy: stakeManagerProxyAddress,
      SlashingManager: slashingManagerAddress,
      StakingInfo: stakingInfoAddress,
      ValidatorShareFactory: validatorShareFactoryAddress,
      StakeManagerExtensionAddress: stakeManagerExtensionAddress,
      StakingNft: stakingNftAddress,
      tokens: {
        MetisToken: metisTokenAddress,
        TestToken: testTokenAddress
      }
    }
  }
  await writeContractAddresses(contractAddresses)
};

async function deployGovernance() {
  const Governance = await hre.ethers.getContractFactory("Governance");
  const govProxy = await upgrades.deployProxy(Governance, []);
  await govProxy.deployed();
  console.log("gov deployed to:", govProxy.address);
  
  govProxyAddress = govProxy.address;
  console.log(verifyStr, process.env.HARDHAT_NETWORK, govProxy.address);
  await delay(3000);
}

async function deployGovernanceProxy(govContractAddress) {
  const GovernanceProxy = await hre.ethers.getContractFactory("GovernanceProxy");
  governanceProxyDeployed = await GovernanceProxy.deploy(govContractAddress);
  console.log("governance proxy deployed to:", governanceProxyDeployed.address);
  govProxyAddress = governanceProxyDeployed.address;
  console.log(verifyStr, process.env.HARDHAT_NETWORK, governanceProxyDeployed.address, govContractAddress);
  await delay(3000);
}

async function deployRegistry(govProxyAddress) {
  const registry = await hre.ethers.getContractFactory("Registry");
  registryDeployed = await registry.deploy(govProxyAddress);
  console.log("registry deployed to:", registryDeployed.address);
  registryAddress = registryDeployed.address;
  console.log(verifyStr, process.env.HARDHAT_NETWORK, registryDeployed.address, govProxyAddress);
  await delay(3000);
}

// async function deployValidatorShare(){
//    const ValidatorShare = await hre.ethers.getContractFactory("ValidatorShare");
//    validatorShareDeployed = await ValidatorShare.deploy(govProxyAddress);
//    console.log("ValidatorShare deployed to:", validatorShareDeployed.address);
//    validatorShareAddress = validatorShareDeployed.address;
//    console.log(verifyStr, process.env.HARDHAT_NETWORK, validatorShareDeployed.address);
//    await delay(3000);
// }

async function deployValidatorShareFactory() {
  const ValidatorShareFactory = await hre.ethers.getContractFactory("ValidatorShareFactory");
  validatorShareFactoryDeployed = await ValidatorShareFactory.deploy();
  console.log("ValidatorShareFactory deployed to:", validatorShareFactoryDeployed.address);
  validatorShareFactoryAddress = validatorShareFactoryDeployed.address;
  console.log(verifyStr, process.env.HARDHAT_NETWORK, validatorShareFactoryDeployed.address);
  await delay(3000);
}

async function deployStakingInfo(registryContractAddress) {
  const StakingInfo = await hre.ethers.getContractFactory("StakingInfo");
  stakingInfoDeployed = await StakingInfo.deploy(registryContractAddress);
  console.log("StakingInfo deployed to:", stakingInfoDeployed.address);
  stakingInfoAddress = stakingInfoDeployed.address;
  console.log(verifyStr, process.env.HARDHAT_NETWORK, stakingInfoDeployed.address, registryContractAddress);
  await delay(3000);
}

async function deployStakingNFT(name,symbol) {
  const StakingNFT = await hre.ethers.getContractFactory("StakingNFT");
  stakingNFTDeployed = await StakingNFT.deploy(name,symbol);
  console.log("StakingNFT deployed to:", stakingNFTDeployed.address);
  stakingNftAddress = stakingNFTDeployed.address;
  console.log(verifyStr, process.env.HARDHAT_NETWORK, stakingNFTDeployed.address, name, symbol);
  await delay(3000);
}

async function deployMetisToken(name, symbol) {
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  testTokenDeployed = await TestToken.deploy(name, symbol);
  console.log("TestToken deployed to:", testTokenDeployed.address);
  metisTokenAddress = testTokenDeployed.address;
  console.log(verifyStr, process.env.HARDHAT_NETWORK, testTokenDeployed.address, name, symbol);
  await delay(3000);
}

async function deployTestToken(name, symbol) {
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  testTokenDeployed = await TestToken.deploy(name, symbol);
  console.log("TestToken deployed to:", testTokenDeployed.address);
  testTokenAddress = testTokenDeployed.address;
  console.log(verifyStr, process.env.HARDHAT_NETWORK, testTokenDeployed.address, name, symbol);
  await delay(3000);
}

async function deployStakeManager() {
  const StakeManager = await hre.ethers.getContractFactory("StakeManager");
  stakeManagerDeployed = await StakeManager.deploy();
  console.log("StakeManager deployed to:", stakeManagerDeployed.address);
  stakeManagerAddress = stakeManagerDeployed.address;
  console.log(verifyStr, process.env.HARDHAT_NETWORK, stakeManagerDeployed.address);
  await delay(3000);
}

async function deployStakeManagerProxy(stakeManagerAddress) {
  const StakeManagerProxy = await hre.ethers.getContractFactory("StakeManagerProxy");
  stakeManagerProxyDeployed = await StakeManagerProxy.deploy(stakeManagerAddress);
  console.log("StakeManagerProxy deployed to:", stakeManagerProxyDeployed.address);
  stakeManagerProxyAddress = stakeManagerProxyDeployed.address;
  console.log(verifyStr, process.env.HARDHAT_NETWORK, stakeManagerProxyDeployed.address, stakeManagerAddress);
  await delay(3000);
}

async function deployStakeManagerExtension() {
  const StakeManagerExtension = await hre.ethers.getContractFactory("StakeManagerExtension");
  stakeManagerExtensionDeployed = await StakeManagerExtension.deploy();
  console.log("StakeManagerExtension deployed to:", stakeManagerExtensionDeployed.address);
  stakeManagerExtensionAddress = stakeManagerExtensionDeployed.address;
  console.log(verifyStr, process.env.HARDHAT_NETWORK, stakeManagerExtensionDeployed.address);
  await delay(3000);
}


async function deploySlashingManager(registryAddress, stakingInfoAddress, themisId) {
  const SlashingManager = await hre.ethers.getContractFactory("SlashingManager");
  slashingManagerDeployed = await SlashingManager.deploy(registryAddress, stakingInfoAddress, themisId);
  console.log("SlashingManager deployed to:", slashingManagerDeployed.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, slashingManagerDeployed.address, registryAddress, stakingInfoAddress, themisId);
  await delay(3000);
  slashingManagerAddress = slashingManagerDeployed.address;
  return slashingManagerDeployed
}

async function deployValidatorShare(registryAddress, stakingInfoAddress, stakeManagerProxyAddress) {
  const ValidatorShare = await hre.ethers.getContractFactory("ValidatorShare");
  validatorShareDeployed = await ValidatorShare.deploy(registryAddress, 0, stakingInfoAddress, stakeManagerProxyAddress);
  console.log("ValidatorShare deployed to:", validatorShareDeployed.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, validatorShareDeployed.address, registryAddress, stakingInfoAddress, stakeManagerProxyAddress);
  await delay(3000);
  return validatorShareDeployed
}

async function writeContractAddresses(contractAddresses) {
  fs.writeFileSync(
    `${process.cwd()}/contractAddresses.json`,
    JSON.stringify(contractAddresses, null, 2) // Indent 2 spaces
  )
}

setTimeout(function () {
  console.log('This printed after about {time} second');
}, 1000);

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

// async function verify() {
//   await hre.run("verify:verify", {
//     address: pool,
//     contract: "contracts/core/MultiSigPool.sol:MultiSigPool",
//     constructorArguments: [
//       signers,
//       // wethAddress,
//       usdcAddress,
//       oneInchAddress,
//       starkEx,
//       factAddress
//     ],
//   });
// }


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
