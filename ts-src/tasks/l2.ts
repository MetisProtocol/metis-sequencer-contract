import { task, types } from "hardhat/config";
import { SequencerSetContractName } from "../utils/constant";

task("l2:update-mpc-address", "Update MPC address for SequencerSet contract")
  .addParam("addr", "The new MPC address")
  .addOptionalParam("fund", "Send the Metis gas to the MPC address at last")
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l2"]) {
      throw new Error(`${hre.network.name} is not an l2`);
    }

    const { address: seqsetAddress } = await hre.deployments.get(
      SequencerSetContractName,
    );
    const seqset = await hre.ethers.getContractAt(
      SequencerSetContractName,
      seqsetAddress,
    );

    const newAddr = args["addr"];
    if (!hre.ethers.isAddress(newAddr)) {
      throw new Error(`addr arg is not a valid address`);
    }

    if ((await seqset.mpcAddress()) === newAddr) {
      console.log("No changes");
      return;
    }

    console.log("Updating the MPC address to", newAddr);
    const tx = await seqset.UpdateMpcAddress(newAddr);
    await tx.wait(1);
    console.log("Confirmed at", tx.hash);

    if (args["fund"]) {
      const amountInWei = hre.ethers.parseEther(args["fund"]);
      console.log(`Sending ${args["fund"]} Metis to the mpc address`);
      const [signer] = await hre.ethers.getSigners();
      const tx = await signer.sendTransaction({
        to: newAddr,
        value: amountInWei,
      });
      console.log("Confrimed at", tx.hash);
    }
  });

task("l2:update-epoch-length", "Update epoch(aka span) length")
  .addParam("length", "The new epoch length", "", types.int)
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l2"]) {
      throw new Error(`${hre.network.name} is not an l2`);
    }

    const { address: seqsetAddress } = await hre.deployments.get(
      SequencerSetContractName,
    );
    const seqset = await hre.ethers.getContractAt(
      SequencerSetContractName,
      seqsetAddress,
    );

    const length = parseInt(args["length"], 0);
    if (Number.isNaN(length)) {
      throw new Error(`length arg is not a valid number`);
    }

    console.log(`Updating the epoch length to ${length}`);
    const tx = await seqset.UpdateEpochLength(length);
    await tx.wait(1);
    console.log("Confrimed at", tx.hash);
  });

task("l2:epoch", "Get current epoch info").setAction(async (_, hre) => {
  if (!hre.network.tags["l2"]) {
    throw new Error(`${hre.network.name} is not an l2`);
  }

  const { address: seqsetAddress } = await hre.deployments.get(
    SequencerSetContractName,
  );
  const seqset = await hre.ethers.getContractAt(
    SequencerSetContractName,
    seqsetAddress,
  );

  {
    const block = await hre.ethers.provider.getBlock("latest", false);
    const epochNumber = await seqset.getEpochByBlock(block!.number);
    console.log("height", block!.number);

    const { number, signer, startBlock, endBlock } =
      await seqset.epochs(epochNumber);

    console.log(
      "producingEpoch",
      number,
      "signer",
      signer,
      "startBlock",
      startBlock,
      "endBlock",
      endBlock,
    );
  }

  {
    const { number, signer, startBlock, endBlock } =
      await seqset.currentEpoch();

    console.log(
      "latestEpoch",
      number,
      "signer",
      signer,
      "startBlock",
      startBlock,
      "endBlock",
      endBlock,
    );
  }
});
