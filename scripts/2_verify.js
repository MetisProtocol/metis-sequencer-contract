require("@nomiclabs/hardhat-etherscan");
const utils = require('./utils');

let stakingNftName = "Metis Validator";
let stakingNftSymbol = "MS";

const main = async () => {
  const accounts = await hre.ethers.getSigners();
  let signer = accounts[0].address;
  console.log("signer address:%s", signer);

  const contractAddresses = utils.getContractAddresses();
  console.log("contractAddresses:", contractAddresses)

  await hre.run("verify:verify", {
      address: contractAddresses.contracts.GovernanceProxy,
      contract: "contracts/governance/Governance.sol:Governance",
      constructorArguments: [
      ],
  });

  await hre.run("verify:verify", {
    address: contractAddresses.contracts.LockingNFT,
    contract: "contracts/LockingNFT.sol:LockingNFT",
    constructorArguments: [
      stakingNftName,
      stakingNftSymbol
    ],
  });

  await hre.run("verify:verify", {
    address: contractAddresses.contracts.LockingPoolProxy,
    contract: "contracts/LockingPool.sol:LockingPool",
    constructorArguments: [],
  });

  await hre.run("verify:verify", {
     address: contractAddresses.contracts.LockingInfo,
     contract: "contracts/LockingInfo.sol:LockingInfo",
     constructorArguments: [
        contractAddresses.contracts.LockingPoolProxy,
     ],
   });
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
