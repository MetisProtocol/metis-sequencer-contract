const {ethers} = require("hardhat");
const {expect} = require('chai');
const web3 = require("web3");
const {time,mineUpTo,reset} = require("@nomicfoundation/hardhat-network-helpers");
const INITIALIZED_AMOUNT = 1;

describe('LockingPoolTest', async () => {
    let wallets;
    let gov;
    let lockingPool;
    let lockingNFT;
    let l1MetisToken;
    let admin;
    let mpc;
    let testERC20;

    let testUserPub = "0xeeef8d4d35c9dc2d64df24af6bb4be3b08557a995b2907d97039c536f96477fecbd56bb78fdcde962ccaa579dcc75376e7839f6211cf62cea8b2871b84106674";
    let testUserAddress = "0x70fB083ab9bC2ED3C4CeBE08054e82827368ed1E";
    let testUserPri = "0x1f9a552c0aad1f104401316375f0737bba5fba0b34a83b0069f2a02c57514a0c"

    let testUser2Pub = "0x1ceee1fb393241b8347ae0f1783924303bd0be6efcc3b38b2d1190b48ee746a4d7da834a7af5f6431456f31ada49eff5485c16c655e7a8dd148f73d796d057a8";
    let testUser2Address = "0x36675727a189e156570edb68f8075bf7b699127a";
    let testUser2Pri = "0x9958b983b4b9d9b2a4e44da155c2b83e34e3167bd8759fc47c333e66aab31651"

    let testUser3Pub = "0xc840b67802e9b65413ff5bf264d69aef1d06169252bf5878cc3b64b0066a648fc93722b977792aebb3b2138b85b9e53696e5a357939623e9e60e65bf891a3f49";
    let testUser3Address = "0xbed1010c3920448edc377cad7389306b6b61ebba";
    let testUser3Pri = "0x06bf12da83c8c6d76e9daac6d405756b8d8c4d9fc901299488fa86b95ecd4991"

    let testUser4Pub = "0x04faef4197c8617a0a32863c345e92a7c93a31a45f62f24f419c8bf52bdd9f7b023802a11a467e582c3952558696e1a0a594ef54d8a5910c57d6889f986c8d30";
    let testUser4Address = "0x1ba02e8b7acefd56700c4bd324bf01f56dd613e5";
    let testUser4Pri = "0x39620a5d4feef6d337c79dc1e9a500c84c50b8c2d90b80a5dec6282099587cb5"

    let testUser5Pub = "0x42adad65660d1690d935bff0861bd40a328c7ee6e557be0c4a15a3963360f8bfcc7d41447d1262f5703df87b0ba8671714d1c67eaa72db23b8d419e25a8563a1";
    let testUser5Address = "0xd4a1db298a100d1159fcbf5b8e0bf6a0795b1fba";
    let testUser5Pri = "0xd63d7585bcec935e47b6f8c4b537025eb226bdbf46805b0fd685b95a3996cbf7"

    before('get wallets', async () => {
        wallets = await ethers.getSigners();
        admin = wallets[0];
        mpc = admin.address;
    })

    beforeEach('create contracts', async () => {
        const mintAmount = web3.utils.toWei('10000000');
        // deploy test ERC20
        const TestERC20 = await ethers.getContractFactory('TestERC20');
        testERC20 = await TestERC20.connect(admin).deploy(mintAmount);
        l1MetisToken = testERC20.address;
        // console.log("l1MetisToken:", l1MetisToken);

        // deploy gov
        const Governance = await ethers.getContractFactory('Governance');
        gov = await Governance.deploy();
        await gov.initialize();
        // console.log("gov:", gov.address);

        // deploy NFT
        const LockingNFT = await ethers.getContractFactory('LockingNFTTest');
        lockingNFT = await LockingNFT.deploy();
        // console.log("lockingNFT:", lockingNFT.address);

        // console.log("mpc:", mpc);
        // deploy Locking Pool
        const LockingPool = await ethers.getContractFactory('LockingPoolTest');
        lockingPool = await LockingPool.deploy(
                gov.address,
                l1MetisToken,
                lockingNFT.address,
                mpc
            );
        // console.log("lockingPool:", lockingPool.address);

        // transfer NFT owner
        await lockingNFT.transferOwnership(lockingPool.address);

        // deploy Locking info
        const LockingInfoTest = await ethers.getContractFactory('LockingInfoTest');
        lockingInfo = await LockingInfoTest.deploy(lockingPool.address);
        // console.log("lockingPool:", lockingPool.address);

        // set logger address
        await updateLockingPoolLoggerAddress(gov, lockingInfo.address, lockingPool.address);

        // console.log("admin:", admin.address);

        // token approve
        await testERC20.connect(admin).approve(lockingPool.address, ethers.constants.MaxUint256);

        // transfer ether to test user
        await admin.sendTransaction({
            to: testUserAddress,
            value: ethers.utils.parseEther("10.0"), // Sends exactly 10.0 ether
        });
        await admin.sendTransaction({
            to: testUser2Address,
            value: ethers.utils.parseEther("10.0"), // Sends exactly 10.0 ether
        });
        await admin.sendTransaction({
            to: testUser3Address,
            value: ethers.utils.parseEther("10.0"), // Sends exactly 10.0 ether
        });
        await admin.sendTransaction({
            to: testUser4Address,
            value: ethers.utils.parseEther("10.0"), // Sends exactly 10.0 ether
        });

        // testUser approve
        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        await testERC20.connect(testUser).approve(lockingPool.address, ethers.constants.MaxUint256);
        await testERC20.transfer(testUserAddress, web3.utils.toWei('100000'));
    })

    it('lock for sequencer', async () => {
        // console.log("lockingPool:", lockingPool.address);
        const lockAmount = web3.utils.toWei('2');
        // console.log("lockAmount:", lockAmount);

         // lock token
         let lockToken = await lockingPool.token();
         expect(lockToken).to.eq(l1MetisToken);

         // lock for
        await lockingPool.connect(admin).lockFor(testUserAddress, lockAmount, testUserPub);
        let nftCounter = await lockingPool.NFTCounter();
        expect(nftCounter).to.eq(2);

        // nft owner
        let nftOwner = await lockingPool.ownerOf(nftCounter-1);
        expect(nftOwner).to.eq(testUserAddress);

        // sequencer lock amount
        let seqLockAmount =  await lockingPool.sequencerLock(nftCounter-1);
        expect(seqLockAmount).to.eq(lockAmount);

        // sequencer currentSequencerSetSize
        let currentSequencerSetSize = await lockingPool.currentSequencerSetSize();
        expect(currentSequencerSetSize).to.eq(1);

        // currentSequencerSetTotalLock
        let currentSequencerSetTotalLock = await lockingPool.currentSequencerSetTotalLock();
        expect(currentSequencerSetTotalLock).to.eq(lockAmount);
        
        // isSequencer
        let isSequencer = await lockingPool.isSequencer(nftCounter - 1);
        expect(isSequencer).to.eq(true);
    })

    it('relock to increase lock amount', async () => {
        // console.log("lockingPool:", lockingPool.address);
        const lockAmount = web3.utils.toWei('2');
        // console.log("lockAmount:", lockAmount);

        // lock token
        let lockToken = await lockingPool.token();
        expect(lockToken).to.eq(l1MetisToken);

        // lock for
        await lockingPool.connect(admin).lockFor(testUserAddress, lockAmount, testUserPub);
        let nftCounter = await lockingPool.NFTCounter();
        expect(nftCounter).to.eq(2);

        // isSequencer
        let sequencerId = nftCounter - 1;
        let isSequencer = await lockingPool.isSequencer(sequencerId);
        expect(isSequencer).to.eq(true);


        // query lock amount
        let beforeRelockAmount = await lockingPool.sequencerLock(sequencerId);
        // relock
        const relockAmount = web3.utils.toWei('20');
        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        await lockingPool.connect(testUser).relock(sequencerId, relockAmount, false);
        // query lock amount
        let afterRelockAmount = await lockingPool.sequencerLock(sequencerId);
        expect(afterRelockAmount.sub(beforeRelockAmount)).to.eq(relockAmount);
    })

     it('relock with reward', async () => {
         const lockAmount = web3.utils.toWei('2');

         // lock token
         let lockToken = await lockingPool.token();
         expect(lockToken).to.eq(l1MetisToken);

         // lock for
         await lockingPool.connect(admin).lockFor(testUserAddress, lockAmount, testUserPub);
         let nftCounter = await lockingPool.NFTCounter();
         expect(nftCounter).to.eq(2);

         // isSequencer
         let sequencerId = nftCounter - 1;
         let isSequencer = await lockingPool.isSequencer(sequencerId);
         expect(isSequencer).to.eq(true);

        let curBatchId = await lockingPool.currentBatch();
         // submit reward
        const params = {
            batchId: ethers.BigNumber.from(curBatchId.toString()).add(1),
            payeer: admin.address,
            sequencers: [testUserAddress],
            finishedBlocks: [10],
            lockingPool: lockingPool.address,
            signer: admin
        }
        let signature = await calcSignature(params);
        await lockingPool.connect(admin).batchSubmitRewards(params.batchId,params.payeer, params.sequencers, params.finishedBlocks, signature);

        // check withdrawable reward
        let withdrawableReward = await calcWithdrawableRewards(lockingPool, sequencerId);
        // console.log("sequencer withdrawable:", withdrawableReward);
        expect(withdrawableReward).to.eq(2 * 10 * 1e18);
        let withdrawable = ethers.BigNumber.from(withdrawableReward.toString());

         // query lock amount
         let beforeRelockAmount = await lockingPool.sequencerLock(sequencerId);
         // relock
         const relockAmount = web3.utils.toWei('20');
         const testUser = new ethers.Wallet(testUserPri, ethers.provider);
         await lockingPool.connect(testUser).relock(sequencerId, relockAmount, true);
         // query lock amount
         let afterRelockAmount = await lockingPool.sequencerLock(sequencerId);
         expect(afterRelockAmount.sub(beforeRelockAmount)).to.eq(ethers.BigNumber.from(relockAmount.toString()).add(withdrawable));
     })

    it('lock for sequencer reverted with no more slots', async () => {
        // console.log("lockingPool:", lockingPool.address);
        const lockAmount = web3.utils.toWei('2');
        // console.log("lockAmount:", lockAmount);

        // lock token
        let lockToken = await lockingPool.token();
        expect(lockToken).to.eq(l1MetisToken);

        // lock for
        await lockingPool.connect(admin).lockFor(testUserAddress, lockAmount, testUserPub);
        await lockingPool.connect(admin).lockFor(testUser2Address, lockAmount, testUser2Pub);
        await lockingPool.connect(admin).lockFor(testUser3Address, lockAmount, testUser3Pub);
        await lockingPool.connect(admin).lockFor(testUser4Address, lockAmount, testUser4Pub);
        await expect(lockingPool.connect(admin).lockFor(testUser5Address, lockAmount, testUser5Pub)).to.be.revertedWith("no more slots");
    })

    it('withdraw reward', async () => {
        // console.log("lockingPool:", lockingPool.address);
        const lockAmount = web3.utils.toWei('2');
        // console.log("lockAmount:", lockAmount);

        // lock for
        await lockingPool.connect(admin).lockFor(testUserAddress, lockAmount, testUserPub);
        let nftCounter = await lockingPool.NFTCounter();
        expect(nftCounter).to.eq(2);

        // isSequencer
        let sequencerId = nftCounter - 1;
        let isSequencer = await lockingPool.isSequencer(sequencerId);
        expect(isSequencer).to.eq(true);

        // update reward
        let curBatchId = await lockingPool.currentBatch();
        // console.log("curBatchId:", curBatchId);

        // submit reward
        const params = {
            batchId: ethers.BigNumber.from(curBatchId.toString()).add(1),
            payeer: admin.address,
            sequencers: [testUserAddress],
            finishedBlocks: [10],
            lockingPool: lockingPool.address,
            signer: admin
        }
        let signature = await calcSignature(params);
        // console.log("params.batchId:", params.batchId);
        await lockingPool.connect(admin).batchSubmitRewards(params.batchId, params.payeer, params.sequencers, params.finishedBlocks, signature);

        // check withdrawable reward
        let withdrawableReward = await calcWithdrawableRewards(lockingPool, sequencerId);
        // console.log("sequencer withdrawable:", withdrawableReward);
        expect(withdrawableReward).to.eq(2 * 10 * 1e18);
        let withdrawable = ethers.BigNumber.from(withdrawableReward.toString());

        // withdraw
        let beforeWithdrawReward = await testERC20.balanceOf(testUserAddress);
        // console.log("beforeWithdrawReward balance:", beforeWithdrawReward);

        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        await lockingPool.connect(testUser).withdrawRewards(sequencerId,false);

        let afterWithdrawReward = await testERC20.balanceOf(testUserAddress);
        // console.log("afterWithdrawReward balance:", afterWithdrawReward);
        expect(afterWithdrawReward.sub(beforeWithdrawReward)).to.eq(withdrawable);
    })

    it('unlock to exit reverted with not allowed', async () => {
        const lockAmount = web3.utils.toWei('2');
        // console.log("lockAmount:", lockAmount);

        // lock for
        await lockingPool.connect(admin).lockFor(testUserAddress, lockAmount, testUserPub);
        let nftCounter = await lockingPool.NFTCounter();
        expect(nftCounter).to.eq(2);

        // isSequencer
        let sequencerId = nftCounter - 1;
        let isSequencer = await lockingPool.isSequencer(sequencerId);
        expect(isSequencer).to.eq(true);

        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        await expect(lockingPool.connect(testUser).unlock(sequencerId, false)).to.be.revertedWith("not allowed");
    })

    it('unlock to exit', async () => {
        const lockAmount = web3.utils.toWei('2');
        // console.log("lockAmount:", lockAmount);

        // lock for
        await lockingPool.connect(admin).lockFor(testUserAddress, lockAmount, testUserPub);
        let nftCounter = await lockingPool.NFTCounter();
        expect(nftCounter).to.eq(2);

        // isSequencer
        let sequencerId = nftCounter - 1;
        let isSequencer = await lockingPool.isSequencer(sequencerId);
        expect(isSequencer).to.eq(true);

        // lock for other users
        await lockingPool.connect(admin).lockFor(testUser2Address, lockAmount, testUser2Pub);
        await lockingPool.connect(admin).lockFor(testUser3Address, lockAmount, testUser3Pub);
        await lockingPool.connect(admin).lockFor(testUser4Address, lockAmount, testUser4Pub);

        // let state = await lockingPool.sequencerState();
        // console.log("state lockerCount:", state.lockerCount);

        // let currentUnlockedInit = await lockingPool.currentUnlockedInit();
        // console.log("currentUnlockedInit:", currentUnlockedInit);
        // console.log("div:", state.lockerCount / 3);
        // console.log("allowed:", currentUnlockedInit + 1 <= state.lockerCount/3);

        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        await lockingPool.connect(testUser).unlock(sequencerId, false);
    })

    it('unlock claim', async () => {
        const lockAmount = web3.utils.toWei('2');
        // console.log("lockAmount:", lockAmount);

        // lock for
        await lockingPool.connect(admin).lockFor(testUserAddress, lockAmount, testUserPub);
        let nftCounter = await lockingPool.NFTCounter();
        expect(nftCounter).to.eq(2);

        // isSequencer
        let sequencerId = nftCounter - 1;
        let isSequencer = await lockingPool.isSequencer(sequencerId);
        expect(isSequencer).to.eq(true);

        // lock for other users
        await lockingPool.connect(admin).lockFor(testUser2Address, lockAmount, testUser2Pub);
        await lockingPool.connect(admin).lockFor(testUser3Address, lockAmount, testUser3Pub);
        await lockingPool.connect(admin).lockFor(testUser4Address, lockAmount, testUser4Pub);

        // unlock
        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        await lockingPool.connect(testUser).unlock(sequencerId, false);

        // time increase
        await time.increase(10);

        // claim
        let beforeUnlockClaim = await testERC20.balanceOf(testUserAddress);
        // console.log("beforeUnlockClaim balance:", beforeUnlockClaim);
        await lockingPool.connect(testUser).unlockClaim(sequencerId, false);
        let afterUnlockClaim = await testERC20.balanceOf(testUserAddress);
        // console.log("afterUnlockClaim balance:", afterUnlockClaim);
        expect(afterUnlockClaim.sub(beforeUnlockClaim)).to.eq(lockAmount);
    })

    it('force unlock', async () => {
        const lockAmount = web3.utils.toWei('2');

        // lock for
        await lockingPool.connect(admin).lockFor(testUserAddress, lockAmount, testUserPub);
        await lockingPool.connect(admin).lockFor(testUser2Address, lockAmount, testUser2Pub);
        await lockingPool.connect(admin).lockFor(testUser3Address, lockAmount, testUser3Pub);
        await lockingPool.connect(admin).lockFor(testUser4Address, lockAmount, testUser4Pub);

        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        const testUser2 = new ethers.Wallet(testUser2Pri, ethers.provider);
        const testUser3 = new ethers.Wallet(testUser3Pri, ethers.provider);
        const testUser4 = new ethers.Wallet(testUser4Pri, ethers.provider);

        // unlock
        await lockingPool.connect(testUser).unlock(1, false);

        // not allowed
        await expect(lockingPool.connect(testUser2).unlock(2, false)).to.be.revertedWith("not allowed");

        // use force unlock
        await forceUnlock(gov, 2, lockingPool.address);
        await forceUnlock(gov, 3, lockingPool.address);
        await forceUnlock(gov, 4, lockingPool.address);

        // time increase for withdraw delay time
        time.increase(10);

        // claim after withdraw delay time
        await lockingPool.connect(testUser).unlockClaim(1, false);
        await lockingPool.connect(testUser2).unlockClaim(2, false);
        await lockingPool.connect(testUser3).unlockClaim(3, false);
        await lockingPool.connect(testUser4).unlockClaim(4, false);

        // check pool balance
        let lockingPoolBalance = await testERC20.balanceOf(lockingPool.address);
        expect(lockingPoolBalance).to.eq(0);
    })
})

async function updateLockingPoolLoggerAddress(govObj,loggerAddress,lockingPoolAddress) {
    let ABI = [
        "function updateLockingInfo(address _lockingInfo)"
    ];
    let iface = new ethers.utils.Interface(ABI);
    let updateLockingInfoEncodeData = iface.encodeFunctionData("updateLockingInfo", [
        loggerAddress,
    ])
    // console.log("updateLockingInfo: ", updateLockingInfoEncodeData)

    return govObj.update(
        lockingPoolAddress,
        updateLockingInfoEncodeData
    )
}

async function forceUnlock(govObj, sequencerId, lockingPoolAddress) {
    let ABI = [
        "function forceUnlock(uint256 sequencerId, bool withdrawRewardToL2)"
    ];
    let iface = new ethers.utils.Interface(ABI);
    let forceUnlockEncodeData = iface.encodeFunctionData("forceUnlock", [
        sequencerId,
        false
    ])
    // console.log("updateLockingInfo: ", forceUnlockEncodeData)

    return govObj.update(
        lockingPoolAddress,
        forceUnlockEncodeData
    )
}

async function calcSignature(params) {
    let message = ethers.utils.solidityPack(["uint256", "address[]", "uint256[]", "address"], [
        params.batchId,
        params.sequencers,
        params.finishedBlocks,
        params.lockingPool
    ])
    const messageHash = ethers.utils.solidityKeccak256(["bytes"], [message]);
    const messageHashBinary = ethers.utils.arrayify(messageHash);
    // console.log("messageHashBinary:", messageHashBinary);

    // sign
    let signature = await params.signer.signMessage(messageHashBinary);
    // console.log("signature:", signature);
    return signature;
}

async function calcWithdrawableRewards(lockingPool,sequencerId){
     // check withdrawable reward
    let sequencerInfo = await lockingPool.sequencers(sequencerId);
    return sequencerInfo.reward - INITIALIZED_AMOUNT;
}