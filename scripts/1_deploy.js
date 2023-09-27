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

let govProxyAddress = "0xe1239449CD8b9F38c31d06DAB329c46b2B57B8fe";
let lockingNftAddress = "";
let lockingPoolProxyAddress = "0x44ba81BFf5c2f7C495Ac5256b221f85f8004Ade4";
let lockingInfoAddress = "";

const main = async () => {
  const accounts = await hre.ethers.getSigners();
  signer = accounts[0].address;
  console.log("signer address:%s", signer, new Date().toTimeString());

  console.log('deploying contracts...');
   // deploy gov and gov proxy
   const gov = await hre.ethers.getContractFactory("Proxy");

   // updateMpc
  // const govProxyObj = await gov.attach(govProxyAddress);
  // let updateMpcTx = await updateMpc(govProxyObj, "0x563870eA4f826f1460C8Ce2800ed275f07B234E4");
  //  await updateMpcTx.wait();
  // console.log("updateMpcTx:", updateMpcTx.hash);
  // await delay(3000);
  // return

  // updateMinLock
   const govProxyObj = await gov.attach(govProxyAddress);
   let updateMinLockTx = await updateMinLock(govProxyObj);
   console.log("updateMinLock:", updateMinLockTx.hash);
   await updateMinLockTx.wait();
   return

   // updateMinLock
    // const govProxyObj = await gov.attach(govProxyAddress);
    // let updateWithdrawDelayTx = await updateWithdrawDelay(govProxyObj);
  //  await updateWithdrawDelayTx.wait();
    // console.log("updateWithdrawDelay:", updateWithdrawDelayTx.hash);
    // await delay(3000);
    // return

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
              ],
              {
                initializer: 'initialize(address,address,address,address,uint32,address,address)'
              });
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
    await setLockingInfoTx.wait();
    console.log("updateLockingPoolLoggerAddress:", setLockingInfoTx.hash);
    await delay(3000);
  }

  // NFT transferOwnership
  const LockingNFTObj = await LockingNFT.attach(lockingNftAddress);
  let tx = await LockingNFTObj.transferOwnership(lockingPoolProxyAddress);
  await tx.wait();
  console.log("LockingNFT transferOwnership tx:", tx.hash);
  await delay(3000);
  
  console.log('writing contract addresses to file...')
  const contractAddresses = {
    contracts: {
      ProxyProxy: govProxyAddress,
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
    "function updateMinAmounts(uint256 _minLock)"
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

async function updateWithdrawDelay(govObj) {
  let ABI = [
    "function updateWithdrawDelayTimeValue(uint256 newWithdrawDelayTime) "
  ];
  let iface = new ethers.utils.Interface(ABI);
  let updateWithdrawDelayTimeValueData = iface.encodeFunctionData("updateWithdrawDelayTimeValue", [
    600,
  ])
  console.log("updateWithdrawDelayTimeValue: ", updateWithdrawDelayTimeValueData)

  return govObj.update(
    lockingPoolProxyAddress,
    updateWithdrawDelayTimeValueData
  )
}


async function updateMpc(govObj, newMpc) {
  let ABI = [
    "function updateMpc(address _newMpc)"
  ];
  let iface = new ethers.utils.Interface(ABI);
  let updateMpcData = iface.encodeFunctionData("updateMpc", [
    newMpc
  ])
  console.log("updateMpc: ", updateMpcData)

  return govObj.update(
    lockingPoolProxyAddress,
    updateMpcData
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
