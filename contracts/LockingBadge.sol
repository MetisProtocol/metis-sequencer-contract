// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ILockingBadge} from "./interfaces/ILockingBadge.sol";

contract LockingBadge is
    ERC721EnumerableUpgradeable,
    OwnableUpgradeable,
    ILockingBadge
{
    // sequencers count threshold
    uint256 public threshold;

    // whitelist
    mapping(address => bool) public whitelist;

    // sequencerId => sequencer
    mapping(uint256 seqId => Sequencer _seq) public sequencers;

    // sequencer owner => sequencerId
    mapping(address owner => uint256 seqId) public seqOwners;

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
        threshold = 10;

        __ERC721_init("Metis Sequencer", "MS");
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
     * @dev setThreshold allow owner to update the threshold
     * @param _threshold restrict the sequencer count
     */
    function setThreshold(uint256 _threshold) external onlyOwner {
        threshold = _threshold;
        emit SetThreshold(_threshold);
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

        if (seq.owner != msg.sender) {
            revert NotSeqOwner();
        }

        seq.owner = _owner;
        emit SequencerOwnerChanged(_seqId, _owner);
    }

    /**
     * @dev updateSigner Allow sqeuencer to update new signers to replace old signer addresses，and NFT holder will be transfer driectly
     * @param _seqId unique integer to identify a sequencer.
     * @param _signerPubkey the new signer pubkey address
     */
    function updateSigner(
        uint256 _seqId,
        bytes calldata _signerPubkey
    ) external whitelistRequired {
        Sequencer storage seq = sequencers[_seqId];
        if (seq.status != Status.Active) {
            revert SeqNotActive();
        }

        if (seq.signer != msg.sender) {
            revert NotSeq();
        }

        require(_signerPubkey.length == 64, "invalid pubkey");
        address newSigner = address(uint160(uint256(keccak256(_signerPubkey))));
        seq.signer = newSigner;
        _transfer2(msg.sender, newSigner, _seqId);
    }

    function _mintFor(
        address _caller,
        address _to
    ) internal returns (uint256 _seqId) {
        if (seqOwners[_caller] != 0) {
            revert OwnedSequencer();
        }

        if (balanceOf(_to) != 0) {
            revert OwnedBadge();
        }

        // tokenId starts from 1
        _seqId = totalSupply() + 1;
        if (_seqId > threshold) {
            revert ThresholdExceed();
        }

        // it will check the _to must not be empty address
        _mint(_to, _seqId);
        return _seqId;
    }

    // revert if user do a transfer external
    function _transfer(address, address, uint256) internal pure override {
        revert("transfer is not available");
    }

    // it's for updating signer key, used by the updateSigner func
    function _transfer2(address _from, address _to, uint256 _tokenId) internal {
        if (balanceOf(_to) == 1) {
            revert OwnedBadge();
        }
        super._transfer(_from, _to, _tokenId);
    }
}
