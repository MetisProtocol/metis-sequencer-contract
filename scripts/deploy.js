const { ethers, upgrades } = require("hardhat");
require("@nomiclabs/hardhat-etherscan");
const utils = require('./utils')

const verifyStr = "npx hardhat verify --network";

const main = async () => {
  const accounts = await hre.ethers.getSigners();
  signer = accounts[0].address;
  console.log("signer address:%s", signer);

  console.log('deploying contracts...')
  let gov = await deployGovernance();
  let govProxy = await deployGovernanceProxy(gov.address);
  let registry = await deployRegistry(govProxy.address);

  let validatorShareFactory = await deployValidatorShareFactory();
  let stakingInfo = await deployStakingInfo(registry.address);
  let stakingNFT = await deployStakingNFT('Metis Sequencer','MS');

  console.log('deploying tokens...')
  let testToken = await deployTestToken('Test ERC20', 'TST20');
  let stakeManager = await deployStakeManager();
  const StakeManager = await hre.ethers.getContractFactory("StakeManager");
  // const stakeManagerObj = await StakeManager.attach(stakeManager.address)

  let stakeManagerProxy = await deployStakeManagerProxy('0x0000000000000000000000000000000000000000');

  const StakeManagerProxy = await hre.ethers.getContractFactory("StakeManagerProxy");
  const stakeManagerProxyObj = await StakeManagerProxy.attach(stakeManagerProxy.address)
  
  let ABI = [
    "function initialize(address _registry,address _rootchain,address _token,address _NFTContract,address _stakingLogger,address _validatorShareFactory,address _governance,address _owner,address _extensionCode)"
  ];
  let iface = new ethers.utils.Interface(ABI);
  let initializeEncodeData = iface.encodeFunctionData("initialize", [registry.address,
        '0x0000000000000000000000000000000000000000',
        testToken.address,
        stakingNFT.address,
        stakingInfo.address,
        validatorShareFactory.address,
        govProxy.address,
        govProxy.address,
        govProxy.address
      ])
  console.log("initializeEncodeData: ", initializeEncodeData)

  let updateResult = await stakeManagerProxyObj.updateAndCall(
    stakeManager.address, 
    initializeEncodeData)
    // stakeManagerObj.contract.methods.initialize(
    //   registry.address, 
    //   '0x0000000000000000000000000000000000000000', 
    //   testToken.address,
    //   stakingNFT.address, 
    //   stakingInfo.address, 
    //   validatorShareFactory.address, 
    //   govProxy.address
    // ))
  console.log('stakeManagerProxy initialize result:', updateResult)

  let slashingManager = await deploySlashingManager(registry.address, stakingInfo.address, process.env.HEIMDALL_ID)
  // let validatorShare = await deployValidatorShare(registry.address, 0, stakingInfo.address, stakeManagerProxy.address)

  console.log('writing contract addresses to file...')

  const contractAddresses = {
    root: {
      Registry: registry.address,
      Governance: gov.address,
      GovernanceProxy: govProxy.address,
      // ValidatorShare: validatorShare.address,
      SlashingManager: slashingManager.address,
      StakingInfo: stakingInfo.address,
      StakingManager: stakeManager.address,
      StakingManagerProxy: stakeManagerProxy.address,
      tokens: {
        TestToken: testToken.address,
        // RootERC721: RootERC721.address
      }
    }
  }
  utils.writeContractAddresses(contractAddresses)

  // await verify();
};

async function deployGovernance() {
  const Governance = await hre.ethers.getContractFactory("Governance");
  governanceDeployed = await Governance.deploy();
  console.log("governance deployed to:", governanceDeployed.address);
  // console.log(verifyStr, process.env.HARDHAT_NETWORK, governanceDeployed.address);
  return governanceDeployed
}

async function deployGovernanceProxy(govContractAddress) {
  const GovernanceProxy = await hre.ethers.getContractFactory("GovernanceProxy");
  governanceProxyDeployed = await GovernanceProxy.deploy(govContractAddress);
  console.log("governance proxy deployed to:", governanceProxyDeployed.address);
  return governanceProxyDeployed
}

async function deployRegistry(govProxyAddress) {
  const registry = await hre.ethers.getContractFactory("Registry");
  registryDeployed = await registry.deploy(govProxyAddress);
  console.log("registry deployed to:", registryDeployed.address);
  return registryDeployed
}

async function deployValidatorShareFactory() {
  const ValidatorShareFactory = await hre.ethers.getContractFactory("ValidatorShareFactory");
  validatorShareFactoryDeployed = await ValidatorShareFactory.deploy();
  console.log("ValidatorShareFactory deployed to:", validatorShareFactoryDeployed.address);
  return validatorShareFactoryDeployed
}

async function deployStakingInfo(registryContractAddress) {
  const StakingInfo = await hre.ethers.getContractFactory("StakingInfo");
  stakingInfoDeployed = await StakingInfo.deploy(registryContractAddress);
  console.log("StakingInfo deployed to:", stakingInfoDeployed.address);
  return stakingInfoDeployed
}

async function deployStakingNFT(name,symbol) {
  const StakingNFT = await hre.ethers.getContractFactory("StakingNFT");
  stakingNFTDeployed = await StakingNFT.deploy(name,symbol);
  console.log("StakingNFT deployed to:", stakingNFTDeployed.address);
  return stakingNFTDeployed
}

async function deployTestToken(name, symbol) {
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  testTokenDeployed = await TestToken.deploy(name, symbol);
  console.log("TestToken deployed to:", testTokenDeployed.address);
  return testTokenDeployed
}

async function deployStakeManager() {
  const StakeManager = await hre.ethers.getContractFactory("StakeManager");
  stakeManagerDeployed = await StakeManager.deploy();
  console.log("StakeManager deployed to:", stakeManagerDeployed.address);
  return stakeManagerDeployed
}

async function deployStakeManagerProxy(stakeManagerAddress) {
  const StakeManagerProxy = await hre.ethers.getContractFactory("StakeManagerProxy");
  stakeManagerProxyDeployed = await StakeManagerProxy.deploy(stakeManagerAddress);
  console.log("StakeManagerProxy deployed to:", stakeManagerProxyDeployed.address);
  return stakeManagerProxyDeployed
}

async function deploySlashingManager(registryAddress, stakingInfoAddress, themisId) {
  const SlashingManager = await hre.ethers.getContractFactory("SlashingManager");
  slashingManagerDeployed = await SlashingManager.deploy(registryAddress, stakingInfoAddress, themisId);
  console.log("SlashingManager deployed to:", slashingManagerDeployed.address);
  return slashingManagerDeployed
}

async function deployValidatorShare(registryAddress, stakingInfoAddress, stakeManagerProxyAddress) {
  const ValidatorShare = await hre.ethers.getContractFactory("ValidatorShare");
  validatorShareDeployed = await ValidatorShare.deploy(registryAddress, 0, stakingInfoAddress, stakeManagerProxyAddress);
  console.log("ValidatorShare deployed to:", validatorShareDeployed.address);
  return validatorShareDeployed
}

async function verify() {
  await hre.run("verify:verify", {
    address: pool,
    contract: "contracts/core/MultiSigPool.sol:MultiSigPool",
    constructorArguments: [
      signers,
      // wethAddress,
      usdcAddress,
      oneInchAddress,
      starkEx,
      factAddress
    ],
  });
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
