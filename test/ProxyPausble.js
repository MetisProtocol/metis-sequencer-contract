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
        const ProxyPauseableTest = await ethers.getContractFactory('ProxyPauseableTest');
        const govPauseableProxy = await upgrades.deployProxy(ProxyPauseableTest, [wallets[0].address]);
        await govPauseableProxy.deployed();
        // console.log("gov:", govProxy.address);

        govP = await ethers.getContractAt('ProxyPauseableTest', govPauseableProxy.address);
    })

    it('pause ', async () => {
        await govP.setPause();
        await expect(govP.connect(wallets[1]).setPause()).to.be.revertedWith("Only Proxy contract is authorized");
    })

    it('unpause ', async () => {
        await govP.setPause();
         await govP.setUnpause();
         await expect(govP.connect(wallets[1]).setUnpause()).to.be.revertedWith("Only Proxy contract is authorized");
    })
})