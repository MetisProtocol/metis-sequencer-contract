require("@nomiclabs/hardhat-etherscan");
const utils = require('./utils');

let stakingNftName = "Metis Validator";
let stakingNftSymbol = "MS";

let metisTokenName = "Metis ERC20";
let metisTokenSymbol = "METIS";

let validatorShareTokenName = "Validator Share Token";
let validatorShareTokenSymbol = "VST";

const main = async () => {
  const accounts = await hre.ethers.getSigners();
  let signer = accounts[0].address;
  console.log("signer address:%s", signer);

  const contractAddresses = utils.getContractAddresses();
  console.log("contractAddresses:", contractAddresses)

    // await hre.run("verify:verify", {
    //   address: "0xc342fe54F75ac92279aB30b5E3B8383379633B86",
    //   contract: "contracts/staking/validatorShare/ValidatorShare.sol:ValidatorShare",
    //   constructorArguments: [
    //     validatorShareTokenName,
    //     validatorShareTokenSymbol
    //   ],
    // });
    // return

  // await hre.run("verify:verify", {
  //     address: contractAddresses.contracts.GovernanceProxy,
  //     contract: "contracts/common/governance/GovernanceProxy.sol:GovernanceProxy",
  //     constructorArguments: [
  //     ],
  //   });

  // await hre.run("verify:verify", {
  //    address: contractAddresses.contracts.Registry,
  //    contract: "contracts/common/Registry.sol:Registry",
  //    constructorArguments: [
  //    ],
  //  });

  // await hre.run("verify:verify", {
  //    address: contractAddresses.contracts.ValidatorShareFactory,
  //    contract: "contracts/staking/validatorShare/ValidatorShareFactory.sol:ValidatorShareFactory",
  //    constructorArguments: [],
  //  });


  // await hre.run("verify:verify", {
  //    address: contractAddresses.contracts.StakingInfo,
  //    contract: "contracts/staking/StakingInfo.sol:StakingInfo",
  //    constructorArguments: [
  //       contractAddresses.contracts.Registry,
  //    ],
  //  });


  // await hre.run("verify:verify", {
  //   address: contractAddresses.contracts.StakingNft,
  //   contract: "contracts/staking/stakeManager/StakingNFT.sol:StakingNFT",
  //   constructorArguments: [
  //     stakingNftName,
  //     stakingNftSymbol
  //     ],
  //   });


  // await hre.run("verify:verify", {
  //   address: contractAddresses.contracts.tokens.MetisToken,
  //   contract: "contracts/common/tokens/TestToken.sol:TestToken",
  //   constructorArguments: [
  //     metisTokenName,
  //     metisTokenSymbol
  //   ],
  // });

  await hre.run("verify:verify", {
    address: contractAddresses.contracts.StakingManagerProxy,
    contract: "contracts/staking/stakeManager/StakeManager.sol:StakeManager",
    constructorArguments: [
    ],
  });

  //   await hre.run("verify:verify", {
  //     address: contractAddresses.contracts.StakeManagerExtensionAddress,
  //     contract: "contracts/staking/stakeManager/StakeManagerExtension.sol:StakeManagerExtension",
  //     constructorArguments: [
  //     ],
  //   });

  //   await hre.run("verify:verify", {
  //     address: contractAddresses.contracts.EventHubProxy,
  //     contract: "contracts/staking/EventsHub.sol:EventsHub",
  //     constructorArguments: [
  //     ],
  //   });
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
