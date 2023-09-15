const {
    ethers,
    upgrades
} = require("hardhat");

const {
    expect
} = require('chai');

const zeroAddress = "0x0000000000000000000000000000000000000000";

describe('Proxy', async () => {
    let wallets;
    let gov;
    let testERC20;

    before('get wallets', async () => {
        wallets = await ethers.getSigners();

        const balance = await wallets[0].getBalance();
        console.log("admin balance:", ethers.utils.formatEther(balance));
    })

    beforeEach('create gov', async () => {
        // deploy gov
        const Proxy = await ethers.getContractFactory('Proxy');
        const govProxy = await upgrades.deployProxy(Proxy, []);
        await govProxy.deployed();
        // console.log("gov:", govProxy.address);

        gov = await ethers.getContractAt('Proxy', govProxy.address);

        const TestERC20 = await ethers.getContractFactory('TestERC20');
        const mintAmount = ethers.utils.parseEther('10000000');
        testERC20 = await TestERC20.deploy(mintAmount);
    })

    it('update ', async () => {
        await expect(gov.connect(wallets[1]).update(zeroAddress, [1, 2, 3])).to.be.revertedWith("Ownable: caller is not the owner");
        await expect(gov.update(zeroAddress, [1, 2, 3])).to.be.revertedWith("invalid target");
        await gov.update(wallets[1].address, [1, 2, 3]);
        await expect(gov.update(testERC20.address, [1, 2, 3])).to.be.revertedWith("Update failed");
    })
})