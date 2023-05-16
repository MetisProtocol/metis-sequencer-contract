const { ethers, upgrades } = require("hardhat");
require("@nomiclabs/hardhat-etherscan");
const fs = require('fs')

const verifyStr = "npx hardhat verify --network";

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
let stakingNftName = "Metis Sequencer";
let stakingNftSymbol = "MS";
let metisTokenName = "Metis ERC20";
let metisTokenSymbol = "METIS";
let testTokenName = "Test ERC20";
let testTokenSymbol = "TEST20";
const ZeroAddress = '0x0000000000000000000000000000000000000000';

const main = async () => {
  const accounts = await hre.ethers.getSigners();
  signer = accounts[0].address;
  console.log("signer address:%s", signer, new Date().toTimeString());

  // const Governance = await ethers.getContractFactory("Governance");
  // const proxy = await upgrades.deployProxy(Governance, []);
  // await proxy.deployed();
  // console.log(proxy.address);
  // return;

  console.log('deploying contracts...');
  // await deployGovernance();
  // await deployGovernanceProxy(govAddress);
  // await deployRegistry(govProxyAddress);
  // await deployValidatorShareFactory();
  // await deployValidatorShare();
  // await deployStakingInfo(registryAddress);
  // await deployStakingNFT(stakingNftName, stakingNftSymbol);

  // console.log('deploying tokens...');
  // await deployMetisToken(metisTokenName, metisTokenSymbol);
  // await deployTestToken(testTokenName, testTokenSymbol);

  // await deployStakeManager();
  // await deployStakeManagerProxy(ZeroAddress);
  // await deployStakeManagerExtension();
  
  // let ABI = [
  //   "function initialize(address _registry,address _token,address _NFTContract,address _stakingLogger,address _validatorShareFactory,address _governance,address _owner,address _extensionCode)"
  // ];
  // let iface = new ethers.utils.Interface(ABI);
  // let initializeEncodeData = iface.encodeFunctionData("initialize", [
  //       registryAddress,
  //       metisTokenAddress,
  //       stakingNftAddress,
  //       stakingInfoAddress,
  //       validatorShareFactoryAddress,
  //       govProxyAddress,
  //       signer,
  //       stakeManagerExtensionAddress
  //     ])
  // console.log("initializeEncodeData: ", initializeEncodeData)

  // const StakeManagerProxy = await hre.ethers.getContractFactory("StakeManagerProxy");
  // const stakeManagerProxyObj = await StakeManagerProxy.attach(stakeManagerProxyAddress);
  // let updateResult = await stakeManagerProxyObj.updateAndCall(
  //   stakeManagerAddress,
  //   initializeEncodeData)
  // console.log('stakeManagerProxy initialize result:', updateResult.hash)
  // await delay(3000);

  // const StakingNFT = await hre.ethers.getContractFactory("StakingNFT");
  // const StakingNFTObj = await StakingNFT.attach(stakingNftAddress);
  // let tx = await StakingNFTObj.transferOwnership(stakeManagerProxyAddress);
  // console.log("StakingNFT transferOwnership tx:", tx.hash);
  // await delay(3000);

  // await deploySlashingManager(registryAddress, stakingInfoAddress, process.env.THEMIS_ID);
  // await delay(3000);

   const StakeManager = await hre.ethers.getContractFactory("StakeManager");
   const stakeManagerObj = await StakeManager.attach(stakeManagerAddress);
  let reinitResult = await stakeManagerObj.functions.reinitialize(
      registryAddress,
      metisTokenAddress,
      stakingNftAddress,
      stakingInfoAddress,
      validatorShareFactoryAddress,
      govProxyAddress,
      signer,
      stakeManagerExtensionAddress
  );
  console.log('stakeManager reinitialize result:', reinitResult)
  // await delay(3000);

  
  console.log('writing contract addresses to file...')
  const contractAddresses = {
    root: {
      Registry: registryAddress,
      Governance: govAddress,
      GovernanceProxy: govProxyAddress,
      StakingManager: stakeManagerAddress,
      StakingManagerProxy: stakeManagerProxyAddress,
      SlashingManager: slashingManagerAddress,
      StakingInfo: stakingInfoAddress,
      ValidatorShareFactory: validatorShareFactoryAddress,
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
  governanceDeployed = await Governance.deploy();
  console.log("governance deployed to:", governanceDeployed.address);
  govAddress = governanceDeployed.address;
  console.log(verifyStr, process.env.HARDHAT_NETWORK, governanceDeployed.address);
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
