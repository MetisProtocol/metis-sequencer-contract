// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {GovernancePauseable} from "./governance/GovernancePauseable.sol";
import {IGovernance} from "./governance/IGovernance.sol";
import {ILockingPool} from "./interfaces/ILockingPool.sol";
import {LockingInfo} from "./LockingInfo.sol";
import {LockingNFT} from "./LockingNFT.sol";
import { IL1ERC20Bridge } from "./interfaces/IL1ERC20Bridge.sol";

contract LockingPool is
    ILockingPool,
    GovernancePauseable
{
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    event UpdateLockingInfo(address _newLockingInfo);
    event UpdateNFTContract(address _newNftContract);
    event SetCurrentBatch(uint256 _newCurrentBatch);
    event SetLockingToken(address _newLockingToken);
    event InsertSigners(address[] _newSigners);
    event UpdateSignerUpdateLimit(uint256 _newLimit);
    event UpdateMinAmounts(uint256 _newMinLock);
    event UpdateMpc(address _newMpc);

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _governance,
        address _bridge,
        address _l1Token,
        address _l2Token,
        uint32 _l2Gas,
        address _NFTContract,
        address _mpc
    ) external initializer {
        require(_governance != address(0),"invalid _governance");
        require(_bridge != address(0),"invalid _bridge");
        require(_l1Token != address(0),"invalid _l1Token");
        require(_l2Token != address(0),"invalid _l2Token");
        require(_NFTContract != address(0),"invalid _NFTContract");
        require(_mpc != address(0),"_mpc is zero address");
        
        governance = IGovernance(_governance);  
        bridge = _bridge;
        l1Token = _l1Token;
        l2Token = _l2Token;
        l2Gas = _l2Gas;
        token = IERC20(_l1Token);  
        NFTContract = LockingNFT(_NFTContract); 

        require(!isContract(_mpc),"_mpc is a contract");
        mpcAddress = _mpc;

        mpcHistory.push(MpcHistoryItem({
            startBlock: block.number,
            newMpcAddress: _mpc
        }));

        WITHDRAWAL_DELAY = 21 days; // sequencer exit withdraw delay time
        currentBatch = 1;  // default start from batch 1
        BLOCK_REWARD = 2 * (10**18); // per block reward, update via governance
        minLock = 20000* (10**18);  // min lock amount
        signerUpdateLimit = 100; // allow max signer update
        sequencerThreshold = 10; // allow max sequencers
        NFTCounter = 1; // sequencer id
    }


    // query owenr by NFT token id
    function ownerOf(uint256 tokenId) override public view returns (address) {
        return NFTContract.ownerOf(tokenId);
    }

    // query withdraw delay time
    function withdrawalDelay() override public view returns (uint256) {
        return WITHDRAWAL_DELAY;
    }

    // query current lock amount by sequencer id
    function sequencerLock(uint256 sequencerId) override public view returns (uint256) {
        return sequencers[sequencerId].amount;
    }

    // get sequencer id by address
    function getSequencerId(address user) override public view returns (uint256) {
        return NFTContract.tokenOfOwnerByIndex(user, 0);
    }

    //  get sequencer reward by sequencer id
    function sequencerReward(uint256 sequencerId) override public view returns (uint256) {
        return sequencers[sequencerId].reward.sub(INITIALIZED_AMOUNT);
    }

    // get all sequencer count
    function currentSequencerSetSize() override public view returns (uint256) {
        return sequencerState.lockerCount;
    }

    // get total lock amount for all sequencers
    function currentSequencerSetTotalLock() override public view returns (uint256) {
        return sequencerState.amount;
    }


    // query whether an id is a sequencer
    function isSequencer(uint256 sequencerId) override public view returns (bool) {
        return
            _isSequencer(
                sequencers[sequencerId].status,
                sequencers[sequencerId].amount,
                sequencers[sequencerId].deactivationBatch,
                currentBatch
            );
    }

    /**
        Governance Methods
     */

    /**
     * @dev forceUnlock Allow gov to force a sequencer node to exit
     * @param sequencerId unique integer to identify a sequencer.
     * @param withdrawRewardToL2 Whether the current reward is withdrawn to L2
     */
    function forceUnlock(uint256 sequencerId, bool withdrawRewardToL2) external onlyGovernance {
        _unlock(sequencerId, currentBatch, withdrawRewardToL2,true);
    }

    /**
     * @dev updateNFTContract Allow gov update the NFT contract address
     * @param _nftContract new NFT contract address
     */
    function updateNFTContract(address _nftContract) external onlyGovernance {
        require(_nftContract != address(0));
        NFTContract = LockingNFT(_nftContract);
        emit UpdateNFTContract(_nftContract);
    }

     /**
     * @dev updateLockingInfo Allow gov update the locking info contract address
     * @param _lockingInfo new locking info contract address
     */
    function updateLockingInfo(address _lockingInfo) external onlyGovernance {
        require(_lockingInfo != address(0));
        logger = LockingInfo(_lockingInfo); 
        emit UpdateLockingInfo(_lockingInfo);
    }

    /**
     * @dev setCurrentBatch  Allow gov to set current batch id
     * @param _currentBatch batch id to set
     */
    function setCurrentBatch(uint256 _currentBatch) external onlyGovernance {
        currentBatch = _currentBatch;
        emit SetCurrentBatch(_currentBatch);
    }

    /**
     * @dev setCurrentBatch  Allow gov to set locking token
     * @param _token the token address
     */
    function setLockingToken(address _token) public onlyGovernance {
        require(_token != address(0));
        token = IERC20(_token);
        emit SetLockingToken(_token);
    }

    /**
     * @dev updateSequencerThreshold  Allow gov to set max sequencer threshold
     * @param newThreshold the new threshold
     */
    function updateSequencerThreshold(uint256 newThreshold) public onlyGovernance {
        require(newThreshold != 0);
        logger.logThresholdChange(newThreshold, sequencerThreshold);
        sequencerThreshold = newThreshold;
    }

     /**
     * @dev updateBlockReward  Allow gov to set per block reward
     * @param newReward the block reward
     */
    function updateBlockReward(uint256 newReward) public onlyGovernance {
        require(newReward != 0);
        logger.logRewardUpdate(newReward, BLOCK_REWARD);
        BLOCK_REWARD = newReward;
    }

     /**
     * @dev insertSigners  Allow gov to update signers
     * @param _signers the new signers
     */
    function insertSigners(address[] memory _signers) public onlyGovernance {
        signers = _signers;
        emit InsertSigners(_signers);
    }

    /**
    *  @dev updateWithdrwDelayTimeValue Allow gov to set withdraw delay time.
    *  @param newWithdrwDelayTime new withdraw delay time
    */
    function updateWithdrwDelayTimeValue(uint256 newWithdrwDelayTime) public onlyGovernance {
        require(newWithdrwDelayTime > 0);
        logger.logWithrawDelayTimeChange(newWithdrwDelayTime, WITHDRAWAL_DELAY);
        WITHDRAWAL_DELAY = newWithdrwDelayTime;
    }

    /**
     * @dev updateSignerUpdateLimit Allow gov to set signer update max limit
     * @param _limit new limit
     */
    function updateSignerUpdateLimit(uint256 _limit) public onlyGovernance {
        signerUpdateLimit = _limit;
        emit UpdateSignerUpdateLimit(_limit);
    }


    /**
     * @dev updateMinAmounts Allow gov to update min lock amount 
     * @param _minLock new min lock amount
     */
    function updateMinAmounts(uint256 _minLock) public onlyGovernance {
        minLock = _minLock;
        emit UpdateMinAmounts(_minLock);
    }


    /**
     * @dev updateMpc Allow gov to update new mpc address
     * @param _newMpc new mpc
     */
    function updateMpc(address _newMpc) external onlyGovernance {
        require(!isContract(_newMpc),"_newMpc is a contract");
        require(_newMpc != address(0),"_newMpc is zero address");
        mpcAddress = _newMpc;
        mpcHistory.push(MpcHistoryItem({
            startBlock: block.number,
            newMpcAddress: _newMpc
        }));

        emit UpdateMpc(_newMpc);
    }

    /**
        Public Methods
     */

     /**
      * @dev fetchMpcAddress query mpc address by L1 block height, used by batch-submitter
      * @param blockHeight the L1 block height
      */
    function fetchMpcAddress(uint256 blockHeight) override public view returns(address){
        for (uint i = mpcHistory.length-1; i>=0; i--) {
            if (blockHeight>= mpcHistory[i].startBlock){
                return mpcHistory[i].newMpcAddress;
            }
        }

        return address(0);
    }

    /**
     * @dev getL2ChainId return the l2 chain id
     */
    function getL2ChainId() override public view returns(uint256) {
        uint256 l2ChainId;
        if (block.chainid == 1) {
            l2ChainId = 1088;
        }else if (block.chainid == 5){
            l2ChainId = 599;
        }
        return l2ChainId;
    }

     /**
     * @dev lockFor is used to lock Metis and participate in the sequencer block node application
     * @param user sequencer signer address
     * @param amount Amount of L1 metis token to lock for.
     * @param signerPubkey sequencer signer pubkey
     */    
     function lockFor(
        address user,
        uint256 amount,
        bytes memory signerPubkey
    ) override public  whenNotPaused {
        require(currentSequencerSetSize() < sequencerThreshold, "no more slots");
        require(amount >= minLock, "not enough deposit");

        _transferTokenFrom(msg.sender, address(this), amount);
        _lockFor(user, amount, signerPubkey);
    }


     /**
     * @dev unlock is used to unlock Metis and exit the sequencer node
     *
     * @param sequencerId sequencer id
     * @param withdrawRewardToL2 Whether the current reward is withdrawn to L2
     */    
    function unlock(uint256 sequencerId, bool withdrawRewardToL2) override external onlySequencer(sequencerId) {
        Status status = sequencers[sequencerId].status;
        require(
            sequencers[sequencerId].activationBatch > 0 &&
                sequencers[sequencerId].deactivationBatch == 0 &&
                status == Status.Active
        );

        uint256 exitBatch = currentBatch.add(1); // notice period
        _unlock(sequencerId, exitBatch, withdrawRewardToL2,false);
    }


     /**
     * @dev unlockClaim Because unlock has a waiting period, after the waiting period is over, you can claim locked tokens
     *
     * @param sequencerId sequencer id
     * @param withdrawToL2 Whether the current reward is withdrawn to L2
     */   
    function unlockClaim(uint256 sequencerId, bool withdrawToL2) override public onlySequencer(sequencerId) {
        uint256 deactivationBatch = sequencers[sequencerId].deactivationBatch;
        uint256 unlockClaimTime = sequencers[sequencerId].unlockClaimTime;

        // can only claim after WITHDRAWAL_DELAY
        require(
            deactivationBatch > 0 &&
                unlockClaimTime <= block.timestamp &&
                sequencers[sequencerId].status != Status.Unlocked,
            "claim not allowed"
        );

        uint256 amount = sequencers[sequencerId].amount;
        uint256 newTotalLocked = totalLocked.sub(amount);
        totalLocked = newTotalLocked;

        // Check for unclaimed rewards
        _liquidateRewards(sequencerId, msg.sender, withdrawToL2);

        NFTContract.burn(sequencerId);

        sequencers[sequencerId].amount = 0;
        sequencers[sequencerId].signer = address(0);

        signerToSequencer[sequencers[sequencerId].signer] = INCORRECT_SEQUENCER_ID;
        sequencers[sequencerId].status = Status.Unlocked;

        // withdraw locked token
        if (!withdrawToL2){
            _transferToken(msg.sender, amount);
        }else{
            IERC20(l1Token).safeApprove(bridge, amount);
            IL1ERC20Bridge(bridge).depositERC20ToByChainId(getL2ChainId(), l1Token, l2Token, msg.sender, amount, l2Gas, "0x0");
        }

        logger.logUnlocked(msg.sender, sequencerId, amount, newTotalLocked);
    }

    /**
     * @dev relock Allow sequencer to increase the amount of locked positions
     * @param sequencerId unique integer to identify a sequencer.
     * @param amount Amount of L1 metis token to relock for.
     * @param lockRewards Whether to lock the current rewards
     */
    function relock(
        uint256 sequencerId,
        uint256 amount,
        bool lockRewards
    ) override public whenNotPaused onlySequencer(sequencerId) {
        require(amount >= minLock, "not enough deposit");
        require(sequencers[sequencerId].deactivationBatch == 0, "No restaking");

        if (amount > 0) {
            _transferTokenFrom(msg.sender, address(this), amount);
        }

        if (lockRewards) {
            amount = amount.add(sequencers[sequencerId].reward).sub(INITIALIZED_AMOUNT);
            sequencers[sequencerId].reward = INITIALIZED_AMOUNT;
        }

        uint256 newTotalLocked = totalLocked.add(amount);
        totalLocked = newTotalLocked;
        sequencers[sequencerId].amount = sequencers[sequencerId].amount.add(amount);

        updateTimeline(int256(amount), 0, 0);

        logger.logLockUpdate(sequencerId);
        logger.logRelockd(sequencerId, sequencers[sequencerId].amount, newTotalLocked);
    }

    /**
     * @dev withdrawRewards withdraw current rewards
     *
     * @param sequencerId unique integer to identify a sequencer.
     * @param withdrawToL2 Whether the current reward is withdrawn to L2
     */   
    function withdrawRewards(uint256 sequencerId, bool withdrawToL2) override public onlySequencer(sequencerId) {
        _liquidateRewards(sequencerId, msg.sender, withdrawToL2);
    }

    /**
     * @dev updateSigner Allow sqeuencer to update new signers to replace old signer addresses
     * @param sequencerId unique integer to identify a sequencer.
     * @param signerPubkey the new signer pubkey address
     */
    function updateSigner(uint256 sequencerId, bytes memory signerPubkey) public onlySequencer(sequencerId) {
        address signer = _getAndAssertSigner(signerPubkey);
        uint256 _currentBatch = currentBatch;
        require(_currentBatch >= latestSignerUpdateBatch[sequencerId].add(signerUpdateLimit), "Not allowed");

        address currentSigner = sequencers[sequencerId].signer;
        // update signer event
        logger.logSignerChange(sequencerId, currentSigner, signer, signerPubkey);
        
        if (sequencers[sequencerId].deactivationBatch == 0) { 
            // didn't unlock, swap signer in the list
            _removeSigner(currentSigner);
            _insertSigner(signer);
        }

        signerToSequencer[currentSigner] = INCORRECT_SEQUENCER_ID;
        signerToSequencer[signer] = sequencerId;
        sequencers[sequencerId].signer = signer;

        // reset update time to current time
        latestSignerUpdateBatch[sequencerId] = _currentBatch;
    }

    /**
     * @dev batchSubmitRewards Allow gov or other roles to submit L2 sequencer block information, and attach Metis reward tokens for reward distribution
     * @param batchId The batchId that submitted the reward is that
     * @param payeer Who Pays the Reward Tokens
     * @param startEpoch The startEpoch that submitted the reward is that
     * @param endEpoch The endEpoch that submitted the reward is that
     * @param sequencers Those sequencers can receive rewards
     * @param finishedBlocks How many blocks each sequencer finished.
     * @param signature Confirmed by mpc and signed for reward distribution
     */
    function batchSubmitRewards(
        uint256 batchId,
        address payeer,
        uint256 startEpoch,
        uint256 endEpoch,
        address[] memory sequencers,
        uint256[] memory finishedBlocks,
        bytes memory signature
    // )  external onlyGovernance  returns (uint256) {
    )  external returns (uint256) {
        uint256 nextBatch = currentBatch.add(1);
        require(nextBatch == batchId,"invalid batch id");
        require(!batchSubmitHistory[nextBatch], "already submited");

        // check mpc signature
        bytes32 operationHash = keccak256(abi.encodePacked(batchId, startEpoch,endEpoch,sequencers, finishedBlocks, address(this)));
        operationHash = ECDSA.toEthSignedMessageHash(operationHash);
        address signer = ECDSA.recover(operationHash, signature);
        require(signer == mpcAddress, "invalid mpc signature");

        // calc reward
        uint256 totalReward;
        for (uint256 i = 0; i < sequencers.length; ++i) {
            require(signerToSequencer[sequencers[i]] > 0,"sequencer not exist");
            require(isSequencer(signerToSequencer[sequencers[i]]), "invalid sequencer");

            uint256 reward = _calculateReward(finishedBlocks[i]);
            _increaseReward(sequencers[i],reward);
            totalReward += reward;
        }

        _finalizeCommit();

        // reward income
        token.safeTransferFrom(payeer, address(this), totalReward);
        return totalReward;
    }


      /**
     * @dev updateTimeline Used to update sequencerState information
     * @param amount The number of locked positions changed
     * @param lockerCount The number of lock sequencer changed
     * @param targetBatch When does the change take effect
     */
    function updateTimeline(
        int256 amount,
        int256 lockerCount,
        uint256 targetBatch
    ) internal {
        if (targetBatch == 0) {
            // update total lock and sequencer count
            if (amount > 0) {
                sequencerState.amount = sequencerState.amount.add(uint256(amount));
            } else if (amount < 0) {
                sequencerState.amount = sequencerState.amount.sub(uint256(amount * -1));
            }

            if (lockerCount > 0) {
                sequencerState.lockerCount = sequencerState.lockerCount.add(uint256(lockerCount));
            } else if (lockerCount < 0) {
                sequencerState.lockerCount = sequencerState.lockerCount.sub(uint256(lockerCount * -1));
            }
        } else {
            sequencerStateChanges[targetBatch].amount += amount;
            sequencerStateChanges[targetBatch].lockerCount += lockerCount;
        }
    }

    /**
        Private Methods
     */

    function _getAndAssertSigner(bytes memory pub) private view returns (address) {
        require(pub.length == 64, "not pub");
        address signer = address(uint160(uint256(keccak256(pub))));
        require(signer != address(0) && signerToSequencer[signer] == 0, "Invalid signer");
        return signer;
    }

    function _isSequencer(
        Status status,
        uint256 amount,
        uint256 deactivationBatch,
        uint256 _currentBatch
    ) private pure returns (bool) {
        return (amount > 0 && (deactivationBatch == 0 || deactivationBatch > _currentBatch) && status == Status.Active);
    }

    function _calculateReward(
        uint256 blockInterval
    ) internal view returns (uint256) {
        // rewards are based on BlockInterval multiplied on `BLOCK_REWARD`
        return blockInterval.mul(BLOCK_REWARD);
    }

    function _increaseReward(
        address sequencer,
        uint256 reward
    ) private {
        uint256 sequencerId = signerToSequencer[sequencer];
        Sequencer memory sequencerInfo = sequencers[sequencerId];

        // rewardPerLock update
        uint256 newRewardPerLock = sequencerInfo.initialRewardPerLock.add(reward.mul(REWARD_PRECISION).div(sequencerInfo.amount));
        sequencers[sequencerId].initialRewardPerLock = newRewardPerLock;
      
        // update reward
        if (sequencerInfo.deactivationBatch != 0 && currentBatch >= sequencerInfo.deactivationBatch) {
            return;
        }
        _increaseSequencerReward(sequencerId,reward);
    }

    function _increaseSequencerReward(uint256 sequencerId, uint256 reward) private {
        if (reward > 0) {
            sequencers[sequencerId].reward = sequencers[sequencerId].reward.add(reward);
        }
    }


    function _lockFor(
        address user,
        uint256 amount,
        bytes memory signerPubkey
    ) internal returns (uint256) {
        address signer = _getAndAssertSigner(signerPubkey);
        require(user == signer,"user and signerPubkey mismatch");

        uint256 _currentBatch = currentBatch;
        uint256 sequencerId = NFTCounter;

        uint256 newTotalLocked = totalLocked.add(amount);
        totalLocked = newTotalLocked;

        sequencers[sequencerId] = Sequencer({
            reward: INITIALIZED_AMOUNT,
            amount: amount,
            activationBatch: _currentBatch,
            deactivationBatch: 0,
            deactivationTime: 0,
            unlockClaimTime: 0,
            signer: signer,
            status: Status.Active,
            initialRewardPerLock: 0
        });

        latestSignerUpdateBatch[sequencerId] = _currentBatch;
        NFTContract.mint(user, sequencerId);

        signerToSequencer[signer] = sequencerId;
        updateTimeline(int256(amount), 1, 0);

        logger.logLocked(signer, signerPubkey, sequencerId, _currentBatch, amount, newTotalLocked);
        NFTCounter = sequencerId.add(1);

        _insertSigner(signer);
        return sequencerId;
    }

    // The function restricts the sequencer's exit if the number of total locked sequencers divided by 3 is less than the number of 
    // sequencers that have already exited. This would effectively freeze the sequencer's unlock function until a sufficient number of 
    // new sequencers join the system.
    function _unlock(uint256 sequencerId, uint256 exitBatch, bool withdrawRewardToL2,bool force) internal {
        if (!force){
            // Ensure that the number of exit sequencer is less than 1/3 of the total
            require(currentUnlockedInit + 1 <= sequencerState.lockerCount/3, "not allowed");
        }

        uint256 amount = sequencers[sequencerId].amount;
        address sequencer = ownerOf(sequencerId);

        sequencers[sequencerId].status = Status.Inactive;
        sequencers[sequencerId].deactivationBatch = exitBatch;
        sequencers[sequencerId].deactivationTime = block.timestamp;
        sequencers[sequencerId].unlockClaimTime = block.timestamp + WITHDRAWAL_DELAY;

        _removeSigner(sequencers[sequencerId].signer);
        _liquidateRewards(sequencerId, sequencer, withdrawRewardToL2);

        uint256 targetBatch = exitBatch <= currentBatch ? 0 : exitBatch;
        updateTimeline(-(int256(amount)), -1, targetBatch);

        currentUnlockedInit++;

        logger.logUnlockInit(
            sequencer,
            sequencerId,
            exitBatch,
            sequencers[sequencerId].deactivationTime, 
            sequencers[sequencerId].unlockClaimTime,
            amount
        );
    }

    function _finalizeCommit() internal {
        uint256 nextBatch = currentBatch.add(1);
        batchSubmitHistory[nextBatch]=true;

        StateChange memory changes = sequencerStateChanges[nextBatch];
        updateTimeline(changes.amount, changes.lockerCount, 0);

        delete sequencerStateChanges[currentBatch];

        currentBatch = nextBatch;
    }

    function _liquidateRewards(uint256 sequencerId, address sequencerUser, bool withdrawRewardToL2) private {
        uint256 reward = sequencers[sequencerId].reward.sub(INITIALIZED_AMOUNT);
        totalRewardsLiquidated = totalRewardsLiquidated.add(reward);
        sequencers[sequencerId].reward = INITIALIZED_AMOUNT;

        if (!withdrawRewardToL2){
           _transferToken(sequencerUser, reward);
        }else{
            IERC20(l1Token).safeApprove(bridge, reward);
            IL1ERC20Bridge(bridge).depositERC20ToByChainId(getL2ChainId(), l1Token, l2Token, sequencerUser, reward, l2Gas, "0x0");
        }
        logger.logClaimRewards(sequencerId, reward, totalRewardsLiquidated);
    }

    function _transferToken(address destination, uint256 amount) private {
        token.safeTransfer(destination, amount);
    }

    function _transferTokenFrom(
        address from,
        address destination,
        uint256 amount
    ) private {
        token.safeTransferFrom(from, destination, amount);
    }

    function _insertSigner(address newSigner) internal {
        signers.push(newSigner);

        uint lastIndex = signers.length - 1;
        uint i = lastIndex;
        for (; i > 0; --i) {
            address signer = signers[i - 1];
            if (signer < newSigner) {
                break;
            }
            signers[i] = signer;
        }

        if (i != lastIndex) {
            signers[i] = newSigner;
        }
    }

    function _removeSigner(address signerToDelete) internal {
        uint256 totalSigners = signers.length;
        address swapSigner = signers[totalSigners - 1];
        delete signers[totalSigners - 1];

        // bubble last element to the beginning until target signer is met
        for (uint256 i = totalSigners - 1; i > 0; --i) {
            if (swapSigner == signerToDelete) {
                break;
            }

            (swapSigner, signers[i - 1]) = (signers[i - 1], swapSigner);
        }
    }

    function isContract(address _target) virtual internal view returns (bool) {
        if (_target == address(0)) {
            return false;
        }

        uint256 size;
        assembly {
            size := extcodesize(_target)
        }
        return size > 0;
    }
}
