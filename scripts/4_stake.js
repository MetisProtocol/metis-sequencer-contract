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


// pubkey should not have the leading 04 prefix
let testPri1 = "0x1f9a552c0aad1f104401316375f0737bba5fba0b34a83b0069f2a02c57514a0c"
let testPub1 = "0xeeef8d4d35c9dc2d64df24af6bb4be3b08557a995b2907d97039c536f96477fecbd56bb78fdcde962ccaa579dcc75376e7839f6211cf62cea8b2871b84106674"
let addr1 = "0x70fb083ab9bc2ed3c4cebe08054e82827368ed1e"

let testPri2 = "0x87f4f773ff72685f05494c4d2f4b484d9ac958f9d010b9abda174e9ce1266e05"
let testPub2 = "0xde61a8a5e89510a7dcbcf9ec79aa4ae502341f001b53c0fdb08f4d16adff9c1848b7301f8f616a45a3aad950a68235e41a122fd8f213b1b7f98f661c91acefc2"
let addr2 = "0x57114948f79fa1c2be29b814ff19957c1fe8f64a"

let testPri3 = "0xa94c90ff67050eb2881287a24df98e3e20612e46531a783e66bf7410d68410fc"
let testPub3 = "0x46e8a59b9483fe4697bc2c966ec3365e17d7ab3c5073e0aadf10814f281fbe577ee9dcd53067196cce6503939651edd2458137dcd0e537806fae8827153df9f6"
let addr3 = "0xc1ada63f72fa305111455b5dbede8a42a7d2dc70"

const main = async () => {
  const accounts = await ethers.getSigners();
  signer = accounts[0].address;
  console.log("signer address:%s", signer);

  // 更新佣金比例
  await updateValidatorCommissionRate();
  return

  // // 授权
  // const metisToken = await ethers.getContractFactory("TestToken");
  // const metisTokenObj = await metisToken.attach(metisTokenAddress);
  // console.log('Sender accounts has a balanceOf', (await metisTokenObj.balanceOf(signer)).toString())
  // let approveTx = await metisTokenObj.approve(stakeManagerProxyAddress, web3.utils.toWei('1000000000000'))
  // console.log("approve tx:", approveTx.hash);
  // return 

  const validatorAccount = addr3;
  const pubkey = testPub3;

  // const validatorAccount = "0x53cC871454560f150839bc195A3727335e5fAfA4";
  // const pubkey = "0xf747f4dc85add58949a08feaff631a4d81f7fec402a1a9b1e0627584c76598c2e52027285cbd67d2a86866932115aaed4c787966712b84c4459e94fdd200f190";
  
  const stakeAmount = web3.utils.toWei('1000');
  console.log(`Staking ${stakeAmount} for ${validatorAccount}...`);

  console.log('staking now...')
  const stakeManager = await ethers.getContractFactory("StakeManager");
  const stakeManagerObj = await stakeManager.attach(stakeManagerProxyAddress);
  let stakeTx  = await stakeManagerObj.stakeFor(validatorAccount, stakeAmount, true, pubkey);
  console.log("stake tx ", stakeTx.hash);
}

async function updateValidatorCommissionRate() {
  const stakeManager = await ethers.getContractFactory("StakeManager");
  const stakeManagerObj = await stakeManager.attach(stakeManagerProxyAddress);
  let updateCommissionRateTx = await stakeManagerObj.updateCommissionRate(1, 10);
  console.log("updateCommissionRateTx tx ", updateCommissionRateTx.hash);
}

// async function mapToken(root, child, isErc721) {
//   const registry = await Registry.at(contracts.root.Registry)
//   console.log(await registry.rootToChildToken(root))
//   const governance = await Governance.at(contracts.root.GovernanceProxy)
//   await governance.update(
//     contracts.root.Registry,
//     registry.contract.methods.mapToken(root, child, isErc721).encodeABI()
//   )
//   console.log(await registry.rootToChildToken(root))
// }

// async function updateValidatorThreshold(number) {
//   const stakeManager = await getStakeManager()
//   console.log((await stakeManager.validatorThreshold()).toString())
//   const r = await stakeManager.updateValidatorThreshold(number)
//   console.log(r.tx)
//   console.log((await stakeManager.validatorThreshold()).toString())
// }

// async function updateCheckpointReward(reward) {
//   const stakeManager = await getStakeManager()
//   console.log((await stakeManager.CHECKPOINT_REWARD()).toString())
//   const r = await stakeManager.updateCheckpointReward(reward)
//   console.log(r.tx)
//   console.log((await stakeManager.CHECKPOINT_REWARD()).toString())
// }

// async function deposit() {
//   const amount = web3.utils.toWei(process.argv[6])
//   console.log(`Depositing ${amount}...`)
//   const testToken = await TestToken.at(contracts.root.tokens.TestToken)
//   let r = await testToken.approve(contracts.root.DepositManagerProxy, amount)
//   console.log('approved', r.tx)
//   const depositManager = await DepositManager.at(contracts.root.DepositManagerProxy)
//   r = await depositManager.depositERC20(contracts.root.tokens.TestToken, amount)
//   console.log('deposited', r.tx)
// }

// async function updateDynasty() {
//   const stakeManager = await getStakeManager()
//   let auctionPeriod = await stakeManager.auctionPeriod()
//   let dynasty = await stakeManager.dynasty()
//   console.log({ dynasty: dynasty.toString(), auctionPeriod: auctionPeriod.toString(), signerUpdateLimit: (await stakeManager.signerUpdateLimit()).toString() })

//   await stakeManager.updateSignerUpdateLimit(10)

//   await stakeManager.updateDynastyValue(888)
//   dynasty = await stakeManager.dynasty()
//   auctionPeriod = await stakeManager.auctionPeriod()
//   console.log({ dynasty: dynasty.toString(), auctionPeriod: auctionPeriod.toString() })

//   await stakeManager.stopAuctions('10000')
// }

// async function updateExitPeriod() {
//   const wm = await WithdrawManager.at(contracts.root.WithdrawManagerProxy)
//   let period = await wm.HALF_EXIT_PERIOD()
//   console.log({ period: period.toString()})

//   await wm.updateExitPeriod('5')

//   period = await wm.HALF_EXIT_PERIOD()
//   console.log({ period: period.toString()})
// }

// async function child() {
//   const mrc20 = await MRC20.at('0x0000000000000000000000000000000000001010')
//   console.log(await mrc20.owner())
// }

// async function updateImplementation() {
//   let stakeManager = await StakeManagerProxy.at(contracts.root.StakeManagerProxy)
//   // const drainContract = '0xF6Fc3a5f0D6389cD96727955c813069B1d47F358' // on goerli for Mumbai
//   const drainContract = '0x3025349b8BbBd3324aFe90c89157dBC567A7E5Ff' // on mainnet
//   stakeManager.updateImplementation(drainContract)
//   await delay(5)
//   stakeManager = await DrainStakeManager.at(contracts.root.StakeManagerProxy)
//   const governance = await Governance.at(contracts.root.GovernanceProxy)
//   await governance.update(
//     contracts.root.StakeManagerProxy,
//     stakeManager.contract.methods.drain(process.env.FROM, web3.utils.toWei('70277')).encodeABI()
//   )
// }

// async function setEpoch() {
//   let stakeManager = await StakeManager.at(contracts.root.StakeManagerProxy)
//   console.log((await stakeManager.currentEpoch()).toString())
//   await stakeManager.setCurrentEpoch('1507')
//   console.log((await stakeManager.currentEpoch()).toString())
// }

// async function stopAuctions() {
//   let stakeManager = await StakeManager.at(contracts.root.StakeManagerProxy)
//   await stakeManager.stopAuctions('10000')
// }

// async function updateNonce() {
//   let stakeInfo = await StakingInfo.at(contracts.root.StakingInfo)
//   await stakeInfo.updateNonce([1], [2])
// }

function delay(s) {
  return new Promise(resolve => setTimeout(resolve, s * 1000));
}




main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });