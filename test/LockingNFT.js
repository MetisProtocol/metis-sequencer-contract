const {ethers} = require("hardhat");
const {expect} = require('chai');

describe('LockingNFTTest', async () => {
    let wallets;
    let lockingNFT;

    before('get wallets', async () => {
        wallets = await ethers.getSigners();

        const balance = await wallets[0].getBalance();
        console.log("admin balance:", ethers.utils.formatEther(balance));
    })

    beforeEach('create locking NFT', async () => {
        const LockingNFTTest = await ethers.getContractFactory('LockingNFTTest');
        lockingNFT = await LockingNFTTest.deploy();
    })

    it('mint NFT', async () => {
        // console.log("mint NFT for address:", wallets[0].address);
        await lockingNFT.mint(wallets[0].address,1);
        let ownerOfTokenId1 = await lockingNFT.ownerOf(1);
        expect(ownerOfTokenId1).to.eq(wallets[0].address);
    })

    it('burn NFT', async () => {
        // console.log("mint NFT 1 for address:", wallets[0].address);
        await lockingNFT.mint(wallets[0].address, 2);
        // console.log("burn NFT 1 of address:", wallets[0].address);
        await lockingNFT.burn(2);
        await expect(lockingNFT.ownerOf(2)).to.be.revertedWith("ERC721: invalid token ID");
    })

    it('transfer NFT', async () => {
        // console.log("mint NFT 3 for address:", wallets[0].address);
        await lockingNFT.mint(wallets[0].address, 3);
        // console.log("transfer NFT 3 from address:", wallets[0].address, " to address:", wallets[1].address);

        await lockingNFT.approve(wallets[1].address, 3);
        await lockingNFT.transferFrom(wallets[0].address, wallets[1].address, 3);

        let ownerOfTokenId3 = await lockingNFT.ownerOf(3);
        expect(ownerOfTokenId3).to.eq(wallets[1].address);
    })
})
