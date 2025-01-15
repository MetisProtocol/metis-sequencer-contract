import fs from "fs";
import { task, types } from "hardhat/config";

import { stdin, stdout } from "node:process";
import readline from "node:readline/promises";

import { l1MetisMap } from "../utils/address";
import {
  LockingInfoContractName,
  LockingPoolContractName,
} from "../utils/constant";
import { parseDuration, trimPubKeyPrefix } from "../utils/params";

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
      console.log(`Adding ${args["addr"]} to whitelist`);
    } else {
      console.log(`Removing ${args["addr"]} from whitelist`);
    }

    const whitelisted = await lockingManager.whitelist(addr);
    if (whitelisted == enable) {
      console.log("No changes");
      return;
    }

    const tx = await lockingManager.setWhitelist(addr, enable);
    await tx.wait(1);
    console.log("Confrimed at", tx.hash);
  });

task("l1:lock", "Lock Metis to LockingPool contract")
  .addParam(
    "ownerPrivkeyPath",
    `the private key file path of the owner of the sequencer, the address should be whitelisted first and have Metis to lock and Eth to pay gas fee`,
    "",
    types.inputFile,
  )
  .addParam(
    "nodePubkey",
    "the uncompressed public key file path of sequencer node",
  )
  .addParam("amount", "lock amount in Metis")
  .addOptionalParam(
    "rewardRecipient",
    "reward recipient, default is the owner address",
  )
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const metisL1Addr = l1MetisMap[hre.network.name];
    if (!hre.ethers.isAddress(metisL1Addr)) {
      throw new Error(`MEITS_L1_TOKEN env is not set or it's not an address`);
    }

    console.log(`Reading key from ${args["ownerPrivkeyPath"]}`);
    const seqOwnerWallet = new hre.ethers.Wallet(
      new hre.ethers.SigningKey(
        fs.readFileSync(args["ownerPrivkeyPath"]).toString("utf8").trim(),
      ),
      hre.ethers.provider,
    );

    const nodePubkey = <string>args["nodePubkey"];
    if (nodePubkey.length != 132 || !nodePubkey.startsWith("0x04")) {
      throw new Error("the node key should be an uncompressed public key");
    }
    const nodeAddress = hre.ethers.computeAddress(nodePubkey);

    // if the reward receipt is not provided, use the owner address instread
    const rewardReceipt =
      <string>args["rewardRecipient"] ?? seqOwnerWallet.address;
    if (!hre.ethers.isAddress(rewardReceipt)) {
      throw new Error(`reward recipient is not a valid address`);
    }

    const amountInWei = hre.ethers.parseEther(args["amount"]);

    const { address: LockingInfoAddress } = await hre.deployments.get(
      LockingInfoContractName,
    );

    const lockingInfo = await hre.ethers.getContractAt(
      LockingInfoContractName,
      LockingInfoAddress,
    );

    // min/max restriction check
    const [minLock, maxLock] = await Promise.all([
      lockingInfo.minLock(),
      lockingInfo.maxLock(),
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

    console.log("Sequencer owner", seqOwnerWallet.address);
    console.log("Sequencer signer(Node address)", nodeAddress);
    console.log("Reward recipient", rewardReceipt);
    console.log("Locking amount", hre.ethers.formatEther(amountInWei));

    const prompt = readline.createInterface({ input: stdin, output: stdout });
    const answer = await prompt.question(
      "Do you want to continue? (Only 'yes' will be accepted to approve) ",
    );
    if (answer !== "yes") {
      console.log("Okay, I will exit");
      return;
    }

    const lockingManager = await hre.ethers.getContractAt(
      LockingPoolContractName,
      LockingPoolAddress,
    );

    console.log("checking whitelist status");
    const isWhitelisted = await lockingManager.whitelist(
      seqOwnerWallet.address,
    );
    if (!isWhitelisted) {
      throw new Error(
        `Your address ${seqOwnerWallet.address} is not whitelisted`,
      );
    }

    const metis = await hre.ethers.getContractAt("TestERC20", metisL1Addr);
    console.log("checking the Metis balance");
    const metisBalance = await metis.balanceOf(seqOwnerWallet.address);
    if (metisBalance < amountInWei) {
      throw new Error(
        `Insufficient Metis balance, current balance ${hre.ethers.formatEther(metisBalance)}, required balance ${args["amount"]}`,
      );
    }

    console.log("checking the allowance");
    const allowance = await metis.allowance(
      seqOwnerWallet.address,
      LockingInfoAddress,
    );
    if (allowance < amountInWei) {
      console.log("approving Metis");
      const tx = await metis
        .connect(seqOwnerWallet)
        .approve(LockingInfoAddress, amountInWei);
      await tx.wait(2);
    }

    console.log(`locking ${args["amount"]}`);
    const tx = await lockingManager
      .connect(seqOwnerWallet)
      .lockWithRewardRecipient(
        nodeAddress,
        rewardReceipt,
        amountInWei,
        trimPubKeyPrefix(nodePubkey),
      );
    await tx.wait(1);
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
        await tx.wait(1);
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

    if ((await lockingManager.mpcAddress()) === newAddr) {
      console.log("No changes");
      return;
    }

    console.log("Updating the MPC address to", newAddr);
    const tx = await lockingManager.updateMpc(newAddr);
    console.log("Confirmed at", tx.hash);
    await tx.wait(3);

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
      await tx.wait(1);
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
    await tx.wait(1);
    console.log("Confrimed at", tx.hash);
  });

task("l1:update-reward-per-block", "update reward per block")
  .addParam(
    "value",
    "the reward per block, use number+unit, e.g. 0.000761metis",
    "",
    types.string,
  )
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const regexp = /^(\d+\.?\d+)\s?(metis|ether|gwei|wei)$/;
    const matched = args["value"].match(regexp);
    if (!matched) {
      throw new Error(`Invalid value input ${args["value"]}`);
    }

    const { address: LockingPoolAddress } = await hre.deployments.get(
      LockingPoolContractName,
    );

    const lockingManager = await hre.ethers.getContractAt(
      LockingPoolContractName,
      LockingPoolAddress,
    );

    const [_, value, unit] = matched;
    const wei = hre.ethers.parseUnits(value, unit === "metis" ? "ether" : unit);
    console.log(
      `update the reward per block value to ${value} ${unit} = (${wei} wei)`,
    );
    const prompt = readline.createInterface({ input: stdin, output: stdout });
    const answer = await prompt.question(
      "Do you want to continue? (Only 'yes' will be accepted to approve) ",
    );
    if (answer !== "yes") {
      console.log("Okay, I will exit");
      return;
    }
    const tx = await lockingManager.updateBlockReward(wei);
    await tx.wait(1);
    console.log("Confrimed at", tx.hash);
  });

task("l1:set-reward-payer", "Update reward payer")
  .addParam("addr", "The new payer address", "", types.string)
  .addParam(
    "approve",
    "approve if the signer is equal with the addr",
    false,
    types.boolean,
  )
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const { address: LockingInfoAddress } = await hre.deployments.get(
      LockingInfoContractName,
    );

    const lockingInfo = await hre.ethers.getContractAt(
      LockingInfoContractName,
      LockingInfoAddress,
    );

    const newAddr = args["addr"];
    if (!hre.ethers.isAddress(newAddr)) {
      throw new Error(`addr arg is not a valid address`);
    }

    if ((await lockingInfo.rewardPayer()) !== newAddr) {
      console.log("Updating the reward payer address to", newAddr);
      const tx = await lockingInfo.setRewardPayer(newAddr);
      await tx.wait(1);
      console.log("Confirmed at", tx.hash);
    } else {
      console.log("No changes");
    }

    if (args["approve"]) {
      const [signer] = await hre.ethers.getSigners();
      if ((await signer.getAddress()) != newAddr) {
        console.log("No the signer, can't continue to approve");
        return;
      }

      const metisL1Addr = l1MetisMap[hre.network.name];
      if (!hre.ethers.isAddress(metisL1Addr)) {
        throw new Error(`MEITS_L1_TOKEN env is not set or it's not an address`);
      }
      const metis = await hre.ethers.getContractAt("TestERC20", metisL1Addr);
      const allowance = await metis.allowance(newAddr, LockingInfoAddress);
      if (allowance !== hre.ethers.MaxUint256) {
        console.log("approving Metis");
        const tx = await metis.approve(
          LockingInfoAddress,
          hre.ethers.MaxUint256,
        );
        await tx.wait(1);
        console.log("Confirmed at", tx.hash);
      } else {
        console.log("approved before");
      }
    } else {
      console.log(
        "Note: You need to approve your Metis to LockingInfo contract later",
      );
    }
  });

task("l1:target-reward-per-block", "Update reward payer")
  .addParam("interval", "The block generation interval", 8, types.int)
  .addParam("rate", "The reward rate target", 20, types.int)
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    if (args["rate"] < 1 || args["rate"] > 50) {
      throw new Error("The rate should be in 1-50");
    }

    const { address: LockingInfoAddress } = await hre.deployments.get(
      LockingInfoContractName,
    );

    const lockingInfo = await hre.ethers.getContractAt(
      LockingInfoContractName,
      LockingInfoAddress,
    );

    const totalLocked = await lockingInfo.totalLocked();
    console.log("totalLocked", totalLocked.toString());

    const blocks = (365n * 24n * 3600n) / BigInt(args["interval"]);
    const result = (totalLocked * BigInt(args["rate"])) / 100n / blocks;
    console.log("targetRewardPerBlock", result.toString());
  });
