import { ethers, deployments } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const zeroAddress = ethers.ZeroAddress;
const l2MetisAddr = "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000";

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
        value: ethers.parseEther("5"),
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

    const LockingInfo = await ethers.getContractFactory("LockingInfo");
    const lockingInfo = await LockingInfo.deploy(
      await lockingPool.getAddress(),
    );

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
    const { lockingPool, mpc, l1Bridge, metisToken, lockingNFT } =
      await loadFixture(fixture);
    await expect(
      lockingPool.initialize(
        await l1Bridge.getAddress(),
        await metisToken.getAddress(),
        l2MetisAddr,
        await lockingNFT.getAddress(),
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
});
