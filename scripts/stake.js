const {
  ethers,
  upgrades
} = require("hardhat");

const web3 = require("web3");

let govProxyAddress = "0x937aaFF6b2aDdD3593CaE0d135530f4EDD6e4b65";
let registryAddress = "0x9Ebe9b50C08617158267654F893f8859991fd806";
let validatorShareFactoryAddress = "0x40B09Cc3242076412837208A41503Fd4c51554C6";
let stakingInfoAddress = "0x934b77c79bCD81510de51e61da58bE29Bce91497";
let stakingNftAddress = "0x5DB6a3111ea98AE461A4097C71CED4c9ef415526";
let metisTokenAddress = "0xD331E3CA3e51d3dd6712541CB01d7100E24DAdD1";
let testTokenAddress = "0x384d2a29acBf54F375939D0Ea6FD85969a628D74";
let stakeManagerProxyAddress = "0xC3f4dD007F97197151711556110f48d4c772D734";
let stakeManagerExtensionAddress = "0x81955bcCA0f852C072c877D1CCA1eD1b14c0E5eB";
let slashingManagerAddress = "0x2B3a174C812f550B58CAD89A23345d3867e99367";
let eventHubProxyAddress = "0xF7Ee63689b05B062Ebd15327CD80Cf81cC133fd0";

const main = async () => {
  const accounts = await ethers.getSigners();
  signer = accounts[0].address;
  console.log("signer address:%s", signer);

  // const metisToken = await ethers.getContractFactory("TestToken");
  // const metisTokenObj = await metisToken.attach(metisTokenAddress);
  // console.log('Sender accounts has a balanceOf', (await metisTokenObj.balanceOf(signer)).toString())
  // let approveTx = await metisTokenObj.approve(stakeManagerProxyAddress, web3.utils.toWei('1000000000000'))
  // console.log("approve tx:", approveTx.hash);
  // return 

  const validatorAccount = signer;
  // const validatorAccount = "0x53cC871454560f150839bc195A3727335e5fAfA4";
  // pubkey should not have the leading 04 prefix
  // const pubkey = "0x04f747f4dc85add58949a08feaff631a4d81f7fec402a1a9b1e0627584c76598c2e52027285cbd67d2a86866932115aaed4c787966712b84c4459e94fdd200f190";
  // const pubkey = "0xf747f4dc85add58949a08feaff631a4d81f7fec402a1a9b1e0627584c76598c2e52027285cbd67d2a86866932115aaed4c787966712b84c4459e94fdd200f190";
  const pubkey = "0x2d905ff3831bb3e3bec873544cd8da2796b5a3a699f0e8dbe86e811322e77cfbaa8ea790e0af28a640f9efb5ba72afab13bbae9b5767d99e3d28a62ec02491bd";
  const stakeAmount = web3.utils.toWei(process.argv[8] || '1000');
  console.log(`Staking ${stakeAmount} for ${validatorAccount}...`);


  console.log('sent approve tx, staking now...')
  const stakeManager = await ethers.getContractFactory("StakeManager");
  const stakeManagerObj = await stakeManager.attach(stakeManagerProxyAddress);
  let stakeTx  = await stakeManagerObj.stakeFor(validatorAccount, stakeAmount, false, pubkey);
  console.log("stake tx ", stakeTx.hash);
}

// async function topUpForFee() {
//   const stakeFor = process.argv[6]
//   const amount = web3.utils.toWei(process.argv[7])
//   const stakeManager = await getStakeManager()

//   const rootToken = await RootToken.at(contracts.root.tokens.TestToken)
//   await rootToken.approve(stakeManager.address, amount)
//   console.log('approved, staking now...')

//   const validatorId = await stakeManager.signerToValidator(stakeFor)
//   console.log(validatorId.toString())
//   let r = await stakeManager.topUpForFee(validatorId.toString(), amount)
//   console.log(r.tx)
// }

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