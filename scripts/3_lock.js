const {
  ethers,
  upgrades
} = require("hardhat");

const web3 = require("web3");
const utils = require('./utils');
const IERC20_SOURCE = "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20";

// params for goerli
// pubkey should not have the leading 04 prefix
let testPri1 = "0x1f9a552c0aad1f104401316375f0737bba5fba0b34a83b0069f2a02c57514a0c"
let testPub1 = "0xeeef8d4d35c9dc2d64df24af6bb4be3b08557a995b2907d97039c536f96477fecbd56bb78fdcde962ccaa579dcc75376e7839f6211cf62cea8b2871b84106674"
let addr1 = "0x70fb083ab9bc2ed3c4cebe08054e82827368ed1e"

let testPri2 = "0x87f4f773ff72685f05494c4d2f4b484d9ac958f9d010b9abda174e9ce1266e05"
let testPub2 = "0xde61a8a5e89510a7dcbcf9ec79aa4ae502341f001b53c0fdb08f4d16adff9c1848b7301f8f616a45a3aad950a68235e41a122fd8f213b1b7f98f661c91acefc2"
let addr2 = "0x57114948f79fa1c2be29b814ff19957c1fe8f64a"

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
  const sequencerSigner = signer;
  const pubkey = signerPubkey;

  const lockAmount = web3.utils.toWei('2');
  console.log(`Staking ${lockAmount} for ${sequencerSigner}...`);

  console.log('staking now...')
  let lockTx = await LockingPoolObj.lockFor(sequencerSigner, lockAmount, pubkey);
  console.log("lock tx ", lockTx.hash);

  //  console.log('restaking now...')
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