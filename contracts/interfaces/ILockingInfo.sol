// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ISequencerInfo} from "./ISequencerInfo.sol";

interface ILockingInfo {
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
        uint256 nonce,
        uint256 indexed activationBatch,
        uint256 amount,
        uint256 total,
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
     * @param totalAmount total rewards has liquidated
     */
    event ClaimRewards(
        uint256 indexed sequencerId,
        address recipient,
        uint256 indexed amount,
        uint256 indexed totalAmount
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

    function newSequencer(
        uint256 _id,
        address _owner,
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
        uint256 _reward,
        uint32 _l2gas,
        ISequencerInfo.Sequencer calldata _seq
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

    function logSignerChange(
        uint256 sequencerId,
        address oldSigner,
        address newSigner,
        uint256 nonce,
        bytes calldata signerPubkey
    ) external;
}
