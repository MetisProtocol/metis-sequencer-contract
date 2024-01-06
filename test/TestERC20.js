const {
    ethers,
} = require("hardhat");

const {
    expect
} = require('chai');

const zeroAddress = "0x0000000000000000000000000000000000000000";

describe('TestERC20', async () => {
    let wallets;
    let testERC20;

    before('get wallets', async () => {
        wallets = await ethers.getSigners();

        const balance = await wallets[0].getBalance();
        console.log("admin balance:", ethers.utils.formatEther(balance));
    })

    beforeEach('create ERC20', async () => {
        const TestERC20 = await ethers.getContractFactory('TestERC20');
        const mintAmount = ethers.utils.parseEther('10000000');
        testERC20 = await TestERC20.deploy(mintAmount);
    })

    it('balance ', async () => {
        const mintAmount = ethers.utils.parseEther('10000000');
        let erc20Balance = await testERC20.balanceOf(wallets[0].address);
        expect(erc20Balance).equals(mintAmount);

        await testERC20.mint(wallets[0].address, mintAmount);
        erc20Balance = await testERC20.balanceOf(wallets[0].address);
        const baAmount = ethers.utils.parseEther('20000000');
        expect(erc20Balance).equals(baAmount);
    })
})