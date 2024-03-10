import { task } from "hardhat/config";

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
