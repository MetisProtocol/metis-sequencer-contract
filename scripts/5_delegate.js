const {
    ethers,
    upgrades
} = require("hardhat");

const web3 = require("web3");
const utils = require('./utils');


const main = async () => {
    //  const validatorShare = await ethers.getContractFactory("ValidatorShare");
    //  const vsObj = await validatorShare.attach("0xeBA5018b7271aFf358543524A942393465A5f0c2");
    //  console.log('validatorId: ', await vsObj.validatorId())
    //   console.log('stakeManager: ', await vsObj.stakeManager())
    //  let approveTx = await metisTokenObj.approve(stakeManagerProxyAddress, web3.utils.toWei('1000000000000'))
    //  console.log("approve tx:", approveTx.hash);
    //  return 

    await delegate(3);
}

async function delegate(validatorId) {
    const accounts = await ethers.getSigners();
    signer = accounts[0].address;
    console.log("signer address:%s", signer);

    const contractAddresses = utils.getContractAddresses();
    console.log("contractAddresses:", contractAddresses);

    const amount = web3.utils.toWei('1000');
    console.log(`Delegating ${amount} for ${validatorId}...`);

    //  const metisToken = await ethers.getContractFactory("TestToken");
    //  const metisTokenObj = await metisToken.attach(contractAddresses.contracts.tokens.MetisToken);
    //  console.log('Sender accounts has a balanceOf', (await metisTokenObj.balanceOf(signer)).toString())
    //  let approveTx = await metisTokenObj.approve(contractAddresses.contracts.StakingManagerProxy, web3.utils.toWei('1000000000000'))
    //  console.log("approve tx:", approveTx.hash);

    const stakeManager = await ethers.getContractFactory("StakeManager");
    const smObj = await stakeManager.attach(contractAddresses.contracts.StakingManagerProxy);
    const _validator = await smObj.validators(validatorId)

    const validatorShare = await ethers.getContractFactory("ValidatorShare");
    const vsObj = await validatorShare.attach(_validator.contractAddress);
    console.log("validatorShare proxy:", _validator.contractAddress)

    // view methods
    // let exchangeRate = await vsObj.exchangeRate();
    // console.log("exchangeRate :", exchangeRate);

    // let getTotalStake = await vsObj.getTotalStake(signer);
    // console.log("getTotalStake :", getTotalStake[0]);
    // console.log("rate :", getTotalStake[1]);

    // let withdrawExchangeRate = await vsObj.withdrawExchangeRate();
    // console.log("withdrawExchangeRate :", withdrawExchangeRate);

    // let getRewardPerShare = await vsObj.getRewardPerShare();
    // console.log("getRewardPerShare :", getRewardPerShare);

    // buy 
    // let result = await vsObj.buyVoucher(web3.utils.toWei('100'), web3.utils.toWei('1'));
    // console.log(`buyVoucher from ${validatorId}: ${result.hash}`);

    // withdrawReward
    // let result = await vsObj.withdrawRewards();
    // console.log("withdrawRewards :", result.hash);

    // sell
     let getTotalStake = await vsObj.getTotalStake(signer);
     let totalStake = getTotalStake[0];
     let rate = getTotalStake[1];
     console.log("getTotalStake :", web3.utils.fromWei(totalStake.toString(), 'ether'));
     console.log("rate :", rate);

    let claimAmount = web3.utils.toWei('100');
    let shares = claimAmount * 100 / (rate);

    console.log("shares :", web3.utils.fromWei(shares.toString(), 'ether'));
    // return
    //    require(shares <= maximumSharesToBurn, "too much slippage");

    let result = await vsObj.sellVoucher(claimAmount, web3.utils.toWei('100'))
    console.log(`UnBond from ${validatorId}: ${result.hash}`)

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });