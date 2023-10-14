const {
  ethers,
  upgrades
} = require("hardhat");

const web3 = require("web3");
const utils = require('./utils');
const IERC20_SOURCE = "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20";

// params for goerli
// pubkey should not have the leading 04 prefix
let seqPub1 = "0xb548c2a036db2b5cdeb9501ff6c73e4653b691e3365e345bdddeb20145fa2f50f8a527550211b4b0664127a36f370d91c2adc33b14423327097f411c4c68ee96"
let seqAddr1 = "0x1267397fb5BF6f6Dcc3d18d673616D512dbcd8F0"

let seqPub2 = "0xa95fde90a1a2ff755ed81ecf8f9a4761ca2e2e1bd017ba202f6d4e222d591f9b8a98718dab19521c6594eeb41ed2707a3e3861cbf5f730de80281cbcf846f3b5"
let seqAddr2 = "0x432e8fB4C4BD8Ce19DC8c05d6915Ab68C336B147"

let seqPub3 = "0x94f65bb41bffc7a86abbbe21a9edc68f2fa005f5c366ae130cbca779173e0f46644936d4bd56949d627320e8b66a8ed084d178d4b494172e3a5d8d33855dbde3"
let seqAddr3 = "0xFe08EE83B1f01d6d7C6eff3c8C84FA6Fe02fca17"

let seqPub4 = "0x9ecfdc9f63b7ff3f1771ef1003c2f74f381a3fc210f04f66a81eba56abd2e51a12c63c559c44233332b691eb733c26ad0aea8edd5afd4ba0b8b701988327a882"
let seqAddr4 = "0x3EB630c3c267395fEE216b603A02061330d39642"

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
    await approveTx.wait();
  }

  const gov = await hre.ethers.getContractFactory("Proxy");
  const govProxyObj = await gov.attach(contractAddresses.contracts.GovProxy);

  await lockFor(govProxyObj, LockingPoolObj, contractAddresses, seqAddr1, seqPub1);
  await lockFor(govProxyObj, LockingPoolObj, contractAddresses, seqAddr2, seqPub2);
  await lockFor(govProxyObj, LockingPoolObj, contractAddresses, seqAddr3, seqPub3);
  await lockFor(govProxyObj, LockingPoolObj, contractAddresses, seqAddr4, seqPub4);

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