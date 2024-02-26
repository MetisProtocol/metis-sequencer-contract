// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ILockingBadge} from "./ILockingBadge.sol";

interface ILockingEscrow {
    /**
     * @dev Emitted when min lock amount update in 'UpdateMinAmounts'
     * @param _newMinLock new min lock.
     */
    event SetMinLock(uint256 _newMinLock);

    /**
     * @dev Emitted when min lock amount update in 'UpdateMaxAmounts'
     * @param _newMaxLock new max lock.
     */
    event SetMaxLock(uint256 _newMaxLock);

    /**
     * @dev Emitted when the reward payer is changed
     * @param _payer new reward payer
     */
    event SetRewardPayer(address _payer);

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
        uint256 indexed activationBatch,
        uint256 nonce,
        uint256 amount,
        uint256 total,
        bytes signerPubkey
    );

    /**
     * @dev Emitted when the sequencer increase lock amoun in 'relock()'.
     * @param _seqId unique integer to identify a sequencer.
     * @param _amount locking new amount
     * @param _total the total locking amount
     */
    event Relocked(uint256 indexed _seqId, uint256 _amount, uint256 _total);

    /**
     * @dev Emitted when sequencer relocking in 'relock()'.
     * @param _seqId unique integer to identify a sequencer.
     * @param _nonce to synchronize the events in themis.
     * @param _amount the updated lock amount.
     */
    event LockUpdate(
        uint256 indexed _seqId,
        uint256 indexed _nonce,
        uint256 indexed _amount
    );

    /**
     * @dev Emitted when sequencer withdraw rewards in 'withdrawRewards' or 'unlockClaim'
     * @param _seqId unique integer to identify a sequencer.
     * @param _recipient the address receive reward tokens
     * @param _amount the reward amount.
     * @param _totalAmount total rewards has liquidated
     */
    event ClaimRewards(
        uint256 indexed _seqId,
        address indexed _recipient,
        uint256 _amount,
        uint256 _totalAmount
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
     * @dev Emitted when batch update in  'batchSubmitRewards'
     * @param _newBatchId new batchId.
     */
    event BatchSubmitReward(uint256 _newBatchId);

    function newSequencer(
        uint256 _id,
        address _signer,
        uint256 _amount,
        uint256 _batchId,
        bytes calldata _signerPubkey
    ) external;

    function increaseLocked(
        uint256 _seqId,
        uint256 _nonce,
        address _owner,
        uint256 _locked,
        uint256 _incoming,
        uint256 _fromReward
    ) external;

    function initializeUnlock(
        uint256 _seqId,
        uint32 _l2gas,
        ILockingBadge.Sequencer calldata _seq
    ) external payable;

    function finalizeUnlock(
        address _owner,
        uint256 _seqId,
        uint256 _amount,
        uint256 _reward,
        address _recipient,
        uint32 _l2gas
    ) external payable;

    function liquidateReward(
        uint256 _seqId,
        uint256 _amount,
        address _recipient,
        uint32 _l2gas
    ) external payable;

    function distributeReward(uint256 _batchId, uint256 _totalReward) external;
}
