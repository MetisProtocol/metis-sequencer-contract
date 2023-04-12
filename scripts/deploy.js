const { ethers, upgrades } = require("hardhat");
require("@nomiclabs/hardhat-etherscan");

const verifyStr = "npx hardhat verify --network";

// goerli env
const usdcAddress = "0xd44BB808bfE43095dBb94c83077766382D63952a";
const starkEx = "0x7478037C3a1F44f0Add4Ae06158fefD10d44Bb63";
const factAddress = "0x5070F5d37419AEAd10Df2252421e457336561269";
const wethAddress = "0x655e2b2244934Aea3457E3C56a7438C271778D44";
const oneInchAddress = "0x655e2b2244934Aea3457E3C56a7438C271778D44";

let pool = '0xC73ac64cE48750C5d273ab1886Aff3AF34cbA33f';
let signer;

var signers = [
    "0x9F41154D472dD406B907A2F6827d6Be5D3215bcB",
    "0x086E48b2752194E6cd85b7FEA18B1513162196b8",
    "0x94f397b322F3A914e15c6C058356F4839bCC5b1B",
  ];

/// below variables only for testnet

const main = async () => {
  const accounts = await hre.ethers.getSigners();
  signer = accounts[0].address;
  console.log("signer address:%s", signer);

  // await createUsdc();
  // await createMultiSigWallet();
  await verify();
};

async function createMultiSigWallet() {
  const MultiSigPool = await hre.ethers.getContractFactory("MultiSigPool");

  multiSigPool = await MultiSigPool.deploy(signers, usdcAddress, oneInchAddress, starkEx, factAddress);
  console.log("multisig wallet deployed to:", multiSigPool.address);
  pool = multiSigPool.address;
  console.log(verifyStr, process.env.HARDHAT_NETWORK, multiSigPool.address);
}

async function verify() {
  await hre.run("verify:verify", {
    address: pool,
    contract: "contracts/core/MultiSigPool.sol:MultiSigPool",
    constructorArguments: [
      signers,
      // wethAddress,
      usdcAddress,
      oneInchAddress,
      starkEx,
      factAddress
    ],
  });
}

async function createUsdc() {
  const SelfSufficientERC20 = await hre.ethers.getContractFactory("SelfSufficientERC20");

  usdc = await SelfSufficientERC20.deploy('SLF', 'SLF', 6);
  console.log("usdc deployed to:", usdc.address);
  // console.log(verifyStr, process.env.HARDHAT_NETWORK, usdc.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
