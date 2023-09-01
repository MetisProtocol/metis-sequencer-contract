const {ethers} = require("hardhat");
const {expect} = require('chai');

describe('LockingNFT', async () => {
    let wallets;
    let lockingNFT;

    before('get wallets', async () => {
        wallets = await ethers.getSigners();

        const balance = await wallets[0].getBalance();
        console.log("admin balance:", ethers.utils.formatEther(balance));
    })

    beforeEach('create locking NFT', async () => {
        const LockingNFT = await ethers.getContractFactory('LockingNFT');
        await expect(LockingNFT.deploy("","SYMBOL")).to.be.revertedWith("invalid name");
        await expect(LockingNFT.deploy("NAME", "")).to.be.revertedWith("invalid symbol");

        lockingNFT = await LockingNFT.deploy("Metis Sequencer", "MS");
    })

    it('mint NFT', async () => {
        // console.log("mint NFT for address:", wallets[0].address);
        await lockingNFT.mint(wallets[0].address,1);
        let ownerOfTokenId1 = await lockingNFT.ownerOf(1);
        expect(ownerOfTokenId1).to.eq(wallets[0].address);

        await expect(lockingNFT.mint(wallets[0].address, 2)).to.be.revertedWith("Sequencers MUST NOT own multiple lock position");
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

        await lockingNFT.connect(wallets[1]).approve(wallets[2].address, 3);
        await expect(lockingNFT.connect(wallets[1]).transferFrom(wallets[1].address, wallets[2].address, 3)).to.be.revertedWith("Ownable: caller is not the owner");

        await lockingNFT.mint(wallets[3].address, 4);
        await lockingNFT.transferOwnership(wallets[1].address);
        await lockingNFT.connect(wallets[1]).approve(wallets[3].address, 3);
        await expect(lockingNFT.connect(wallets[1]).transferFrom(wallets[1].address, wallets[3].address, 3)).to.be.revertedWith("Sequencers MUST NOT own multiple lock position");
    })
})
