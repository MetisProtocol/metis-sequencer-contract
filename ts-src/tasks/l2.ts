import { task } from "hardhat/config";

const conractName = "MetisSequencerSet";

task("l2:update-mpc-address", "Update MPC address for SequencerSet contract")
  .addOptionalParam("addr", "The new MPC address")
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l2"]) {
      throw new Error(`${hre.network.name} is not an l2`);
    }

    const { address: seqsetAddress } = await hre.deployments.get(conractName);
    const seqset = await hre.ethers.getContractAt(conractName, seqsetAddress);

    const newAddr = args["addr"];
    if (!hre.ethers.isAddress(newAddr)) {
      throw new Error(`addr arg is not a valid address`);
    }

    const tx = await seqset.UpdateMpcAddress(newAddr);
    await tx.wait();
  });

task("l2:update-epoch-length", "Update epoch(aka span) length")
  .addOptionalParam("length", "The new epoch length")
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l2"]) {
      throw new Error(`${hre.network.name} is not an l2`);
    }

    const { address: seqsetAddress } = await hre.deployments.get(conractName);
    const seqset = await hre.ethers.getContractAt(conractName, seqsetAddress);

    const length = parseInt(args["length"], 0);
    if (Number.isNaN(length)) {
      throw new Error(`length arg is not a valid number`);
    }

    console.log(`Updating the epoch length to ${length}`);
    const tx = await seqset.UpdateEpochLength(length);
    await tx.wait();
  });
