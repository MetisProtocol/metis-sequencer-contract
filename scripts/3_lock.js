const {
  ethers,
  upgrades
} = require("hardhat");

const web3 = require("web3");
const utils = require('./utils');
const IERC20_SOURCE = "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20";

// params for goerli
// pubkey should not have the leading 04 prefix
let seqPub1 = "0xfaeda3a3e5dafb79153a9a72b8275292237fdb6f89c037bffd6682187ce56b7778f815c5794a457cb35484242fba8cbbed3eefa6f795a7e307830a5af52063bc"
let seqAddr1 = "0xD3011EaF0050FC6D474DF2e598461080D787e343"

let seqPub2 = "0xa569db9d2cf0ef29eb95c34dd069d14d9b3776b18d792312ce7f02d0c57da22f04fd4331719a2dd3f51c7873b5842bd1a5558654609a3f5e8294a50fe3c7d4d3"
let seqAddr2 = "0x0e57211BEc9b113d592Dd1072C2E008dd32e8203"

let seqPub3 = "0x9599fbdebeb91bdffd00d00dc2f5b21c731100169814a9220b3c16a8d87f6f8a115014cf1047f5d9266efa709b7412d62328555e46508b0dafb3c3d9d5556129"
let seqAddr3 = "0x108fe339187108042871cC918F708b2C97059a32"

let seqPub4 = "0x6681d9a6a882431be77aeeaabf155ca5343c62211834303e7b4892c78ebb0454c674f978ef74e3355a3a31167d0479d31a5b3991c1003fbb26420aa5c0f4ddd8"
let seqAddr4 = "0x79F08238ADA534EEfd4C4D726ad00865d79F05E3"

let seqPub5 = "0x3640bb1ee74ba2ccf479bf7282c566a4298c39a05e639b5c7304fd2da758e0727c737f9c3fe7dee207a2b4085bc7d8d008a84beaed6cdaef662152a9ca5ebf16"
let seqAddr5 = "0x6eec40d64Fe44c1d40c96AC6A40A130330AC9819"

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
    let approveTx = await metisTokenObj.approve(contractAddresses.contracts.LockingPoolProxy, web3.utils.toWei('100000000000000000000000000000000'))
    console.log("approve tx:", approveTx.hash);
    await approveTx.wait();
  }

  const gov = await hre.ethers.getContractFactory("Proxy");
  const govProxyObj = await gov.attach(contractAddresses.contracts.GovProxy);

  // await lockFor(govProxyObj, LockingPoolObj, contractAddresses, seqAddr1, seqPub1);
  // await lockFor(govProxyObj, LockingPoolObj, contractAddresses, seqAddr2, seqPub2);
  await lockFor(govProxyObj, LockingPoolObj, contractAddresses, seqAddr3, seqPub3);
  await lockFor(govProxyObj, LockingPoolObj, contractAddresses, seqAddr4, seqPub4);
  // await lockFor(govProxyObj, LockingPoolObj, contractAddresses, seqAddr5, seqPub5);

  //  console.log('relocking now...')
  //  let reLockTx = await LockingPoolObj.relock(1, lockAmount, true);
  // await reLockTx.wait();
  //  console.log("reLock tx ", reLockTx.hash);
}

async function lockFor(govProxyObj, LockingPoolObj, contractAddresses, sequencerSigner, sequencerPubkey) {
   let setWitheAddressTx = await setWitheAddress(govProxyObj, contractAddresses.contracts.LockingPoolProxy, sequencerSigner);
   await setWitheAddressTx.wait();
   console.log("setWitheAddress:", setWitheAddressTx.hash);

   const lockAmount = web3.utils.toWei('20000');
   console.log(`Locking ${lockAmount} for ${sequencerSigner}...`);

   console.log('locking now...')
   let lockTx = await LockingPoolObj.lockFor(sequencerSigner, lockAmount, sequencerPubkey);
   await lockTx.wait();
   console.log("lock tx ", lockTx.hash);
}

async function setWitheAddress(govObj, lockingPoolProxyAddress,user) {
  let ABI = [
    "function setWhiteListAddress(address user, bool verified)"
  ];
  let iface = new ethers.utils.Interface(ABI);
  let setWhiteAddressEncodeData = iface.encodeFunctionData("setWhiteListAddress", [
    user,true
  ])
  console.log("setWitheAddress: ", setWhiteAddressEncodeData)

  return govObj.update(
    lockingPoolProxyAddress,
    setWhiteAddressEncodeData
  )
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