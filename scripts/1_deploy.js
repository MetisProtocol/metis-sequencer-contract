const { ethers, upgrades } = require("hardhat");
require("@nomiclabs/hardhat-etherscan");
const utils = require('./utils');
const { zeroAddress } = require("ethereumjs-util");
const web3 = require("web3");

const l1MetisToken = "0x7f49160EB9BB068101d445fe77E17ecDb37D0B47";
const l2MetisToken = "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000"
const l1BridgeAddress = "0xCB22CC16329e3D7A9cAf46Dbc0Aa0a5f6D0341c2";
const l2Gas = 200000;

let lockingNftName = "Metis Sequencer";
let lockingNftSymbol = "MS";

const main = async () => {
  const accounts = await hre.ethers.getSigners();
  signer = accounts[0].address;
  console.log("signer address:%s", signer, new Date().toTimeString());

  console.log('deploying contracts...');

  // deploy locking nft
  const LockingNFT = await hre.ethers.getContractFactory("LockingNFT");
  let lockingNFTDeployed = await LockingNFT.deploy(lockingNftName, lockingNftSymbol);
  console.log("LockingNFT deployed to:", lockingNFTDeployed.address);
  await delay(3000);

  let mpcAddress = signer;
  // deploy locking and proxy
  const LockingPool = await hre.ethers.getContractFactory("LockingPool");
  const lockingPoolProxy = await upgrades.deployProxy(LockingPool,
            [
              l1BridgeAddress,
              l1MetisToken,
              l2MetisToken,
              l2Gas,
              lockingNFTDeployed.address,
              mpcAddress
            ],
            {
              initializer: 'initialize(address,address,address,uint32,address,address)'
            });
  await lockingPoolProxy.deployed();
  console.log("LockingPool deployed to:", lockingPoolProxy.address);
  await delay(3000);

  // const lockingPoolUpgrade = await hre.ethers.getContractFactory("LockingPool");
  // let upgrade = await upgrades.upgradeProxy(lockingPoolProxy.address, lockingPoolUpgrade);
  // console.log("LockingPool deployed to:", upgrade.address);
  // return

  //  deploy locking info
  const LockingInfo = await hre.ethers.getContractFactory("LockingInfo");
  let lockingInfoDeployed = await LockingInfo.deploy(lockingPoolProxy.address);
  console.log("LockingInfo deployed to:", lockingInfoDeployed.address);
  await delay(3000);

  // set locking pool logger address
  const lockingPoolObj = LockingPool.attach(lockingPoolProxy.address);
  let loggerAddress = await lockingPoolObj.logger();
  console.log("LockingPool logger address:", loggerAddress, "zeroAddress", zeroAddress());
  
  if (loggerAddress == zeroAddress()){
    let setLockingInfoTx =  await lockingPoolObj.updateLockingInfo(lockingInfoDeployed.address);
    await setLockingInfoTx.wait();
    console.log("updateLockingPoolLoggerAddress:", setLockingInfoTx.hash);
    await delay(3000);
  }

  // NFT transferOwnership
  const LockingNFTObj = await LockingNFT.attach(lockingNFTDeployed.address);
  let tx = await LockingNFTObj.transferOwnership(lockingPoolProxy.address);
  await tx.wait();
  console.log("LockingNFT transferOwnership tx:", tx.hash);
  await delay(3000);
  
  console.log('writing contract addresses to file...')
  const contractAddresses = {
    contracts: {
      LockingPoolProxy: lockingPoolProxy.address,
      LockingInfo: lockingInfoDeployed.address,
      LockingNFT: lockingNFTDeployed.address,
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
