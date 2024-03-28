import { DeployFunction } from "hardhat-deploy/types";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { SequencerSetContractName } from "../utils/constant";

const func: DeployFunction = async function (hre) {
  if (!hre.network.tags["l2"]) {
    throw new Error(`current network ${hre.network.name} is not an L2`);
  }

  const { deployer } = await hre.getNamedAccounts();

  const seq = process.env.METIS_SEQSET_FIRST_SEQUENCER;
  if (!hre.ethers.isAddress(seq)) {
    throw new Error(
      `METIS_SEQSET_FIRST_SEQUENCER env is not set or it's not an address`,
    );
  }

  const startBlock = parseInt(
    process.env.METIS_SEQSET_FIRST_START_BLOCK as string,
    0,
  );
  if (Number.isNaN(startBlock)) {
    throw new Error(
      `METIS_SEQSET_FIRST_START_BLOCK env is not set or it's not a number`,
    );
  }

  const endblock = parseInt(
    process.env.METIS_SEQSET_FIRST_END_BLOCK as string,
    0,
  );
  if (Number.isNaN(startBlock)) {
    throw new Error(
      `METIS_SEQSET_FIRST_END_BLOCK env is not set or it's not a number`,
    );
  }

  const epochLength = parseInt(
    process.env.METIS_SEQSET_EPOCH_LENGTH as string,
    0,
  );

  if (Number.isNaN(startBlock)) {
    throw new Error(
      `METIS_SEQSET_EPOCH_LENGTH env is not set or it's not a number`,
    );
  }

  if (startBlock > endblock) {
    throw new Error(`startBlock(${startBlock}) > endBlock(${endblock}) `);
  }

  if (epochLength < 1) {
    throw new Error(`epoch length(${epochLength}) < 1`);
  }

  // We do not check if the length between the start and end block matches the epoch length
  // the epoch length can only be used for next epoch
  // if ((endblock - startBlock + 1) % epochLength !== 0) {
  //   throw new Error(`epoch length not match with startBlock and endBlock`);
  // }

  console.log(
    "using params:",
    "seq",
    seq,
    "start",
    startBlock,
    "end",
    endblock,
    "epochLength",
    epochLength,
  );

  const prompt = readline.createInterface({ input: stdin, output: stdout });
  const answer = await prompt.question(
    "Do you want to continue? (Only 'yes' will be accepted to approve) ",
  );
  if (answer !== "yes") {
    console.log("Okay, I will exit");
    return;
  }

  await hre.deployments.deploy(SequencerSetContractName, {
    from: deployer,
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        init: {
          methodName: "initialize",
          // use deployer as the first mpc address
          args: [seq, deployer, startBlock, endblock, epochLength],
        },
      },
    },
    waitConfirmations: 1,
    log: true,
  });
};

func.tags = [SequencerSetContractName, "l2"];

export default func;
