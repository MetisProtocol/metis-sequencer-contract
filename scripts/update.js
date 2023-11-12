 const {
     ethers
 } = require("hardhat");

 const web3 = require("web3");
 const utils = require('./utils');
 let lockingPoolAddress;

 const main = async () => {
     const accounts = await ethers.getSigners();
     let signer = accounts[0];
     console.log("tx sender:", signer.address);

     const contractAddresses = utils.getContractAddresses();
     console.log("contractAddresses:", contractAddresses);
     lockingPoolAddress = contractAddresses.contracts.LockingPoolProxy;
     console.log("lockingPoolAddress address:", lockingPoolAddress);


     const govProxyObj = await hre.ethers.getContractAt("Proxy", contractAddresses.contracts.GovProxy);
     console.log("govProxyObj address:", govProxyObj.address);

    //  let updateMinLockTx = await updateMinLock(govProxyObj);
    //  await updateMinLockTx.wait();
    //  console.log("updateMinLockTx:", updateMinLockTx.hash);

    // //  updateMpc
    //  let updateMpcTx = await updateMpc(govProxyObj, "0x563870eA4f826f1460C8Ce2800ed275f07B234E4");
    //   await updateMpcTx.wait();
    //  console.log("updateMpcTx:", updateMpcTx.hash);
    //  await delay(3000);

    // //  updateMinLock
    //  let updateWithdrawDelayTx = await updateWithdrawDelay(govProxyObj);
    //   await updateWithdrawDelayTx.wait();
    //  console.log("updateWithdrawDelay:", updateWithdrawDelayTx.hash);
    //  await delay(3000);

     // update blockReward amount
    let newBlockAmount = ethers.utils.parseEther('0.006341958');
    let updateBlockRewardAmountTx = await updateBlockRewardAmount(govProxyObj, newBlockAmount);
    console.log("updateBlockRewardAmount:", updateBlockRewardAmountTx.hash);
    await updateBlockRewardAmountTx.wait();
 }

 async function updateRewardByGov(govObj, params) {
     let signature = await calcSignature(params);
     console.log("signature:", signature);

     let ABI = [
         "function batchSubmitRewards(uint256 batchId,address payeer,uint256 startEpoch,uint256 endEpoch,address[] memory sequencers,uint256[] memory finishedBlocks,bytes memory signature)"
     ];
     let iface = new ethers.utils.Interface(ABI);
     let updateRewardData = iface.encodeFunctionData("batchSubmitRewards", [
         params.batchId,
         params.signer.address,
         params.startEpoch,
         params.endEpoch,
         params.sequencers,
         params.finishedBlocks,
         signature,
     ])
     console.log("updateRewardByGov: ", updateRewardData)

     return govObj.update(
         params.lockingPool,
         updateRewardData
     )
 }

 async function calcSignature(params) {
     let message = ethers.utils.solidityPack(["uint256", "uint256", "uint256", "address[]", "uint256[]", "address"], [
         params.batchId,
         params.startEpoch,
         params.endEpoch,
         params.sequencers,
         params.finishedBlocks,
         params.lockingPool
     ])
     console.log("message:", message);

     const messageHash = ethers.utils.solidityKeccak256(["bytes"], [message]);
     console.log("messageHash:", messageHash);

     const messageHashBinary = ethers.utils.arrayify(messageHash);
     console.log("messageHashBinary:", messageHashBinary);

     // sign
     let signature = await params.signer.signMessage(messageHashBinary);
     console.log("signature:", signature);
     return signature;
 }

 async function updateMinLock(govObj) {
     let ABI = [
         "function updateMinAmounts(uint256 _minLock)"
     ];
     let iface = new ethers.utils.Interface(ABI);
     let updateMinAmountsData = iface.encodeFunctionData("updateMinAmounts", [
         web3.utils.toWei('2'),
     ])
     console.log("updateMinAmounts: ", updateMinAmountsData)

     return govObj.update(
         lockingPoolAddress,
         updateMinAmountsData
     )
 }

 async function updateWithdrawDelay(govObj) {
     let ABI = [
         "function updateWithdrawDelayTimeValue(uint256 newWithdrawDelayTime) "
     ];
     let iface = new ethers.utils.Interface(ABI);
     let updateWithdrawDelayTimeValueData = iface.encodeFunctionData("updateWithdrawDelayTimeValue", [
         600,
     ])
     console.log("updateWithdrawDelayTimeValue: ", updateWithdrawDelayTimeValueData)

     return govObj.update(
         lockingPoolAddress,
         updateWithdrawDelayTimeValueData
     )
 }

 async function updateMpc(govObj, newMpc) {
     let ABI = [
         "function updateMpc(address _newMpc)"
     ];
     let iface = new ethers.utils.Interface(ABI);
     let updateMpcData = iface.encodeFunctionData("updateMpc", [
         newMpc
     ])
     console.log("updateMpc: ", updateMpcData)

     return govObj.update(
         lockingPoolAddress,
         updateMpcData
     )
 }

  async function updateBlockRewardAmount(govObj, newBlockReward) {
      let ABI = [
          "function updateBlockReward(uint256 newReward)"
      ];
      let iface = new ethers.utils.Interface(ABI);
      let newBlockRewardData = iface.encodeFunctionData("updateBlockReward", [
          newBlockReward
      ])
      console.log("newBlockReward: ", newBlockRewardData)

      return govObj.update(
          lockingPoolAddress,
          newBlockRewardData
      )
  }

 main()
     .then(() => process.exit(0))
     .catch((error) => {
         console.error(error);
         process.exit(1);
     });
 
 
 