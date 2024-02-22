// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract LockingInfo is Ownable {
    mapping(uint256 => uint256) public sequencerNonce;
    address public immutable lockingPool;

    /**
     * @dev Emitted when sequencer locks in '_lockFor()' in LockingPool.
     * @param signer sequencer address.
     * @param sequencerId unique integer to identify a sequencer.
     * @param nonce to synchronize the events in themis.
     * @param activationBatch sequencer's first epoch as proposer.
     * @param amount locking amount.
     * @param total total locking amount.
     * @param signerPubkey public key of the sequencer
     */
    event Locked(
        address indexed signer,
        uint256 indexed sequencerId,
        uint256 nonce,
        uint256 indexed activationBatch,
        uint256 amount,
        uint256 total,
        bytes signerPubkey
    );

    /**
     * @dev Emitted when sequencer unlocks in 'unlockClaim()'
     * @param user address of the sequencer.
     * @param sequencerId unique integer to identify a sequencer.
     * @param amount locking amount.
     * @param total total locking amount.
     */
    event Unlocked(
        address indexed user,
        uint256 indexed sequencerId,
        uint256 amount,
        uint256 total
    );

    /**
     * @dev Emitted when sequencer unlocks in '_unlock()'.
     * @param user address of the sequencer.
     * @param sequencerId unique integer to identify a sequencer.
     * @param nonce to synchronize the events in themis.
     * @param deactivationBatch  last batch for sequencer.
     * @param deactivationTime unlock block timestamp.
     * @param unlockClaimTime when user can claim locked token.
     * @param amount locking amount
     */
    event UnlockInit(
        address indexed user,
        uint256 indexed sequencerId,
        uint256 nonce,
        uint256 deactivationBatch,
        uint256 deactivationTime,
        uint256 unlockClaimTime,
        uint256 indexed amount
    );

    /**
     * @dev Emitted when the sequencer public key is updated in 'updateSigner()'.
     * @param sequencerId unique integer to identify a sequencer.
     * @param nonce to synchronize the events in themis.
     * @param oldSigner oldSigner old address of the sequencer.
     * @param newSigner newSigner new address of the sequencer.
     * @param signerPubkey signerPubkey public key of the sequencer.
     */
    event SignerChange(
        uint256 indexed sequencerId,
        uint256 nonce,
        address indexed oldSigner,
        address indexed newSigner,
        bytes signerPubkey
    );

    /**
     * @dev Emitted when the sequencer increase lock amoun in 'relock()'.
     * @param sequencerId unique integer to identify a sequencer.
     * @param amount locking new amount
     * @param total the total locking amount
     */
    event Relocked(uint256 indexed sequencerId, uint256 amount, uint256 total);

    /**
     * @dev Emitted when the proxy update threshold in 'updateSequencerThreshold()'.
     * @param newThreshold new threshold
     * @param oldThreshold  old threshold
     */
    event ThresholdChange(uint256 newThreshold, uint256 oldThreshold);

    /**
     * @dev Emitted when the proxy update threshold in 'updateWithdrawDelayTimeValue()'.
     * @param newWithrawDelayTime new withdraw delay time
     * @param oldWithrawDelayTime  old withdraw delay time
     */
    event WithrawDelayTimeChange(
        uint256 newWithrawDelayTime,
        uint256 oldWithrawDelayTime
    );

    /**
     * @dev Emitted when the proxy update threshold in 'updateBlockReward()'.
     * @param newReward new block reward
     * @param oldReward  old block reward
     */
    event RewardUpdate(uint256 newReward, uint256 oldReward);

    /**
     * @dev Emitted when sequencer relocking in 'relock()'.
     * @param sequencerId unique integer to identify a sequencer.
     * @param nonce to synchronize the events in themis.
     * @param newAmount the updated lock amount.
     */
    event LockUpdate(
        uint256 indexed sequencerId,
        uint256 indexed nonce,
        uint256 indexed newAmount
    );

    /**
     * @dev Emitted when sequencer withdraw rewards in 'withdrawRewards' or 'unlockClaim'
     * @param sequencerId unique integer to identify a sequencer.
     * @param recipient the address receive reward tokens
     * @param amount the reward amount.
     * @param totalAmount total rewards liquidated
     */
    event ClaimRewards(
        uint256 indexed sequencerId,
        address recipient,
        uint256 indexed amount,
        uint256 indexed totalAmount
    );

    /**
     * @dev Emitted when batch update in  'batchSubmitRewards'
     * @param _newBatchId new batchId.
     */
    event BatchSubmitReward(uint256 _newBatchId);

    /**
     * @dev Emitted when batch update in  'updateEpochLength'
     * @param _oldEpochLength old epoch length.
     * @param _newEpochLength new epoch length.
     * @param _effectiveBatch effective batch id.
     */
    event UpdateEpochLength(
        uint256 _oldEpochLength,
        uint256 _newEpochLength,
        uint256 _effectiveBatch
    );

    modifier onlyLockingPool() {
        require(lockingPool == msg.sender, "Invalid sender, not locking pool");
        _;
    }

    constructor(address _lockingPool) {
        lockingPool = _lockingPool;
    }

    /**
     * @dev updateNonce can update nonce for sequencrs by owner
     * @param sequencerIds the sequencer ids.
     * @param nonces the sequencer nonces
     */
    function updateNonce(
        uint256[] calldata sequencerIds,
        uint256[] calldata nonces
    ) external onlyOwner {
        require(sequencerIds.length == nonces.length, "args length mismatch");

        for (uint256 i = 0; i < sequencerIds.length; ++i) {
            sequencerNonce[sequencerIds[i]] = nonces[i];
        }
    }

    /**
     * @dev logLocked log event Locked
     */
    function logLocked(
        address signer,
        bytes memory signerPubkey,
        uint256 sequencerId,
        uint256 activationBatch,
        uint256 amount,
        uint256 total
    ) external onlyLockingPool {
        sequencerNonce[sequencerId] = sequencerNonce[sequencerId] + 1;
        emit Locked(
            signer,
            sequencerId,
            sequencerNonce[sequencerId],
            activationBatch,
            amount,
            total,
            signerPubkey
        );
    }

    /**
     * @dev logUnlocked log event logUnlocked
     */
    function logUnlocked(
        address user,
        uint256 sequencerId,
        uint256 amount,
        uint256 total
    ) external onlyLockingPool {
        emit Unlocked(user, sequencerId, amount, total);
    }

    /**
     * @dev logUnlockInit log event logUnlockInit
     */
    function logUnlockInit(
        address user,
        uint256 sequencerId,
        uint256 deactivationBatch,
        uint256 deactivationTime,
        uint256 unlockClaimTime,
        uint256 amount
    ) external onlyLockingPool {
        sequencerNonce[sequencerId] = sequencerNonce[sequencerId] + 1;
        emit UnlockInit(
            user,
            sequencerId,
            sequencerNonce[sequencerId],
            deactivationBatch,
            deactivationTime,
            unlockClaimTime,
            amount
        );
    }

    /**
     * @dev logSignerChange log event SignerChange
     */
    function logSignerChange(
        uint256 sequencerId,
        address oldSigner,
        address newSigner,
        bytes memory signerPubkey
    ) external onlyLockingPool {
        sequencerNonce[sequencerId] = sequencerNonce[sequencerId] + 1;
        emit SignerChange(
            sequencerId,
            sequencerNonce[sequencerId],
            oldSigner,
            newSigner,
            signerPubkey
        );
    }

    /**
     * @dev logRelockd log event Relocked
     */
    function logRelockd(
        uint256 sequencerId,
        uint256 amount,
        uint256 total
    ) external onlyLockingPool {
        emit Relocked(sequencerId, amount, total);
    }

    /**
     * @dev logThresholdChange log event ThresholdChange
     */
    function logThresholdChange(
        uint256 newThreshold,
        uint256 oldThreshold
    ) external onlyLockingPool {
        emit ThresholdChange(newThreshold, oldThreshold);
    }

    /**
     * @dev logWithrawDelayTimeChange log event WithrawDelayTimeChange
     */
    function logWithrawDelayTimeChange(
        uint256 newWithrawDelayTime,
        uint256 oldWithrawDelayTime
    ) external onlyLockingPool {
        emit WithrawDelayTimeChange(newWithrawDelayTime, oldWithrawDelayTime);
    }

    /**
     * @dev logRewardUpdate log event RewardUpdate
     */
    function logRewardUpdate(
        uint256 newReward,
        uint256 oldReward
    ) external onlyLockingPool {
        emit RewardUpdate(newReward, oldReward);
    }

    /**
     * @dev logLockUpdate log event LockUpdate
     */
    function logLockUpdate(
        uint256 sequencerId,
        uint256 totalLock
    ) external onlyLockingPool {
        sequencerNonce[sequencerId] = sequencerNonce[sequencerId] + 1;
        emit LockUpdate(sequencerId, sequencerNonce[sequencerId], totalLock);
    }

    /**
     * @dev logClaimRewards log event ClaimRewards
     */
    function logClaimRewards(
        uint256 sequencerId,
        address recipient,
        uint256 amount,
        uint256 totalAmount
    ) external onlyLockingPool {
        emit ClaimRewards(sequencerId, recipient, amount, totalAmount);
    }

    /**
     * @dev logBatchSubmitReward log event BatchSubmitReward
     */
    function logBatchSubmitReward(uint256 newBatchId) external onlyLockingPool {
        emit BatchSubmitReward(newBatchId);
    }

    /**
     * @dev logUpdateEpochLength log event UpdateEpochLength
     */
    function logUpdateEpochLength(
        uint256 oldEpochLength,
        uint256 newEpochLength,
        uint256 effectiveBatch
    ) external onlyLockingPool {
        emit UpdateEpochLength(oldEpochLength, newEpochLength, effectiveBatch);
    }
}
