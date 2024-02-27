import { task, types } from "hardhat/config";
import fs from "fs";

import { parseDuration, trimPubKeyPrefix } from "../utils/params";
import {
  LockingInfoContractName,
  LockingPoolContractName,
} from "../utils/constant";

task("l1:whitelist", "Whitelist an sequencer address")
  .addParam("addr", "the sequencer address", "", types.string)
  .addOptionalParam(
    "enable",
    "enable or remove the sequencer",
    true,
    types.boolean,
  )
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const { address: LockingPoolAddress } = await hre.deployments.get(
      LockingPoolContractName,
    );

    const lockingManager = await hre.ethers.getContractAt(
      LockingPoolContractName,
      LockingPoolAddress,
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

    const tx = await lockingManager.setWhitelist(addr, enable);
    console.log("Confrimed at", tx.hash);
  });

task("l1:lock", "Lock Metis to LockingPool contract")
  .addParam("key", "the private key file path for the sequencer")
  .addParam("amount", "lock amount in Metis", "", types.string)
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const metisL1Addr = process.env.MEITS_L1_TOKEN as string;
    if (!hre.ethers.isAddress(metisL1Addr)) {
      throw new Error(`MEITS_L1_TOKEN env is not set or it's not an address`);
    }

    const amountInWei = hre.ethers.parseEther(args["amount"]);

    const { address: LockingInfoAddress } = await hre.deployments.get(
      LockingInfoContractName,
    );

    const lockingEscrow = await hre.ethers.getContractAt(
      LockingInfoContractName,
      LockingInfoAddress,
    );

    // min/max lock check
    const [minLock, maxLock] = await Promise.all([
      lockingEscrow.minLock(),
      lockingEscrow.maxLock(),
    ]);

    if (amountInWei < minLock) {
      throw new Error(`minLock is ${hre.ethers.formatEther(minLock)}`);
    }
    if (amountInWei > maxLock) {
      throw new Error(`maxLock is ${hre.ethers.formatEther(maxLock)}`);
    }

    const { address: LockingPoolAddress } = await hre.deployments.get(
      LockingPoolContractName,
    );

    const [signer] = await hre.ethers.getSigners();

    const seqKey = new hre.ethers.SigningKey(
      fs.readFileSync(args["key"]).toString("utf8").trim(),
    );

    const seqWallet = new hre.ethers.Wallet(seqKey, hre.ethers.provider);

    console.log("Locking Metis for", seqWallet.address);

    const lockingManager = await hre.ethers.getContractAt(
      LockingPoolContractName,
      LockingPoolAddress,
    );

    console.log("checking whitelist status");
    const isWhitelisted = await lockingManager.whitelist(seqWallet.address);
    if (!isWhitelisted) {
      throw new Error(`Your address ${signer.address} is not whitelisted`);
    }

    const metis = await hre.ethers.getContractAt("TestERC20", metisL1Addr);
    console.log("checking the Metis balance");
    const metisBalance = await metis.balanceOf(seqWallet.address);
    if (metisBalance < amountInWei) {
      throw new Error(
        `Insufficient Metis balance, current balance ${hre.ethers.formatEther(metisBalance)}, required balance ${args["amount"]}`,
      );
    }

    console.log("checking the allowance");
    const allowance = await metis.allowance(
      seqWallet.address,
      LockingInfoAddress,
    );
    if (allowance < amountInWei) {
      console.log("approving Metis to LockingEscrow");
      const tx = await metis
        .connect(seqWallet)
        .approve(LockingInfoAddress, amountInWei);
      await tx.wait(2);
    }

    console.log(`locking ${args["amount"]}`);
    const tx = await lockingManager
      .connect(seqWallet)
      .lockFor(
        seqWallet.address,
        amountInWei,
        trimPubKeyPrefix(seqKey.publicKey),
      );
    console.log("Confrimed at", tx.hash);
  });

task("l1:update-lock-amount", "Update locking amount condition")
  .addOptionalParam("min", "Min amount in Metis", "", types.string)
  .addOptionalParam("max", "Max amount in Metis", "", types.string)
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const { address: LockingInfoAddress } = await hre.deployments.get(
      LockingInfoContractName,
    );

    const lockingEscrow = await hre.ethers.getContractAt(
      LockingInfoContractName,
      LockingInfoAddress,
    );

    let actions = 0;
    if (args["min"]) {
      actions++;
      const min = hre.ethers.parseEther(args["min"]);
      const min2 = await lockingEscrow.minLock();
      if (min != min2) {
        console.log(
          `setting min lock to ${args["min"]}, the previous is ${hre.ethers.formatEther(min2)}`,
        );
        const tx = await lockingEscrow.setMinLock(min);
        await tx.wait(2);
      }
    }

    if (args["max"]) {
      actions++;
      const max = hre.ethers.parseEther(args["max"]);
      const max2 = await lockingEscrow.maxLock();
      if (max != max2) {
        console.log(
          `setting min lock to ${args["max"]}, the previous is ${hre.ethers.formatEther(max2)}`,
        );
        const tx = await lockingEscrow.setMaxLock(max);
        console.log("Confrimed at", tx.hash);
      }
    }

    if (!actions) {
      console.log("You need to provide --min or --max argument");
    }
  });

task("l1:update-mpc-address", "Update MPC address for LockingPool contract")
  .addParam("addr", "The new MPC address", "", types.string)
  .addOptionalParam("fund", "Send ETH gas to the MPC address at last")
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const { address: lockingPoolAddress } =
      await hre.deployments.get("LockingPool");

    const { address: LockingPoolAddress } = await hre.deployments.get(
      LockingPoolContractName,
    );

    const lockingManager = await hre.ethers.getContractAt(
      LockingPoolContractName,
      LockingPoolAddress,
    );

    const newAddr = args["addr"];
    if (!hre.ethers.isAddress(newAddr)) {
      throw new Error(`addr arg is not a valid address`);
    }

    console.log("Updating the MPC address to", newAddr);
    const tx = await lockingManager.updateMpc(newAddr);
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

    const { address: LockingPoolAddress } = await hre.deployments.get(
      LockingPoolContractName,
    );

    const lockingManager = await hre.ethers.getContractAt(
      LockingPoolContractName,
      LockingPoolAddress,
    );

    const duration = parseDuration(args["duration"]);
    console.log(`update the delay to ${args["duration"]}(=${duration}s)`);
    const tx = await lockingManager.updateWithdrawDelayTimeValue(duration);
    console.log("Confrimed at", tx.hash);
  });

task("l1:update-reward-per-block", "update reward per block")
  .addParam("value", "the reward per block", "", types.string)
  .addParam("unit", "ether", "wei/gwei/ether", types.string)
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const { address: LockingPoolAddress } = await hre.deployments.get(
      LockingPoolContractName,
    );

    const lockingManager = await hre.ethers.getContractAt(
      LockingPoolContractName,
      LockingPoolAddress,
    );

    console.log(
      `update the reward per block value to ${args["value"]}${args["unit"]}`,
    );

    const tx = await lockingManager.updateBlockReward(
      hre.ethers.parseUnits(args["value"], args["unit"]),
    );

    console.log("Confrimed at", tx.hash);
  });
