// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ISequencerInfo} from "./interfaces/ISequencerInfo.sol";

contract SequencerInfo is OwnableUpgradeable, ISequencerInfo {
    uint256 public totalSequencers;

    // whitelist
    mapping(address owner => bool yes) public whitelist;

    // sequencerId => sequencer
    mapping(uint256 seqId => Sequencer _seq) public sequencers;

    // sequencer owner address => sequencerId
    // Note: sequencerId starts from 1
    // sequencer does not exist if the seqId is 0
    mapping(address owner => uint256 seqId) public seqOwners;

    // sequencer signer address => sequencerId
    // the signer can't be reused afterward if the sequencer exits or updates its pubkey
    // It means that the signer is invalid if the seqId is type(uint256).max
    mapping(address signer => uint256 seqId) public seqSigners;

    // sequencer status => count
    mapping(Status status => uint256 count) public seqStatuses;

    /**
     * @dev Modifier to make a function callable only the msg.sender is in the whitelist.
     */
    modifier whitelistRequired() {
        if (!whitelist[msg.sender]) {
            revert NotWhitelisted();
        }
        _;
    }

    function __LockingBadge_init() internal {
        __Ownable_init();
    }

    /**
     * @dev setWhitelist Allow owner to update white address list
     * @param _addr the address who can lock token
     * @param _yes white address state
     */
    function setWhitelist(address _addr, bool _yes) external onlyOwner {
        whitelist[_addr] = _yes;
        emit SetWhitelist(_addr, _yes);
    }

    /**
     * @dev setSequencerRewardRecipient Allow sequencer owner to set a reward recipient
     * @param _seqId The sequencerId
     * @param _recipient Who will receive the reward token
     */
    function setSequencerRewardRecipient(
        uint256 _seqId,
        address _recipient
    ) external whitelistRequired {
        Sequencer storage seq = sequencers[_seqId];

        if (seq.owner != msg.sender) {
            revert NotSeqOwner();
        }

        if (seq.status != Status.Active) {
            revert SeqNotActive();
        }

        if (_recipient == address(0)) {
            revert NullAddress();
        }

        seq.rewardRecipient = _recipient;
        emit SequencerRewardRecipientChanged(_seqId, _recipient);
    }

    /**
     * @dev setSequencerOwner update sequencer owner
     * @param _seqId The sequencerId
     * @param _owner the new owner
     */
    function setSequencerOwner(
        uint256 _seqId,
        address _owner
    ) external whitelistRequired {
        if (_owner == address(0)) {
            revert NullAddress();
        }

        Sequencer storage seq = sequencers[_seqId];
        if (seq.status != Status.Active) {
            revert SeqNotActive();
        }

        address owner = seq.owner;
        if (owner != msg.sender) {
            revert NotSeqOwner();
        }
        seq.owner = _owner;
        delete seqOwners[owner];
        seqOwners[_owner] = _seqId;
        emit SequencerOwnerChanged(_seqId, _owner);
    }

    function _lockFor(
        uint256 _batchId,
        address _owner,
        address _signer,
        bytes calldata _signerPubkey,
        uint256 _amount,
        address _rewardRecipient
    ) internal returns (uint256 _seqId) {
        // it will check the _signer must not be empty address
        require(
            _getAddrByPubkey(_signerPubkey) == _signer,
            "pubkey and address mismatch"
        );

        if (seqOwners[_owner] != 0) {
            revert OwnedSequencer();
        }

        if (seqSigners[_signer] != 0) {
            revert SignerExisted();
        }

        uint256 seqs = totalSequencers;

        // seqId starts from 1
        _seqId = seqs + 1;

        seqOwners[_owner] = _seqId;
        seqSigners[_signer] = _seqId;
        seqStatuses[Status.Active]++;
        totalSequencers = _seqId;

        sequencers[_seqId] = Sequencer({
            amount: _amount,
            reward: 0,
            activationBatch: _batchId,
            deactivationBatch: 0,
            updatedBatch: _batchId,
            deactivationTime: 0,
            unlockClaimTime: 0,
            nonce: 1,
            owner: _owner,
            signer: _signer,
            pubkey: _signerPubkey,
            rewardRecipient: _rewardRecipient,
            status: Status.Active
        });
        return _seqId;
    }

    function _getAddrByPubkey(
        bytes calldata _signerPubkey
    ) internal pure returns (address) {
        require(_signerPubkey.length == 64, "invalid pubkey");
        address newSigner = address(uint160(uint256(keccak256(_signerPubkey))));
        require(newSigner != address(0), "empty address");
        return newSigner;
    }

    function _invalidSignerAddress(address _signer) internal {
        seqSigners[_signer] = type(uint256).max;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
