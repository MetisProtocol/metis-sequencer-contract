import { ethers, deployments } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const zeroAddress = ethers.ZeroAddress;
const l2MetisAddr = "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000";

const trimPubKeyPrefix = (key: string) => {
  if (key.startsWith("0x")) {
    key = key.slice(2);
  }
  if (key.startsWith("04")) {
    key = key.slice(2);
  }
  return Buffer.from(key, "hex");
};

describe("LockingPool", async () => {
  async function fixture() {
    const wallets = new Array(5)
      .fill(null)
      .map(() => ethers.Wallet.createRandom(ethers.provider));

    const [admin, mpc, ...others] = await ethers.getSigners();

    // deploy test bridge
    const TestBridge = await ethers.getContractFactory("TestBridge");
    const l1Bridge = await TestBridge.deploy();

    // deploy test ERC20
    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const metisToken = await TestERC20.deploy(0);

    const mintAmount = ethers.parseEther("1000");
    for (const wallet of wallets) {
      await admin.sendTransaction({
        to: wallet.address,
        value: ethers.parseEther("10"),
      });
      await metisToken.mint(wallet, mintAmount);
    }

    const LockingNFT = await ethers.getContractFactory("LockingNFT");

    const lockingNFT = await LockingNFT.deploy("Metis Sequencer", "MS");

    const lockingPoolProxy = await deployments.deploy("LockingPool", {
      from: admin.address,
      proxy: {
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          init: {
            methodName: "initialize",
            args: [
              await l1Bridge.getAddress(),
              await metisToken.getAddress(),
              l2MetisAddr,
              await lockingNFT.getAddress(),
              mpc.address,
              0xdeadbeaf,
            ],
          },
        },
      },
    });

    const lockingPool = await ethers.getContractAt(
      "LockingPool",
      lockingPoolProxy.address,
    );

    // approve the metis to the lockingPool
    for (const wallet of wallets) {
      await metisToken
        .connect(wallet)
        .approve(await lockingPool.getAddress(), ethers.MaxUint256);
    }

    // first two addresses are whitelisted
    await lockingPool.setWhiteListAddress(wallets[0].address, true);
    await lockingPool.setWhiteListAddress(wallets[1].address, true);

    const LockingInfo = await ethers.getContractFactory("LockingInfo");
    const lockingInfo = await LockingInfo.deploy(
      await lockingPool.getAddress(),
    );

    await lockingNFT.transferOwnership(lockingPoolProxy.address);
    await lockingPool.updateLockingInfo(await lockingInfo.getAddress());

    return {
      wallets,
      lockingNFT,
      metisToken,
      l1Bridge,
      admin,
      mpc,
      others,
      lockingPool,
      lockingInfo,
    };
  }

  it("initializer modifier", async () => {
    const { lockingPool, mpc } = await loadFixture(fixture);
    await expect(
      lockingPool.initialize(
        ethers.ZeroAddress,
        ethers.ZeroAddress,
        l2MetisAddr,
        ethers.ZeroAddress,
        mpc,
        0xdead,
      ),
    ).to.be.revertedWith("Initializable: contract is already initialized");
  });

  it("bridge,l2ChainId,l2Token...", async () => {
    const { lockingPool, l1Bridge, metisToken, lockingNFT, mpc, admin } =
      await loadFixture(fixture);
    expect(await lockingPool.bridge()).to.be.eq(await l1Bridge.getAddress());
    expect(await lockingPool.l1Token()).to.be.eq(await metisToken.getAddress());
    expect(await lockingPool.l2Token()).to.be.eq(l2MetisAddr);
    expect(await lockingPool.NFTContract()).to.be.eq(
      await lockingNFT.getAddress(),
    );
    expect(await lockingPool.NFTContract()).to.be.eq(
      await lockingNFT.getAddress(),
    );
    expect(await lockingPool.mpcAddress()).to.be.eq(mpc.address);
    expect(await lockingPool.l2ChainId()).to.be.eq(0xdeadbeaf);
    expect(await lockingPool.owner()).to.be.eq(admin, "admin address");
    expect(await lockingPool.paused()).to.be.false;

    const { newMpcAddress } = await lockingPool.mpcHistory(0);
    expect(newMpcAddress).to.be.eq(mpc.address);
  });

  it("updateNFTContract", async () => {
    const { lockingPool, others } = await loadFixture(fixture);

    const LockingNFT = await ethers.getContractFactory("LockingNFT");
    const lockingNFT = await LockingNFT.deploy("New Metis Sequencer", "NMS");

    await expect(
      lockingPool
        .connect(others[0])
        .updateNFTContract(await lockingNFT.getAddress()),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(lockingPool.updateNFTContract(zeroAddress)).to.be.revertedWith(
      "invalid _nftContract",
    );

    expect(await lockingPool.updateNFTContract(await lockingNFT.getAddress()))
      .with.emit(lockingPool, "UpdateNFTContract")
      .withArgs(await lockingNFT.getAddress());
    expect(await lockingPool.NFTContract()).to.eq(
      await lockingNFT.getAddress(),
    );
  });

  it("updateLockingInfo", async () => {
    const { lockingPool, others } = await loadFixture(fixture);

    const LockingInfo = await ethers.getContractFactory("LockingInfo");
    const lockingInfo = await LockingInfo.deploy(
      await lockingPool.getAddress(),
    );

    await expect(
      lockingPool
        .connect(others[0])
        .updateLockingInfo(await lockingInfo.getAddress()),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(lockingPool.updateLockingInfo(zeroAddress)).to.be.revertedWith(
      "invalid _lockingInfo",
    );

    expect(await lockingPool.updateLockingInfo(await lockingInfo.getAddress()))
      .with.emit(lockingPool, "UpdateNFTContract")
      .withArgs(await lockingInfo.getAddress());
    expect(await lockingPool.logger()).to.eq(await lockingInfo.getAddress());
  });

  it("updateSequencerThreshold", async () => {
    const { lockingPool, lockingInfo, mpc, others } =
      await loadFixture(fixture);

    const curThreadhold = await lockingPool.sequencerThreshold();
    const newThreshold = 10;

    await expect(
      lockingPool.connect(mpc).updateSequencerThreshold(newThreshold),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      lockingPool.connect(others[0]).updateSequencerThreshold(newThreshold),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(lockingPool.updateSequencerThreshold(0)).to.be.revertedWith(
      "invalid newThreshold",
    );

    expect(await lockingPool.updateSequencerThreshold(newThreshold))
      .to.emit(lockingInfo, "ThresholdChange")
      .withArgs(newThreshold, curThreadhold);
    expect(await lockingPool.sequencerThreshold()).to.eq(newThreshold);
  });

  it("updatePerSecondReward", async () => {
    const { lockingPool, mpc, others, lockingInfo } =
      await loadFixture(fixture);

    const curReward = await lockingPool.perSecondReward();
    const newReward = 10n;

    await expect(
      lockingPool.connect(mpc).updatePerSecondReward(newReward),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      lockingPool.connect(others[0]).updatePerSecondReward(newReward),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(lockingPool.updatePerSecondReward(0)).to.be.revertedWith(
      "invalid newReward",
    );

    expect(await lockingPool.updatePerSecondReward(newReward))
      .to.emit(lockingInfo, "RewardUpdate")
      .withArgs(newReward, curReward);
    expect(await lockingPool.perSecondReward()).to.be.eq(
      newReward,
      "newReward check",
    );
  });

  it("updateWithdrawDelayTimeValue", async () => {
    const { lockingPool, mpc, others, lockingInfo } =
      await loadFixture(fixture);

    const curDelayTime = await lockingPool.WITHDRAWAL_DELAY();
    const newDelayTime = 24 * 3600 * 1000;

    await expect(
      lockingPool.connect(mpc).updateWithdrawDelayTimeValue(newDelayTime),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      lockingPool.connect(others[0]).updateWithdrawDelayTimeValue(newDelayTime),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      lockingPool.updateWithdrawDelayTimeValue(0),
    ).to.be.revertedWith("invalid newWithdrawDelayTime");

    expect(await lockingPool.updateWithdrawDelayTimeValue(newDelayTime))
      .to.emit(lockingInfo, "WithrawDelayTimeChange")
      .withArgs(newDelayTime, curDelayTime);
    expect(await lockingPool.WITHDRAWAL_DELAY()).to.eq(newDelayTime);
  });

  it("updateSignerUpdateLimit", async () => {
    const { lockingPool, mpc, others } = await loadFixture(fixture);

    const newLimit = 10;

    await expect(
      lockingPool.connect(mpc).updateSignerUpdateLimit(newLimit),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      lockingPool.connect(others[0]).updateSignerUpdateLimit(newLimit),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(lockingPool.updateSignerUpdateLimit(0)).to.be.revertedWith(
      "invalid _limit",
    );

    expect(await lockingPool.updateSignerUpdateLimit(newLimit))
      .to.emit(lockingPool, "UpdateSignerUpdateLimit")
      .withArgs(newLimit);
    expect(await lockingPool.signerUpdateLimit()).to.eq(newLimit);
  });

  it("updateMinAmounts", async () => {
    const { lockingPool, mpc, others } = await loadFixture(fixture);

    const newLimit = 10;

    await expect(
      lockingPool.connect(mpc).updateMinAmounts(newLimit),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      lockingPool.connect(others[0]).updateMinAmounts(newLimit),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(lockingPool.updateMinAmounts(0)).to.be.revertedWith(
      "invalid _minLock",
    );

    expect(await lockingPool.updateMinAmounts(newLimit))
      .to.emit(lockingPool, "UpdateMinAmounts")
      .withArgs(newLimit);
    expect(await lockingPool.minLock()).to.eq(newLimit);
  });

  it("updateMaxAmounts", async () => {
    const { lockingPool, mpc, others } = await loadFixture(fixture);

    const newLimit = 10;

    await expect(
      lockingPool.connect(mpc).updateMaxAmounts(newLimit),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      lockingPool.connect(others[0]).updateMaxAmounts(newLimit),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(lockingPool.updateMaxAmounts(0)).to.be.revertedWith(
      "invalid _maxLock",
    );

    expect(await lockingPool.updateMaxAmounts(newLimit))
      .to.emit(lockingPool, "UpdateMaxAmounts")
      .withArgs(newLimit);
    expect(await lockingPool.maxLock(), "macLock").to.eq(newLimit);
  });

  it("updateMpc", async () => {
    const { lockingPool, l1Bridge, mpc, others } = await loadFixture(fixture);

    const newLimit = 10;

    await expect(
      lockingPool.connect(mpc).updateMpc(others[0]),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      lockingPool.connect(others[0]).updateMpc(others[0]),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(lockingPool.updateMpc(l1Bridge)).to.be.revertedWith(
      "_newMpc is a contract",
    );

    await expect(lockingPool.updateMpc(ethers.ZeroAddress)).to.be.revertedWith(
      "_newMpc is zero address",
    );

    expect(await lockingPool.updateMpc(others[0]))
      .to.emit(lockingPool, "UpdateMaxAmounts")
      .withArgs(newLimit);

    expect(await lockingPool.mpcAddress()).to.eq(others[0]);
    const theHeight = await ethers.provider.getBlockNumber();
    const { startBlock, newMpcAddress } = await lockingPool.mpcHistory(1);
    expect(theHeight, "mpcHistory.startBlock").to.be.eq(startBlock);
    expect(newMpcAddress, "mpcHistory.newMpcAddress").to.be.eq(others[0]);
  });

  it("setWhiteListAddress", async () => {
    const { lockingPool, mpc, others } = await loadFixture(fixture);

    expect(
      await lockingPool.whiteListAddresses(others[0]),
      "0/whitelist/false?",
    ).to.be.false;

    await expect(
      lockingPool.connect(mpc).setWhiteListAddress(others[0], true),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      lockingPool.connect(others[0]).setWhiteListAddress(others[0], true),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    expect(await lockingPool.setWhiteListAddress(others[0], true))
      .to.emit(lockingPool, "WhiteListAdded")
      .withArgs(others[0], true);

    expect(await lockingPool.whiteListAddresses(others[0]), "0/whitelist/true?")
      .to.be.true;

    await expect(
      lockingPool.setWhiteListAddress(others[0], true),
    ).to.be.revertedWith("state not change");

    expect(await lockingPool.setWhiteListAddress(others[0], false))
      .to.emit(lockingPool, "WhiteListAdded")
      .withArgs(others[0], false);

    expect(await lockingPool.whiteListAddresses(others[0])).to.be.false;
  });

  it("setPause/setUnpause", async () => {
    const { lockingPool, mpc, others } = await loadFixture(fixture);

    expect(await lockingPool.paused()).to.be.false;

    await expect(lockingPool.connect(mpc).setPause()).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );

    await expect(lockingPool.connect(others[0]).setPause()).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );

    await lockingPool.setPause();
    expect(await lockingPool.paused()).to.be.true;

    await expect(lockingPool.connect(mpc).setUnpause()).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );

    await expect(
      lockingPool.connect(others[0]).setUnpause(),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await lockingPool.setUnpause();
    expect(await lockingPool.paused()).to.be.false;
  });

  it("lockFor", async () => {
    const { lockingPool, mpc, others, metisToken, wallets } =
      await loadFixture(fixture);

    const [wallet0, wallet1, wallet2] = wallets;
    const minLock = 1n;
    await lockingPool.updateMinAmounts(minLock);
    const maxLock = 10n;
    await lockingPool.updateMaxAmounts(maxLock);

    await lockingPool.setPause();
    await expect(
      lockingPool
        .connect(wallet0)
        .lockFor(
          wallet0,
          minLock,
          trimPubKeyPrefix(wallet0.signingKey.publicKey),
        ),
    ).to.be.revertedWith("Pausable: paused");
    await lockingPool.setUnpause();

    await expect(
      lockingPool
        .connect(wallet2)
        .lockFor(
          wallet2,
          minLock,
          trimPubKeyPrefix(wallet2.signingKey.publicKey),
        ),
    ).to.be.revertedWith("msg sender should be in the white list");

    await expect(
      lockingPool
        .connect(wallet0)
        .lockFor(wallet0, 0, trimPubKeyPrefix(wallet0.signingKey.publicKey)),
    ).to.be.revertedWith("amount less than minLock");

    await expect(
      lockingPool
        .connect(wallet0)
        .lockFor(
          wallet0,
          maxLock + 1n,
          trimPubKeyPrefix(wallet0.signingKey.publicKey),
        ),
    ).to.be.revertedWith("amount large than maxLock");

    await expect(
      lockingPool
        .connect(wallet0)
        .lockFor(wallet0, minLock, Buffer.from([1, 2, 3])),
    ).to.be.revertedWith("not pub");

    await expect(
      lockingPool
        .connect(wallet0)
        .lockFor(
          wallet0,
          minLock,
          trimPubKeyPrefix(wallet1.signingKey.publicKey),
        ),
    ).to.be.revertedWith("user and signerPubkey mismatch");

    {
      await lockingPool
        .connect(wallet0)
        .lockFor(
          wallet0,
          minLock,
          trimPubKeyPrefix(wallet0.signingKey.publicKey),
        );

      expect(await lockingPool.NFTCounter()).to.eq(2);
      expect(await lockingPool.ownerOf(1)).to.eq(wallet0.address);
      expect(
        await metisToken.balanceOf(await lockingPool.getAddress()),
      ).to.be.eq(minLock);

      expect(await lockingPool.sequencerLock(1)).to.eq(minLock);
      expect(await lockingPool.getSequencerId(wallet0)).to.eq(1);
      expect(await lockingPool.currentSequencerSetSize()).to.eq(1);
      expect(await lockingPool.isSequencer(1)).to.be.true;
    }
  });
});
