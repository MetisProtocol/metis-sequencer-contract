const {
    ethers,
    upgrades
} = require("hardhat");

const web3 = require("web3");

let govProxyAddress = "0x937aaFF6b2aDdD3593CaE0d135530f4EDD6e4b65";
let registryAddress = "0x9Ebe9b50C08617158267654F893f8859991fd806";
let validatorShareFactoryAddress = "0xa7cdd83CE970FfF8Eb4452824663049d7c447813";
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
let testTokenName = "Test ERC20";
let testTokenSymbol = "TST20";

const main = async () => {
    //  const validatorShare = await ethers.getContractFactory("ValidatorShare");
    //  const vsObj = await validatorShare.attach("0xeBA5018b7271aFf358543524A942393465A5f0c2");
    //  console.log('validatorId: ', await vsObj.validatorId())
    //   console.log('stakeManager: ', await vsObj.stakeManager())
    //  let approveTx = await metisTokenObj.approve(stakeManagerProxyAddress, web3.utils.toWei('1000000000000'))
    //  console.log("approve tx:", approveTx.hash);
    //  return 

   


    await delegate(4);
}

async function delegate(validatorId) {
    const accounts = await ethers.getSigners();
    const amount = web3.utils.toWei('1000')
    console.log(`Delegating ${amount} for ${validatorId}...`)

    //  const metisToken = await ethers.getContractFactory("TestToken");
    //  const metisTokenObj = await metisToken.attach(metisTokenAddress);
    //  console.log('Sender accounts has a balanceOf', (await metisTokenObj.balanceOf(accounts[0])).toString())
    //  let approveTx = await metisTokenObj.approve(stakeManagerProxyAddress, web3.utils.toWei('1000000000000'))
    //  console.log("approve tx:", approveTx.hash);

    const stakeManager = await ethers.getContractFactory("StakeManager");
    const smObj = await stakeManager.attach(stakeManagerProxyAddress);
    const _validator = await smObj.validators(validatorId)

    const validatorShare = await ethers.getContractFactory("ValidatorShare");
    const vsObj = await validatorShare.attach(_validator.contractAddress);

    // view methods
    let exchangeRate = await vsObj.exchangeRate();
    console.log("exchangeRate :", exchangeRate);

    let getTotalStake = await vsObj.getTotalStake();
    console.log("getTotalStake :", getTotalStake);

    let withdrawExchangeRate = await vsObj.withdrawExchangeRate();
    console.log("withdrawExchangeRate :", withdrawExchangeRate);

    let getRewardPerShare = await vsObj.getRewardPerShare();
    console.log("getRewardPerShare :", getRewardPerShare);


    let result = await vsObj.sellVoucher(web3.utils.toWei('1'), web3.utils.toWei('10'))
    console.log(`UnBond from ${validatorId}: ${result.hash}`)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });