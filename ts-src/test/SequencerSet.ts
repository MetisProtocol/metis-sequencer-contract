import { ethers, deployments } from "hardhat";
import { expect } from "chai";
import {
  loadFixture,
  mineUpTo,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

const initStartBlock = 1n;
const initEndBlock = 599n;
const initEpochLen = 200n;

describe("MetisSequencerSet", async () => {
  async function fixture() {
    const [admin, mpc, seq0, seq1, ...others] = await ethers.getSigners();

    const deploy = await deployments.deploy("MetisSequencerSet", {
      from: admin.address,
      proxy: {
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          init: {
            methodName: "initialize",
            args: [
              seq0.address,
              mpc.address,
              initStartBlock,
              initEndBlock,
              initEpochLen,
            ],
          },
        },
      },
    });

    const seqset = await ethers.getContractAt(
      "MetisSequencerSet",
      deploy.address,
    );

    return { seqset, admin, seq0, seq1, mpc, others };
  }

  it("mpc,owner,init values...", async () => {
    const { seqset, admin, seq0, mpc } = await loadFixture(fixture);
    await expect(
      seqset.initialize(seq0, mpc, initStartBlock, initEndBlock, initEpochLen),
    ).to.be.revertedWith("Initializable: contract is already initialized");

    expect(await seqset.owner()).to.be.eq(admin.address);
    expect(await seqset.mpcAddress()).to.be.eq(mpc.address);
    expect(await seqset.epochLength()).to.be.eq(initEpochLen);

    {
      const { number, startBlock, endBlock, signer } = await seqset.epochs(0n);
      expect(number).to.be.equal(0n);
      expect(startBlock).to.be.equal(initStartBlock);
      expect(endBlock).to.be.equal(initEndBlock);
      expect(signer).to.be.equal(seq0.address);
    }
  });

  it("UpdateMpcAddress", async () => {
    const { seqset, others } = await loadFixture(fixture);

    await expect(
      seqset.connect(others[0]).UpdateMpcAddress(others[1]),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(seqset.UpdateMpcAddress(ethers.ZeroAddress)).to.revertedWith(
      "Invalid new mpc",
    );

    await seqset.UpdateMpcAddress(others[0].address);

    expect(await seqset.mpcAddress()).to.be.eq(others[0].address);
  });

  it("UpdateEpochLength", async () => {
    const { seqset, mpc, others } = await loadFixture(fixture);

    await expect(seqset.UpdateEpochLength(0)).to.revertedWith(
      "Invalid new epoch length",
    );

    await expect(
      seqset.connect(others[1]).UpdateEpochLength(100),
    ).to.revertedWith("Not Mpc or Owner");

    // mpc and owner
    await seqset.UpdateEpochLength(300);
    expect(await seqset.epochLength()).to.equal(300);
    await seqset.connect(mpc).UpdateEpochLength(200);
    expect(await seqset.epochLength()).to.equal(200);
  });

  it("commitEpoch", async () => {
    const { seqset, mpc, seq1 } = await loadFixture(fixture);

    // current epoch
    const currentEpochNumber = await seqset.currentEpochNumber();

    // commit
    await expect(
      seqset.commitEpoch(currentEpochNumber + 1n, 600, 799, seq1),
    ).to.revertedWith("Not Mpc");

    await expect(
      seqset.connect(mpc).commitEpoch(currentEpochNumber + 2n, 600, 799, seq1),
    ).to.revertedWith("Invalid epoch id");

    await expect(
      seqset.connect(mpc).commitEpoch(currentEpochNumber + 1n, 900, 799, seq1),
    ).to.revertedWith("End block must be greater than start block");

    await expect(
      seqset.connect(mpc).commitEpoch(currentEpochNumber + 1n, 600, 699, seq1),
    ).to.revertedWith("Mismatch epoch length and block length");

    await expect(
      seqset.connect(mpc).commitEpoch(currentEpochNumber + 1n, 601, 800, seq1),
    ).to.revertedWith(
      "Start block must be greater than currentEpoch.endBlock by 1",
    );

    const latestEpochNumber = currentEpochNumber + 1n;
    expect(
      await seqset.connect(mpc).commitEpoch(latestEpochNumber, 600, 799, seq1),
    )
      .with.emit(seqset, "NewEpoch")
      .withArgs(latestEpochNumber, 600, 799);

    // new epoch
    expect(await seqset.currentEpochNumber()).to.equal(latestEpochNumber);
    expect(await seqset.getEpochByBlock(650)).to.equal(latestEpochNumber);
    expect(await seqset.getMetisSequencer(650)).to.equal(seq1.address);

    // assert epoch value
    {
      const { number, startBlock, endBlock, signer } =
        await seqset.epochs(latestEpochNumber);
      expect(number).to.be.equal(latestEpochNumber);
      expect(startBlock).to.be.equal(600n);
      expect(endBlock).to.be.equal(799n);
      expect(signer).to.be.equal(seq1.address);
    }
  });

  it("recommit epoch", async () => {
    const { seqset, mpc, seq1 } = await loadFixture(fixture);

    // commit
    await seqset.connect(mpc).commitEpoch(1, 600, 799, seq1);

    await mineUpTo(595);

    // block 596
    await expect(seqset.recommitEpoch(1, 2, 596, 799, seq1)).to.revertedWith(
      "Not Mpc",
    );

    await mineUpTo(598);

    // block 599
    await expect(
      seqset.connect(mpc).recommitEpoch(1, 3, 599, 799, seq1),
    ).to.revertedWith("Invalid newEpochId");

    // block 600
    await expect(
      seqset.connect(mpc).recommitEpoch(1, 2, 600, 598, seq1),
    ).to.revertedWith("End block must be greater than start block");

    // block 601 / set epoch 2
    await seqset.connect(mpc).commitEpoch(2, 800, 999, seq1);

    await mineUpTo(699);

    // block 699
    await expect(
      seqset.connect(mpc).recommitEpoch(1, 2, 699, 898, seq1),
    ).to.revertedWith("Invalid start block");

    await mineUpTo(705);

    // block 706
    await expect(
      seqset.connect(mpc).recommitEpoch(3, 4, 706, 901, seq1),
    ).to.revertedWith("Invalid oldEpochId");

    await mineUpTo(710);

    // block 711
    await expect(
      seqset.connect(mpc).recommitEpoch(1, 2, 711, 688, seq1),
    ).to.revertedWith("End block must be greater than start block");

    await mineUpTo(899);
    await seqset.connect(mpc).recommitEpoch(2, 3, 900, 1099, seq1);

    // check block epoch
    expect(await seqset.getEpochByBlock(899)).to.equal(2);
    expect(await seqset.getEpochByBlock(900)).to.equal(3);

    // commit
    await mineUpTo(999);
    await seqset.connect(mpc).commitEpoch(4, 1100, 1299, seq1);
    await seqset.connect(mpc).commitEpoch(5, 1300, 1499, seq1);
    await seqset.connect(mpc).commitEpoch(6, 1500, 1699, seq1);

    await mineUpTo(1349);
    await expect(
      seqset.connect(mpc).recommitEpoch(5, 7, 1350, 1700, seq1),
    ).to.be.revertedWith("Invalid newEpochId");

    await mineUpTo(1355);
    await expect(
      seqset.connect(mpc).recommitEpoch(5, 6, 1356, 1340, seq1),
    ).to.be.revertedWith("End block must be greater than start block");

    await mineUpTo(1360);
    await seqset.connect(mpc).recommitEpoch(5, 6, 1361, 1700, seq1);
  });
});
