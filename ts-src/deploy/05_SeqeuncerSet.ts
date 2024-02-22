import { DeployFunction } from "hardhat-deploy/types";

const ctName = "MetisSequencerSet";

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

  await hre.deployments.deploy(ctName, {
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

func.tags = [ctName, "l2"];

export default func;
