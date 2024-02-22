import { task } from "hardhat/config";
import { LockingPool, TestERC20 } from "../../typechain-types";
import fs from "fs";

const lockingPoolName = "LockingPool";

task("l1:whitelist", "Whitelist an sequencer address")
  .addOptionalParam("addr", "the sequencer address")
  .addOptionalParam("enable", "enable or remove the sequencer", "true")
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const { address: lockingPoolAddress } =
      await hre.deployments.get("LockingPool");

    const LockingPool = await hre.ethers.getContractAt(
      lockingPoolName,
      lockingPoolAddress,
    );

    const addr = args["addr"];
    if (!hre.ethers.isAddress(addr)) {
      throw new Error(`addr arg is not a valid address`);
    }

    const enable = Boolean(args["enable"]);
    if (enable) {
      console.log(`Adding addr to whitelist`);
    } else {
      console.log(`Removing addr from whitelist`);
    }

    const tx = await LockingPool.setWhiteListAddress(addr, enable);
    await tx.wait();
  });

task("l1:lock", "Lock Metis to LockingPool contract")
  .addOptionalParam("key", "the private key file path for the sequencer")
  .addOptionalParam("amount", "lock amount in Metis")
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const metisL1Addr = process.env.MEITS_L1_TOKEN as string;
    if (!hre.ethers.isAddress(metisL1Addr)) {
      throw new Error(`MEITS_L1_TOKEN env is not set or it's not an address`);
    }

    const amountInWei = (() => {
      if (args["amount"]) {
        throw new Error(`amount arg should be provided`);
      }

      try {
        return hre.ethers.parseEther(args["amount"]);
      } catch {
        throw new Error(
          `The amount arg ${args["amount"]} is not a valid number`,
        );
      }
    })();

    const { address: lockingPoolAddress } =
      await hre.deployments.get("LockingPool");

    const [signer] = await hre.ethers.getSigners();

    const seqKey = new hre.ethers.SigningKey(
      fs.readFileSync(args["key"]).toString("utf8").trim(),
    );

    const seqWallet = new hre.ethers.Wallet(seqKey, hre.ethers.provider);

    console.log("Locking Metis for", seqWallet.address);
    const pool = await hre.ethers.getContractAt(
      lockingPoolName,
      lockingPoolAddress,
    );

    console.log("checking whitelist status");
    const isWhitelisted = await pool.whiteListAddresses(seqWallet.address);
    if (!isWhitelisted) {
      throw new Error(`Your address ${signer.address} is not whitelisted`);
    }

    const metis = await hre.ethers.getContractAt("TestERC20", metisL1Addr);
    console.log("checking the balance");
    const balance = await metis.balanceOf(seqWallet.address);
    if (balance < amountInWei) {
      throw new Error(
        `Insufficient Metis balance, current balance ${hre.ethers.formatEther(balance)}, required balance ${args["amount"]}`,
      );
    }

    console.log("checking the allowance");
    const allowance = await metis.allowance(
      seqWallet.address,
      lockingPoolAddress,
    );
    if (allowance < amountInWei) {
      console.log("approving Metis to LockingPool");
      const tx = await metis
        .connect(seqWallet)
        .approve(await pool.getAddress(), amountInWei);
      await tx.wait(2);
    }

    console.log("locking...");
    const tx = await pool
      .connect(seqWallet)
      .lockFor(
        seqWallet.address,
        amountInWei,
        Buffer.from(seqKey.publicKey.slice(4), "hex"),
      );
    await tx.wait();
  });

task("l1:update-lock-amount", "Update locking amount condition")
  .addOptionalParam("min", "Min amount in Metis")
  .addOptionalParam("max", "Max amount in Metis")
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const { address: lockingPoolAddress } =
      await hre.deployments.get("LockingPool");

    const contract = await hre.ethers.getContractAt(
      lockingPoolName,
      lockingPoolAddress,
    );

    if (args["min"]) {
      const min = hre.ethers.parseEther(args["min"]);
      const min2 = await contract.minLock();
      if (min != min2) {
        console.log(
          `setting min lock to ${args["min"]}, the previous is ${hre.ethers.formatEther(min2)}`,
        );
        const tx = await contract.updateMinAmounts(min);
        await tx.wait(2);
      }
    }

    if (args["max"]) {
      const max = hre.ethers.parseEther(args["max"]);
      const max2 = await contract.maxLock();
      if (max != max2) {
        console.log(
          `setting min lock to ${args["max"]}, the previous is ${hre.ethers.formatEther(max2)}`,
        );
        const tx = await contract.updateMaxAmounts(max);
        await tx.wait();
      }
    }
  });

task("l1:update-mpc-address", "Update MPC address for LockingPool contract")
  .addOptionalParam("contract", "The LockingPool address")
  .addOptionalParam("mpcAddress", "The new MPC address")
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const LockingPoolFactory =
      await hre.ethers.getContractFactory(lockingPoolName);

    const LockingPool = <LockingPool>(
      await LockingPoolFactory.attach(args["contract"])
    );

    const tx = await LockingPool.updateMpc(args["mpcAddress"]);
    await tx.wait();
  });
