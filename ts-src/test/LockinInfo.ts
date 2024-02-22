import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("LockingInfo", async () => {
  async function fixture() {
    const factory = await ethers.getContractFactory("LockingInfo");
    const [wallet, other, other1, other2] = await ethers.getSigners();
    const lockingInfo = await factory.deploy(wallet);
    return { lockingInfo, wallet, other, other1, other2 };
  }

  it("update nonce", async () => {
    const { lockingInfo, wallet } = await loadFixture(fixture);

    await expect(lockingInfo.updateNonce([1, 2], [3])).to.be.revertedWith(
      "args length mismatch",
    );
    await lockingInfo.updateNonce([1, 2], [3, 4]);
  });

  it("log locked", async () => {
    const { lockingInfo, wallet, other } = await loadFixture(fixture);

    await lockingInfo.logLocked(
      wallet.address,
      Buffer.from([1, 2, 3]),
      1,
      2,
      2,
      5,
    );

    await expect(
      lockingInfo
        .connect(other)
        .logLocked(wallet.address, Buffer.from([1, 2, 3]), 1, 2, 2, 5),
    ).to.be.revertedWith("Invalid sender, not locking pool");
  });

  it("log unlocked", async () => {
    const { lockingInfo, wallet, other } = await loadFixture(fixture);

    await lockingInfo.logUnlocked(wallet.address, 1, 2, 5);
    await expect(
      lockingInfo.connect(other).logUnlocked(wallet.address, 1, 2, 5),
    ).to.be.revertedWith("Invalid sender, not locking pool");
  });

  it("log unlock init", async () => {
    const { lockingInfo, wallet, other } = await loadFixture(fixture);

    await lockingInfo.logUnlockInit(wallet.address, 1, 2, 100, 200, 5);
    await expect(
      lockingInfo
        .connect(other)
        .logUnlockInit(wallet.address, 1, 2, 100, 200, 5),
    ).to.be.revertedWith("Invalid sender, not locking pool");
  });

  it("log signer change", async () => {
    const { lockingInfo, wallet, other } = await loadFixture(fixture);

    await lockingInfo.logSignerChange(
      1,
      wallet.address,
      other.address,
      Buffer.from([1, 2, 3]),
    );
    await expect(
      lockingInfo
        .connect(other)
        .logSignerChange(
          1,
          wallet.address,
          other.address,
          Buffer.from([1, 2, 3]),
        ),
    ).to.be.revertedWith("Invalid sender, not locking pool");
  });

  it("log relock", async () => {
    const { lockingInfo, wallet, other } = await loadFixture(fixture);

    await lockingInfo.logRelockd(1, 2, 5);
    await expect(
      lockingInfo.connect(other).logRelockd(1, 2, 5),
    ).to.be.revertedWith("Invalid sender, not locking pool");
  });

  it("log ThresholdChange", async () => {
    const { lockingInfo, wallet, other } = await loadFixture(fixture);

    await lockingInfo.logThresholdChange(1, 2);
    await expect(
      lockingInfo.connect(other).logThresholdChange(1, 2),
    ).to.be.revertedWith("Invalid sender, not locking pool");
  });

  it("log WithrawDelayTimeChange", async () => {
    const { lockingInfo, wallet, other } = await loadFixture(fixture);

    await lockingInfo.logWithrawDelayTimeChange(1, 2);
    await expect(
      lockingInfo.connect(other).logWithrawDelayTimeChange(1, 2),
    ).to.be.revertedWith("Invalid sender, not locking pool");
  });

  it("log RewardUpdate", async () => {
    const { lockingInfo, wallet, other } = await loadFixture(fixture);

    await lockingInfo.logRewardUpdate(1, 2);
    await expect(
      lockingInfo.connect(other).logRewardUpdate(1, 2),
    ).to.be.revertedWith("Invalid sender, not locking pool");
  });

  it("log LockUpdate", async () => {
    const { lockingInfo, wallet, other } = await loadFixture(fixture);

    await lockingInfo.logLockUpdate(1, 100);
    await expect(
      lockingInfo.connect(other).logLockUpdate(1, 100),
    ).to.be.revertedWith("Invalid sender, not locking pool");
  });

  it("log ClaimRewards", async () => {
    const { lockingInfo, wallet, other } = await loadFixture(fixture);

    await lockingInfo.logClaimRewards(1, wallet.address, 100, 200);
    await expect(
      lockingInfo.connect(other).logClaimRewards(1, wallet.address, 100, 200),
    ).to.be.revertedWith("Invalid sender, not locking pool");
  });

  it("log logBatchSubmitReward", async () => {
    const { lockingInfo, wallet, other } = await loadFixture(fixture);

    await lockingInfo.logBatchSubmitReward(1);
    await expect(
      lockingInfo.connect(other).logBatchSubmitReward(1),
    ).to.be.revertedWith("Invalid sender, not locking pool");
  });

  it("log logUpdateEpochLength", async () => {
    const { lockingInfo, wallet, other } = await loadFixture(fixture);

    await lockingInfo.logUpdateEpochLength(100, 1000, 5);
    await expect(
      lockingInfo.connect(other).logUpdateEpochLength(100, 1000, 5),
    ).to.be.revertedWith("Invalid sender, not locking pool");
  });
});
