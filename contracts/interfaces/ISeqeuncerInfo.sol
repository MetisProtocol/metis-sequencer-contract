// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface ISeqeuncerInfo {
    error OwnedSequencer();
    error OwnedSigner();
    error NoSuchSeq();
    error NullAddress();
    error SeqNotActive();
    error NotSeqOwner();
    error NotSeqSigner();
    error NoRewardRecipient();
    error NotWhitelisted();

    // the sequencer status
    enum Status {
        Unavailabe, // placeholder for default value
        Inactive, // the sequencer will be Inactive if its owner starts unlock
        Active, // the sequencer is active when it locks tokens on the contract
        Unlocked // Exited, the sequencer has no locked tokens, and it's no longer produce blocks on L2
    }

    struct Sequencer {
        uint256 amount; // sequencer current locked
        uint256 reward; // sequencer current reward
        uint256 activationBatch; // sequencer activation batch id
        uint256 updatingBatch; // batch id of the last updating
        uint256 deactivationBatch; // sequencer deactivation batch id
        uint256 deactivationTime; // sequencer deactivation timestamp
        uint256 unlockClaimTime; // timestamp that sequencer can claim unlocked token, it's equal to deactivationTime + WITHDRAWAL_DELAY
        uint256 nonce; // sequencer operations number, starts from 1, and used internally by the Metis consencus client
        address owner; // the operator address, owns this sequencer ndoe, it controls lock/relock/unlock/cliam
        address signer; // sequencer signer, an address for a sequencer node, it can change signer address
        bytes pubkey; // sequencer signer pubkey
        address rewardRecipient; // seqeuncer rewarder recipient address
        Status status; // sequencer status
    }

    /**
     * @dev Emitted if owner call 'setWhitelist'
     * @param _user the address who can lock token
     * @param _yes white address state
     */
    event SetWhitelist(address _user, bool _yes);

    /**
     * @dev Emitted when reward recipient address update in 'setSequencerRewardRecipient'
     * @param _seqId the sequencerId
     * @param _recipient the address receive reward token
     */
    event SequencerRewardRecipientChanged(uint256 _seqId, address _recipient);

    /**
     * @dev Emitted when sequencer owner is changed
     * @param _seqId the sequencerId
     * @param _owner the sequencer owner
     */
    event SequencerOwnerChanged(uint256 _seqId, address _owner);

    function seqOwners(address owner) external returns (uint256 seqId);
}
