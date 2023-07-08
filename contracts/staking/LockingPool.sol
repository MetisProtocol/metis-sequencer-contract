pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {GovernancePauseable} from "./governance/GovernancePauseable.sol";
import {IGovernance} from "./governance/IGovernance.sol";
import {ILockingPool} from "./ILockingPool.sol";
import {LockingInfo} from "./LockingInfo.sol";
import {LockingNFT} from "./LockingNFT.sol";
import { IL1ERC20Bridge } from "./IL1ERC20Bridge.sol";

contract LockingPool is
    ILockingPool,
    Initializable,
    GovernancePauseable
{
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    function initialize(
        address _governance,
        address _bridge,
        address _l1Token,
        address _l2Token,
        uint32 _l2Gas,
        address _token,
        address _NFTContract,
        address _stakingLogger,
        address _mpc
    ) external initializer {
        governance = IGovernance(_governance);  
        bridge = _bridge;
        l1Token = _l1Token;
        l2Token = _l2Token;
        l2Gas = _l2Gas;
        token = IERC20(_token);  
        NFTContract = LockingNFT(_NFTContract); 
        logger = LockingInfo(_stakingLogger); 
        mpcAddress = _mpc;

        mpcHistory.push(MpcHistoryItem({
            startBlock: block.number,
            newMpcAddress: _mpc
        }));

        WITHDRAWAL_DELAY = 21 days; 
        currentBatch = 1;  // default start from batch1
        BLOCK_REWARD = 2 * (10**18); // per block reward, update via governance
        
        minDeposit = (10**18); 
        signerUpdateLimit = 100; 

        sequencerThreshold = 100; // allow max sequencers
        NFTCounter = 1; // sequencer id
    }


    /**
        @dev Owner of sequencer slot NFT
     */
    function ownerOf(uint256 tokenId) override public view returns (address) {
        return NFTContract.ownerOf(tokenId);
    }

    // current batch
    function batch() override public view returns (uint256) {
        return currentBatch;
    }

    // withdraw delay time
    function withdrawalDelay() override public view returns (uint256) {
        return WITHDRAWAL_DELAY;
    }

    // query current lock amount by sequencer id
    function sequencerLock(uint256 sequencerId) override public view returns (uint256) {
        return sequencers[sequencerId].amount;
    }

    // get sequencer id by address
    function getSequencerId(address user)  public view returns (uint256) {
        return NFTContract.tokenOfOwnerByIndex(user, 0);
    }

    //  get sequencer reward by sequencer id
    function sequencerReward(uint256 sequencerId) public view returns (uint256) {
        uint256 _sequencerReward;
        if (sequencers[sequencerId].deactivationBatch == 0) {
            _sequencerReward = _evaluateSequencerReward(sequencerId);
        }
        return sequencers[sequencerId].reward.add(_sequencerReward).sub(INITIALIZED_AMOUNT);
    }

    // get all sequencer count
    function currentSequencerSetSize() public view returns (uint256) {
        return sequencerState.lockerCount;
    }

    // get total lock amount for all sequencers
    function currentSequencerSetTotalLock() public view returns (uint256) {
        return sequencerState.amount;
    }


    function isSequencer(uint256 sequencerId) public view returns (bool) {
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

    function forceUnlock(uint256 sequencerId, bool withdrawRewardToL2) external onlyGovernance {
        _unlock(sequencerId, currentBatch, withdrawRewardToL2);
    }

    function setCurrentBatch(uint256 _currentBatch) external onlyGovernance {
        currentBatch = _currentBatch;
    }

    // set staking token
    function setLockingToken(address _token) public onlyGovernance {
        require(_token != address(0x0));
        token = IERC20(_token);
    }

    // set max sequencer threshold
    function updateSequencerThreshold(uint256 newThreshold) public onlyGovernance {
        require(newThreshold != 0);
        logger.logThresholdChange(newThreshold, sequencerThreshold);
        sequencerThreshold = newThreshold;
    }

    // set per block reward
    function updateBlockReward(uint256 newReward) public onlyGovernance {
        require(newReward != 0);
        logger.logRewardUpdate(newReward, BLOCK_REWARD);
        BLOCK_REWARD = newReward;
    }

    function insertSigners(address[] memory _signers) public onlyGovernance {
        signers = _signers;
    }

    /**
        @dev Users must exit before this update or all funds may get lost
     */

    function updateWithdrwDelayTimeValue(uint256 newWithdrwDelayTime) public onlyGovernance {
        require(newWithdrwDelayTime > 0);
        logger.logWithrawDelayTimeChange(newWithdrwDelayTime, WITHDRAWAL_DELAY);
        WITHDRAWAL_DELAY = newWithdrwDelayTime;
    }

    function updateSignerUpdateLimit(uint256 _limit) public onlyGovernance {
        signerUpdateLimit = _limit;
    }

    function updateMinAmounts(uint256 _minDeposit) public onlyGovernance {
        minDeposit = _minDeposit;
    }

    function drain(address destination, uint256 amount) external onlyGovernance {
        _transferToken(destination, amount);
    }

    function updateMpc(address _newMpc) external onlyGovernance {
        require(!isContract(_newMpc),"_newMpc is a contract");
        require(_newMpc != address(0x0),"_newMpc is zero address");
        mpcAddress = _newMpc;
        mpcHistory.push(MpcHistoryItem({
            startBlock: block.number,
            newMpcAddress: _newMpc
        }));
    }

    function reinitialize(
        address _NFTContract,
        address _stakingLogger
    ) external onlyGovernance {
        NFTContract = LockingNFT(_NFTContract);
        logger = LockingInfo(_stakingLogger);
    }

    /**
        Public Methods
     */

    // query total delagated amount by sequencer address
    function totalLockedFor(address user) override external view returns (uint256) {
        if (user == address(0x0) || NFTContract.balanceOf(user) == 0) {
            return 0;
        }
        return sequencers[NFTContract.tokenOfOwnerByIndex(user, 0)].amount;
    }

    // sequencer exit
    function unlock(uint256 sequencerId, bool withdrawRewardToL2) override external onlySequencer(sequencerId) {
        Status status = sequencers[sequencerId].status;
        require(
            sequencers[sequencerId].activationBatch > 0 &&
                sequencers[sequencerId].deactivationBatch == 0 &&
                (status == Status.Active || status == Status.Locked)
        );

        uint256 exitBatch = currentBatch.add(1); // notice period
        _unlock(sequencerId, exitBatch, withdrawRewardToL2);
    }


    function lockFor(
        address user,
        uint256 amount,
        bytes memory signerPubkey
    ) override public  onlyWhenUnpaused {
        require(currentSequencerSetSize() < sequencerThreshold, "no more slots");
        require(amount >= minDeposit, "not enough deposit");

        _transferTokenFrom(msg.sender, address(this), amount);
        _lockFor(user, amount, signerPubkey);
    }

    function unlockClaim(uint256 sequencerId, bool withdrawRewardToL2) public onlySequencer(sequencerId) {
        uint256 deactivationBatch = sequencers[sequencerId].deactivationBatch;
        uint256 unlockClaimTime = sequencers[sequencerId].unlockClaimTime;

        // can only claim after WITHDRAWAL_DELAY
        require(
            deactivationBatch > 0 &&
                unlockClaimTime <= block.timestamp &&
                sequencers[sequencerId].status != Status.Unlocked
        );

        uint256 amount = sequencers[sequencerId].amount;
        uint256 newTotalLocked = totalLocked.sub(amount);
        totalLocked = newTotalLocked;

        _liquidateRewards(sequencerId, msg.sender, withdrawRewardToL2);

        NFTContract.burn(sequencerId);

        sequencers[sequencerId].amount = 0;
        sequencers[sequencerId].signer = address(0);

        signerToSequencer[sequencers[sequencerId].signer] = INCORRECT_SEQUENCER_ID;
        sequencers[sequencerId].status = Status.Unlocked;

        _transferToken(msg.sender, amount);
        logger.logUnlocked(msg.sender, sequencerId, amount, newTotalLocked);
    }

    function relock(
        uint256 sequencerId,
        uint256 amount,
        bool lockRewards
    ) public onlyWhenUnpaused onlySequencer(sequencerId) {
        require(amount >= minDeposit, "not enough deposit");
        require(sequencers[sequencerId].deactivationBatch == 0, "No restaking");

        if (amount > 0) {
            _transferTokenFrom(msg.sender, address(this), amount);
        }

        _updateRewards(sequencerId);

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

    function withdrawRewards(uint256 sequencerId, bool withdrawToL2) public onlySequencer(sequencerId) {
        _updateRewards(sequencerId);
        _liquidateRewards(sequencerId, msg.sender, withdrawToL2);
    }


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

    // submit every batch
    // TODO: submit with mpc signature

    function batchSubmitRewards(
        address payeer,
        address[] memory sequencers,
        uint256[] memory finishedBlocks,
        bytes memory signature
    )  external onlyGovernance  returns (uint256) {
        // check mpc signature
        bytes32 operationHash = keccak256(abi.encodePacked(sequencers,finishedBlocks, address(this)));
        operationHash = ECDSA.toEthSignedMessageHash(operationHash);
        address signer = ECDSA.recover(operationHash, signature);
        require(signer == mpcAddress, "invalid mpc signature");

        // calc reward
        uint256 totalReward;
        for (uint256 i = 0; i < sequencers.length; ++i) {
            uint256 reward = _calculateReward(finishedBlocks[i]);
            _increaseReward(sequencers[i],reward);
            totalReward += reward;
        }

        // reward income
        token.safeTransferFrom(payeer, address(this), totalReward);
        return totalReward;
    }


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

    // query mpc address by L1 block height, used by batch-submitter
    function FetchMpcAddress(uint256 blockHeight) public view returns(address){
        for (uint i = mpcHistory.length-1; i>=0; i--) {
            if (blockHeight>= mpcHistory[i].startBlock){
                return mpcHistory[i].newMpcAddress;
            }
        }

        return address(0);
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
    ) private returns (uint256) {
        uint256 currentTotalLock = sequencerState.amount;

        // sequencer reward update
        uint256 sequencerId = signerToSequencer[sequencer];

        // rewardPerLock update
        uint256 newRewardPerLock = rewardPerLock.add(reward.mul(REWARD_PRECISION).div(currentTotalLock));
        _updateRewardsAndCommitWithFixedReward(sequencerId, reward,newRewardPerLock);
        rewardPerLock = newRewardPerLock;
        
        _finalizeCommit();
        return reward;
    }

    function _updateRewardsAndCommitWithFixedReward(uint256 sequencerId,uint256 reward, uint256 newRewardPerLock) private{
        uint256 deactivationBatch = sequencers[sequencerId].deactivationBatch;
        if (deactivationBatch != 0 && currentBatch >= deactivationBatch) {
            return;
        }

        _increaseSequencerReward(sequencerId,reward);

        uint256 initialRewardPerLock = sequencers[sequencerId].initialRewardPerLock;
        if (newRewardPerLock > initialRewardPerLock) {
            sequencers[sequencerId].initialRewardPerLock = newRewardPerLock;
        }
    }

    function _updateRewardsAndCommit(
        uint256 sequencerId,
        uint256 currentRewardPerLock,
        uint256 newRewardPerLock
    ) private {
        uint256 deactivationBatch = sequencers[sequencerId].deactivationBatch;
        if (deactivationBatch != 0 && currentBatch >= deactivationBatch) {
            return;
        }

        uint256 initialRewardPerLock = sequencers[sequencerId].initialRewardPerLock;

        // attempt to save gas in case if rewards were updated previosuly
        if (initialRewardPerLock < currentRewardPerLock) {
            uint256 sequencersLock = sequencers[sequencerId].amount;
                _increaseSequencerReward(
                    sequencerId,
                    _getEligibleSequencerReward(
                        sequencersLock,
                        currentRewardPerLock,
                        initialRewardPerLock
                    )
                );
        }

        if (newRewardPerLock > initialRewardPerLock) {
            sequencers[sequencerId].initialRewardPerLock = newRewardPerLock;
        }
    }

    function _updateRewards(uint256 sequencerId) private {
        _updateRewardsAndCommit(sequencerId, rewardPerLock, rewardPerLock);
    }

    function _getEligibleSequencerReward(
        uint256 sequencerLockPower,
        uint256 currentRewardPerLock,
        uint256 initialRewardPerLock
    ) private pure returns (uint256) {
        uint256 eligibleReward = currentRewardPerLock - initialRewardPerLock;
        return eligibleReward.mul(sequencerLockPower).div(REWARD_PRECISION);
    }

    function _increaseSequencerReward(uint256 sequencerId, uint256 reward) private {
        if (reward > 0) {
            sequencers[sequencerId].reward = sequencers[sequencerId].reward.add(reward);
        }
    }


    function _evaluateSequencerReward(uint256 sequencerId)
        private
        view
        returns (uint256  )
    {
        uint256 sequencersLock = sequencers[sequencerId].amount;
        uint256 eligibleReward = rewardPerLock - sequencers[sequencerId].initialRewardPerLock;
        return eligibleReward.mul(sequencersLock).div(REWARD_PRECISION);
    }

    function _lockFor(
        address user,
        uint256 amount,
        bytes memory signerPubkey
    ) internal returns (uint256) {
        address signer = _getAndAssertSigner(signerPubkey);
        uint256 _currentBatch = currentBatch;
        uint256 sequencerId = NFTCounter;
        LockingInfo _logger = logger;

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
            initialRewardPerLock: rewardPerLock
        });

        latestSignerUpdateBatch[sequencerId] = _currentBatch;
        NFTContract.mint(user, sequencerId);

        signerToSequencer[signer] = sequencerId;
        updateTimeline(int256(amount), 1, 0);

        _logger.logLocked(signer, signerPubkey, sequencerId, _currentBatch, amount, newTotalLocked);
        NFTCounter = sequencerId.add(1);

        _insertSigner(signer);
        return sequencerId;
    }

    function _unlock(uint256 sequencerId, uint256 exitBatch, bool withdrawRewardToL2) internal {
        // Ensure that the number of exit sequencer is less than 1/3 of the total
        require(currentUnlockedInit + 1 < sequencerState.lockerCount/3, "not allowed");

        _updateRewards(sequencerId);

        uint256 amount = sequencers[sequencerId].amount;
        address sequencer = ownerOf(sequencerId);

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
        uint256 _currentBatch = currentBatch;
        uint256 nextBatch = _currentBatch.add(1);

        StateChange memory changes = sequencerStateChanges[nextBatch];
        updateTimeline(changes.amount, changes.lockerCount, 0);

        delete sequencerStateChanges[_currentBatch];

        currentBatch = nextBatch;
    }

    function _liquidateRewards(uint256 sequencerId, address sequencerUser, bool withdrawRewardToL2) private {
        uint256 reward = sequencers[sequencerId].reward.sub(INITIALIZED_AMOUNT);
        totalRewardsLiquidated = totalRewardsLiquidated.add(reward);
        sequencers[sequencerId].reward = INITIALIZED_AMOUNT;

        if (!withdrawRewardToL2){
           _transferToken(sequencerUser, reward);
        }else{
            IL1ERC20Bridge(bridge).depositERC20ToByChainId(getL2ChainId(), l1Token, l2Token, sequencerUser, reward, l2Gas, "0x0");
        }
        logger.logClaimRewards(sequencerId, reward, totalRewardsLiquidated);
    }

    function _transferToken(address destination, uint256 amount) private {
        require(token.transfer(destination, amount), "transfer failed");
    }

    function _transferTokenFrom(
        address from,
        address destination,
        uint256 amount
    ) private {
        require(token.transferFrom(from, destination, amount), "transfer from failed");
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

    function getL2ChainId() public view returns(uint256) {
        uint256 l2ChainId;
        if (block.chainid == 1) {
            l2ChainId = 1088;
        }else if (block.chainid == 5){
            l2ChainId = 599;
        }
        return l2ChainId;
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
