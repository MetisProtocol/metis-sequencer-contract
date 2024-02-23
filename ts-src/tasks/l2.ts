import { task } from "hardhat/config";

const conractName = "MetisSequencerSet";

task("l2:update-mpc-address", "Update MPC address for SequencerSet contract")
  .addOptionalParam("addr", "The new MPC address")
  .addOptionalParam("fund", "Send the Metis gas to the MPC address at last")
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

    console.log("Updating");
    const tx1 = await seqset.UpdateMpcAddress(newAddr);
    console.log("Confrimed at", tx1.hash);

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
    console.log("Confrimed at", tx.hash);
  });
