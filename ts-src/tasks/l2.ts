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

task("l2:get-mpc-address", "Get current MPC address").setAction(
  async (_, hre) => {
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
    const address = await seqset.mpcAddress();
    const balance = await hre.ethers.provider.getBalance(address);
    console.log(
      hre.network.name,
      "address",
      address,
      "balance",
      hre.ethers.formatEther(balance),
    );
  },
);

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

task("l2:epoch", "Get current epoch info or provide an epoch i")
  .addOptionalParam("epoch", "epoch number")
  .addOptionalParam("block", "block number")
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l2"]) {
      throw new Error(`${hre.network.name} is not an l2`);
    }

    const seqNames = new Map<string, string>();

    if (
      hre.network.name === "metis-sepolia" ||
      hre.network.name === "metis-andromeda"
    ) {
      const chainId = await hre.getChainId();

      const data: Array<{ name: string; seq_addr: string }> = await (
        await fetch(
          `https://metisprotocol.github.io/metis-sequencer-resources/${chainId}/all.json`,
        )
      ).json();

      for (const item of data) {
        seqNames.set(item.seq_addr.toLowerCase(), item["name"]);
      }
    }

    const { address: seqsetAddress } = await hre.deployments.get(
      SequencerSetContractName,
    );
    const seqset = await hre.ethers.getContractAt(
      SequencerSetContractName,
      seqsetAddress,
    );

    {
      const epoch = parseInt(args["epoch"], 0);
      if (epoch) {
        const { number, signer, startBlock, endBlock } =
          await seqset.epochs(epoch);

        const seqName = seqNames.get(signer.toLocaleLowerCase()) || signer;

        console.log(
          "epochInfo",
          number,
          "signer",
          seqName,
          "startBlock",
          startBlock,
          "endBlock",
          endBlock,
        );
        return;
      }
    }

    {
      const block = parseInt(args["block"], 0);
      if (block) {
        const epoch = await seqset.getEpochByBlock(block);
        const { number, signer, startBlock, endBlock } =
          await seqset.epochs(epoch);

        const seqName = seqNames.get(signer.toLocaleLowerCase()) || signer;

        console.log(
          "epochInfo",
          number,
          "signer",
          seqName,
          "startBlock",
          startBlock,
          "endBlock",
          endBlock,
        );
        return;
      }
    }

    {
      const block = await hre.ethers.provider.getBlock("latest", false);
      const epochNumber = await seqset.getEpochByBlock(block!.number);
      console.log("height", block!.number);

      const { number, signer, startBlock, endBlock } =
        await seqset.epochs(epochNumber);

      const seqName = seqNames.get(signer.toLocaleLowerCase()) || signer;

      console.log(
        "producingEpoch",
        number,
        "signer",
        seqName,
        "startBlock",
        startBlock,
        "endBlock",
        endBlock,
      );
    }

    {
      const { number, signer, startBlock, endBlock } =
        await seqset.currentEpoch();

      const seqName = seqNames.get(signer.toLocaleLowerCase()) || signer;

      console.log(
        "latestEpoch",
        number,
        "signer",
        seqName,
        "startBlock",
        startBlock,
        "endBlock",
        endBlock,
      );
    }
  });
