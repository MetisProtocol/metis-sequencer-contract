const {
  ethers,
  upgrades
} = require("hardhat");

const web3 = require("web3");
const utils = require('./utils');
const IERC20_SOURCE = "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20";

// pubkey should not have the leading 04 prefix
let seqPub1 = "0xb21c89c5716dbc670f4cbc247a1af723bb810463e2b56625b7a00c43f2b34a4be1c00db627f8dbd02833d12a2b957e54b19398dcb730e805cd592d7c1c4006b3"
let seqAddr1 = "0xAa3d162b95596d36CB33Bcf1EF24759A23D9b032"

let seqPub2 = "0x932f98ef71534bb88efbb064f91605928034a38f62d7f47d17a81de084d05a9bbe52d0c75b585550654bae50827a9df97a701b015b7585e9ba4fe0447a35ecee"
let seqAddr2 = "0x46D0D6A056257ac88D809a6CF4F51202345eAC3f"

let seqPub3 = "0xb65fa94bef4cddacff69a54c3a370704fb286dc242a8a0245755896a73a5c5697a123ecf6469ca98cdf4a938f94c2754e0e9c310395ab8231ce3faffc54c92e6"
let seqAddr3 = "0x44323A0044Cf40F5E0B05c0f6af3C7A5bE7B0f3B"

const main = async () => {
  const accounts = await ethers.getSigners();
  signer = accounts[0].address;
  console.log("signer address:%s", signer);

  const contractAddresses = utils.getContractAddresses();
  console.log("contractAddresses:", contractAddresses)

  const LockingPool = await ethers.getContractFactory("LockingPool");
  const LockingPoolObj = await LockingPool.attach(contractAddresses.contracts.LockingPoolProxy);

  await lockFor(LockingPoolObj, seqAddr1, seqPub1, seqPri1, contractAddresses);
  await lockFor(LockingPoolObj, seqAddr2, seqPub2, seqPri2, contractAddresses);
  await lockFor(LockingPoolObj, seqAddr3, seqPub3, seqPri3, contractAddresses);
}

async function lockFor(LockingPoolObj, sequencerSigner, sequencerPubkey, sequencerPri, contractAddresses) {
   let setWitheAddressTx = await LockingPoolObj.setWhiteListAddress(sequencerSigner, true);
   await setWitheAddressTx.wait();
   console.log("setWitheAddress:", setWitheAddressTx.hash);

   const lockAmount = web3.utils.toWei('20000');
   console.log(`Locking ${lockAmount} for ${sequencerSigner}...`);

   console.log('locking now...')
  const testUser = new ethers.Wallet(sequencerPri, ethers.provider);

  const metisTokenObj = await ethers.getContractAt(IERC20_SOURCE, contractAddresses.contracts.tokens.L1MetisToken);
  console.log('Sender accounts has a balanceOf', (await metisTokenObj.balanceOf(sequencerSigner)).toString())

  const approveAmount = await metisTokenObj.connect(testUser).allowance(sequencerSigner, contractAddresses.contracts.LockingPoolProxy);
  if (approveAmount <= 0) {
    let approveTx = await metisTokenObj.connect(testUser).approve(contractAddresses.contracts.LockingPoolProxy, web3.utils.toWei('100000000000000000000000000000000'))
    console.log("approve tx:", approveTx.hash);
    await approveTx.wait();
  }

   let lockTx = await LockingPoolObj.connect(testUser).lockFor(sequencerSigner, lockAmount, sequencerPubkey);
   await lockTx.wait();
   console.log("lock tx ", lockTx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });