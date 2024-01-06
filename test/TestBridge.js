const {
    ethers,
} = require("hardhat");

const {
    expect
} = require('chai');

const zeroAddress = "0x0000000000000000000000000000000000000000";

describe('TestBridge', async () => {
    let wallets;
    let testBridge;

    before('get wallets', async () => {
        wallets = await ethers.getSigners();

        const balance = await wallets[0].getBalance();
        console.log("admin balance:", ethers.utils.formatEther(balance));
    })

    beforeEach('create Bridge', async () => {
        const TestBridge = await ethers.getContractFactory('TestBridge');
        testBridge = await TestBridge.deploy();
    })

    it('depositERC20ToByChainId ', async () => {
        await testBridge.depositERC20ToByChainId(
            59901,
            zeroAddress,
            zeroAddress,
            zeroAddress,
            1,
            200000,
            "0x00"
        );
    })
})