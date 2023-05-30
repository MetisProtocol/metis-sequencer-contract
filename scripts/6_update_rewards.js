const {
    ethers,
    upgrades
} = require("hardhat");

const web3 = require("web3");

const utils = require('./utils');


const main = async () => {
    const accounts = await ethers.getSigners();
    let signer = accounts[0].address;
    console.log("tx sender:",signer);

      const contractAddresses = utils.getContractAddresses();
      console.log("contractAddresses:", contractAddresses)


    const stakeManager = await ethers.getContractFactory("StakeManager");
    const smObj = await stakeManager.attach(contractAddresses.contracts.StakingManagerProxy);

    const tx = await smObj.batchSubmitRewards(
        signer,
        ["0x57114948F79fa1c2BE29B814Ff19957C1FE8f64a"],
        [100]
        // [web3.utils.toWei('200')],
    )
    console.log("batchSubmitRewards :", tx.hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });