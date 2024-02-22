import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("lockingNFT", async () => {
  async function fixture() {
    const factory = await ethers.getContractFactory("LockingNFT");
    const lockingNFT = await factory.deploy("Metis Sequencer", "MS");
    const [wallet, other, other1, other2] = await ethers.getSigners();
    return { lockingNFT, wallet, other, other1, other2 };
  }

  it("name,symbol", async () => {
    const LockingNFTFactory = await ethers.getContractFactory("LockingNFT");
    await expect(LockingNFTFactory.deploy("", "SYMBOL")).to.be.revertedWith(
      "invalid name",
    );

    await expect(LockingNFTFactory.deploy("NAME", "")).to.be.revertedWith(
      "invalid symbol",
    );

    const name = "Metis Sequencer";
    const symbol = "MS";

    const token = await LockingNFTFactory.deploy(name, symbol);
    expect(await token.name(), name);
    expect(await token.symbol(), symbol);
  });

  it("mint NFT", async () => {
    const { lockingNFT, wallet } = await loadFixture(fixture);

    await lockingNFT.mint(wallet.address, 1);
    let ownerOfTokenId1 = await lockingNFT.ownerOf(1);
    expect(ownerOfTokenId1).to.eq(wallet.address);

    await expect(lockingNFT.mint(wallet.address, 2)).to.be.revertedWith(
      "Sequencers MUST NOT own multiple lock position",
    );
  });

  it("burn NFT", async () => {
    const { lockingNFT, wallet } = await loadFixture(fixture);

    await lockingNFT.mint(wallet.address, 2);
    await lockingNFT.burn(2);
    await expect(lockingNFT.ownerOf(2)).to.be.revertedWith(
      "ERC721: invalid token ID",
    );
  });

  it("transfer NFT", async () => {
    const { lockingNFT, wallet, other, other1, other2 } =
      await loadFixture(fixture);

    await lockingNFT.mint(wallet.address, 3);

    await lockingNFT.approve(other.address, 3);
    await lockingNFT.transferFrom(wallet.address, other.address, 3);

    let ownerOfTokenId3 = await lockingNFT.ownerOf(3);
    expect(ownerOfTokenId3).to.eq(other.address);

    await lockingNFT.connect(other).approve(other1.address, 3);
    await expect(
      lockingNFT.connect(other).transferFrom(other.address, other1.address, 3),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await lockingNFT.mint(other2.address, 4);
    await lockingNFT.transferOwnership(other.address);
    await lockingNFT.connect(other).approve(other2.address, 3);
    await expect(
      lockingNFT.connect(other).transferFrom(other.address, other2.address, 3),
    ).to.be.revertedWith("Sequencers MUST NOT own multiple lock position");
  });
});
