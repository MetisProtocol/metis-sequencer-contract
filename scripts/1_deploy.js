const { ethers, upgrades } = require("hardhat");
require("@nomiclabs/hardhat-etherscan");
const utils = require('./utils');

const verifyStr = "npx hardhat verify --network";

let govProxyAddress = "0xD8233BD9149579fC6580DEf86301819Da6017E7A";
let registryAddress = "0x651570c879ca1C09AAfF7e10c17F79c17709390C";
let validatorShareFactoryAddress = "0xf7c9E53f9C5904b1E325957Feb5934D7111304Da";
let stakingInfoAddress = "0xCF959787649a81919ABA24d02465179466da7254";
let stakingNftAddress = "0x1d00ac45fA9F7cc8357b11C06e1d54CbA07A4c08";
let metisTokenAddress = "0x6816bCAC3faB518FdD57Af4980DeB12E6dcAF825";
let stakeManagerProxyAddress = "0xf64ee0ee71739b479738e08b147AFE8891fd6013";
let stakeManagerExtensionAddress = "0xa29Ad3C7B7cbde5eBa26b9f41d9b20a3132677D1";
let eventHubProxyAddress = "0x2f7f1d09024BA699C9e1615e65e45AD7b3b7C380";

let stakingNftName = "Metis Validator";
let stakingNftSymbol = "MS";

let metisTokenName = "Metis ERC20";
let metisTokenSymbol = "METIS";

let validatorShareTokenName = "Validator Share Token";
let validatorShareTokenSymbol = "VST";

const ZeroAddress = '0x0000000000000000000000000000000000000000';

const main = async () => {
  const accounts = await hre.ethers.getSigners();
  signer = accounts[0].address;
  console.log("signer address:%s", signer, new Date().toTimeString());

  console.log('deploying contracts...');
  // deploy gov and gov proxy
  const gov = await hre.ethers.getContractFactory("Governance");
  const govProxy = await upgrades.deployProxy(gov, [signer]);
  await govProxy.deployed();
  console.log("gov proxy deployed to:", govProxy.address);
  govProxyAddress = govProxy.address;
  await delay(3000);

  // deploy registry
  const registry = await hre.ethers.getContractFactory("Registry");
  let registryDeployed = await registry.deploy();
  console.log("registry deployed to:", registryDeployed.address);
  registryAddress = registryDeployed.address;
  await delay(3000);

  // registry init
  let registryInitTx = await registryDeployed.initialize(govProxyAddress);
  console.log("registry initialize tx:", registryInitTx.hash);
  await delay(3000);

  // deploy validator share factory
  const ValidatorShareFactory = await hre.ethers.getContractFactory("ValidatorShareFactory");
  validatorShareFactoryDeployed = await ValidatorShareFactory.deploy();
  console.log("ValidatorShareFactory deployed to:", validatorShareFactoryDeployed.address);
  validatorShareFactoryAddress = validatorShareFactoryDeployed.address;
  await delay(3000);

  // deploy staking info
  const StakingInfo = await hre.ethers.getContractFactory("StakingInfo");
  stakingInfoDeployed = await StakingInfo.deploy(registryAddress);
  console.log("StakingInfo deployed to:", stakingInfoDeployed.address);
  stakingInfoAddress = stakingInfoDeployed.address;
  await delay(3000);

  // deploy staking nft
  const StakingNFT = await hre.ethers.getContractFactory("StakingNFT");
  stakingNFTDeployed = await StakingNFT.deploy(stakingNftName, stakingNftSymbol);
  console.log("StakingNFT deployed to:", stakingNFTDeployed.address);
  stakingNftAddress = stakingNFTDeployed.address;
  await delay(3000);

  console.log('deploying tokens...');
  metisTokenAddress = await deployTestToken(metisTokenName, metisTokenSymbol);

  // deploy stake manager extension
  const StakeManagerExtension = await hre.ethers.getContractFactory("StakeManagerExtension");
  stakeManagerExtensionDeployed = await StakeManagerExtension.deploy();
  console.log("StakeManagerExtension deployed to:", stakeManagerExtensionDeployed.address);
  stakeManagerExtensionAddress = stakeManagerExtensionDeployed.address;
  await delay(3000);

  // deploy stake manager and proxy
  const stakeManager = await hre.ethers.getContractFactory("StakeManager");
  const stakeManagerProxy = await upgrades.deployProxy(stakeManager, 
            [
              govProxyAddress,
              registryAddress,
              metisTokenAddress,
              stakingNftAddress,
              stakingInfoAddress,
              validatorShareFactoryAddress,
              signer,
              signer,
              stakeManagerExtensionAddress
            ],
            {
              initializer: 'initialize(address,address,address,address,address,address,address,address,address)'
            });
  await stakeManagerProxy.deployed();
  console.log("StakeManager deployed to:", stakeManagerProxy.address);
  stakeManagerProxyAddress = stakeManagerProxy.address;

  // const stakeManagerUpgrade = await hre.ethers.getContractFactory("StakeManager");
  // let upgrade = await upgrades.upgradeProxy(stakeManagerProxyAddress, stakeManagerUpgrade);
  // console.log("StakeManager deployed to:", upgrade.address);

  // NFT transferOwnership
  const StakingNFT1 = await hre.ethers.getContractFactory("StakingNFT");
  const StakingNFTObj = await StakingNFT1.attach(stakingNftAddress);
  let tx = await StakingNFTObj.transferOwnership(stakeManagerProxyAddress);
  console.log("StakingNFT transferOwnership tx:", tx.hash);
  await delay(3000);

  // deploy event hub
  const EventsHub = await hre.ethers.getContractFactory("EventsHub");
  const EventsHubProxy = await upgrades.deployProxy(EventsHub, [registryAddress])
  await EventsHubProxy.deployed();
  console.log("EventsHub deployed to :", EventsHubProxy.address);
  eventHubProxyAddress = EventsHubProxy.address;
  await delay(3000);
  
  console.log('writing contract addresses to file...')
  const contractAddresses = {
    contracts: {
      Registry: registryAddress,
      GovernanceProxy: govProxyAddress,
      StakingManagerProxy: stakeManagerProxyAddress,
      StakingInfo: stakingInfoAddress,
      ValidatorShareFactory: validatorShareFactoryAddress,
      StakeManagerExtensionAddress: stakeManagerExtensionAddress,
      StakingNft: stakingNftAddress,
      EventHubProxy: eventHubProxyAddress,
      tokens: {
        MetisToken: metisTokenAddress,
      }
    }
  }
  await utils.writeContractAddresses(contractAddresses)
};

async function deployTestToken(name, symbol) {
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  testTokenDeployed = await TestToken.deploy(name, symbol);
  console.log("TestToken deployed to:", testTokenDeployed.address);
  testTokenAddress = testTokenDeployed.address;
  await delay(3000);
  return testTokenDeployed.address;
}

setTimeout(function () {
  console.log('This printed after about {time} second');
}, 1000);

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
