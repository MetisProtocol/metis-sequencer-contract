import { ethers, deployments } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {
  LockingEscrowContractName,
  LockingManagerContractName,
} from "../utils/constant";
import { trimPubKeyPrefix } from "../utils/params";

const l2MetisAddr = "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000";

describe("lockingManager", async () => {
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

    const lockingEscrowProxy = await deployments.deploy(
      LockingEscrowContractName,
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

    const lockingEscrow = await ethers.getContractAt(
      LockingEscrowContractName,
      lockingEscrowProxy.address,
    );

    const lockingManagerProxy = await deployments.deploy(
      LockingManagerContractName,
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

    const lockingManager = await ethers.getContractAt(
      LockingManagerContractName,
      lockingManagerProxy.address,
    );

    // approve the metis to the lockingManager
    for (const wallet of wallets) {
      await metisToken
        .connect(wallet)
        .approve(lockingEscrowProxy.address, ethers.MaxUint256);
    }

    // first two addresses are whitelisted
    await lockingManager.setWhitelist(wallets[0].address, true);
    await lockingManager.setWhitelist(wallets[1].address, true);

    await lockingEscrow.initManager(lockingManagerProxy.address);

    return {
      wallets,
      lockingEscrow,
      lockingManager,
      metisToken,
      l1Bridge,
      admin,
      mpc,
      others,
    };
  }

  it("lockFor/validation", async () => {
    const { lockingEscrow, lockingManager, metisToken, wallets } =
      await loadFixture(fixture);

    const [wallet0, wallet1, wallet2] = wallets;
    const minLock = 1n;
    await lockingEscrow.setMinLock(minLock);
    const maxLock = 10n;
    await lockingEscrow.setMaxLock(maxLock);

    await lockingManager.setPause(true);
    await expect(
      lockingManager
        .connect(wallet0)
        .lockFor(
          wallet0,
          minLock,
          trimPubKeyPrefix(wallet0.signingKey.publicKey),
        ),
    ).to.be.revertedWith("Pausable: paused");
    await lockingManager.setPause(false);

    await expect(
      lockingManager
        .connect(wallet2)
        .lockFor(
          wallet2,
          minLock,
          trimPubKeyPrefix(wallet2.signingKey.publicKey),
        ),
    ).to.be.revertedWithCustomError(lockingManager, "NotWhitelisted");

    await expect(
      lockingManager
        .connect(wallet0)
        .lockFor(wallet0, 0, trimPubKeyPrefix(wallet0.signingKey.publicKey)),
    ).to.be.revertedWith("invalid amount");

    await expect(
      lockingManager
        .connect(wallet0)
        .lockFor(
          wallet0,
          maxLock + 1n,
          trimPubKeyPrefix(wallet0.signingKey.publicKey),
        ),
    ).to.be.revertedWith("invalid amount");

    await expect(
      lockingManager
        .connect(wallet0)
        .lockFor(wallet0, minLock, Buffer.from([1, 2, 3])),
    ).to.be.revertedWith("invalid pubkey");

    await expect(
      lockingManager
        .connect(wallet0)
        .lockFor(
          wallet0,
          minLock,
          trimPubKeyPrefix(wallet1.signingKey.publicKey),
        ),
    ).to.be.revertedWith("pubkey and address mismatch");
  });

  it("lockFor", async () => {
    const { lockingEscrow, lockingManager, metisToken, wallets } =
      await loadFixture(fixture);

    const [wallet0, wallet1] = wallets;
    const minLock = 1n;
    const maxLock = 10n;
    await lockingEscrow.setMinLock(minLock);
    await lockingEscrow.setMaxLock(maxLock);

    expect(
      await lockingManager
        .connect(wallet0)
        .lockFor(
          wallet0,
          minLock,
          trimPubKeyPrefix(wallet0.signingKey.publicKey),
        ),
    )
      .emit(lockingEscrow, "Locked")
      .withArgs(
        wallet0.address,
        1,
        1,
        1,
        minLock,
        minLock,
        trimPubKeyPrefix(wallet0.signingKey.publicKey),
      )
      .emit(metisToken, "Transfer")
      .withArgs(wallet0.address, await lockingEscrow.getAddress(), minLock);

    expect(
      await lockingManager.totalSequencers(),
      "current total sequencer should be 1",
    ).to.eq(1);
    expect(
      await lockingManager.seqOwners(wallet0.address),
      "the address should own the token 1",
    ).to.eq(1);
    expect(
      await metisToken.balanceOf(await lockingEscrow.getAddress()),
      "balance of Metis should be equal to the locked in",
    ).to.be.eq(minLock);
  });
});
