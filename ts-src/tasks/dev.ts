import { task } from "hardhat/config";

import {
  LockingInfoContractName,
  LockingPoolContractName,
  SequencerSetContractName,
} from "../utils/constant";

import metisTokenABI from "./metis-abi.json";

task("info", "print current network and wallet information", async (_, hre) => {
  const provider = hre.ethers.provider;
  const [network, blockNumber] = await Promise.all([
    provider.getNetwork(),
    await provider.getBlockNumber(),
  ]);

  console.log(
    "Network",
    network.name,
    "chainId",
    Number(network.chainId),
    "Block",
    blockNumber,
  );

  for (const [index, signer] of (await hre.ethers.getSigners()).entries()) {
    const [balance, nonce] = await Promise.all([
      provider.getBalance(signer.address),
      provider.getTransactionCount(signer.address),
    ]);
    console.log(`Wallet ${index}:`);
    console.log(
      `${signer.address} Balance: ${hre.ethers.formatEther(balance)} Nonce: ${nonce}`,
    );
  }
});

task("err-decode", "decode error info")
  .addParam("error", "the encoded error data")
  .setAction(async (args, hre) => {
    for (const item of [
      LockingInfoContractName,
      LockingPoolContractName,
      SequencerSetContractName,
      metisTokenABI,
    ] as Array<string | Array<any>>) {
      let abi =
        typeof item === "string"
          ? (await hre.artifacts.readArtifact(item)).abi
          : item;

      const dedec = new hre.ethers.Interface(abi);
      const result = dedec.parseError(args["error"]);
      if (result) {
        return console.log(result);
      }
    }
  });
