const {
    ethers,
    upgrades
} = require("hardhat");

const web3 = require("web3");

let govProxyAddress = "0x937aaFF6b2aDdD3593CaE0d135530f4EDD6e4b65";
let registryAddress = "0x9Ebe9b50C08617158267654F893f8859991fd806";
let validatorShareFactoryAddress = "0xa7cdd83CE970FfF8Eb4452824663049d7c447813";
let stakingInfoAddress = "0x934b77c79bCD81510de51e61da58bE29Bce91497";
let stakingNftAddress = "0x8Cc705ccAe9a16566573BBc3405b347751e30992";
let metisTokenAddress = "0xD331E3CA3e51d3dd6712541CB01d7100E24DAdD1";
let testTokenAddress = "0x384d2a29acBf54F375939D0Ea6FD85969a628D74";
let stakeManagerProxyAddress = "0x95f54194847bEECC0b6af1C7D6C6cD4cddeE62A6";
let stakeManagerExtensionAddress = "0x81955bcCA0f852C072c877D1CCA1eD1b14c0E5eB";
let slashingManagerAddress = "0x2B3a174C812f550B58CAD89A23345d3867e99367";
let eventHubProxyAddress = "0xF7Ee63689b05B062Ebd15327CD80Cf81cC133fd0";
let stakingNftName = "Metis Sequencer";
let stakingNftSymbol = "MS";
let testTokenName = "Test ERC20";
let testTokenSymbol = "TST20";

const main = async () => {
    const accounts = await ethers.getSigners();
    let signer = accounts[0].address;
    console.log("tx sender:",signer);

    const stakeManager = await ethers.getContractFactory("StakeManager");
    const smObj = await stakeManager.attach(stakeManagerProxyAddress);

    const tx = await smObj.batchSubmitRewards(
        signer,
        1,
        100,
        ["0x70fb083ab9bc2ed3c4cebe08054e82827368ed1e"],
        [100],
    )
    console.log("batchSubmitRewards :", tx.hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });