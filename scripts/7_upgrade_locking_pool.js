const {
    ethers,
    upgrades
} = require("hardhat");
require("@nomiclabs/hardhat-etherscan");
const utils = require('./utils');
const {
    zeroAddress
} = require("ethereumjs-util");
const web3 = require("web3");

const main = async () => {
    const accounts = await hre.ethers.getSigners();
    signer = accounts[0].address;
    console.log("signer address:%s", signer, new Date().toTimeString());

    console.log('upgrade contracts...');
    
    const contractAddresses = utils.getContractAddresses();
    console.log("contractAddresses:", contractAddresses);

    const lockingPoolUpgrade = await hre.ethers.getContractFactory("LockingPool");
    let upgrade = await upgrades.upgradeProxy(contractAddresses.contracts.LockingPoolProxy, lockingPoolUpgrade);
    console.log("LockingPool upgrade to:", upgrade.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
