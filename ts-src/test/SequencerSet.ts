import { ethers, deployments } from "hardhat";
import { expect } from "chai";
import {
  loadFixture,
  mineUpTo,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

const initStartBlock = 400n;
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

  it("finalizedEpoch", async () => {
    const { seqset, mpc, seq1, seq0 } = await loadFixture(fixture);

    // current epoch
    const currentEpochNumber = await seqset.currentEpochNumber();
    let nextEpochNumber = currentEpochNumber + 1n;

    await seqset.connect(mpc).commitEpoch(nextEpochNumber, 600, 799, seq1);

    // epoch 0 but not exists
    {
      const [{ number, startBlock, endBlock, signer }, valid] =
        await seqset.finalizedEpoch();
      expect(number).eq(0);
      expect(startBlock).eq(initStartBlock);
      expect(endBlock).eq(initEndBlock);
      expect(signer).eq(seq0.address);
      expect(valid).eq(false);

      expect(await seqset.finalizedBlock(), "finalizedBlock-0").eq(
        initStartBlock - 1n,
      );
    }

    await mineUpTo(700);
    nextEpochNumber++;
    await seqset.connect(mpc).commitEpoch(nextEpochNumber, 800, 999, seq0);

    // epoch 0 and exists
    {
      const [{ number, startBlock, endBlock, signer }, valid] =
        await seqset.finalizedEpoch();
      expect(number).eq(0);
      expect(startBlock).eq(initStartBlock);
      expect(endBlock).eq(initEndBlock);
      expect(signer).eq(seq0.address);
      expect(valid).eq(true);
      expect(await seqset.finalizedBlock(), "finalizedBlock-1").eq(
        initEndBlock,
      );
    }

    await mineUpTo(900);
    nextEpochNumber++;
    await seqset.connect(mpc).commitEpoch(nextEpochNumber, 1000, 1199, seq1);
    {
      const [{ number, startBlock, endBlock, signer }, valid] =
        await seqset.finalizedEpoch();
      expect(number).eq(nextEpochNumber - 2n);
      expect(startBlock).eq(600);
      expect(endBlock).eq(799);
      expect(signer).eq(seq1.address);
      expect(valid).eq(true);
      expect(await seqset.finalizedBlock(), "finalizedBlock-2").eq(799);
    }
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
    ).to.revertedWith("Invalid new epoch number");

    await expect(
      seqset.connect(mpc).commitEpoch(currentEpochNumber + 1n, 900, 799, seq1),
    ).to.revertedWith("End block must be greater than start block");

    await expect(
      seqset.connect(mpc).commitEpoch(currentEpochNumber + 1n, 600, 699, seq1),
    ).to.revertedWith("Mismatch epoch length and block length");

    // epoch 1
    await expect(
      seqset.connect(mpc).commitEpoch(currentEpochNumber + 1n, 601, 800, seq1),
    ).to.revertedWith(
      "Start block must be greater than currentEpoch.endBlock by 1",
    );

    let nextEpochNumber = currentEpochNumber + 1n;

    await expect(
      seqset
        .connect(mpc)
        .commitEpoch(nextEpochNumber, 600, 799, ethers.ZeroAddress),
    ).to.revertedWith("Invalid signer");

    await expect(
      await seqset.connect(mpc).commitEpoch(nextEpochNumber, 600, 799, seq1),
    )
      .with.emit(seqset, "NewEpoch")
      .withArgs(nextEpochNumber, 600, 799, seq1.address);

    // new epoch
    expect(await seqset.currentEpochNumber()).to.equal(nextEpochNumber);
    expect(await seqset.getEpochByBlock(650)).to.equal(nextEpochNumber);
    expect(await seqset.getMetisSequencer(650)).to.equal(seq1.address);

    // assert epoch value
    {
      const { number, startBlock, endBlock, signer } =
        await seqset.epochs(nextEpochNumber);
      expect(number).to.be.equal(nextEpochNumber);
      expect(startBlock).to.be.equal(600n);
      expect(endBlock).to.be.equal(799n);
      expect(signer).to.be.equal(seq1.address);
    }

    nextEpochNumber += 1n;
    // epoch 2
    await expect(
      await seqset.connect(mpc).commitEpoch(nextEpochNumber, 800, 999, seq1),
    )
      .with.emit(seqset, "NewEpoch")
      .withArgs(nextEpochNumber, 800, 999, seq1.address);

    // epoch 3 should wait for ending of epoch 1
    nextEpochNumber += 1n;
    await expect(
      seqset.connect(mpc).commitEpoch(nextEpochNumber, 1000, 1199, seq1),
      "epoch 3 can't be committed since the epoch 1 is not finished",
    ).revertedWith("The last epoch not finished");

    mineUpTo(810);
    await expect(
      await seqset.connect(mpc).commitEpoch(nextEpochNumber, 1000, 1199, seq1),
      "epoch 3 can be committed after block 810",
    )
      .with.emit(seqset, "NewEpoch")
      .withArgs(nextEpochNumber, 1000, 1199, seq1.address);
  });

  it("recommit epoch", async () => {
    const { seqset, mpc, seq0, seq1 } = await loadFixture(fixture);

    // commit
    await seqset.connect(mpc).commitEpoch(1, 600, 799, seq1);

    await mineUpTo(595);

    // block 596
    await expect(seqset.recommitEpoch(1, 2, 596, 799, seq1)).to.revertedWith(
      "Not Mpc",
    );

    // block 597
    await expect(
      seqset.connect(mpc).recommitEpoch(1, 2, 597, 800, ethers.ZeroAddress),
    ).to.revertedWith("Invalid signer");

    await mineUpTo(598);

    // block 599
    await expect(
      seqset.connect(mpc).recommitEpoch(1, 3, 599, 799, seq1),
    ).to.revertedWith("Invalid newEpochId");

    // block 600
    await expect(
      seqset.connect(mpc).recommitEpoch(1, 2, 600, 598, seq1),
    ).to.revertedWith("End block must be greater than start block");

    // block 601 / set epoch 2, block 800-999
    await seqset.connect(mpc).commitEpoch(2, 800, 999, seq1);

    await mineUpTo(699);

    // block 700
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

    // block 900, recommit on epoch 2, the latest epoch, should update epoch 2 add new epoch 3
    // epoch 3, 900...1099
    {
      await expect(
        await seqset.connect(mpc).recommitEpoch(2, 3, 900, 1099, seq0),
        "recommitEpoch at block 900",
      )
        .emit(seqset, "ReCommitEpoch")
        .withArgs(2, 3, 2, 900, 1099, seq0.address);

      expect(
        await seqset.currentEpochNumber(),
        "current epoch id is 3 after recommitting epoch 2",
      ).eq(3);
      const {
        signer: epoch2Signer,
        startBlock: epoc2StartBlock,
        endBlock: epoch2EndBlock,
      } = await seqset.epochs(2);
      expect(epoch2Signer, "epoch2Signer").eq(seq1.address);
      expect(epoc2StartBlock, "epoc2StartBlock").eq(800);
      expect(epoch2EndBlock, "epoch2EndBlock").eq(899);

      const {
        signer: epoch3Signer,
        startBlock: epoc3StartBlock,
        endBlock: epoch3EndBlock,
      } = await seqset.epochs(3);
      expect(epoch3Signer, "epoch3Signer").eq(seq0.address);
      expect(epoc3StartBlock, "epoc3StartBlock").eq(900);
      expect(epoch3EndBlock, "epoch3EndBlock").eq(1099);

      // check block epoch
      expect(
        await seqset.getEpochByBlock(899),
        "epoch id of block 899 is 2",
      ).to.equal(2);
      expect(
        await seqset.getEpochByBlock(900),
        "epoch id of block 900 is 3",
      ).to.equal(3);
    }

    // commit
    await mineUpTo(999);
    // block 1000, add epoch 4, 1100-1299
    await seqset.connect(mpc).commitEpoch(4, 1100, 1299, seq1);
    await mineUpTo(1200);
    // block 1201, add epoch 5, 1300-1499
    await seqset.connect(mpc).commitEpoch(5, 1300, 1499, seq1);
    await mineUpTo(1319);
    // block 1320 the epoch 4 has been finished
    await expect(
      seqset.connect(mpc).recommitEpoch(4, 5, 1320, 1700, seq1),
    ).to.be.revertedWith("The last epoch is finished");
    // block 1321, add epoch 5, 1500-1699
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
    // block 1361, recommit on epoch 5, the last but one epoch
    // and the epoch 5 and 6 should be updated
    {
      await expect(
        await seqset.connect(mpc).recommitEpoch(5, 6, 1361, 1700, seq0),
        "recommitEpoch at block 1361",
      )
        .emit(seqset, "ReCommitEpoch")
        .withArgs(5, 6, 6, 1361, 1700, seq0.address);

      expect(
        await seqset.currentEpochNumber(),
        "current epoch id is 6 after recommitting epoch 5",
      ).eq(6);
      const {
        signer: epoch5Signer,
        startBlock: epoc5StartBlock,
        endBlock: epoch5EndBlock,
      } = await seqset.epochs(5);
      expect(epoch5Signer, "epoch5Signer").eq(seq1.address);
      expect(epoc5StartBlock, "epoc5StartBlock").eq(1300);
      expect(epoch5EndBlock, "epoch5EndBlock").eq(1360);

      const {
        signer: epoch6Signer,
        startBlock: epoc6StartBlock,
        endBlock: epoch6EndBlock,
      } = await seqset.epochs(6);
      expect(epoch6Signer, "epoch6Signer").eq(seq0.address);
      expect(epoc6StartBlock, "epoc6StartBlock").eq(1361);
      expect(epoch6EndBlock, "epoch6EndBlock").eq(1700);
    }
  });
});
