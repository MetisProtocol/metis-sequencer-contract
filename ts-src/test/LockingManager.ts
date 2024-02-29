import { ethers, deployments } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {
  LockingInfoContractName,
  LockingPoolContractName,
  l2MetisAddr,
} from "../utils/constant";
import { trimPubKeyPrefix } from "../utils/params";

describe("locking", async () => {
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

    const lockingEscrowProxy = await deployments.deploy(
      LockingInfoContractName,
      {
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
                0xdeadbeaf,
              ],
            },
          },
        },
      },
    );

    const lockingInfo = await ethers.getContractAt(
      LockingInfoContractName,
      lockingEscrowProxy.address,
    );

    const lockingManagerProxy = await deployments.deploy(
      LockingPoolContractName,
      {
        from: admin.address,
        proxy: {
          proxyContract: "OpenZeppelinTransparentProxy",
          execute: {
            init: {
              methodName: "initialize",
              args: [lockingEscrowProxy.address],
            },
          },
        },
      },
    );

    const lockingPool = await ethers.getContractAt(
      LockingPoolContractName,
      lockingManagerProxy.address,
    );
    await lockingInfo.initManager(lockingManagerProxy.address);

    // approve the metis to the lockingManager
    for (const [index, wallet] of wallets.entries()) {
      await admin.sendTransaction({
        to: wallet.address,
        value: ethers.parseEther("10"),
      });
      await metisToken.mint(wallet, ethers.parseEther("20000"));
      await metisToken
        .connect(wallet)
        .approve(lockingEscrowProxy.address, ethers.MaxUint256);

      // first 3 addresses are whitelisted
      if (index < 3) {
        await lockingPool.setWhitelist(wallet.address, true);
      }
    }

    return {
      wallets,
      lockingInfo,
      lockingPool,
      metisToken,
      l1Bridge,
      admin,
      mpc,
      others,
    };
  }

  it("default", async () => {
    const { l1Bridge, metisToken, lockingInfo, lockingPool, admin } =
      await loadFixture(fixture);
    expect(await lockingInfo.bridge(), "bridge").to.be.eq(
      await l1Bridge.getAddress(),
    );
    expect(await lockingInfo.l1Token(), "l1token").to.be.eq(
      await metisToken.getAddress(),
    );
    expect(await lockingInfo.l2Token(), "l2token").to.be.eq(l2MetisAddr);
    expect(await lockingInfo.l2ChainId(), "l2ChainId").to.be.eq(0xdeadbeaf);
    expect(await lockingInfo.owner(), "owner").to.be.eq(admin, "admin address");

    expect(await lockingInfo.minLock(), "minLock").to.eq(
      ethers.parseEther("20000"),
    );
    expect(await lockingInfo.maxLock(), "maxLocak").to.eq(
      ethers.parseEther("100000"),
    );

    expect(await lockingInfo.rewardPayer()).eq(ethers.ZeroAddress);
    expect(await lockingInfo.manager(), "default manager").eq(
      await lockingPool.getAddress(),
    );
  });

  it("setMinLock", async () => {
    const { lockingInfo, others } = await loadFixture(fixture);

    const newLimit = 10;

    await expect(
      lockingInfo.connect(others[0]).setMinLock(newLimit),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(lockingInfo.setMinLock(0)).to.be.revertedWith("_minLock=0");

    expect(await lockingInfo.setMinLock(newLimit))
      .to.emit(lockingInfo, "SetMinLock")
      .withArgs(newLimit);
    expect(await lockingInfo.minLock()).to.eq(newLimit);
  });

  it("setMaxLock", async () => {
    const { lockingInfo, others } = await loadFixture(fixture);

    const newMin = 10;
    const newMax = 100;

    await lockingInfo.setMinLock(newMin);

    await expect(
      lockingInfo.connect(others[0]).setMaxLock(newMax),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(lockingInfo.setMaxLock(9)).to.be.revertedWith(
      "maxLock<minLock",
    );

    expect(await lockingInfo.setMaxLock(newMax))
      .to.emit(lockingInfo, "SetMaxLock")
      .withArgs(newMax);
    expect(await lockingInfo.maxLock(), "maxLock").to.eq(newMax);
  });

  it("updateWithdrawDelayTimeValue", async () => {
    const { lockingPool, mpc, others, lockingInfo } =
      await loadFixture(fixture);

    const curDelayTime = await lockingPool.WITHDRAWAL_DELAY();
    expect(curDelayTime, "default delay time").to.be.eq(21 * 24 * 3600);

    const newDelayTime = 24 * 3600 * 1000;

    await expect(
      lockingPool.connect(mpc).updateWithdrawDelayTimeValue(newDelayTime),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      lockingPool.connect(others[0]).updateWithdrawDelayTimeValue(newDelayTime),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      lockingPool.updateWithdrawDelayTimeValue(0),
    ).to.be.revertedWith("dalayTime==0");

    expect(await lockingPool.updateWithdrawDelayTimeValue(newDelayTime))
      .to.emit(lockingInfo, "WithrawDelayTimeChange")
      .withArgs(newDelayTime, curDelayTime);
    expect(await lockingPool.WITHDRAWAL_DELAY()).to.eq(newDelayTime);
  });

  it("updateBlockReward", async () => {
    const { lockingPool, mpc, others, lockingInfo } =
      await loadFixture(fixture);

    const defaultRpb = await lockingPool.BLOCK_REWARD();
    expect(defaultRpb, "default reward_per_block").eq(761000n * 10n ** 9n);

    const newRpb = 10n;

    await expect(
      lockingPool.connect(mpc).updateBlockReward(newRpb),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      lockingPool.connect(others[0]).updateBlockReward(newRpb),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(lockingPool.updateBlockReward(0)).to.be.revertedWith(
      "invalid newReward",
    );

    expect(await lockingPool.updateBlockReward(newRpb))
      .to.emit(lockingInfo, "RewardUpdate")
      .withArgs(newRpb, defaultRpb);
    expect(await lockingPool.BLOCK_REWARD()).to.be.eq(
      newRpb,
      "newReward check",
    );
  });

  it("updateMpc", async () => {
    const { lockingPool, mpc, others } = await loadFixture(fixture);

    expect(await lockingPool.mpcAddress(), "default mpc").to.eq(
      ethers.ZeroAddress,
    );

    await expect(
      lockingPool.connect(mpc).updateMpc(others[0]),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      lockingPool.connect(others[0]).updateMpc(others[0]),
    ).to.be.revertedWith("Ownable: caller is not the owner");

    expect(await lockingPool.updateMpc(others[0]))
      .to.emit(lockingPool, "UpdateMpc")
      .withArgs(others[0]);

    expect(await lockingPool.mpcAddress()).to.eq(others[0]);
  });

  it("lockFor/validation", async () => {
    const { lockingInfo, lockingPool, wallets } = await loadFixture(fixture);

    const [wallet0, wallet1, wallet2, wallet3] = wallets;
    const minLock = 1n;
    await lockingInfo.setMinLock(minLock);
    const maxLock = 10n;
    await lockingInfo.setMaxLock(maxLock);

    await lockingPool.setPause(true);
    await expect(
      lockingPool
        .connect(wallet0)
        .lockFor(
          wallet0,
          minLock,
          trimPubKeyPrefix(wallet0.signingKey.publicKey),
        ),
    ).to.be.revertedWith("Pausable: paused");
    await lockingPool.setPause(false);

    await expect(
      lockingPool
        .connect(wallet3)
        .lockFor(
          wallet3,
          minLock,
          trimPubKeyPrefix(wallet3.signingKey.publicKey),
        ),
    ).to.be.revertedWithCustomError(lockingPool, "NotWhitelisted");

    await expect(
      lockingPool
        .connect(wallet0)
        .lockFor(wallet0, 0, trimPubKeyPrefix(wallet0.signingKey.publicKey)),
    ).to.be.revertedWith("invalid amount");

    await expect(
      lockingPool
        .connect(wallet0)
        .lockFor(
          wallet0,
          maxLock + 1n,
          trimPubKeyPrefix(wallet0.signingKey.publicKey),
        ),
    ).to.be.revertedWith("invalid amount");

    await expect(
      lockingPool
        .connect(wallet0)
        .lockFor(wallet0, minLock, Buffer.from([1, 2, 3])),
    ).to.be.revertedWith("invalid pubkey");

    await expect(
      lockingPool.connect(wallet0).lockFor(
        wallet0,

        minLock,
        trimPubKeyPrefix(wallet1.signingKey.publicKey),
      ),
    ).to.be.revertedWith("pubkey and address mismatch");
  });

  it("lockFor", async () => {
    const { lockingInfo, lockingPool, metisToken, wallets } =
      await loadFixture(fixture);

    const [wallet0, wallet1, wallet2] = wallets;
    const minLock = 1n;
    await lockingInfo.setMinLock(minLock);

    // const wallet0Pubkey = trimPubKeyPrefix(wallet0.signingKey.publicKey);
    const wallet1Pubkey = trimPubKeyPrefix(wallet1.signingKey.publicKey);

    expect(
      await lockingPool
        .connect(wallet0)
        .lockFor(wallet1, minLock, wallet1Pubkey),
      "lockFor owner=wallet0 signer=wallet1",
    )
      .emit(lockingPool, "SequencerOwnerChanged")
      .withArgs(1, wallet0.address)
      .and.emit(lockingPool, "SequencerRewardRecipientChanged")
      .withArgs(1, ethers.ZeroAddress)
      .and.emit(lockingInfo, "Locked")
      .withArgs(wallet1.address, 1, 1, 1, minLock, minLock, wallet1Pubkey)
      .and.emit(metisToken, "Transfer")
      .withArgs(wallet0.address, await lockingInfo.getAddress(), minLock);

    await expect(
      lockingPool.connect(wallet0).lockFor(wallet1, minLock, wallet1Pubkey),
      "OwnedSequencer",
    ).revertedWithCustomError(lockingPool, "OwnedSequencer");

    await expect(
      lockingPool.connect(wallet2).lockFor(wallet1, minLock, wallet1Pubkey),
      "OwnedSigner",
    ).revertedWithCustomError(lockingPool, "OwnedSigner");

    {
      const curBatchId = await lockingPool.currentBatch();
      const {
        amount,
        reward,
        activationBatch,
        updatedBatch,
        deactivationBatch,
        deactivationTime,
        unlockClaimTime,
        nonce,
        owner,
        signer,
        pubkey,
        rewardRecipient,
        status,
      } = await lockingPool.sequencers(1);
      expect(amount, "amount").eq(minLock);
      expect(reward, "reward").eq(0);
      expect(activationBatch, "activationBatch").eq(curBatchId);
      expect(updatedBatch, "updatedBatch").eq(curBatchId);
      expect(deactivationBatch, "deactivationBatch").eq(0);
      expect(deactivationTime, "deactivationTime").eq(0);
      expect(nonce, "deactivationBatch").eq(1);
      expect(owner, "owner").eq(wallet0.address);
      expect(signer, "wallet0").eq(wallet1.address);
      expect(unlockClaimTime, "unlockClaimTime").eq(0);
      expect(pubkey, "pubkey").eq("0x" + wallet1Pubkey.toString("hex"));
      expect(rewardRecipient, "rewardRecipient").eq(ethers.ZeroAddress);
      expect(status, "status").eq(2);
    }

    expect(
      await lockingPool.totalSequencers(),
      "current total sequencer should be 1",
    ).to.eq(1);
    expect(
      await lockingPool.seqOwners(wallet0.address),
      "the address should own the token 1",
    ).to.eq(1);
    expect(
      await lockingPool.seqSigners(wallet1.address),
      "the address should own the token 1",
    ).to.eq(1);
    expect(
      await metisToken.balanceOf(await lockingInfo.getAddress()),
      "balance of Metis should be equal to the locked in",
    ).to.be.eq(minLock);

    expect(await lockingPool.seqStatuses(2), "Active count").to.eq(1);
  });

  it("lockWithRewardRecipient", async () => {
    const { lockingInfo, lockingPool, metisToken, wallets } =
      await loadFixture(fixture);

    const [wallet0, wallet1] = wallets;
    const minLock = 1n;
    await lockingInfo.setMinLock(minLock);

    const curBatchId = await lockingPool.currentBatch();

    const wallet1Pubkey = trimPubKeyPrefix(wallet1.signingKey.publicKey);

    await expect(
      lockingPool
        .connect(wallet0)
        .lockWithRewardRecipient(wallet1, wallet0, minLock, wallet1Pubkey),
      "lockFor owner=wallet0 signer=wallet1 recipent=wallet0",
    )
      .emit(lockingPool, "SequencerOwnerChanged")
      .withArgs(1, wallet0.address)
      .and.emit(lockingPool, "SequencerRewardRecipientChanged")
      .withArgs(1, wallet0.address)
      .and.emit(lockingInfo, "Locked")
      .withArgs(wallet1.address, 1, 1, 1, minLock, minLock, wallet1Pubkey)
      .and.emit(metisToken, "Transfer")
      .withArgs(wallet0.address, await lockingInfo.getAddress(), minLock);

    {
      const {
        amount,
        reward,
        activationBatch,
        updatedBatch,
        deactivationBatch,
        deactivationTime,
        unlockClaimTime,
        nonce,
        owner,
        signer,
        pubkey,
        rewardRecipient,
        status,
      } = await lockingPool.sequencers(1);
      expect(amount, "amount").eq(minLock);
      expect(reward, "reward").eq(0);
      expect(activationBatch, "activationBatch").eq(curBatchId);
      expect(updatedBatch, "updatedBatch").eq(curBatchId);
      expect(deactivationBatch, "deactivationBatch").eq(0);
      expect(deactivationTime, "deactivationTime").eq(0);
      expect(nonce, "deactivationBatch").eq(1);
      expect(owner, "owner").eq(wallet0.address);
      expect(signer, "wallet0").eq(wallet1.address);
      expect(unlockClaimTime, "unlockClaimTime").eq(0);
      expect(pubkey, "pubkey").eq("0x" + wallet1Pubkey.toString("hex"));
      expect(rewardRecipient, "rewardRecipient").eq(wallet0.address);
      expect(status, "status").eq(2);
    }

    expect(
      await lockingPool.totalSequencers(),
      "current total sequencer should be 1",
    ).to.eq(1);
    expect(
      await lockingPool.seqOwners(wallet0.address),
      "the address should own the token 1",
    ).to.eq(1);
    expect(
      await lockingPool.seqSigners(wallet1.address),
      "the address should own the token 1",
    ).to.eq(1);
    expect(
      await metisToken.balanceOf(await lockingInfo.getAddress()),
      "balance of Metis should be equal to the locked in",
    ).to.be.eq(minLock);

    expect(await lockingPool.seqStatuses(2), "Active count").to.eq(1);
  });

  it("updateSigner", async () => {
    const { lockingInfo, lockingPool, metisToken, wallets } =
      await loadFixture(fixture);

    const [wallet0, wallet1, wallet2] = wallets;
    const minLock = 1n;
    await lockingInfo.setMinLock(minLock);

    expect(
      await lockingPool.signerUpdateThrottle(),
      "default signerUpdateThrottle",
    ).to.be.eq(1);

    const wallet0Pubkey = trimPubKeyPrefix(wallet0.signingKey.publicKey);
    const wallet1Pubkey = trimPubKeyPrefix(wallet1.signingKey.publicKey);
    const wallet2Pubkey = trimPubKeyPrefix(wallet2.signingKey.publicKey);

    // seq1
    await lockingPool.connect(wallet0).lockFor(wallet0, minLock, wallet0Pubkey);

    await expect(
      lockingPool.connect(wallet0).updateSigner(1, wallet1Pubkey),
      "update seq1 pubkey from 0",
    ).revertedWith("signer updating throttle");

    await expect(
      lockingPool.connect(wallet1).updateSigner(1, wallet1Pubkey),
      "update seq1 pubkey from wallet1",
    ).revertedWithCustomError(lockingPool, "NotSeqSigner");

    expect(
      await lockingPool.setSignerUpdateThrottle(0),
      "setSignerUpdateThrottle",
    )
      .emit(lockingPool, "SetSignerUpdateThrottle")
      .withArgs(0);

    const curBatchId = await lockingPool.currentBatch();

    await expect(
      lockingPool.connect(wallet0).updateSigner(1, wallet2Pubkey),
      "update seq1 signer key to wallet2",
    )
      .to.emit(lockingInfo, "SignerChange")
      .withArgs(1, 2, wallet0.address, wallet2.address, wallet2Pubkey);

    const { nonce, signer, pubkey, updatedBatch } =
      await lockingPool.sequencers(1);
    expect(nonce, "nonce").eq(2);
    expect(updatedBatch, "updatedBatch").eq(curBatchId);
    expect(signer, "signer").eq(wallet2.address);
    expect(pubkey, "pubkey").eq("0x" + wallet2Pubkey.toString("hex"));

    expect(
      await lockingPool.seqSigners(wallet0.address),
      "wallet0 signer id to uint256",
    ).eq(ethers.MaxUint256);

    expect(await lockingPool.seqSigners(wallet2.address), "wallet2 signer").eq(
      1,
    );
  });
});
