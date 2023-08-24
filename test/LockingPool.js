const {
    ethers,
    upgrades
} = require("hardhat");

const {expect} = require('chai');
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
    let testUser2Address = "0x36675727A189E156570edb68F8075BF7b699127a";
    let testUser2Pri = "0x9958b983b4b9d9b2a4e44da155c2b83e34e3167bd8759fc47c333e66aab31651"

    let testUser3Pub = "0xc840b67802e9b65413ff5bf264d69aef1d06169252bf5878cc3b64b0066a648fc93722b977792aebb3b2138b85b9e53696e5a357939623e9e60e65bf891a3f49";
    let testUser3Address = "0xbeD1010c3920448eDC377CaD7389306B6b61ebBa";
    let testUser3Pri = "0x06bf12da83c8c6d76e9daac6d405756b8d8c4d9fc901299488fa86b95ecd4991"

    let testUser4Pub = "0x04faef4197c8617a0a32863c345e92a7c93a31a45f62f24f419c8bf52bdd9f7b023802a11a467e582c3952558696e1a0a594ef54d8a5910c57d6889f986c8d30";
    let testUser4Address = "0x1Ba02E8B7acEfD56700c4BD324bf01f56dd613E5";
    let testUser4Pri = "0x39620a5d4feef6d337c79dc1e9a500c84c50b8c2d90b80a5dec6282099587cb5"

    let testUser5Pub = "0x42adad65660d1690d935bff0861bd40a328c7ee6e557be0c4a15a3963360f8bfcc7d41447d1262f5703df87b0ba8671714d1c67eaa72db23b8d419e25a8563a1";
    let testUser5Address = "0xd4A1DB298a100d1159fCBf5b8e0bF6A0795B1Fba";
    let testUser5Pri = "0xd63d7585bcec935e47b6f8c4b537025eb226bdbf46805b0fd685b95a3996cbf7"

    before('get wallets', async () => {
        wallets = await ethers.getSigners();
        admin = wallets[0];
        mpc = admin.address;

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

        await admin.sendTransaction({
            to: testUser5Address,
            value: ethers.utils.parseEther("10.0"), // Sends exactly 10.0 ether
        });
    })

    beforeEach('deploy contracts', async () => {
        // const balance = await admin.getBalance();
        // console.log("admin balance:", ethers.utils.formatEther(balance));

        const mintAmount = ethers.utils.parseEther('10000000');
        // deploy test ERC20
        const TestERC20 = await ethers.getContractFactory('TestERC20');
        testERC20 = await TestERC20.connect(admin).deploy(mintAmount);
        l1MetisToken = testERC20.address;
        // console.log("l1MetisToken:", l1MetisToken);

        // deploy gov
        const Governance = await ethers.getContractFactory('Governance');
        const govProxy = await upgrades.deployProxy(Governance, []);
        await govProxy.connect(admin).deployed();
        // console.log("gov:", govProxy.address);

        gov = await ethers.getContractAt('Governance', govProxy.address);

        // deploy NFT
        const LockingNFT = await ethers.getContractFactory('LockingNFTTest');
        lockingNFT = await LockingNFT.connect(admin).deploy();
        // console.log("lockingNFT:", lockingNFT.address);

        // console.log("mpc:", mpc);
        // deploy Locking Pool
        const LockingPoolTest = await ethers.getContractFactory('LockingPoolTest');
        const lockingPoolProxy = await upgrades.deployProxy(LockingPoolTest,
            [
                // govProxy.address,
                admin.address, // for test
                "0xCF7257A86A5dBba34bAbcd2680f209eb9a05b2d2",
                l1MetisToken,
                "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
                200000,
                lockingNFT.address,
                mpc
            ], {
                initializer: 'initialize(address,address,address,address,uint32,address,address)'
            });
         await lockingPoolProxy.deployed();
        lockingPool = await ethers.getContractAt('LockingPool', lockingPoolProxy.address);
        // console.log("lockingPoolProxy:", lockingPoolProxy.address);

        // transfer NFT owner
        await lockingNFT.connect(admin).transferOwnership(lockingPoolProxy.address);

        // update min lock
        // await updateMinAmounts(gov, ethers.utils.parseEther("2.0"), lockingPool.address);
        await lockingPool.connect(admin).updateMinAmounts(ethers.utils.parseEther("2.0"));

        // deploy Locking info
        const LockingInfoTest = await ethers.getContractFactory('LockingInfoTest');
        lockingInfo = await LockingInfoTest.connect(admin).deploy(lockingPool.address);
        // console.log("lockingPool:", lockingPool.address);

        // set logger address
        // await updateLockingPoolLoggerAddress(gov, lockingInfo.address, lockingPool.address);
        await lockingPool.connect(admin).updateLockingInfo(lockingInfo.address);

        // token approve
        await testERC20.connect(admin).approve(lockingPool.address, ethers.constants.MaxUint256);

        // testUser approve
        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        //  console.log("user1 balance:", ethers.utils.formatEther(await testUser.getBalance()));
        await testERC20.connect(admin).transfer(testUserAddress, ethers.utils.parseEther('100000'));
        await testERC20.connect(testUser).approve(lockingPool.address, ethers.constants.MaxUint256);

        // testUser2 approve
        const testUser2 = new ethers.Wallet(testUser2Pri, ethers.provider);
        //  console.log("user2 balance:", ethers.utils.formatEther(await testUser2.getBalance()));
        await testERC20.connect(admin).transfer(testUser2Address, ethers.utils.parseEther('100000'));
        await testERC20.connect(testUser2).approve(lockingPool.address, ethers.constants.MaxUint256);

        // testUser3 approve
        const testUser3 = new ethers.Wallet(testUser3Pri, ethers.provider);
        //  console.log("user3 balance:", ethers.utils.formatEther(await testUser3.getBalance()));
        await testERC20.connect(admin).transfer(testUser3Address, ethers.utils.parseEther('100000'));
        await testERC20.connect(testUser3).approve(lockingPool.address, ethers.constants.MaxUint256);

        // testUser4 approve
        const testUser4 = new ethers.Wallet(testUser4Pri, ethers.provider);
        //  console.log("user4 balance:", ethers.utils.formatEther(await testUser4.getBalance()));
        await testERC20.connect(admin).transfer(testUser4Address, ethers.utils.parseEther('100000'));
        await testERC20.connect(testUser4).approve(lockingPool.address, ethers.constants.MaxUint256);

         // testUser5 approve
         const testUser5 = new ethers.Wallet(testUser5Pri, ethers.provider);
        // console.log("user5 balance:", ethers.utils.formatEther(await testUser5.getBalance()));
        await testERC20.connect(admin).transfer(testUser5Address, ethers.utils.parseEther('100000'));
        await testERC20.connect(testUser5).approve(lockingPool.address, ethers.constants.MaxUint256);
    })

    it('l2 chainId', async () => {
         // get l2 chain id
         const l2ChainId = await lockingPool.getL2ChainId();
         expect(l2ChainId).to.eq(ethers.BigNumber.from('0'));
    })

    
    it('lock when pause', async () => {
        // pause
        // await setPause(gov,lockingPool.address);
        await lockingPool.setPause();

        // lock for
        const lockAmount = ethers.utils.parseEther('2');
        await expect(lockingPool.connect(admin).lockFor(testUserAddress, lockAmount, testUserPub)).to.be.reverted;

        // unpause
        // await setUnpause(gov, lockingPool.address);
        await lockingPool.setUnpause();
        await lockingPool.connect(admin).lockFor(testUserAddress, lockAmount, testUserPub);
    })

    it('lock', async () => {
        // console.log("lockingPool:", lockingPool.address);
        const lockAmount = ethers.utils.parseEther('2');
        // console.log("lockAmount:", lockAmount);

         // lock token
         let lockToken = await lockingPool.l1Token();
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

        // getSequencerId
        let sequencerId = await lockingPool.getSequencerId(testUserAddress);
        expect(sequencerId).to.eq(1);

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

    it('relock', async () => {
        // console.log("lockingPool:", lockingPool.address);
        const lockAmount = ethers.utils.parseEther('2');
        // console.log("lockAmount:", lockAmount);

        // lock token
        let lockToken = await lockingPool.l1Token();
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
        const relockAmount = ethers.utils.parseEther('20');
        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        await lockingPool.connect(testUser).relock(sequencerId, relockAmount, false);
        // query lock amount
        let afterRelockAmount = await lockingPool.sequencerLock(sequencerId);
        expect(afterRelockAmount.sub(beforeRelockAmount)).to.eq(relockAmount);
    })

     it('relock with reward', async () => {
         const lockAmount = ethers.utils.parseEther('2');

         // lock token
         let lockToken = await lockingPool.l1Token();
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
            startEpoch: 1,
            endEpoch: 2,
            sequencers: [testUserAddress],
            finishedBlocks: [10],
            lockingPool: lockingPool.address,
            signer: admin
        }
        let signature = await calcSignature(params);
        params.signature = signature;

        // await updateRewardByGov(gov, params);
        await lockingPool.batchSubmitRewards(params.batchId,
            params.signer.address,
            params.startEpoch,
            params.endEpoch,
            params.sequencers,
            params.finishedBlocks,
            signature)

        // check withdrawable reward
        let withdrawableReward = await calcWithdrawableRewards(lockingPool, sequencerId);
        // console.log("sequencer withdrawable:", withdrawableReward);
        expect(withdrawableReward).to.eq(2 * 10 * 1e18);
        let withdrawable = ethers.BigNumber.from(withdrawableReward.toString());

         // query lock amount
         let beforeRelockAmount = await lockingPool.sequencerLock(sequencerId);
         // relock
         const relockAmount = ethers.utils.parseEther('20');
         const testUser = new ethers.Wallet(testUserPri, ethers.provider);
         await lockingPool.connect(testUser).relock(sequencerId, relockAmount, true);
         // query lock amount
         let afterRelockAmount = await lockingPool.sequencerLock(sequencerId);
         expect(afterRelockAmount.sub(beforeRelockAmount)).to.eq(ethers.BigNumber.from(relockAmount.toString()).add(withdrawable));
     })

    it('lock for sequencer reverted with no more slots', async () => {
        // console.log("lockingPool:", lockingPool.address);
        const lockAmount = ethers.utils.parseEther('2');
        // console.log("lockAmount:", lockAmount);

        // lock token
        let lockToken = await lockingPool.l1Token();
        expect(lockToken).to.eq(l1MetisToken);

        // update sequencer threshold
        // await updateSequencerThreshold(gov,4,lockingPool.address);
        await lockingPool.updateSequencerThreshold(4);

        // lock for
        await lockingPool.connect(admin).lockFor(testUserAddress, lockAmount, testUserPub);
        await lockingPool.connect(admin).lockFor(testUser2Address, lockAmount, testUser2Pub);
        await lockingPool.connect(admin).lockFor(testUser3Address, lockAmount, testUser3Pub);
        await lockingPool.connect(admin).lockFor(testUser4Address, lockAmount, testUser4Pub);
        await expect(lockingPool.connect(admin).lockFor(testUser5Address, lockAmount, testUser5Pub)).to.be.revertedWith("no more slots");
    })

    it('withdrawRewards', async () => {
        // console.log("lockingPool:", lockingPool.address);
        const lockAmount = ethers.utils.parseEther('2');
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
            startEpoch: 1,
            endEpoch: 2,
            sequencers: [testUserAddress],
            finishedBlocks: [10],
            lockingPool: lockingPool.address,
            signer: admin
        }
        let signature = await calcSignature(params);
        params.signature = signature;

        // update rewards by gov
        // await updateRewardByGov(gov,params);
        await lockingPool.batchSubmitRewards(params.batchId,
            params.signer.address,
            params.startEpoch,
            params.endEpoch,
            params.sequencers,
            params.finishedBlocks,
            signature)

        // check withdrawable reward
        let withdrawableReward = await calcWithdrawableRewards(lockingPool, sequencerId);
        // console.log("sequencer withdrawable:", withdrawableReward);
        expect(withdrawableReward).to.eq(2 * 10 * 1e18);
        let withdrawable = ethers.BigNumber.from(withdrawableReward.toString());

        let seqReward = await lockingPool.sequencerReward(sequencerId);
        expect(seqReward.toString()).to.eq(withdrawableReward.toString());

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
        const lockAmount = ethers.utils.parseEther('2');
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
        const lockAmount = ethers.utils.parseEther('2');
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
        const lockAmount = ethers.utils.parseEther('2');
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

        // set withdraw delay time
        // await updateWithdrawDelayTimeValue(gov, 10, lockingPool.address);
        await lockingPool.updateWithdrawDelayTimeValue(10);

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
        const lockAmount = ethers.utils.parseEther('2');

        // lock for
        await lockingPool.connect(admin).lockFor(testUserAddress, lockAmount, testUserPub);
        await lockingPool.connect(admin).lockFor(testUser2Address, lockAmount, testUser2Pub);
        await lockingPool.connect(admin).lockFor(testUser3Address, lockAmount, testUser3Pub);
        await lockingPool.connect(admin).lockFor(testUser4Address, lockAmount, testUser4Pub);

        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        const testUser2 = new ethers.Wallet(testUser2Pri, ethers.provider);
        const testUser3 = new ethers.Wallet(testUser3Pri, ethers.provider);
        const testUser4 = new ethers.Wallet(testUser4Pri, ethers.provider);

        // update withdraw relay time
        // await updateWithdrawDelayTimeValue(gov, 10, lockingPool.address);
        await lockingPool.updateWithdrawDelayTimeValue(10);

        // unlock
        await lockingPool.connect(testUser).unlock(1, false);

        // not allowed
        await expect(lockingPool.connect(testUser2).unlock(2, false)).to.be.revertedWith("not allowed");

        // use force unlock
        // await forceUnlock(gov, 2, lockingPool.address);
        // await forceUnlock(gov, 3, lockingPool.address);
        // await forceUnlock(gov, 4, lockingPool.address);
        await lockingPool.forceUnlock(2,false);
        await lockingPool.forceUnlock(3,false);
        await lockingPool.forceUnlock(4,false);

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

    it('update signer',async () =>{
        const lockAmount = ethers.utils.parseEther('2');
        // console.log("lockAmount:", lockAmount);

        // lock for
        await lockingPool.connect(admin).lockFor(testUserAddress, lockAmount, testUserPub);
        let nftCounter = await lockingPool.NFTCounter();
        expect(nftCounter).to.eq(2);

        // isSequencer
        let sequencerId = nftCounter - 1;
        let isSequencer = await lockingPool.isSequencer(sequencerId);
        expect(isSequencer).to.eq(true);

        let latestSignerUpdateBatch  = await lockingPool.latestSignerUpdateBatch(sequencerId);
        // console.log("latestSignerUpdateBatch:", latestSignerUpdateBatch);

        // let currentBatch = await lockingPool.currentBatch();
        // console.log("currentBatch:", currentBatch);

        let signerUpdateLimit = await lockingPool.signerUpdateLimit();
        // console.log("signerUpdateLimit:", signerUpdateLimit);

        // update signer 
        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        await expect(lockingPool.connect(testUser).updateSigner(sequencerId, testUser2Pub)).to.be.revertedWith("Not allowed");

        // update batch
        // await setCurrentBatch(gov, signerUpdateLimit + latestSignerUpdateBatch, lockingPool.address);
        await lockingPool.setCurrentBatch(signerUpdateLimit + latestSignerUpdateBatch);
        // currentBatch = await lockingPool.currentBatch();
        // console.log("currentBatch:", currentBatch);

        let beforeUpdateSignerOwner = await lockingPool.ownerOf(sequencerId);
        // console.log("beforeUpdateSignerOwner:", beforeUpdateSignerOwner, "user1", testUserAddress);
        expect(beforeUpdateSignerOwner).to.eq(testUserAddress);
        // update signer 
       await expect(lockingPool.connect(testUser).updateSigner(sequencerId, testUser2Pub)).to.be.revertedWith("ERC721: caller is not token owner or approved");

        // NFT approve
        let tokenId = await lockingPool.getSequencerId(testUserAddress);
        // console.log("tokenId:", tokenId);
        await lockingNFT.connect(testUser).approve(lockingPool.address, tokenId);

        // update signer
        await lockingPool.connect(testUser).updateSigner(sequencerId, testUser2Pub);

        let afterUpdateSignerOwner = await lockingPool.ownerOf(sequencerId);
        expect(afterUpdateSignerOwner).to.eq(testUser2Address);
    })

    it('update nft contract', async () => {
          const LockingNFT = await ethers.getContractFactory('LockingNFTTest');
          lockingNFT = await LockingNFT.deploy();

        //   await updateNFTContract(gov, lockingNFT.address,lockingPool.address);
          await lockingPool.updateNFTContract(lockingNFT.address);

          let newNftAddress = await lockingPool.NFTContract();
          expect(newNftAddress).to.eq(lockingNFT.address);
     })

     it('set current batch', async () => {
        //  await setCurrentBatch(gov, 5, lockingPool.address);
        await lockingPool.setCurrentBatch(5);

         let currentBatch = await lockingPool.currentBatch();
         expect(currentBatch).to.eq(5);
     })

    it('updateSequencerThreshold', async () => {
        // await updateSequencerThreshold(gov, 5, lockingPool.address)
        await lockingPool.updateSequencerThreshold(5);
        let newThreshold = await lockingPool.sequencerThreshold();
        expect(newThreshold).to.eq(5);
    })

    it('updateBlockReward', async () => {
        const newReward = ethers.utils.parseEther('10');
        // await updateBlockReward(gov, newReward, lockingPool.address)
        await lockingPool.updateBlockReward(newReward);
        let reward = await lockingPool.BLOCK_REWARD();
        expect(reward).to.eq(newReward);
    })

    it('updateWithdrawDelayTimeValue', async () => {
        // await updateWithdrawDelayTimeValue(gov, 1000, lockingPool.address);
        await lockingPool.updateWithdrawDelayTimeValue(1000);
        let newDelay = await lockingPool.WITHDRAWAL_DELAY();
        expect(newDelay).to.eq(1000);
    })

    it('updateSignerUpdateLimit', async () => {
        // await updateSignerUpdateLimit(gov, 10, lockingPool.address)

        await lockingPool.updateSignerUpdateLimit(10);
        let newLimit = await lockingPool.signerUpdateLimit();
        expect(newLimit).to.eq(10);
    })


    it('update min amount', async () => {
        const lockAmount = ethers.utils.parseEther('20');

        // await updateMinAmounts(gov, lockAmount, lockingPool.address);
        await lockingPool.updateMinAmounts(lockAmount);
        let minLock = await lockingPool.minLock();
        expect(minLock).to.eq(lockAmount);
    })

    it('update mpc', async () => {
        // expect(await updateMpc(gov, testUserAddress, lockingPool.address)).to.reverted();

        let currentMpc = await lockingPool.mpcAddress();
        expect(currentMpc).to.eq(admin.address);

        let latestBlock = await hre.ethers.provider.getBlock("latest");
        let fetchedMpcAddress = await lockingPool.fetchMpcAddress(latestBlock.number);
        expect(fetchedMpcAddress).to.eq(admin.address);

        await mineUpTo(1000);
        // await updateMpc(gov, testUserAddress, lockingPool.address)
        await lockingPool.updateMpc(testUserAddress);

        let newMpcAddress = await lockingPool.mpcAddress();
        expect(newMpcAddress).to.eq(testUserAddress);

        await mineUpTo(2000);
        fetchedMpcAddress = await lockingPool.fetchMpcAddress(1001);
        expect(fetchedMpcAddress).to.eq(testUserAddress);
    })
})


/*
async function setPause(govObj, lockingPoolAddress) {
    let ABI = [
        "function setPause()"
    ];
    let iface = new ethers.utils.Interface(ABI);
    let setPauseEncodeData = iface.encodeFunctionData("setPause", [])

    return govObj.update(
        lockingPoolAddress,
        setPauseEncodeData
    )
}

async function setUnpause(govObj, lockingPoolAddress) {
    let ABI = [
        "function setUnpause()"
    ];
    let iface = new ethers.utils.Interface(ABI);
    let setUnpauseEncodeData = iface.encodeFunctionData("setUnpause", [])

    return govObj.update(
        lockingPoolAddress,
        setUnpauseEncodeData
    )
}

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

async function updateNFTContract(govObj, nftContractAddress, lockingPoolAddress) {
    let ABI = [
        "function updateNFTContract(address _nftContract)"
    ];
    let iface = new ethers.utils.Interface(ABI);
    let updateNFTContractEncodeData = iface.encodeFunctionData("updateNFTContract", [
        nftContractAddress,
    ])
    // console.log("updateNFTContract: ", updateNFTContractEncodeData)

    return govObj.update(
        lockingPoolAddress,
        updateNFTContractEncodeData
    )
}

async function setCurrentBatch(govObj, batchId, lockingPoolAddress) {
    let ABI = [
        "function setCurrentBatch(uint256 _currentBatch)"
    ];
    let iface = new ethers.utils.Interface(ABI);
    let setCurrentBatchEncodeData = iface.encodeFunctionData("setCurrentBatch", [
        batchId,
    ])

    return govObj.update(
        lockingPoolAddress,
        setCurrentBatchEncodeData
    )
}


async function setLockingToken(govObj, token, lockingPoolAddress) {
    let ABI = [
        "function setLockingToken(address _token)"
    ];
    let iface = new ethers.utils.Interface(ABI);
    let setLockingTokenEncodeData = iface.encodeFunctionData("setLockingToken", [
        token,
    ])

    return govObj.update(
        lockingPoolAddress,
        setLockingTokenEncodeData
    )
}

async function updateSequencerThreshold(govObj, threshold, lockingPoolAddress) {
    let ABI = [
        "function updateSequencerThreshold(uint256 newThreshold)"
    ];
    let iface = new ethers.utils.Interface(ABI);
    let updateSequencerThresholdEncodeData = iface.encodeFunctionData("updateSequencerThreshold", [
        threshold,
    ])

    return govObj.update(
        lockingPoolAddress,
        updateSequencerThresholdEncodeData
    )
}

async function updateBlockReward(govObj, reward, lockingPoolAddress) {
    let ABI = [
        "function updateBlockReward(uint256 newBlockReward)"
    ];
    let iface = new ethers.utils.Interface(ABI);
    let updateBlockRewardEncodeData = iface.encodeFunctionData("updateBlockReward", [
        reward,
    ])

    return govObj.update(
        lockingPoolAddress,
        updateBlockRewardEncodeData
    )
}

async function updateWithdrawDelayTimeValue(govObj, delay, lockingPoolAddress) {
    let ABI = [
        "function updateWithdrawDelayTimeValue(uint256 delay)"
    ];
    let iface = new ethers.utils.Interface(ABI);
    let updateWithdrawDelayTimeValueEncodeData = iface.encodeFunctionData("updateWithdrawDelayTimeValue", [
        delay,
    ])

    return govObj.update(
        lockingPoolAddress,
        updateWithdrawDelayTimeValueEncodeData
    )
}

async function updateSignerUpdateLimit(govObj, limit, lockingPoolAddress) {
    let ABI = [
        "function updateSignerUpdateLimit(uint256 _limit)"
    ];
    let iface = new ethers.utils.Interface(ABI);
    let updateSignerUpdateLimitEncodeData = iface.encodeFunctionData("updateSignerUpdateLimit", [
        limit,
    ])

    return govObj.update(
        lockingPoolAddress,
        updateSignerUpdateLimitEncodeData
    )
}

async function updateMinAmounts(govObj, minAmount, lockingPoolAddress) {
    let ABI = [
        "function updateMinAmounts(uint256 _minLock)"
    ];
    let iface = new ethers.utils.Interface(ABI);
    let updateMinAmountEncodeData = iface.encodeFunctionData("updateMinAmounts", [
        minAmount,
    ])

    return govObj.update(
        lockingPoolAddress,
        updateMinAmountEncodeData
    )
}

async function updateMpc(govObj, mpc, lockingPoolAddress) {
    let ABI = [
        "function updateMpc(address _mpc)"
    ];
    let iface = new ethers.utils.Interface(ABI);
    let updateMpcEncodeData = iface.encodeFunctionData("updateMpc", [
        mpc,
    ])

    return govObj.update(
        lockingPoolAddress,
        updateMpcEncodeData
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

async function updateRewardByGov(govObj, params) {
    // let signature = await calcSignature(params);
    // console.log("signature:", signature);

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
    // console.log("updateRewardByGov: ", updateRewardData)

    return govObj.update(
        params.lockingPool,
        updateRewardData
    )
}
*/

async function calcSignature(params) {
    let message = ethers.utils.solidityPack(["uint256", "uint256", "uint256", "address[]", "uint256[]", "address"], [
        params.batchId,
        params.startEpoch,
        params.endEpoch,
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