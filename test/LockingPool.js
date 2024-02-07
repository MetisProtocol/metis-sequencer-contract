const {
    ethers,
    upgrades
} = require("hardhat");

const {
    getChainId
} = hre;

const {expect} = require('chai');
const {time,mineUpTo,reset} = require("@nomicfoundation/hardhat-network-helpers");
const zeroAddress = "0x0000000000000000000000000000000000000000";
const l2Gas = 200000;

describe('LockingPool', async () => {
    let wallets;
    let lockingPool;
    let lockingNFT;
    let l1MetisToken;
    let admin;
    let mpc;
    let testERC20;
    let l1Bridge;

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
            value: ethers.utils.parseEther("1800.0"), // Sends exactly 1800.0 ether
        });

        await admin.sendTransaction({
            to: testUser2Address,
            value: ethers.utils.parseEther("1800.0"), // Sends exactly 1800.0 ether
        });

        await admin.sendTransaction({
            to: testUser3Address,
            value: ethers.utils.parseEther("1800.0"), // Sends exactly 1800.0 ether
        });

        await admin.sendTransaction({
            to: testUser4Address,
            value: ethers.utils.parseEther("1800.0"), // Sends exactly 1800.0 ether
        });

        await admin.sendTransaction({
            to: testUser5Address,
            value: ethers.utils.parseEther("1800.0"), // Sends exactly 1800.0 ether
        });


    })

    beforeEach('deploy contracts', async () => {
        epochLength = 3000;

        const balance = await admin.getBalance();
        // console.log("admin balance:", ethers.utils.formatEther(balance));

        const mintAmount = ethers.utils.parseEther('10000000');

        // deploy test bridge
        const TestBridge = await ethers.getContractFactory('TestBridge');
        l1Bridge = await TestBridge.connect(admin).deploy();

        // deploy test ERC20
        const TestERC20 = await ethers.getContractFactory('TestERC20');
        testERC20 = await TestERC20.connect(admin).deploy(mintAmount);
        l1MetisToken = testERC20.address;
        // console.log("l1MetisToken:", l1MetisToken);

        // deploy NFT
        const LockingNFT = await ethers.getContractFactory('LockingNFT');
        lockingNFT = await LockingNFT.connect(admin).deploy("Metis Sequencer", "MS");
        // console.log("lockingNFT:", lockingNFT.address);

        // console.log("mpc:", mpc);
        // deploy Locking Pool
        const LockingPool = await ethers.getContractFactory('LockingPool');
        const lockingPoolProxy = await upgrades.deployProxy(LockingPool,
            [
                l1Bridge.address,
                l1MetisToken,
                "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
                lockingNFT.address,
                mpc
            ], {
                initializer: 'initialize(address,address,address,address,address)'
            });
        await lockingPoolProxy.connect(admin).deployed();

        lockingPool = await ethers.getContractAt('LockingPool', lockingPoolProxy.address);
        // console.log("lockingPoolProxy:", lockingPoolProxy.address);

        // transfer NFT owner
        await lockingNFT.connect(admin).transferOwnership(lockingPoolProxy.address);

        // update min lock
        await updateMinAmounts(lockingPool, admin, ethers.utils.parseEther("2.0"));

        // deploy Locking info
        const LockingInfo = await ethers.getContractFactory('LockingInfo');
        lockingInfo = await LockingInfo.connect(admin).deploy(lockingPool.address);
        // console.log("lockingPool:", lockingPool.address);

        // set logger address
        await expect(updateLockingPoolLoggerAddress(lockingPool, admin, zeroAddress)).to.be.revertedWith("invalid _lockingInfo");
        await updateLockingPoolLoggerAddress(lockingPool, admin, lockingInfo.address);

        // token approve
        await testERC20.connect(admin).approve(lockingPool.address, ethers.constants.MaxUint256);

        // testUser approve
        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        //  console.log("user1 balance:", ethers.utils.formatEther(await testUser.getBalance()));
        await testERC20.connect(admin).transfer(testUserAddress, ethers.utils.parseEther('100000'));
        // const t1balance = await testUser.getBalance();
        // console.log("testUser1 balance:", ethers.utils.formatEther(t1balance));
        await testERC20.connect(testUser).approve(lockingPool.address, ethers.constants.MaxUint256);

        // testUser2 approve
        const testUser2 = new ethers.Wallet(testUser2Pri, ethers.provider);
        //  console.log("user2 balance:", ethers.utils.formatEther(await testUser2.getBalance()));
        await testERC20.connect(admin).transfer(testUser2Address, ethers.utils.parseEther('100000'));
        // const t2balance = await testUser2.getBalance();
        // console.log("testUser2 balance:", ethers.utils.formatEther(t2balance));
        await testERC20.connect(testUser2).approve(lockingPool.address, ethers.constants.MaxUint256);

        // testUser3 approve
        const testUser3 = new ethers.Wallet(testUser3Pri, ethers.provider);
        //  console.log("user3 balance:", ethers.utils.formatEther(await testUser3.getBalance()));
        await testERC20.connect(admin).transfer(testUser3Address, ethers.utils.parseEther('100000'));
        // const t3balance = await testUser3.getBalance();
        // console.log("testUser3 balance:", ethers.utils.formatEther(t3balance));
        await testERC20.connect(testUser3).approve(lockingPool.address, ethers.constants.MaxUint256);

        // testUser4 approve
        const testUser4 = new ethers.Wallet(testUser4Pri, ethers.provider);
        //  console.log("user4 balance:", ethers.utils.formatEther(await testUser4.getBalance()));
        await testERC20.connect(admin).transfer(testUser4Address, ethers.utils.parseEther('100000'));
        // const t4balance = await testUser4.getBalance();
        // console.log("testUser4 balance:", ethers.utils.formatEther(t4balance));
        await testERC20.connect(testUser4).approve(lockingPool.address, ethers.constants.MaxUint256);

         // testUser5 approve
         const testUser5 = new ethers.Wallet(testUser5Pri, ethers.provider);
        // console.log("user5 balance:", ethers.utils.formatEther(await testUser5.getBalance()));
        await testERC20.connect(admin).transfer(testUser5Address, ethers.utils.parseEther('100000'));
        // const t5balance = await testUser5.getBalance();
        // console.log("testUser5 balance:", ethers.utils.formatEther(t5balance));
        await testERC20.connect(testUser5).approve(lockingPool.address, ethers.constants.MaxUint256);
    })

     it('initialize', async () => {
        let LockingPool1 = await ethers.getContractFactory('LockingPool');
        await expect(upgrades.deployProxy(LockingPool1,
            [
                zeroAddress,
                l1MetisToken,
                "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
                lockingNFT.address,
                mpc
            ], {
                 initializer: 'initialize(address,address,address,address,address)'
            })).to.be.revertedWith("invalid _bridge");

        await expect(upgrades.deployProxy(LockingPool1,
            [
                "0xCF7257A86A5dBba34bAbcd2680f209eb9a05b2d2",
                zeroAddress,
                "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
                lockingNFT.address,
                mpc
            ], {
                 initializer: 'initialize(address,address,address,address,address)'
            })).to.be.revertedWith("invalid _l1Token");

        await expect(upgrades.deployProxy(LockingPool1,
            [
                "0xCF7257A86A5dBba34bAbcd2680f209eb9a05b2d2",
                l1MetisToken,
                zeroAddress,
                lockingNFT.address,
                mpc
            ], {
                 initializer: 'initialize(address,address,address,address,address)'
            })).to.be.revertedWith("invalid _l2Token");

        await expect(upgrades.deployProxy(LockingPool1,
            [
                "0xCF7257A86A5dBba34bAbcd2680f209eb9a05b2d2",
                l1MetisToken,
                "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
                zeroAddress,
                mpc
            ], {
                 initializer: 'initialize(address,address,address,address,address)'
            })).to.be.revertedWith("invalid _NFTContract");

        await expect(upgrades.deployProxy(LockingPool1,
            [
                "0xCF7257A86A5dBba34bAbcd2680f209eb9a05b2d2",
                l1MetisToken,
                "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
                lockingNFT.address,
                zeroAddress
            ], {
                 initializer: 'initialize(address,address,address,address,address)'
            })).to.be.revertedWith("_mpc is zero address");

        await expect(upgrades.deployProxy(LockingPool1,
            [
                "0xCF7257A86A5dBba34bAbcd2680f209eb9a05b2d2",
                l1MetisToken,
                "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
                lockingNFT.address,
                lockingNFT.address
            ], {
                 initializer: 'initialize(address,address,address,address,address)'
            })).to.be.revertedWith("_mpc is a contract");
    })

    it('l2 chainId', async () => {
        let l1ChainID = await getChainId();
        console.log("l1 chainId:",l1ChainID);

        let l2ChainId = await lockingPool.getL2ChainId(5);
        // get l2 chain id
        expect(l2ChainId).to.eq(ethers.BigNumber.from('59901'));

        l2ChainId = await lockingPool.getL2ChainId(1);
        // get l2 chain id
        expect(l2ChainId).to.eq(ethers.BigNumber.from('1088'));
    })
    

    it('lock when pause', async () => {
        await setWitheAddress(lockingPool, admin, testUserAddress);

        // pause
        await setPause(lockingPool, wallets[0], lockingPool.address);
        

        // lock for
        const lockAmount = ethers.utils.parseEther('2');
        await expect(lockingPool.connect(admin).lockFor(testUserAddress, lockAmount, testUserPub)).to.be.revertedWith("Pausable: paused");
        
        // unpause
        await setUnpause(lockingPool, wallets[0], lockingPool.address);

        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        await expect(lockingPool.connect(admin).lockFor(testUserAddress, lockAmount, testUserPub)).to.be.revertedWith("msg sender should be in the white list");
        
        await lockingPool.connect(testUser).lockFor(testUserAddress, lockAmount, testUserPub);
    })

     it('lock with pause change', async () => {
        await setWitheAddress(lockingPool, admin, testUserAddress);

        const lockAmount = ethers.utils.parseEther('2');

        let pausedStatus = await lockingPool.paused();
        expect(pausedStatus).to.eq(false);

        // pause
        await expect(setPause(lockingPool, wallets[1], lockingPool.address)).to.be.revertedWith("Ownable: caller is not the owner");
        await setPause(lockingPool, wallets[0], lockingPool.address);

        pausedStatus = await lockingPool.paused();
        expect(pausedStatus).to.eq(true);

        await expect(lockingPool.connect(admin).lockFor(testUserAddress, lockAmount, testUserPub)).to.be.revertedWith("Pausable: paused");

        await expect(setUnpause(lockingPool, wallets[1], lockingPool.address)).to.be.revertedWith("Ownable: caller is not the owner");
        await setUnpause(lockingPool, wallets[0], lockingPool.address);
     })

    it('lock', async () => {

        // console.log("lockingPool:", lockingPool.address);
        const lockAmount = ethers.utils.parseEther('2');
        // console.log("lockAmount:", lockAmount);

         // lock token
         let lockToken = await lockingPool.l1Token();
         expect(lockToken).to.eq(l1MetisToken);

         // lock for
        await expect(lockingPool.connect(admin).lockFor(testUserAddress, lockAmount, testUserPub)).to.be.revertedWith('msg sender should be in the white list');

        await setWitheAddress(lockingPool, admin, testUserAddress);
        const testUser = new ethers.Wallet(testUserPri, ethers.provider);

        await expect(setWitheAddress(lockingPool, admin, testUserAddress)).to.be.revertedWith('state not change');

        await expect(lockingPool.connect(testUser).lockFor(testUserAddress, lockAmount, [1,2,3])).to.be.revertedWith('not pub');
        await expect(lockingPool.connect(testUser).lockFor(testUserAddress, lockAmount, testUser2Pub)).to.be.revertedWith('user and signerPubkey mismatch');

        // set max lock 
        const maxAmount = ethers.utils.parseEther('1.9');
        await updateMaxAmounts(lockingPool, admin, maxAmount);
        await expect(lockingPool.connect(testUser).lockFor(testUserAddress, lockAmount, testUserPub)).to.be.revertedWith('amount large than maxLock');
        await updateMaxAmounts(lockingPool, admin, lockAmount);

        await lockingPool.connect(testUser).lockFor(testUserAddress, lockAmount, testUserPub);
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

    it('owner of', async() =>{
        await setWitheAddress(lockingPool, admin, testUserAddress);
        const testUser = new ethers.Wallet(testUserPri, ethers.provider);

        // console.log("lockingPool:", lockingPool.address);
        const lockAmount = ethers.utils.parseEther('2');
        // console.log("lockAmount:", lockAmount);

        // lock token
        let lockToken = await lockingPool.l1Token();
        expect(lockToken).to.eq(l1MetisToken);

        // lock for
        await lockingPool.connect(testUser).lockFor(testUserAddress, lockAmount, testUserPub);
        let nftCounter = await lockingPool.NFTCounter();
        expect(nftCounter).to.eq(2);

        // nft owner
        let nftOwner = await lockingPool.ownerOf(nftCounter - 1);
        expect(nftOwner).to.eq(testUserAddress);
    })

    it('relock', async () => {
        const lockAmount = ethers.utils.parseEther('2');

        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        const testUser2 = new ethers.Wallet(testUser2Pri, ethers.provider);
        await setWitheAddress(lockingPool, admin, testUserAddress);

        await expect(lockingPool.connect(testUser2).relock(1, lockAmount, false)).to.be.revertedWith("invalid sequencer locked amount");

        // console.log("lockingPool:", lockingPool.address);
        // console.log("lockAmount:", lockAmount);

        // lock token
        let lockToken = await lockingPool.l1Token();
        expect(lockToken).to.eq(l1MetisToken);

        // lock for
        await lockingPool.connect(testUser).lockFor(testUserAddress, lockAmount, testUserPub);
        let nftCounter = await lockingPool.NFTCounter();
        expect(nftCounter).to.eq(2);

        // isSequencer
        let sequencerId = nftCounter - 1;
        let isSequencer = await lockingPool.isSequencer(sequencerId);
        expect(isSequencer).to.eq(true);

        const zeroAmount = ethers.utils.parseEther('0');
        await expect(lockingPool.connect(testUser).relock(1, zeroAmount, false)).to.be.revertedWith("invalid relock amount");

        // query lock amount
        let beforeRelockAmount = await lockingPool.sequencerLock(sequencerId);
        // relock
        const relockAmount = ethers.utils.parseEther('20');
        await expect(lockingPool.connect(testUser2).relock(sequencerId, relockAmount, false)).to.be.revertedWith("msg sender should be in the white list");
        await setWitheAddress(lockingPool, admin, testUser2Address);
        await expect(lockingPool.connect(testUser2).relock(sequencerId, relockAmount, false)).to.be.revertedWith("whiteAddress and boundSequencer mismatch");

        const maxAmount = ethers.utils.parseEther('10');
        await updateMaxAmounts(lockingPool, admin, maxAmount);
        await expect(lockingPool.connect(testUser).relock(sequencerId, relockAmount, false)).to.be.revertedWith("amount large than maxLock");
        const maxAmount1 = ethers.utils.parseEther('100');
        await updateMaxAmounts(lockingPool, admin, maxAmount1);

        await lockingPool.connect(testUser).relock(sequencerId, relockAmount, false);
        // query lock amount
        let afterRelockAmount = await lockingPool.sequencerLock(sequencerId);
        expect(afterRelockAmount.sub(beforeRelockAmount)).to.eq(relockAmount);
    })

     it('relock with reward', async () => {
        await setWitheAddress(lockingPool, admin, testUserAddress);
        const testUser = new ethers.Wallet(testUserPri, ethers.provider);

         const lockAmount = ethers.utils.parseEther('2');

         // lock token
         let lockToken = await lockingPool.l1Token();
         expect(lockToken).to.eq(l1MetisToken);

         // lock for
         await lockingPool.connect(testUser).lockFor(testUserAddress, lockAmount, testUserPub);
         let nftCounter = await lockingPool.NFTCounter();
         expect(nftCounter).to.eq(2);

         // isSequencer
         let sequencerId = nftCounter - 1;
         let isSequencer = await lockingPool.isSequencer(sequencerId);
         expect(isSequencer).to.eq(true);

        let curBatchId = await lockingPool.currentBatch();

        let l1ChainID = await getChainId();
         // submit reward
        const params = {
            chainId: l1ChainID,
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

        await batchSubmitReward(lockingPool,admin, params);

        // check withdrawable reward
        let withdrawableReward = await calcWithdrawableRewards(lockingPool, sequencerId);
        // console.log("sequencer withdrawable:", withdrawableReward);
        // expect(withdrawableReward).to.eq(2 * 10 * 1e18);
        let withdrawable = ethers.BigNumber.from(withdrawableReward.toString());

         // query lock amount
         let beforeRelockAmount = await lockingPool.sequencerLock(sequencerId);
         // relock
         const relockAmount = ethers.utils.parseEther('20');
         await lockingPool.connect(testUser).relock(sequencerId, relockAmount, true);
         // query lock amount
         let afterRelockAmount = await lockingPool.sequencerLock(sequencerId);
         expect(afterRelockAmount.sub(beforeRelockAmount)).to.eq(ethers.BigNumber.from(relockAmount.toString()).add(withdrawable));
     })

    it('lock for sequencer reverted with no more slots', async () => {
        await setWitheAddress(lockingPool, admin, testUserAddress);
        await setWitheAddress(lockingPool, admin, testUser2Address);
        await setWitheAddress(lockingPool, admin, testUser3Address);
        await setWitheAddress(lockingPool, admin, testUser4Address);
        await setWitheAddress(lockingPool, admin, testUser5Address);

        const testUser1 = new ethers.Wallet(testUserPri, ethers.provider);
        const testUser2 = new ethers.Wallet(testUser2Pri, ethers.provider);
        const testUser3 = new ethers.Wallet(testUser3Pri, ethers.provider);
        const testUser4 = new ethers.Wallet(testUser4Pri, ethers.provider);
        const testUser5 = new ethers.Wallet(testUser5Pri, ethers.provider);


        // console.log("lockingPool:", lockingPool.address);
        const lockAmount = ethers.utils.parseEther('2');
        // console.log("lockAmount:", lockAmount);

        // lock token
        let lockToken = await lockingPool.l1Token();
        expect(lockToken).to.eq(l1MetisToken);

        // update sequencer threshold
        await updateSequencerThreshold(lockingPool, wallets[0], 4);

        // lock for
        const lockAmount1 = ethers.utils.parseEther('1');
        await expect(lockingPool.connect(testUser5).lockFor(testUser5Address, lockAmount1, testUser5Pub)).to.be.revertedWith("amount less than minLock");

        await lockingPool.connect(testUser1).lockFor(testUserAddress, lockAmount, testUserPub);
        await lockingPool.connect(testUser2).lockFor(testUser2Address, lockAmount, testUser2Pub);
        await lockingPool.connect(testUser3).lockFor(testUser3Address, lockAmount, testUser3Pub);
        await lockingPool.connect(testUser4).lockFor(testUser4Address, lockAmount, testUser4Pub);
        await expect(lockingPool.connect(testUser5).lockFor(testUser5Address, lockAmount, testUser5Pub)).to.be.revertedWith("no more slots");
    })

    it('withdrawRewards', async () => {
        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        const lockAmount = ethers.utils.parseEther('2');

        await expect(lockingPool.connect(testUser).withdrawRewards(1,l2Gas)).to.be.revertedWith('msg sender should be in the white list');
        await setWitheAddress(lockingPool, admin, testUserAddress);

        // console.log("lockingPool:", lockingPool.address);
        // console.log("lockAmount:", lockAmount);

        // lock for
        await lockingPool.connect(testUser).lockFor(testUserAddress, lockAmount, testUserPub);
        let nftCounter = await lockingPool.NFTCounter();
        expect(nftCounter).to.eq(2);

        await expect(lockingPool.connect(testUser).withdrawRewards(2,l2Gas)).to.be.revertedWith('whiteAddress and boundSequencer mismatch');
        await expect(lockingPool.connect(testUser).withdrawRewards(1, l2Gas)).to.be.revertedWith('invalid reward recipient');

        await lockingPool.connect(testUser).setSequencerRewardRecipient(1, admin.address);

        // isSequencer
        let sequencerId = nftCounter - 1;
        let isSequencer = await lockingPool.isSequencer(sequencerId);
        expect(isSequencer).to.eq(true);

        // update reward
        let curBatchId = await lockingPool.currentBatch();
        // console.log("curBatchId:", curBatchId);

        let l1ChainID = await getChainId();
        // submit reward
        const params = {
            chainId: l1ChainID,
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

        // update rewards 
        await batchSubmitReward(lockingPool, wallets[0], params);

        // check withdrawable reward
        let withdrawableReward = await calcWithdrawableRewards(lockingPool, sequencerId);
        // console.log("sequencer withdrawable:", withdrawableReward);
        // expect(withdrawableReward).to.eq(2 * 10 * 1e18);
        let withdrawable = ethers.BigNumber.from(withdrawableReward.toString());

        let seqReward = await lockingPool.sequencerReward(sequencerId);
        expect(seqReward.toString()).to.eq(withdrawableReward.toString());

        // withdraw
        // let beforeWithdrawReward = await testERC20.balanceOf(testUserAddress);
        // console.log("beforeWithdrawReward balance:", beforeWithdrawReward);

        await lockingPool.connect(testUser).withdrawRewards(sequencerId,l2Gas);
        // await expect(lockingPool.connect(testUser).withdrawRewards(sequencerId,l2Gas)).to.be.revertedWith("not allowed recipient");

        // let afterWithdrawReward = await testERC20.balanceOf(testUserAddress);
        // // console.log("afterWithdrawReward balance:", afterWithdrawReward);
        // expect(afterWithdrawReward.sub(beforeWithdrawReward)).to.eq(withdrawable);
    })

    it('unlock to exit reverted with not allowed', async () => {
        await setWitheAddress(lockingPool, admin, testUserAddress);
        const testUser = new ethers.Wallet(testUserPri, ethers.provider);

        const lockAmount = ethers.utils.parseEther('2');
        // console.log("lockAmount:", lockAmount);

        // lock for
        await lockingPool.connect(testUser).lockFor(testUserAddress, lockAmount, testUserPub);
        let nftCounter = await lockingPool.NFTCounter();
        expect(nftCounter).to.eq(2);

        // isSequencer
        let sequencerId = nftCounter - 1;
        let isSequencer = await lockingPool.isSequencer(sequencerId);
        expect(isSequencer).to.eq(true);


        const testUser2 = new ethers.Wallet(testUser2Pri, ethers.provider);
        await expect(lockingPool.connect(testUser2).unlock(sequencerId,l2Gas)).to.be.revertedWith("msg sender should be in the white list");
        await expect(lockingPool.connect(testUser).unlock(sequencerId + 1, l2Gas)).to.be.revertedWith("whiteAddress and boundSequencer mismatch");
        await expect(lockingPool.connect(testUser).unlock(sequencerId, l2Gas)).to.be.revertedWith("rewardRecipient not set");
    })

    it('unlock to exit', async () => {
        await setWitheAddress(lockingPool, admin, testUserAddress);
        await setWitheAddress(lockingPool, admin, testUser2Address);
        await setWitheAddress(lockingPool, admin, testUser3Address);
        await setWitheAddress(lockingPool, admin, testUser4Address);

        const testUser1 = new ethers.Wallet(testUserPri, ethers.provider);
        const testUser2 = new ethers.Wallet(testUser2Pri, ethers.provider);
        const testUser3 = new ethers.Wallet(testUser3Pri, ethers.provider);
        const testUser4 = new ethers.Wallet(testUser4Pri, ethers.provider);

        const lockAmount = ethers.utils.parseEther('2');
        // console.log("lockAmount:", lockAmount);

        // lock for
        await lockingPool.connect(testUser1).lockFor(testUserAddress, lockAmount, testUserPub);
        let nftCounter = await lockingPool.NFTCounter();
        expect(nftCounter).to.eq(2);

        // isSequencer
        let sequencerId = nftCounter - 1;
        let isSequencer = await lockingPool.isSequencer(sequencerId);
        expect(isSequencer).to.eq(true);

        // lock for other users
        await lockingPool.connect(testUser2).lockFor(testUser2Address, lockAmount, testUser2Pub);
        await lockingPool.connect(testUser3).lockFor(testUser3Address, lockAmount, testUser3Pub);
        await lockingPool.connect(testUser4).lockFor(testUser4Address, lockAmount, testUser4Pub);

        // let state = await lockingPool.sequencerState();
        // console.log("state lockerCount:", state.lockerCount);

        // let currentUnlockedInit = await lockingPool.currentUnlockedInit();
        // console.log("currentUnlockedInit:", currentUnlockedInit);
        // console.log("div:", state.lockerCount / 3);
        // console.log("allowed:", currentUnlockedInit + 1 <= state.lockerCount/3);

        await expect(lockingPool.connect(testUser1).unlock(sequencerId, l2Gas)).to.be.revertedWith("rewardRecipient not set");
        await lockingPool.connect(testUser1).setSequencerRewardRecipient(sequencerId, admin.address);

        // set reward recipient
        await lockingPool.connect(testUser1).withdrawRewards(sequencerId,l2Gas);
        // unlock
        await lockingPool.connect(testUser1).unlock(sequencerId, l2Gas);
        await expect(lockingPool.connect(testUser1).unlock(sequencerId, l2Gas)).to.be.revertedWith("invalid sequencer status");

        // await lockingPool.connect(testUser).updateSigner(sequencerId, testUser2Pub);

        await expect(lockingPool.connect(testUser1).relock(sequencerId, lockAmount, false)).to.be.revertedWith("no relocking");
        await expect(lockingPool.connect(testUser1).lockFor(testUserAddress, lockAmount, testUserPub)).to.be.revertedWith('had bound sequencer');
    })

    it('unlock claim', async () => {
         const testUser1 = new ethers.Wallet(testUserPri, ethers.provider);
         const testUser2 = new ethers.Wallet(testUser2Pri, ethers.provider);
         const testUser3 = new ethers.Wallet(testUser3Pri, ethers.provider);
         const testUser4 = new ethers.Wallet(testUser4Pri, ethers.provider);

        await expect(lockingPool.connect(testUser1).unlockClaim(1,l2Gas)).to.be.revertedWith('msg sender should be in the white list');

        await setWitheAddress(lockingPool, admin, testUserAddress);
        await setWitheAddress(lockingPool, admin, testUser2Address);

        await setWitheAddress(lockingPool, admin, testUser3Address);
        await setWitheAddress(lockingPool, admin, testUser4Address);
       

        const lockAmount = ethers.utils.parseEther('2');
        // console.log("lockAmount:", lockAmount);

        // lock for
        await lockingPool.connect(testUser1).lockFor(testUserAddress, lockAmount, testUserPub);
        let nftCounter = await lockingPool.NFTCounter();
        expect(nftCounter).to.eq(2);

        // isSequencer
        let sequencerId = nftCounter - 1;
        let isSequencer = await lockingPool.isSequencer(sequencerId);
        expect(isSequencer).to.eq(true);

        // lock for other users
        await lockingPool.connect(testUser2).lockFor(testUser2Address, lockAmount, testUser2Pub);
        await lockingPool.connect(testUser3).lockFor(testUser3Address, lockAmount, testUser3Pub);
        await lockingPool.connect(testUser4).lockFor(testUser4Address, lockAmount, testUser4Pub);

        // set withdraw delay time
        await updateWithdrawDelayTimeValue(lockingPool, wallets[0], 10);

        await lockingPool.connect(testUser1).setSequencerRewardRecipient(sequencerId, admin.address);

        await expect(lockingPool.connect(testUser2).unlockClaim(sequencerId + 1, l2Gas)).to.be.revertedWith('rewardRecipient not set');

        // set reward recipient address
        await lockingPool.connect(testUser1).withdrawRewards(sequencerId, l2Gas);

        await expect(lockingPool.connect(testUser1).unlockClaim(5, l2Gas)).to.be.revertedWith('whiteAddress and boundSequencer mismatch');

        // unlock
        await lockingPool.connect(testUser1).unlock(sequencerId,l2Gas);

        await expect(lockingPool.connect(testUser1).unlockClaim(sequencerId, l2Gas)).to.be.revertedWith('claim not allowed');

        // time increase
        await time.increase(10);

        // claim
        let beforeUnlockClaim = await testERC20.balanceOf(testUserAddress);
        // console.log("beforeUnlockClaim balance:", beforeUnlockClaim);
        await lockingPool.connect(testUser1).unlockClaim(sequencerId, l2Gas);
        let afterUnlockClaim = await testERC20.balanceOf(testUserAddress);
        // console.log("afterUnlockClaim balance:", afterUnlockClaim);
        expect(afterUnlockClaim.sub(beforeUnlockClaim)).to.eq(lockAmount);
    })

    it('force unlock', async () => {
         await setWitheAddress(lockingPool, admin, testUserAddress);
         await setWitheAddress(lockingPool, admin, testUser2Address);
         await setWitheAddress(lockingPool, admin, testUser3Address);
         await setWitheAddress(lockingPool, admin, testUser4Address);

        const testUser1 = new ethers.Wallet(testUserPri, ethers.provider);
        const testUser2 = new ethers.Wallet(testUser2Pri, ethers.provider);
        const testUser3 = new ethers.Wallet(testUser3Pri, ethers.provider);
        const testUser4 = new ethers.Wallet(testUser4Pri, ethers.provider);

        const lockAmount = ethers.utils.parseEther('2');

        // lock for
        await lockingPool.connect(testUser1).lockFor(testUserAddress, lockAmount, testUserPub);
        await lockingPool.connect(testUser2).lockFor(testUser2Address, lockAmount, testUser2Pub);
        await lockingPool.connect(testUser3).lockFor(testUser3Address, lockAmount, testUser3Pub);
        await lockingPool.connect(testUser4).lockFor(testUser4Address, lockAmount, testUser4Pub);

       
        // update withdraw relay time
        await updateWithdrawDelayTimeValue(lockingPool, wallets[0], 10);

        await expect(lockingPool.connect(testUser1).unlock(1,l2Gas)).to.be.revertedWith("rewardRecipient not set");

         // set reward recipient
         await lockingPool.connect(testUser1).setSequencerRewardRecipient(1, admin.address);
         await lockingPool.connect(testUser2).setSequencerRewardRecipient(2, admin.address);
         await lockingPool.connect(testUser3).setSequencerRewardRecipient(3, admin.address);
         await lockingPool.connect(testUser4).setSequencerRewardRecipient(4, admin.address);

        // set reward recipient address
        await lockingPool.connect(testUser1).withdrawRewards(1, l2Gas);
        // unlock
        await lockingPool.connect(testUser1).unlock(1,l2Gas);

        // not allowed
        // await expect(lockingPool.connect(testUser2).unlock(2)).to.be.revertedWith("Ownable: caller is not the owner");

        // use force unlock
        await expect(forceUnlock(lockingPool, testUser2, 2)).to.be.revertedWith("Ownable: caller is not the owner");
        await forceUnlock(lockingPool, admin, 2);
        await forceUnlock(lockingPool, admin, 3);
        await forceUnlock(lockingPool, admin, 4);
      
        // time increase for withdraw delay time
        time.increase(10);

        // set reward recipient address
        await lockingPool.connect(testUser2).withdrawRewards(2, l2Gas);
        await lockingPool.connect(testUser3).withdrawRewards(3, l2Gas);
        await lockingPool.connect(testUser4).withdrawRewards(4, l2Gas);

        // claim after withdraw delay time
        await lockingPool.connect(testUser1).unlockClaim(1, l2Gas);
        await lockingPool.connect(testUser2).unlockClaim(2, l2Gas);
        await lockingPool.connect(testUser3).unlockClaim(3, l2Gas);
        await lockingPool.connect(testUser4).unlockClaim(4, l2Gas);

        // check pool balance
        let lockingPoolBalance = await testERC20.balanceOf(lockingPool.address);
        expect(lockingPoolBalance).to.eq(0);

        let l1ChainID = await getChainId();
        // invalid sequencer
        let curBatchId = await lockingPool.currentBatch();
        const params = {
            chainId: l1ChainID,
            batchId: ethers.BigNumber.from(curBatchId.toString()).add(1),
            payeer: admin.address,
            startEpoch: 1,
            endEpoch: 2,
            sequencers: [testUserAddress],
            finishedBlocks: [10],
            lockingPool: lockingPool.address,
            signer: admin
        }
        params.startEpoch = 2;
        params.endEpoch = 3;
        await expect(batchSubmitReward(lockingPool, wallets[0], params)).to.be.revertedWith("invalid sequencer");
    })

    it('update signer',async () =>{
        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        const testUser2 = new ethers.Wallet(testUser2Pri, ethers.provider);
        const testUser3 = new ethers.Wallet(testUser3Pri, ethers.provider);
        const testUser4 = new ethers.Wallet(testUser4Pri, ethers.provider);

       await expect(lockingPool.connect(testUser).updateSigner(1, testUser2Pub)).to.be.revertedWith("msg sender should be in the white list");
        await setWitheAddress(lockingPool, admin, testUserAddress);
        await setWitheAddress(lockingPool, admin, testUser2Address);
        await setWitheAddress(lockingPool, admin, testUser3Address);
        await setWitheAddress(lockingPool, admin, testUser4Address);


        const lockAmount = ethers.utils.parseEther('2');
        // console.log("lockAmount:", lockAmount);

        // lock for
        await lockingPool.connect(testUser).lockFor(testUserAddress, lockAmount, testUserPub);
        let nftCounter = await lockingPool.NFTCounter();
        expect(nftCounter).to.eq(2);
        let sequencerId = nftCounter - 1;

       await expect(lockingPool.connect(testUser).updateSigner(2, testUser2Pub)).to.be.revertedWith("whiteAddress and boundSequencer mismatch");

        await lockingPool.connect(testUser).setSequencerRewardRecipient(sequencerId, admin.address);

        // set reward recipient
        await lockingPool.connect(testUser).withdrawRewards(sequencerId, l2Gas);

        await expect(lockingPool.connect(testUser).unlock(sequencerId,l2Gas)).to.be.revertedWith('unlock not allowed');

        await lockingPool.connect(testUser2).lockFor(testUser2Address, lockAmount, testUser2Pub);
        await lockingPool.connect(testUser3).lockFor(testUser3Address, lockAmount, testUser3Pub);
        await lockingPool.connect(testUser4).lockFor(testUser4Address, lockAmount, testUser4Pub);

        // isSequencer
        let isSequencer = await lockingPool.isSequencer(sequencerId);
        expect(isSequencer).to.eq(true);

        let latestSignerUpdateBatch  = await lockingPool.latestSignerUpdateBatch(sequencerId);
        console.log("latestSignerUpdateBatch:", latestSignerUpdateBatch);

        // let currentBatch = await lockingPool.currentBatch();
        // console.log("currentBatch:", currentBatch);

        let signerUpdateLimit = await lockingPool.signerUpdateLimit();
        console.log("signerUpdateLimit:", signerUpdateLimit);

        // update signer 
        await expect(lockingPool.connect(testUser).updateSigner(sequencerId, testUser5Pub)).to.be.revertedWith("not allowed");
        await expect(lockingPool.connect(testUser).updateSigner(sequencerId, testUser2Pub)).to.be.revertedWith("invalid signer");

         // exit
        await lockingPool.connect(testUser).unlock(sequencerId, l2Gas);
        await expect(lockingPool.connect(testUser).updateSigner(sequencerId, testUser5Pub)).to.be.revertedWith('exited sequencer');

        // update batch
        // await expect(setCurrentBatch(lockingPool, wallets[0], 0, lockingPool.address)).to.be.revertedWith("invalid _currentBatch");
        // await setCurrentBatch(lockingPool, wallets[0], signerUpdateLimit + latestSignerUpdateBatch, lockingPool.address);
        // currentBatch = await lockingPool.currentBatch();
        // console.log("currentBatch:", currentBatch);

    /*
        let beforeUpdateSignerOwner = await lockingPool.ownerOf(sequencerId);
        // console.log("beforeUpdateSignerOwner:", beforeUpdateSignerOwner, "user1", testUserAddress);
        expect(beforeUpdateSignerOwner).to.eq(testUserAddress);
        // update signer 
    //    await expect(lockingPool.connect(testUser1).updateSigner(sequencerId, testUser5Pub)).to.be.revertedWith("ERC721: caller is not token owner or approved");

       await expect(lockingPool.connect(testUser).updateSigner(sequencerId, testUser2Pub)).to.be.revertedWith("invalid signer");

        // NFT approve
        let tokenId = await lockingPool.getSequencerId(testUserAddress);
        // console.log("tokenId:", tokenId);
        await lockingNFT.connect(testUser).approve(lockingPool.address, tokenId);

        // update signer
        await lockingPool.connect(testUser).updateSigner(sequencerId, testUser5Pub);

        let afterUpdateSignerOwner = await lockingPool.ownerOf(sequencerId);
        expect(afterUpdateSignerOwner).to.eq(testUser5Address);
    */
    })

    it('update nft contract', async () => {
          const LockingNFT = await ethers.getContractFactory('LockingNFT');
          lockingNFT = await LockingNFT.deploy("Metis Sequencer", "MS");

        await expect(updateNFTContract(lockingPool, wallets[0], zeroAddress)).to.be.revertedWith("invalid _nftContract");
        await updateNFTContract(lockingPool, wallets[0], lockingNFT.address);

        let newNftAddress = await lockingPool.NFTContract();
        expect(newNftAddress).to.eq(lockingNFT.address);
     })

    it('updateSequencerThreshold', async () => {
        await expect(updateSequencerThreshold(lockingPool, wallets[0], 0, lockingPool.address)).to.be.revertedWith("invalid newThreshold");
        await updateSequencerThreshold(lockingPool, wallets[0], 5);
        let newThreshold = await lockingPool.sequencerThreshold();
        expect(newThreshold).to.eq(5);
    })

    it('updateBlockReward', async () => {
        const newReward = ethers.utils.parseEther('10');
        await expect(updateBlockReward(lockingPool, wallets[0], 0)).to.be.revertedWith("invalid newReward");
        await updateBlockReward(lockingPool, wallets[0], newReward);
        let reward = await lockingPool.perSecondReward();
        expect(reward).to.eq(newReward);
    })

    it('updateWithdrawDelayTimeValue', async () => {
        await expect(updateWithdrawDelayTimeValue(lockingPool, wallets[0], 0)).to.be.revertedWith("invalid newWithdrawDelayTime");
        await updateWithdrawDelayTimeValue(lockingPool, wallets[0], 1000);
        let newDelay = await lockingPool.WITHDRAWAL_DELAY();
        expect(newDelay).to.eq(1000);
    })

    it('updateSignerUpdateLimit', async () => {
        await expect(updateSignerUpdateLimit(lockingPool, wallets[0], 0)).to.be.revertedWith("invalid _limit");
        await updateSignerUpdateLimit(lockingPool, wallets[0], 10);
        let newLimit = await lockingPool.signerUpdateLimit();
        expect(newLimit).to.eq(10);
    })


    it('update min amount', async () => {
        const lockAmount = ethers.utils.parseEther('20');

        await expect(updateMinAmounts(lockingPool, wallets[0], 0)).to.be.revertedWith("invalid _minLock");
        await updateMinAmounts(lockingPool, wallets[0], lockAmount);

        let minLock = await lockingPool.minLock();
        expect(minLock).to.eq(lockAmount);

        // not allow 
         const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        await expect(updateMinAmounts(lockingPool, testUser, lockAmount)).to.be.revertedWith("Ownable: caller is not the owner");
    })

    it('update max amount', async () => {
        const lockAmount = ethers.utils.parseEther('20');

        await expect(updateMaxAmounts(lockingPool, wallets[0], 0)).to.be.revertedWith("invalid _maxLock");
        await updateMaxAmounts(lockingPool, wallets[0], lockAmount);

        let maxLock = await lockingPool.maxLock();
        expect(maxLock).to.eq(lockAmount);

        // not allow 
        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        await expect(updateMaxAmounts(lockingPool, testUser, lockAmount)).to.be.revertedWith("Ownable: caller is not the owner");
    })


    it('update mpc', async () => {
        let currentMpc = await lockingPool.mpcAddress();
        expect(currentMpc).to.eq(admin.address);

        let latestBlock = await hre.ethers.provider.getBlock("latest");
        let fetchedMpcAddress = await lockingPool.fetchMpcAddress(latestBlock.number);
        expect(fetchedMpcAddress).to.eq(admin.address);

        await expect(updateMpc(lockingPool, wallets[0], lockingPool.address)).to.be.revertedWith("_newMpc is a contract");
        await expect(updateMpc(lockingPool, wallets[0], zeroAddress)).to.be.revertedWith("_newMpc is zero address");

        await mineUpTo(1000);
        await updateMpc(lockingPool, wallets[0], testUserAddress);

        fetchedMpcAddress = await lockingPool.fetchMpcAddress(999);
        expect(fetchedMpcAddress).to.eq(admin.address);

        let newMpcAddress = await lockingPool.mpcAddress();
        expect(newMpcAddress).to.eq(testUserAddress);

        await mineUpTo(2000);
        fetchedMpcAddress = await lockingPool.fetchMpcAddress(2001);
        expect(fetchedMpcAddress).to.eq(testUserAddress);
    })

    it('batch submit rewards', async ()=>{
        await setWitheAddress(lockingPool, admin, testUserAddress);

        const lockAmount = ethers.utils.parseEther('2');
        // lock for
        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        await lockingPool.connect(testUser).lockFor(testUserAddress, lockAmount, testUserPub);
        
        let curBatchId = await lockingPool.currentBatch();
        let l1ChainID = await getChainId();
        // submit reward
        const params = {
            chainId: l1ChainID,
            batchId: ethers.BigNumber.from(curBatchId.toString()).add(1),
            payeer: admin.address,
            startEpoch: 1,
            endEpoch: 2,
            sequencers: [testUserAddress],
            finishedBlocks: [10],
            lockingPool: lockingPool.address,
            signer: admin
        }

        // invalid mpc signature
        params.signer = wallets[1];
        let signature = await calcSignature(params);
        params.signature = signature;
        await expect(batchSubmitReward(lockingPool, wallets[0], params)).to.be.revertedWith("invalid mpc signature");

        // update rewards
        params.signer = admin;
        signature = await calcSignature(params);
        params.signature = signature;
        await batchSubmitReward(lockingPool, wallets[0], params);

        // invalid batch id
        params.batchId = 100;
        await expect(batchSubmitReward(lockingPool, wallets[0], params)).to.be.revertedWith("invalid batch id");
        
        // mismatch length
        params.batchId = ethers.BigNumber.from(curBatchId.toString()).add(2);
        params.finishedBlocks = [10,11];
        await expect(batchSubmitReward(lockingPool, wallets[0], params)).to.be.revertedWith("mismatch length");

        // invalid startEpoch
        params.batchId = ethers.BigNumber.from(curBatchId.toString()).add(2);
        params.finishedBlocks = [10];

        let lastRewardEpochId = await lockingPool.lastRewardEpochId();
        if (lastRewardEpochId > 1){
            params.startEpoch = lastRewardEpochId - 1;
        }
        await expect(batchSubmitReward(lockingPool, wallets[0], params)).to.be.revertedWith("invalid startEpoch");

        // invalid endEpoch
        params.batchId = ethers.BigNumber.from(curBatchId.toString()).add(2);
        params.startEpoch = 10;
        params.endEpoch = 8;
        await expect(batchSubmitReward(lockingPool, wallets[0], params)).to.be.revertedWith("invalid endEpoch");

        // invalid mpc signature
        params.batchId = ethers.BigNumber.from(curBatchId.toString()).add(2);
        params.signer = testUser
        params.signature = await calcSignature(params);
        params.startEpoch = 11;
        params.endEpoch = 13;
        await expect(batchSubmitReward(lockingPool, wallets[0], params)).to.be.revertedWith("invalid mpc signature");

        // sequencer not exist
        params.batchId = ethers.BigNumber.from(curBatchId.toString()).add(2);
        params.sequencers = [zeroAddress];
        params.startEpoch = 11;
        params.endEpoch = 13;
        params.signer = admin
        signature = await calcSignature(params);
        params.signature = signature;
        await expect(batchSubmitReward(lockingPool, wallets[0], params)).to.be.revertedWith("sequencer not exist");
    })

    it('setSequencerRewardRecipient', async () => {
        const testUser = new ethers.Wallet(testUserPri, ethers.provider);
        const testUser2 = new ethers.Wallet(testUser2Pri, ethers.provider);

        const lockAmount = ethers.utils.parseEther('2');

        await expect(lockingPool.connect(testUser).setSequencerRewardRecipient(1, admin.address)).to.be.revertedWith("msg sender should be in the white list");
        await setWitheAddress(lockingPool, admin, testUserAddress);
        await setWitheAddress(lockingPool, admin, testUser2Address);

        await lockingPool.connect(testUser).lockFor(testUserAddress, lockAmount, testUserPub);
        await lockingPool.connect(testUser2).lockFor(testUser2Address, lockAmount, testUser2Pub);

        await expect(lockingPool.connect(testUser2).setSequencerRewardRecipient(1, admin.address)).to.be.revertedWith("whiteAddress and boundSequencer mismatch");
        
        await expect(lockingPool.connect(testUser).setSequencerRewardRecipient(1, zeroAddress)).to.be.revertedWith("invalid recipient");
        await lockingPool.connect(testUser).setSequencerRewardRecipient(1, admin.address);
    })
})


async function setWitheAddress(lockingPoolObj, signer, user) {
    return lockingPoolObj.connect(signer).setWhiteListAddress(
       user, true
    )
}

async function setPause(lockingPoolObj, signer) {
    return lockingPoolObj.connect(signer).setPause()
}

async function setUnpause(lockingPoolObj,signer) {
    return lockingPoolObj.connect(signer).setUnpause()
}

async function updateLockingPoolLoggerAddress(lockingPoolObj,signer,loggerAddress) {
    return lockingPoolObj.connect(signer).updateLockingInfo(loggerAddress)
}

async function updateNFTContract(lockingPoolObj,signer, nftContractAddress) {
    return lockingPoolObj.connect(signer).updateNFTContract(nftContractAddress)
}

async function setLockingToken(lockingPoolObj,signer, token) {
    return lockingPoolObj.connect(signer).setLockingToken(token)
}

async function updateSequencerThreshold(lockingPoolObj,signer, threshold) {
    return lockingPoolObj.connect(signer).updateSequencerThreshold(threshold)
}

async function updateBlockReward(lockingPoolObj,signer,reward) {
    return lockingPoolObj.connect(signer).updatePerSecondReward(reward)
}

async function updateWithdrawDelayTimeValue(lockingPoolObj,signer, delay) {
    return lockingPoolObj.connect(signer).updateWithdrawDelayTimeValue(delay)
}

async function updateSignerUpdateLimit(lockingPoolObj,signer, limit) {
    return lockingPoolObj.connect(signer).updateSignerUpdateLimit(limit)
}

async function updateMinAmounts(lockingPoolObj,signer, minAmount) {
    return lockingPoolObj.connect(signer).updateMinAmounts(minAmount)
}

async function updateMaxAmounts(lockingPoolObj, signer, maxAmount) {
    return lockingPoolObj.connect(signer).updateMaxAmounts(maxAmount)
}

async function updateMpc(lockingPoolObj, signer, mpc) {
    return lockingPoolObj.connect(signer).updateMpc(mpc)
}

async function forceUnlock(lockingPoolObj,signer, sequencerId) {
    return lockingPoolObj.connect(signer).forceUnlock(sequencerId,l2Gas)
}

async function batchSubmitReward(lockingPoolObj,signer, params) {
    let signature = await calcSignature(params);
    // console.log("signature:", signature);
    
    return lockingPoolObj.connect(signer).batchSubmitRewards(params.batchId,
        params.signer.address,
        params.startEpoch,
        params.endEpoch,
        params.sequencers,
        params.finishedBlocks,
        signature)
}

async function calcSignature(params) {
    let message = ethers.utils.solidityPack(["uint256","uint256", "uint256", "uint256", "address[]", "uint256[]", "address"], [
        params.chainId,
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
    return sequencerInfo.reward;
}