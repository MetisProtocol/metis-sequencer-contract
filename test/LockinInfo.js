const {
    ethers
} = require("hardhat");
const {
    expect
} = require('chai');

describe('LockingInfo', async () => {
    let wallets;
    let lockingInfo;

    before('get wallets', async () => {
        wallets = await ethers.getSigners();

        const balance = await wallets[0].getBalance();
        console.log("admin balance:", ethers.utils.formatEther(balance));
    })

    beforeEach('create locking Info', async () => {
        const LockingInfo = await ethers.getContractFactory('LockingInfo');
        lockingInfo = await LockingInfo.deploy(wallets[0].address);
    })

    it('update nonce', async () => {
       await expect(lockingInfo.updateNonce([1, 2], [3])).to.be.revertedWith("args length mismatch");
       await lockingInfo.updateNonce([1, 2], [3,4]);
    })

    it('log locked', async () => {
        await lockingInfo.logLocked(wallets[0].address,[1,2,3],1,2,2,5);
        await expect(lockingInfo.connect(wallets[1]).logLocked(wallets[0].address, [1,2,3], 1, 2, 2, 5)).to.be.revertedWith("Invalid sender, not locking pool");
    })

    it('log unlocked', async () => {
        await lockingInfo.logUnlocked(wallets[0].address, 1, 2, 5);
        await expect(lockingInfo.connect(wallets[1]).logUnlocked(wallets[0].address, 1, 2, 5)).to.be.revertedWith("Invalid sender, not locking pool");
    })

    it('log unlock init', async () => {
        await lockingInfo.logUnlockInit(wallets[0].address, 1, 2, 100, 200, 5);
        await expect(lockingInfo.connect(wallets[1]).logUnlockInit(wallets[0].address, 1, 2, 100, 200, 5)).to.be.revertedWith("Invalid sender, not locking pool");
    })

    it('log signer change', async () => {
        await lockingInfo.logSignerChange(1, wallets[0].address, wallets[1].address, [1,2,3]);
        await expect(lockingInfo.connect(wallets[1]).logSignerChange(1, wallets[0].address, wallets[1].address, [1,2,3])).to.be.revertedWith("Invalid sender, not locking pool");
    })

    it('log relock', async () => {
        await lockingInfo.logRelockd(1, 2,5);
        await expect(lockingInfo.connect(wallets[1]).logRelockd(1, 2, 5)).to.be.revertedWith("Invalid sender, not locking pool");
    })

    it('log ThresholdChange', async () => {
        await lockingInfo.logThresholdChange(1, 2);
        await expect(lockingInfo.connect(wallets[1]).logThresholdChange(1, 2)).to.be.revertedWith("Invalid sender, not locking pool");
    })

    it('log WithrawDelayTimeChange', async () => {
        await lockingInfo.logWithrawDelayTimeChange(1, 2);
        await expect(lockingInfo.connect(wallets[1]).logWithrawDelayTimeChange(1, 2)).to.be.revertedWith("Invalid sender, not locking pool");
    })

    it('log RewardUpdate', async () => {
        await lockingInfo.logRewardUpdate(1, 2);
        await expect(lockingInfo.connect(wallets[1]).logRewardUpdate(1, 2)).to.be.revertedWith("Invalid sender, not locking pool");
    })

    it('log LockUpdate', async () => {
        await lockingInfo.logLockUpdate(1, 100);
        await expect(lockingInfo.connect(wallets[1]).logLockUpdate(1, 100)).to.be.revertedWith("Invalid sender, not locking pool");
    })

    it('log ClaimRewards', async () => {
        await lockingInfo.logClaimRewards(1, 100,200);
        await expect(lockingInfo.connect(wallets[1]).logClaimRewards(1, 100, 200)).to.be.revertedWith("Invalid sender, not locking pool");
    })
})