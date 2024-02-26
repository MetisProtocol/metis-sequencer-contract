// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import {LockingBadge} from "./LockingBadge.sol";

import {ILockingEscrow} from "./interfaces/ILockingEscrow.sol";
import {ILockingManager} from "./interfaces/ILockingManager.sol";

contract LockingManager is PausableUpgradeable, LockingBadge, ILockingManager {
    error NotMpc();

    struct BatchState {
        uint256 id; // current batch id
        uint256 number; // current batch block number
        uint256 startEpoch; // start epoch number for current batch
        uint256 endEpoch; // end epoch number for current batch
    }

    ILockingEscrow public escorow;

    // delay time for unlock
    uint256 public WITHDRAWAL_DELAY;

    // reward per L2 block
    uint256 public BLOCK_REWARD;

    // the mpc address
    address public mpcAddress;

    // current batch state
    BatchState public batchState;

    function initialize(address _escorow) external initializer {
        WITHDRAWAL_DELAY = 21 days;
        BLOCK_REWARD = 761000 gwei;

        // init batch state
        batchState = BatchState({
            id: 1,
            number: block.number,
            startEpoch: 0,
            endEpoch: 0
        });

        escorow = ILockingEscrow(_escorow);

        __Pausable_init();
        __LockingBadge_init();
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
     */
    function setPause() external onlyOwner {
        _pause();
    }

    /**
     * @dev setUnpause
     */
    function setUnpause() external onlyOwner {
        _unpause();
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
     * @dev lockFor lock Metis and participate in the sequencer node
     * @param _signer Sequencer signer address
     * @param _amount Amount of L1 metis token to lock for.
     * @param _signerPubkey Sequencer signer pubkey, it should be uncompressed
     */
    function lockFor(
        address _signer,
        uint256 _amount,
        bytes calldata _signerPubkey
    ) external whenNotPaused whitelistRequired {
        uint256 seqId = _mintFor(msg.sender, _signer);
        uint256 batchId = batchState.id;

        sequencers[seqId] = Sequencer({
            amount: _amount,
            reward: 0,
            activationBatch: 0,
            deactivationBatch: 0,
            updatingBatch: batchId,
            deactivationTime: 0,
            unlockClaimTime: 0,
            nonce: 1,
            owner: msg.sender,
            signer: _signer,
            pubkey: _signerPubkey,
            rewardRecipient: address(0), // the recepient should be update afterward
            status: Status.Active
        });

        escorow.newSequencer(seqId, _signer, batchId, _amount, _signerPubkey);
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
     * @dev unlock your Metis and exit the sequencer node
     *      the reward will be arrived by L1Bridge first
     *      and you need to wait the exit period and call
     *
     *
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
     * @dev unlockClaim claim your locked tokens after the waiting period is passed
     *
     * @param _seqId sequencer id
     * @param _l2Gas bridge reward to L2 gasLimit
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

        _burn(_seqId);
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
        if (msg.sender != mpcAddress) {
            revert NotMpc();
        }
        require(
            _seqs.length == _blocks.length && _seqs.length > 0,
            "mismatch length"
        );

        BatchState storage bs = batchState;
        uint256 nextBatch = bs.id + 1;
        require(nextBatch == _batchId, "invalid batch id");
        bs.id = nextBatch;

        require(bs.endEpoch + 1 == _startEpoch, "invalid startEpoch");
        require(_startEpoch < _endEpoch, "invalid endEpoch");

        for (uint256 i = 0; i < _seqs.length; i++) {
            uint256 reward = _blocks[i] * BLOCK_REWARD;
            uint256 seqId = tokenOfOwnerByIndex(_seqs[i], 0);
            Sequencer storage seq = sequencers[seqId];
            seq.reward += reward;
            totalReward += reward;
        }

        escorow.distributeReward(_batchId, totalReward);
    }

    function _unlock(uint256 _seqId, bool _force, uint32 _l2Gas) internal {
        Sequencer storage seq = sequencers[_seqId];

        if (!_force) {
            if (seq.owner != msg.sender) {
                revert NotSeqOwner();
            }
            // todo: 1/3 check
        }

        address recipient = seq.rewardRecipient;
        if (recipient == address(0)) {
            revert NoRewardRecipient();
        }

        if (seq.status != Status.Active) {
            revert SeqNotActive();
        }

        seq.status = Status.Inactive;
        seq.deactivationBatch = batchState.id;
        seq.deactivationTime = block.timestamp;
        seq.unlockClaimTime = block.timestamp + WITHDRAWAL_DELAY;
        seq.reward = 0;

        uint256 nonce = seq.nonce + 1;
        seq.nonce = nonce;

        escorow.initializeUnlock{value: msg.value}(_seqId, _l2Gas, seq);
    }
}
