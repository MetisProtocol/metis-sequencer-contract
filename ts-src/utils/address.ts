const l2ChainIdMap: { [key: string]: number } = {
  mainnet: 1088,
  sepolia: 59902,
  holesky: 59903,
  devnet: Number(process.env["DEVBNET_L2_CHAINID"]),
};

const l1BridgeMap: { [key: string]: string } = {
  mainnet: "0x3980c9ed79d2c191A89E02Fa3529C60eD6e9c04b",
  sepolia: "0x9848dE505e6Aa301cEecfCf23A0a150140fc996e",
  holesky: "0x890D4Ef96551C9904e7D4E73d2C22D3F207F5CFb",
  devnet: process.env["DEVBNET_METIST_L1_BRIDGE"] as string,
};

const l1MetisMap: { [key: string]: string } = {
  mainnet: "0x9e32b13ce7f2e80a01932b42553652e053d6ed8e",
  sepolia: "0x7f49160EB9BB068101d445fe77E17ecDb37D0B47",
  holesky: "0xaf8e5B10c69c983204505cDCD56Ec2aC2280D08e",
  devnet: process.env["DEVBNET_METIST_TOKEN"] as string,
};

export { l2ChainIdMap, l1BridgeMap, l1MetisMap };
