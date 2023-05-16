require("@nomiclabs/hardhat-etherscan");

let govAddress = "0xBdb7fDbc1211F9eF09Aa9c006ebD389c59ffdBF9";
let govProxyAddress = "0xa18655b73FDC38665CFB9e09A5a0a10C14e68EC5";
let registryAddress = "0xA82F8dC4704d3512b120de70480219761F24B6Eb";
let validatorShareFactoryAddress = "0x49b05721B9615dC1811E20F47D5700dA2d6Ed429";
let stakingInfoAddress = "0xe38cfa32cCd918d94E2e20230dFaD1A4Fd8aEF16";
let stakingNftAddress = "0x9Da17239a4170f50A5A2c11813BD0C601b5c9693";
let testTokenAddress = "0xB4EB98c6d7D4807033Ae6195241ef7A839070748";
let stakeManagerAddress = "0xd3b2241BfF9654195F814a15CbAc458C72Fa5084";
let stakeManagerProxyAddress = "0xecD258382bd77A1d4b9a12b07E04c09081062369";
let stakeManagerExtensionAddress = "0x46E0c0DBf12d99137e23942C965Fc1B551023f7C";
let slashingManagerAddress = "0x497bd1C86a1088e80f58EaA13de8C81aB70a4e79";
let stakingNftName = "Metis Sequencer";
let stakingNftSymbol = "MS";
let testTokenName = "Test ERC20";
let testTokenSymbol = "TST20";

const main = async () => {
  const accounts = await hre.ethers.getSigners();
  let signer = accounts[0].address;
  console.log("signer address:%s", signer);

  // await hre.run("verify:verify", {
  //   address: govAddress,
  //   contract: "contracts/common/governance/Governance.sol:Governance",
  //   constructorArguments: [
  //   ],
  // });

  // // await hre.run("verify:verify", {
  // //     address: govProxyAddress,
  // //     contract: "contracts/common/governance/GovernanceProxy.sol:GovernanceProxy",
  // //     constructorArguments: [
  // //       govAddress
  // //     ],
  // //   });

  // await hre.run("verify:verify", {
  //    address: registryAddress,
  //    contract: "contracts/common/Registry.sol:Registry",
  //    constructorArguments: [
  //     govProxyAddress
  //    ],
  //  });

  // await hre.run("verify:verify", {
  //    address: validatorShareFactoryAddress,
  //    contract: "contracts/staking/validatorShare/ValidatorShareFactory.sol:ValidatorShareFactory",
  //    constructorArguments: [],
  //  });

  // await hre.run("verify:verify", {
  //    address: stakingInfoAddress,
  //    contract: "contracts/staking/StakingInfo.sol:StakingInfo",
  //    constructorArguments: [
  //     registryAddress,
  //    ],
  //  });

  // await hre.run("verify:verify", {
  //     address: stakingNftAddress,
  //     contract: "contracts/staking/stakeManager/StakingNFT.sol:StakingNFT",
  //     constructorArguments: [
  //       stakingNftName,
  //       stakingNftSymbol
  //     ],
  //   });

  // await hre.run("verify:verify", {
  //   address: testTokenAddress,
  //   contract: "contracts/common/tokens/TestToken.sol:TestToken",
  //   constructorArguments: [
  //     testTokenName,
  //     testTokenSymbol
  //   ],
  // });

  await hre.run("verify:verify", {
    address: stakeManagerAddress,
    contract: "contracts/staking/stakeManager/StakeManager.sol:StakeManager",
    constructorArguments: [
    ],
  });

  // // await hre.run("verify:verify", {
  // //    address: stakeManagerProxyAddress,
  // //    contract: "contracts/staking/stakeManager/StakeManagerProxy.sol:StakeManagerProxy",
  // //    constructorArguments: [
  // //     stakeManagerAddress
  // //    ],
  // //  });

  //  await hre.run("verify:verify", {
  //    address: slashingManagerAddress,
  //    contract: "contracts/staking/slashing/SlashingManager.sol:SlashingManager",
  //    constructorArguments: [
  //     registryAddress,
  //     stakingInfoAddress,
  //     process.env.THEMIS_ID
  //    ],
  //  });
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
