const {
  ethers,
  upgrades
} = require("hardhat");

const web3 = require("web3");
const utils = require('./utils');
const IERC20_SOURCE = "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20";

// params for goerli
// pubkey should not have the leading 04 prefix
let testPri1 = "0xed3f195449409dc1d22f0119da7678200710a447ff75baa06bfc42829d02d28c"
let testPub1 = "0xb548c2a036db2b5cdeb9501ff6c73e4653b691e3365e345bdddeb20145fa2f50f8a527550211b4b0664127a36f370d91c2adc33b14423327097f411c4c68ee96"
let addr1 = "0x1267397FB5BF6F6DCC3D18D673616D512DBCD8F0"

let testPri2 = "0x87f4f773ff72685f05494c4d2f4b484d9ac958f9d010b9abda174e9ce1266e05"
let testPub2 = "0xde61a8a5e89510a7dcbcf9ec79aa4ae502341f001b53c0fdb08f4d16adff9c1848b7301f8f616a45a3aad950a68235e41a122fd8f213b1b7f98f661c91acefc2"
let addr2 = "0x57114948f79fa1c2be29b814ff19957c1fe8f64a"

let testPri4 = "0x35adc09de5c4ba56e824695ab03be7d5d91cead985a685d3ca44920e69d391ca"
let testPub4 = "0x51b5cfe5551bafd4039d7804bb660194f386ae6e171f90ce96be77870fc8f3dcca5a7ddfd9fd897f27999a443d2066e90281eb1f6915b41478103527884a4be7"
let addr4 = "0x1cc73d42a0a081F442daDf40B89A8A86ECc69b55"

let signerPubkey = "0x2d905ff3831bb3e3bec873544cd8da2796b5a3a699f0e8dbe86e811322e77cfbaa8ea790e0af28a640f9efb5ba72afab13bbae9b5767d99e3d28a62ec02491bd"

const main = async () => {
  const accounts = await ethers.getSigners();
  signer = accounts[0].address;
  console.log("signer address:%s", signer);

  const contractAddresses = utils.getContractAddresses();
  console.log("contractAddresses:", contractAddresses)

  const LockingPool = await ethers.getContractFactory("LockingPool");
  const LockingPoolObj = await LockingPool.attach(contractAddresses.contracts.LockingPoolProxy);

  const metisTokenObj = await ethers.getContractAt(IERC20_SOURCE, contractAddresses.contracts.tokens.L1MetisToken);
  console.log('Sender accounts has a balanceOf', (await metisTokenObj.balanceOf(signer)).toString())

  const approveAmount = await metisTokenObj.allowance(signer, contractAddresses.contracts.LockingPoolProxy);
  console.log("approveAmount: ", approveAmount);
  if (approveAmount <= 0) {
    let approveTx = await metisTokenObj.approve(contractAddresses.contracts.LockingPoolProxy, web3.utils.toWei('1000000000000'))
    console.log("approve tx:", approveTx.hash);
    delay(3);
  }

  // lock params
  // const sequencerSigner = signer;
  // const pubkey = signerPubkey;

   const sequencerSigner = addr4;
   const pubkey = testPub4;

  const lockAmount = web3.utils.toWei('2');
  console.log(`Locking ${lockAmount} for ${sequencerSigner}...`);

  console.log('locking now...')
  let lockTx = await LockingPoolObj.lockFor(sequencerSigner, lockAmount, pubkey);
  console.log("lock tx ", lockTx.hash);

  //  console.log('relocking now...')
  //  let reLockTx = await LockingPoolObj.relock(1, lockAmount, true);
  //  console.log("reLock tx ", reLockTx.hash);
}

function delay(s) {
  return new Promise(resolve => setTimeout(resolve, s * 1000));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });