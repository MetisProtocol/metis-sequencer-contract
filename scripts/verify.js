require("@nomiclabs/hardhat-etherscan");

let govProxyAddress = "0x937aaFF6b2aDdD3593CaE0d135530f4EDD6e4b65";
let registryAddress = "0x9Ebe9b50C08617158267654F893f8859991fd806";
let validatorShareFactoryAddress = "0x40B09Cc3242076412837208A41503Fd4c51554C6";
let stakingInfoAddress = "0x934b77c79bCD81510de51e61da58bE29Bce91497";
let stakingNftAddress = "0x5DB6a3111ea98AE461A4097C71CED4c9ef415526";
let metisTokenAddress = "0xD331E3CA3e51d3dd6712541CB01d7100E24DAdD1";
let testTokenAddress = "0x384d2a29acBf54F375939D0Ea6FD85969a628D74";
let stakeManagerProxyAddress = "0xC3f4dD007F97197151711556110f48d4c772D734";
let stakeManagerExtensionAddress = "0x81955bcCA0f852C072c877D1CCA1eD1b14c0E5eB";
let slashingManagerAddress = "0x2B3a174C812f550B58CAD89A23345d3867e99367";
let eventHubProxyAddress = "0xF7Ee63689b05B062Ebd15327CD80Cf81cC133fd0";
let stakingNftName = "Metis Sequencer";
let stakingNftSymbol = "MS";
let testTokenName = "Test ERC20";
let testTokenSymbol = "TST20";

const main = async () => {
  const accounts = await hre.ethers.getSigners();
  let signer = accounts[0].address;
  console.log("signer address:%s", signer);

  //  await hre.run("verify:verify", {
  //    address: v1Address,
  //    contract: "contracts/V1.sol:V1",
  //    constructorArguments: [
  //    ],
  //  });

  //   await hre.run("verify:verify", {
  //     address: v2Address,
  //     contract: "contracts/V2.sol:V2",
  //     constructorArguments: [],
  //   });
  //  return

  // await hre.run("verify:verify", {
  //   address: govAddress,
  //   contract: "contracts/common/governance/Governance.sol:Governance",
  //   constructorArguments: [
  //   ],
  // });
  // return

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

  // await hre.run("verify:verify", {
  //   address: stakeManagerProxyAddress,
  //   contract: "contracts/staking/stakeManager/StakeManager.sol:StakeManager",
  //   constructorArguments: [
  //   ],
  // });

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

    // await hre.run("verify:verify", {
    //   address: stakeManagerExtensionAddress,
    //   contract: "contracts/staking/stakeManager/StakeManagerExtension.sol:StakeManagerExtension",
    //   constructorArguments: [
    //   ],
    // });

      // await hre.run("verify:verify", {
      //   address: eventHubProxyAddress,
      //   contract: "contracts/staking/EventsHub.sol:EventsHub",
      //   constructorArguments: [
      //   ],
      // });

};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
