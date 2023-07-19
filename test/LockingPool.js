const {ethers} = require("hardhat");
const {expect} = require('chai');
const web3 = require("web3");
// const {time,mineUpTo,reset} = require("@nomicfoundation/hardhat-network-helpers");

describe('LockingPoolTest', async () => {
    let wallets;
    let gov;
    let lockingPool;
    let lockingNFT;
    let l1MetisToken;
    let admin;
    let user1;
    let user2;
    let mpc;

    before('get wallets', async () => {
        wallets = await ethers.getSigners();
        admin = wallets[0];
        user1 = wallets[1];
        user2 = wallets[2];
        mpc = user1.address;
    })

    beforeEach('create contracts', async () => {
        const mintAmount = web3.utils.toWei('10000000');
        // deploy test ERC20
        const TestERC20 = await ethers.getContractFactory('TestERC20');
        let testERC20 = await TestERC20.deploy(mintAmount);
        l1MetisToken = testERC20.address;
        console.log("l1MetisToken:", l1MetisToken);

        // deploy gov
        const Governance = await ethers.getContractFactory('Governance');
        gov = await Governance.deploy();
        await gov.initialize();
        console.log("gov:", gov.address);

        // deploy NFT
        const LockingNFT = await ethers.getContractFactory('LockingNFTTest');
        lockingNFT = await LockingNFT.deploy();
        console.log("lockingNFT:", lockingNFT.address);

        console.log("mpc:", mpc);
        // deploy Locking Pool
        const LockingPool = await ethers.getContractFactory('LockingPoolTest');
        lockingPool = await LockingPool.deploy(
                gov.address,
                l1MetisToken,
                lockingNFT.address,
                mpc
            );
        console.log("lockingPool:", lockingPool.address);

        // transfer NFT owner
        await lockingNFT.transferOwnership(lockingPool.address);

        // deploy Locking info
        const LockingInfoTest = await ethers.getContractFactory('LockingInfoTest');
        lockingInfo = await LockingInfoTest.deploy(lockingPool.address);
        console.log("lockingPool:", lockingPool.address);


        // set logger address
        await updateLockingPoolLoggerAddress(gov, lockingInfo.address, lockingPool.address);

        console.log("admin:", admin.address);
        console.log("user1:", user1.address);
        console.log("user2:", user2.address);

        // token approve
        await testERC20.connect(admin).approve(lockingPool.address, ethers.constants.MaxUint256);
        await testERC20.connect(user1).approve(lockingPool.address, ethers.constants.MaxUint256);
        await testERC20.connect(user2).approve(lockingPool.address, ethers.constants.MaxUint256);

        await testERC20.transfer(user1.address, web3.utils.toWei('100000'));
        await testERC20.transfer(user2.address, web3.utils.toWei('100000'));
        await testERC20.transfer("0x70fB083ab9bC2ED3C4CeBE08054e82827368ed1E", web3.utils.toWei('100000'));
    })

    it('lock for sequencer', async () => {
        console.log("lockingPool:", lockingPool.address);

        // let testPri1 = "0x1f9a552c0aad1f104401316375f0737bba5fba0b34a83b0069f2a02c57514a0c"
        let testPub1 = "0xeeef8d4d35c9dc2d64df24af6bb4be3b08557a995b2907d97039c536f96477fecbd56bb78fdcde962ccaa579dcc75376e7839f6211cf62cea8b2871b84106674";
        let addr1 = "0x70fB083ab9bC2ED3C4CeBE08054e82827368ed1E";

        const lockAmount = web3.utils.toWei('2');
        console.log("lockAmount:", lockAmount);

         // lock token
         let lockToken = await lockingPool.token();
         expect(lockToken).to.eq(l1MetisToken);

         // lock for
        await lockingPool.connect(admin).lockFor(addr1, lockAmount, testPub1);
        let nftCounter = await lockingPool.NFTCounter();
        expect(nftCounter).to.eq(2);

        // nft owner
        let nftOwner = await lockingPool.ownerOf(nftCounter-1);
        expect(nftOwner).to.eq(addr1);

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
})

async function updateLockingPoolLoggerAddress(govObj,loggerAddress,lockingPoolAddress) {
    let ABI = [
        "function updateLockingInfo(address _lockingInfo)"
    ];
    let iface = new ethers.utils.Interface(ABI);
    let updateLockingInfoEncodeData = iface.encodeFunctionData("updateLockingInfo", [
        loggerAddress,
    ])
    console.log("updateLockingInfo: ", updateLockingInfoEncodeData)

    return govObj.update(
        lockingPoolAddress,
        updateLockingInfoEncodeData
    )
}
