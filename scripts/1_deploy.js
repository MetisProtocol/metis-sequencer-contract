const { ethers, upgrades } = require("hardhat");
require("@nomiclabs/hardhat-etherscan");
const utils = require('./utils');
const { zeroAddress } = require("ethereumjs-util");
const web3 = require("web3");

const l1MetisToken = "0x114f836434a9aa9ca584491e7965b16565bf5d7b";
const l2MetisToken = "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000"
const l1BridgeAddress = "0xCF7257A86A5dBba34bAbcd2680f209eb9a05b2d2";
const l2Gas = 200000;

let lockingNftName = "Metis Sequencer";
let lockingNftSymbol = "MS";

let govProxyAddress = "0x21f7eA6766Ed0F202b5292dA3B39F9915D097207";
let lockingNftAddress = "0x8C63357C0b02c3CB082e2A6846F5D048cc737c69";
let lockingPoolProxyAddress = "0x73D5B3D9C5502953E51E3dDeDFf81A3e86FA874D";
let lockingInfoAddress = "0x33CdB54Fb5B0A469adB7D294dd868f4b782E2fBA";

const main = async () => {
  const accounts = await hre.ethers.getSigners();
  signer = accounts[0].address;
  console.log("signer address:%s", signer, new Date().toTimeString());

  console.log('deploying contracts...');
   // deploy gov and gov proxy
   const gov = await hre.ethers.getContractFactory("Governance");

  // updateMinLock
  //  const govProxyObj = await gov.attach(govProxyAddress);
  //  let updateMinLockTx = await updateMinLock(govProxyObj);
  //  console.log("updateMinLock:", updateMinLockTx.hash);
  //  await delay(3000);
  //  return

  if (govProxyAddress == ""){
    const govProxy = await upgrades.deployProxy(gov, []);
    await govProxy.deployed();
    console.log("gov proxy deployed to:", govProxy.address);
    govProxyAddress = govProxy.address;
    await delay(3000);
  }

  // deploy locking nft
  const LockingNFT = await hre.ethers.getContractFactory("LockingNFT");
  if (lockingNftAddress == ""){
    lockingNFTDeployed = await LockingNFT.deploy(lockingNftName, lockingNftSymbol);
    console.log("LockingNFT deployed to:", lockingNFTDeployed.address);
    lockingNftAddress = lockingNFTDeployed.address;
    await delay(3000);
  }

  let mpcAddress = signer;
  // deploy locking and proxy
  const LockingPool = await hre.ethers.getContractFactory("LockingPool");
  if (lockingPoolProxyAddress == ""){
    const lockingPoolProxy = await upgrades.deployProxy(LockingPool,
              [
                govProxyAddress,
                l1BridgeAddress,
                l1MetisToken,
                l2MetisToken,
                l2Gas,
                lockingNftAddress,
                mpcAddress
              ]);
    await lockingPoolProxy.deployed();
    console.log("LockingPool deployed to:", lockingPoolProxy.address);
    lockingPoolProxyAddress = lockingPoolProxy.address;
  }

  // const lockingPoolUpgrade = await hre.ethers.getContractFactory("LockingPool");
  // let upgrade = await upgrades.upgradeProxy(lockingPoolProxyAddress, lockingPoolUpgrade);
  // console.log("LockingPool deployed to:", upgrade.address);
  // return

  //  deploy locking info
   const LockingInfo = await hre.ethers.getContractFactory("LockingInfo");
  if (lockingInfoAddress == ""){
    lockingInfoDeployed = await LockingInfo.deploy(lockingPoolProxyAddress);
    console.log("LockingInfo deployed to:", lockingInfoDeployed.address);
    lockingInfoAddress = lockingInfoDeployed.address;
    await delay(3000);
  }

  // set locking pool logger address
  const lockingPoolObj = LockingPool.attach(lockingPoolProxyAddress);
  let loggerAddress = await lockingPoolObj.logger();
  console.log("LockingPool logger address:", loggerAddress, "zeroAddress", zeroAddress());
  
  if (loggerAddress == zeroAddress()){
    const govProxyObj = await gov.attach(govProxyAddress);
    let setLockingInfoTx =  await updateLockingPoolLoggerAddress(govProxyObj);
    console.log("updateLockingPoolLoggerAddress:", setLockingInfoTx.hash);
    await delay(3000);
  }

  // NFT transferOwnership
  const LockingNFTObj = await LockingNFT.attach(lockingNftAddress);
  let tx = await LockingNFTObj.transferOwnership(lockingPoolProxyAddress);
  console.log("LockingNFT transferOwnership tx:", tx.hash);
  await delay(3000);
  
  console.log('writing contract addresses to file...')
  const contractAddresses = {
    contracts: {
      GovernanceProxy: govProxyAddress,
      LockingPoolProxy: lockingPoolProxyAddress,
      LockingInfo: lockingInfoAddress,
      LockingNFT: lockingNftAddress,
      MetisBridge: l1BridgeAddress,
      L2Gas: l2Gas,
      tokens: {
        L1MetisToken: l1MetisToken,
        L2MetisToken: l2MetisToken,
      }
    }
  }
  await utils.writeContractAddresses(contractAddresses)
};

async function updateLockingPoolLoggerAddress(govObj) {
  let ABI = [
    "function updateLockingInfo(address _lockingInfo)"
  ];
  let iface = new ethers.utils.Interface(ABI);
  let updateLockingInfoEncodeData = iface.encodeFunctionData("updateLockingInfo", [
    lockingInfoAddress,
  ])
  console.log("updateLockingInfo: ", updateLockingInfoEncodeData)

  return govObj.update(
    lockingPoolProxyAddress,
    updateLockingInfoEncodeData
  )
}

async function updateMinLock(govObj) {
  let ABI = [
    " function updateMinAmounts(uint256 _minLock)"
  ];
  let iface = new ethers.utils.Interface(ABI);
  let updateMinAmountsData = iface.encodeFunctionData("updateMinAmounts", [
    web3.utils.toWei('2'),
  ])
  console.log("updateMinAmounts: ", updateMinAmountsData)

  return govObj.update(
    lockingPoolProxyAddress,
    updateMinAmountsData
  )
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
