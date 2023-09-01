const {
    ethers,
    upgrades
} = require("hardhat");

const {
    expect
} = require('chai');

const zeroAddress = "0x0000000000000000000000000000000000000000";

describe('Pauseable', async () => {
    let wallets;
    let pt;

    before('get wallets', async () => {
        wallets = await ethers.getSigners();

        const balance = await wallets[0].getBalance();
        console.log("admin balance:", ethers.utils.formatEther(balance));
    })

    beforeEach('create govPause', async () => {
        // deploy gov
        const PauseableTest = await ethers.getContractFactory('PauseableTest');
        const pauseable = await upgrades.deployProxy(PauseableTest, []);
        await pauseable.deployed();

        pt = await ethers.getContractAt('GovernancePauseableTest', pauseable.address);
    })

    it('pause ', async () => {
        let result = await pt.paused();
        expect(result).eq(false);
        await pt.setPause();

        result = await pt.paused();
        await expect(result).eq(true);

        await expect(pt.setPause()).to.be.revertedWith("EnforcedPause");
    })

    it('unpause ', async () => {
        let result = await pt.paused();
        expect(result).eq(false);
        await pt.setPause();

        result = await pt.paused();
        await expect(result).eq(true);

        await pt.setUnpause();
        await expect(pt.setUnpause()).to.be.revertedWith("ExpectedPause");
    })
})