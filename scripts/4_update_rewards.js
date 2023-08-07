const {
    ethers,
    upgrades
} = require("hardhat");

const web3 = require("web3");
const utils = require('./utils');
const IERC20_SOURCE = "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20";

const main = async () => {
    const accounts = await ethers.getSigners();
    let signer = accounts[0];
    console.log("tx sender:",signer.address);

    const contractAddresses = utils.getContractAddresses();
    console.log("contractAddresses:", contractAddresses);

    // const govObj = await hre.ethers.getContractAt("Governance", contractAddresses.contracts.GovernanceProxy);
    // let updateRewardTx =  await updateReward(govObj, signer, contractAddresses.contracts.LockingPoolProxy);
    // console.log("updateRewardTx:", updateRewardTx.hash);

    const LockingPool = await ethers.getContractFactory("LockingPool");
    const LockingPoolObj = await LockingPool.attach(contractAddresses.contracts.LockingPoolProxy);

    const metisTokenObj = await ethers.getContractAt(IERC20_SOURCE, contractAddresses.contracts.tokens.L1MetisToken);
    console.log('Sender accounts has a balanceOf', (await metisTokenObj.balanceOf(signer.address)).toString())

    const approveAmount = await metisTokenObj.allowance(signer.address, contractAddresses.contracts.LockingPoolProxy);
    console.log("approveAmount: ", approveAmount);
    if (approveAmount <= 0) {
        let approveTx = await metisTokenObj.approve(contractAddresses.contracts.LockingPoolProxy, web3.utils.toWei('1000000000000'))
        console.log("approve tx:", approveTx.hash);
    }

    let curBatchId = await LockingPoolObj.currentBatch();
    const params = {
        batchId: ethers.BigNumber.from(curBatchId.toString()).add(1),
        payeer: signer.address,
        startEpoch: ethers.BigNumber.from("1"),
        endEpoch: ethers.BigNumber.from("2"),
        // sequencers: [signer.address],
        sequencers: ["0x1267397fb5BF6f6Dcc3d18d673616D512dbcd8F0"],
        finishedBlocks: [100],
        lockingPool: contractAddresses.contracts.LockingPoolProxy,
        signer: signer
    }
    console.log("params: ", params);


    let signature = await calcSignature(params);
    return 
    let batchSubmitRewardsTx = await LockingPoolObj.batchSubmitRewards(params.payeer, params.sequencers, params.finishedBlocks, signature);
    console.log("batchSubmitRewards tx ", batchSubmitRewardsTx.hash);
}

async function updateRewardByGov(govObj, params) {
    let signature = await calcSignature(params);
    console.log("signature:", signature);

    let ABI = [
        "function batchSubmitRewards(uin256 batchId,address payeer,uin256 startEpoch,uin256 endEpoch,address[] memory sequencers,uint256[] memory finishedBlocks,bytes memory signature)"
    ];
    let iface = new ethers.utils.Interface(ABI);
    let updateRewardData = iface.encodeFunctionData("batchSubmitRewards", [
        params.batchId,
        params.signer.address,
        params.startEpoch,
        params.endEpoch,
        params.sequencers,
        params.finishedBlocks,
        signature,
    ])
    console.log("updateRewardByGov: ", updateRewardData)

    return govObj.update(
        lockingPool,
        updateRewardData
    )
}

async function calcSignature(params) {
    let message = ethers.utils.solidityPack(["uint256", "uint256", "uint256", "address[]", "uint256[]", "address"], [
        params.batchId,
        params.startEpoch,
        params.endEpoch,
        params.sequencers,
        params.finishedBlocks,
        params.lockingPool
    ])
    console.log("message:", message);

    const messageHash = ethers.utils.solidityKeccak256(["bytes"], [message]);
    console.log("messageHash:", messageHash);
    
    const messageHashBinary = ethers.utils.arrayify(messageHash);
    console.log("messageHashBinary:", messageHashBinary);   

    // sign
    let signature = await params.signer.signMessage(messageHashBinary);
    console.log("signature:", signature);
    return signature;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });