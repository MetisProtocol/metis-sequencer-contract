// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import {ILockingInfo} from "./interfaces/ILockingInfo.sol";
import {ILockingPool} from "./interfaces/ILockingPool.sol";

import {SequencerInfo} from "./SequencerInfo.sol";

contract LockingPool is ILockingPool, PausableUpgradeable, SequencerInfo {
    struct BatchState {
        uint256 id; // current batch id
        uint256 number; // current batch block number
        uint256 startEpoch; // start epoch number for current batch
        uint256 endEpoch; // end epoch number for current batch
    }

    ILockingInfo public escorow;

    // delay time for unlock
    uint256 public WITHDRAWAL_DELAY;

    // reward per L2 block
    uint256 public BLOCK_REWARD;

    // the mpc address
    address public mpcAddress;

    // current batch state
    BatchState public curBatchState;

    // the number of batch that signer can be updated since the last update
    uint256 public signerUpdateThrottle;

    function initialize(address _escorow) external initializer {
        WITHDRAWAL_DELAY = 21 days;
        BLOCK_REWARD = 761000 gwei;

        // init batch state
        curBatchState = BatchState({
            id: 1,
            number: block.number,
            startEpoch: 0,
            endEpoch: 0
        });

        escorow = ILockingInfo(_escorow);

        signerUpdateThrottle = 1;

        __Pausable_init();
        __LockingBadge_init();
    }

    /**
     * @dev currentBatch returns current batch id
     */
    function currentBatch() external view returns (uint256) {
        return curBatchState.id;
    }

    /**
     * @dev updateMpc update the mpc address
     * @param _newMpc new mpc address
     */
    function updateMpc(address _newMpc) external onlyOwner {
        mpcAddress = _newMpc;
        emit UpdateMpc(_newMpc);
    }

    /**
     * @dev setPause
     * @param _yes pause or not
     */
    function setPause(bool _yes) external onlyOwner {
        if (_yes) {
            _pause();
        } else {
            _unpause();
        }
    }

    /**
     *  @dev updateWithdrawDelayTimeValue Allow owner to set withdraw delay time.
     *  @param _time new withdraw delay time
     */
    function updateWithdrawDelayTimeValue(uint256 _time) external onlyOwner {
        require(_time > 0, "dalayTime==0");
        uint256 pre = WITHDRAWAL_DELAY;
        WITHDRAWAL_DELAY = _time;
        emit WithrawDelayTimeChange(_time, pre);
    }

    /**
     * @dev updateBlockReward  Allow owner to set per block reward
     * @param newReward the block reward
     */
    function updateBlockReward(uint256 newReward) external onlyOwner {
        require(newReward != 0, "invalid newReward");
        uint256 pre = BLOCK_REWARD;
        BLOCK_REWARD = newReward;
        emit RewardUpdate(newReward, pre);
    }

    /**
     * @dev setSignerUpdateThrottle  set signerUpdateThrottle
     * @param _n the new value of the throttle
     *        Note: it can be 0
     */
    function setSignerUpdateThrottle(uint256 _n) external onlyOwner {
        signerUpdateThrottle = _n;
        emit SetSignerUpdateThrottle(_n);
    }

    /**
     * @dev updateSigner Allow sqeuencer to update new signers to replace old signer addresses，and NFT holder will be transfer driectly
     * @param _seqId the sequencer id
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

        // can be updated by the signer
        address signer = seq.signer;
        if (signer != msg.sender) {
            revert NotSeqSigner();
        }

        require(
            curBatchState.id >= seq.updatedBatch + signerUpdateThrottle,
            "signer updating throttle"
        );

        address newSigner = _getAddrByPubkey(_signerPubkey);
        // the new signer should not be a signer before
        if (seqSigners[newSigner] != 0) {
            revert SignerExisted();
        }
        seq.pubkey = _signerPubkey;

        seq.signer = newSigner;
        seqSigners[newSigner] = _seqId;

        // the previous signer address can'be used again
        _invalidSignerAddress(signer);

        // set signer updated batch id
        seq.updatedBatch = curBatchState.id;

        uint256 nonce = seq.nonce + 1;
        seq.nonce = nonce;
        // the event emits in LocingInfo is just for compatibility
        escorow.logSignerChange(
            _seqId,
            signer,
            newSigner,
            nonce,
            _signerPubkey
        );
    }

    /**
     * @dev lockFor lock Metis and participate in the sequencer node
     *      the msg.sender will be owner of the sequencer
     *      the owner has abilities to leverage lock/relock/unlock/cliam
     *      **Note**: the locking amount will be trasnfered from msg.sender
     *      and you need to approve the Metis of msg.sender to **LockingInfo** contract
     *      instead of this LockingPool contract
     *
     *      the default reward recipient is an empty address
     *      you need to update it using setSequencerRewardRecipient afterward
     * @param _signer Sequencer signer address
     * @param _amount Amount of L1 metis token to lock for.
     * @param _signerPubkey Sequencer signer pubkey, it should be uncompressed
     */
    function lockFor(
        address _signer,
        uint256 _amount,
        bytes calldata _signerPubkey
    ) external whenNotPaused whitelistRequired {
        uint256 batchId = curBatchState.id;
        address owner = msg.sender;
        uint256 seqId = _lockFor(
            batchId,
            owner,
            _signer,
            _signerPubkey,
            _amount,
            address(0)
        );
        escorow.newSequencer(
            seqId,
            owner,
            _signer,
            _amount,
            batchId,
            _signerPubkey
        );
        emit SequencerOwnerChanged(seqId, msg.sender);
        emit SequencerRewardRecipientChanged(seqId, address(0));
    }

    /**
     * @dev lockWithRewardRecipient is the same with lockFor, but you can provide a reward receipent
     * @param _signer Sequencer signer address
     * @param _rewardRecipient Sequencer reward receiptent
     *        you can use an empty address if you haven't choose an address
     *        you can update it using `setSequencerRewardRecipient` after then
     * @param _amount Amount of L1 metis token to lock for.
     * @param _signerPubkey Sequencer signer pubkey
     *         it should be uncompressed and matched with signer address
     */
    function lockWithRewardRecipient(
        address _signer,
        address _rewardRecipient,
        uint256 _amount,
        bytes calldata _signerPubkey
    ) external whenNotPaused whitelistRequired {
        uint256 batchId = curBatchState.id;
        uint256 seqId = _lockFor(
            batchId,
            msg.sender,
            _signer,
            _signerPubkey,
            _amount,
            _rewardRecipient
        );
        escorow.newSequencer(
            seqId,
            msg.sender,
            _signer,
            _amount,
            batchId,
            _signerPubkey
        );
        emit SequencerOwnerChanged(seqId, msg.sender);
        emit SequencerRewardRecipientChanged(seqId, _rewardRecipient);
    }

    /**
     * @dev relock allow sequencer operator to increase the amount of locked positions
     * @param _seqId the id of your sequencer
     * @param _amount amount of token to relock, it can be 0 if you want to relock your rewrad
     * @param _lockReward use true if lock the current rewards
     */
    function relock(
        uint256 _seqId,
        uint256 _amount,
        bool _lockReward
    ) external whenNotPaused whitelistRequired {
        Sequencer storage seq = sequencers[_seqId];
        if (seq.status != Status.Active) {
            revert SeqNotActive();
        }

        if (seq.owner != msg.sender) {
            revert NotSeqOwner();
        }

        uint256 _fromReward = 0;
        if (_lockReward) {
            _fromReward = seq.reward;
            seq.reward = 0;
        }

        uint256 locked = seq.amount + _amount + _fromReward;
        uint256 nonce = seq.nonce + 1;

        seq.nonce = nonce;
        seq.amount = locked;

        escorow.increaseLocked(
            _seqId,
            nonce,
            msg.sender,
            locked,
            _amount,
            _fromReward
        );
    }

    /**
     * @dev unlock your metis and exit the sequencer node
     *      the reward will be arrived by L1Bridge first
     *      and you need to wait the exit period and call
     *      unlockClaim to cliam your locked token
     * @param _seqId sequencer id
     * @param _l2Gas the L2 gas limit for L1Bridge.
     *       the reward is distributed by bridge
     *       so you need to pay the ETH as the bridge fee
     */
    function unlock(
        uint256 _seqId,
        uint32 _l2Gas
    ) external payable whenNotPaused whitelistRequired {
        _unlock(_seqId, false, _l2Gas);
    }

    /**
     * @dev forceUnlock Allow owner to force a sequencer node to exit
     * @param _seqId the sequencer id
     * @param _l2Gas l2 gas limit, see above for the detail
     */
    function forceUnlock(uint256 _seqId, uint32 _l2Gas) external onlyOwner {
        _unlock(_seqId, true, _l2Gas);
    }

    /**
     * @dev unlockClaim claim your locked tokens after the waiting period is passed
     *
     * @param _seqId sequencer id
     * @param _l2Gas l2 gas limit
     */
    function unlockClaim(
        uint256 _seqId,
        uint32 _l2Gas
    ) external payable whenNotPaused whitelistRequired {
        Sequencer storage seq = sequencers[_seqId];
        if (seq.owner != msg.sender) {
            revert NotSeqOwner();
        }

        address recipient = seq.rewardRecipient;
        if (recipient == address(0)) {
            revert NoRewardRecipient();
        }

        // operator can only claim after WITHDRAWAL_DELAY
        require(
            seq.status == Status.Inactive &&
                seq.unlockClaimTime <= block.timestamp,
            "Not allowed to cliam"
        );

        uint256 amount = seq.amount;
        uint256 reward = seq.reward;
        // uint256 nonce = seq.nonce + 1;

        seq.amount = 0;
        seq.reward = 0;
        // seq.nonce = nonce;
        seq.status = Status.Unlocked;
        seqStatuses[Status.Inactive]--;
        seqStatuses[Status.Unlocked]++;

        delete seqOwners[seq.owner];

        // invalid it
        _invalidSignerAddress(seq.signer);

        escorow.finalizeUnlock{value: msg.value}(
            msg.sender,
            _seqId,
            amount,
            reward,
            seq.rewardRecipient,
            _l2Gas
        );
    }

    /**
     * @dev withdrawRewards withdraw current rewards
     *
     * @param _seqId unique integer to identify a sequencer.
     * @param _l2Gas bridge reward to L2 gasLimit
     */
    function withdrawRewards(
        uint256 _seqId,
        uint32 _l2Gas
    ) external payable whenNotPaused whitelistRequired {
        Sequencer storage seq = sequencers[_seqId];
        if (seq.status != Status.Active) {
            revert SeqNotActive();
        }

        if (seq.owner != msg.sender) {
            revert NotSeqOwner();
        }

        address recipient = seq.rewardRecipient;
        if (recipient == address(0)) {
            revert NoRewardRecipient();
        }
        uint256 reward = seq.reward;
        if (reward > 0) {
            seq.reward = 0;
            escorow.liquidateReward{value: msg.value}(
                _seqId,
                reward,
                recipient,
                _l2Gas
            );
        }
    }

    /**
     * @dev batchSubmitRewards Allow to submit L2 sequencer block information, and attach Metis reward tokens for reward distribution
     * @param _batchId The batchId that submitted the reward is that
     * @param _startEpoch The startEpoch that submitted the reward is that
     * @param _endEpoch The endEpoch that submitted the reward is that
     * @param _seqs Those sequencers can receive rewards
     * @param _blocks How many blocks each sequencer finished.
     */
    function batchSubmitRewards(
        uint256 _batchId,
        uint256 _startEpoch,
        uint256 _endEpoch,
        address[] calldata _seqs,
        uint256[] calldata _blocks
    ) external payable returns (uint256 totalReward) {
        require(msg.sender == mpcAddress, "not MPC");
        require(
            _seqs.length == _blocks.length && _seqs.length > 0,
            "mismatch length"
        );

        BatchState storage bs = curBatchState;
        uint256 nextBatch = bs.id + 1;
        require(nextBatch == _batchId, "invalid batch id");
        bs.id = nextBatch;

        require(bs.endEpoch + 1 == _startEpoch, "invalid startEpoch");
        require(_startEpoch < _endEpoch, "invalid endEpoch");

        for (uint256 i = 0; i < _seqs.length; i++) {
            uint256 reward = _blocks[i] * BLOCK_REWARD;
            uint256 seqId = seqSigners[_seqs[i]];
            Sequencer storage seq = sequencers[seqId];
            if (seq.status == Status.Unavailabe) {
                revert NoSuchSeq();
            }
            seq.reward += reward;
            totalReward += reward;
        }
        bs.number = block.number;
        bs.startEpoch = _startEpoch;
        bs.endEpoch = _endEpoch;
        escorow.distributeReward(_batchId, totalReward);
    }

    function _unlock(uint256 _seqId, bool _force, uint32 _l2Gas) internal {
        Sequencer storage seq = sequencers[_seqId];
        if (seq.status != Status.Active) {
            revert SeqNotActive();
        }

        uint256 actived = --seqStatuses[Status.Active];
        uint256 inactived = ++seqStatuses[Status.Inactive];

        if (!_force) {
            if (seq.owner != msg.sender) {
                revert NotSeqOwner();
            }

            // BFT check, actived sequencer count must be high than 2/3 of total
            if (inactived * 3 > actived + inactived) {
                revert("BFT restriction");
            }
        }

        address recipient = seq.rewardRecipient;
        if (recipient == address(0)) {
            revert NoRewardRecipient();
        }

        seq.status = Status.Inactive;
        seq.deactivationBatch = curBatchState.id;
        seq.deactivationTime = block.timestamp;
        seq.unlockClaimTime = block.timestamp + WITHDRAWAL_DELAY;

        uint256 nonce = seq.nonce + 1;
        seq.nonce = nonce;
        uint256 unclaimed = seq.reward;
        seq.reward = 0;

        escorow.initializeUnlock{value: msg.value}(
            _seqId,
            unclaimed,
            _l2Gas,
            seq
        );
    }
}
