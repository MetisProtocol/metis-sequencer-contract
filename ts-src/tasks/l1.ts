import { task, types } from "hardhat/config";
import fs from "fs";

import { parseDuration } from "../utils/params";

const lockingPoolName = "LockingPool";

task("l1:whitelist", "Whitelist an sequencer address")
  .addParam("addr", "the sequencer address", "", types.string)
  .addOptionalParam(
    "enable",
    "enable or remove the sequencer",
    "true",
    types.boolean,
  )
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
    console.log("Confrimed at", tx.hash);
  });

task("l1:lock", "Lock Metis to LockingPool contract")
  .addParam(
    "key",
    "the private key file path for the sequencer",
    "",
    types.string,
  )
  .addParam("amount", "lock amount in Metis", "", types.float)
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const metisL1Addr = process.env.MEITS_L1_TOKEN as string;
    if (!hre.ethers.isAddress(metisL1Addr)) {
      throw new Error(`MEITS_L1_TOKEN env is not set or it's not an address`);
    }

    const amountInWei = hre.ethers.parseEther(args["amount"]);

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
    console.log("Confrimed at", tx.hash);
  });

task("l1:update-lock-amount", "Update locking amount condition")
  .addOptionalParam("min", "Min amount in Metis", "", types.float)
  .addOptionalParam("max", "Max amount in Metis", "", types.float)
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

    let actions = 0;
    if (args["min"]) {
      actions++;
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
      actions++;
      const max = hre.ethers.parseEther(args["max"]);
      const max2 = await contract.maxLock();
      if (max != max2) {
        console.log(
          `setting min lock to ${args["max"]}, the previous is ${hre.ethers.formatEther(max2)}`,
        );
        const tx = await contract.updateMaxAmounts(max);
        console.log("Confrimed at", tx.hash);
      }
    }

    if (!actions) {
      console.log("You need to provide --min or --max argument");
    }
  });

task("l1:update-mpc-address", "Update MPC address for LockingPool contract")
  .addParam("addr", "The new MPC address", "", types.string)
  .addOptionalParam(
    "fund",
    "Send ETH gas to the MPC address at last",
    "",
    types.float,
  )
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const { address: lockingPoolAddress } =
      await hre.deployments.get("LockingPool");

    const lockingPool = await hre.ethers.getContractAt(
      lockingPoolName,
      lockingPoolAddress,
    );

    const newAddr = args["addr"];
    if (!hre.ethers.isAddress(newAddr)) {
      throw new Error(`addr arg is not a valid address`);
    }

    console.log("Updating the MPC address to", newAddr);
    const tx = await lockingPool.updateMpc(newAddr);
    console.log("Confrimed at", tx.hash);

    if (args["fund"]) {
      const amountInWei = (() => {
        try {
          return hre.ethers.parseEther(args["fund"]);
        } catch {
          throw new Error(
            `The amount arg ${args["fund"]} is not a valid number`,
          );
        }
      })();

      console.log(`Sending ${args["fund"]} ETH to the mpc address`);
      const [signer] = await hre.ethers.getSigners();
      const tx = await signer.sendTransaction({
        to: newAddr,
        value: amountInWei,
      });
      console.log("Confrimed at", tx.hash);
    }
  });

task("l1:update-exit-delay", "update exit delay time duration")
  .addParam("duration", "duration string(e.g. 1d1h30m20s)", "", types.string)
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const { address: lockingPoolAddress } =
      await hre.deployments.get("LockingPool");

    const lockingPool = await hre.ethers.getContractAt(
      lockingPoolName,
      lockingPoolAddress,
    );

    const duration = parseDuration(args["duration"]);
    console.log(`update the delay to ${args["duration"]}(=${duration}s)`);
    const tx = await lockingPool.updateWithdrawDelayTimeValue(duration);
    console.log("Confrimed at", tx.hash);
  });
