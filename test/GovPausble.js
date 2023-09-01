const {
    ethers,
    upgrades
} = require("hardhat");

const {
    expect
} = require('chai');

const zeroAddress = "0x0000000000000000000000000000000000000000";

describe('GovPauseable', async () => {
    let wallets;
    let govP;

    before('get wallets', async () => {
        wallets = await ethers.getSigners();

        const balance = await wallets[0].getBalance();
        console.log("admin balance:", ethers.utils.formatEther(balance));
    })

    beforeEach('create govPause', async () => {
        // deploy gov
        const GovernancePauseableTest = await ethers.getContractFactory('GovernancePauseableTest');
        const govPauseableProxy = await upgrades.deployProxy(GovernancePauseableTest, [wallets[0].address]);
        await govPauseableProxy.deployed();
        // console.log("gov:", govProxy.address);

        govP = await ethers.getContractAt('GovernancePauseableTest', govPauseableProxy.address);
    })

    it('pause ', async () => {
        await govP.setPause();
        await expect(govP.connect(wallets[1]).setPause()).to.be.revertedWith("Only governance contract is authorized");
    })

    it('unpause ', async () => {
        await govP.setPause();
         await govP.setUnpause();
         await expect(govP.connect(wallets[1]).setUnpause()).to.be.revertedWith("Only governance contract is authorized");
    })
})