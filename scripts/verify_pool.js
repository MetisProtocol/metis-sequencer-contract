require("@nomiclabs/hardhat-etherscan");

// eth
const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const oneInchAddress = "0x1111111254fb6c44bAC0beD2854e76F90643097d";
const starkExAddress = "0xA1D5443F2FB80A5A55ac804C948B45ce4C52DCbb";
const factAddress = "0xBE9a129909EbCb954bC065536D2bfAfBd170d27A";

let pool = '0x1661181907bBbd0688EBC6B3b630b3669bBB4Bd4';
var signers = [
  "0x015155D9f7bb601FbF25084C106531c759c05379",
  "0x321072F3Ce95EDa4cc87F42FA483a5822a8A7A92",
  "0xfA85BEA9B0F2D9540040118BeacbaD7258f45d81",
];

// BSC
// const usdcAddress = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
// const oneInchAddress = "0x1111111254fb6c44bAC0beD2854e76F90643097d";
// const starkExAddress = "0x0000000000000000000000000000000000000000";
// const factAddress = "0x0000000000000000000000000000000000000000";

// let pool = '0x2fd7d4A45f80b1d22d1eBb7B3b2961D131eB0A22';
// var signers = [
//   "0xa3037C93F689D70FdE0edD811f98dCb3912d630a",
//   "0x92845F13f99D116A95f300dad6C396e9FE0D9Cc9",
//   "0xfA85BEA9B0F2D9540040118BeacbaD7258f45d81",
// ];


// MATIC
// const usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
// const oneInchAddress = "0x1111111254fb6c44bAC0beD2854e76F90643097d";
// const starkExAddress = "0x0000000000000000000000000000000000000000";
// const factAddress = "0x0000000000000000000000000000000000000000";


// let pool = '0x7B55800de02e4799F7b00a2C9963575464053F6A';
// var signers = [
//     "0x9C5E4D586B38bfcFF9b64EAC7e78FF05068f9641",
//     "0x203a5296948d5DD8889b3EC3097911451066B806",
//     "0xfA85BEA9B0F2D9540040118BeacbaD7258f45d81",
//   ];

/// below variables only for testnet
const main = async () => {
  const accounts = await hre.ethers.getSigners();
  let signer = accounts[0].address;
  console.log("signer address:%s", signer);

  await verifyPool();
};


// constructor(address[] memory allowedSigners, address usdc, address aggregationRouterV4, address starkex, address fact) 

async function verifyPool() {
  await hre.run("verify:verify", {
    address: pool,
    contract: "contracts/core/MultiSigPool.sol:MultiSigPool",
    constructorArguments: [
      signers,
      usdcAddress,
      oneInchAddress,
      starkExAddress,
      factAddress,
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
