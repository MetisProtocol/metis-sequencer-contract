// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// dummy interface to avoid cyclic dependency
abstract contract ILockingPoolLocal {
    enum Status {Inactive, Active, Unlockd}

    struct Sequencer {
        uint256 amount;
        uint256 reward;
        uint256 activationBatch;
        uint256 deactivationBatch;
        uint256 deactivationTime;
        uint256 unlockClaimTime;
        address signer;
        Status status;
        uint256 initialRewardPerLock;
    }

    mapping(uint256 => Sequencer) public sequencers;
 
    function currentSequencerSetTotalLock() virtual public view returns (uint256);

    // signer to Sequencer mapping
    function signerToSequencer(address sequencerAddress)
        virtual
        public
        view
        returns (uint256);

    function isSequencer(uint256 sequencerId) virtual public view returns (bool);
}

contract LockingInfo is Ownable {
    using SafeMath for uint256;
    mapping(uint256 => uint256) public sequencerNonce;
    address public lockingPool;

    /// @dev Emitted when sequencer locks in '_lockFor()' in LockingPool.
    /// @param signer sequencer address.
    /// @param sequencerId unique integer to identify a sequencer.
    /// @param nonce to synchronize the events in themis.
    /// @param activationBatch sequencer's first epoch as proposer.
    /// @param amount staking amount.
    /// @param total total staking amount.
    /// @param signerPubkey public key of the sequencer
    event Locked(
        address indexed signer,
        uint256 indexed sequencerId,
        uint256 nonce,
        uint256 indexed activationBatch,
        uint256 amount,
        uint256 total,
        bytes signerPubkey
    );

    /// @dev Emitted when sequencer unlocks in 'unlockClaim()'
    /// @param user address of the sequencer.
    /// @param sequencerId unique integer to identify a sequencer.
    /// @param amount staking amount.
    /// @param total total staking amount.
    event Unlocked(
        address indexed user,
        uint256 indexed sequencerId,
        uint256 amount,
        uint256 total
    );

    /// @dev Emitted when sequencer unlocks in '_unlock()'.
    /// @param user address of the sequencer.
    /// @param sequencerId unique integer to identify a sequencer.
    /// @param nonce to synchronize the events in themis.
    /// @param deactivationBatch last epoch for sequencer.
    /// @param amount staking amount.
    event UnlockInit(
        address indexed user,
        uint256 indexed sequencerId,
        uint256 nonce,
        uint256 deactivationBatch,
        uint256 deactivationTime,
        uint256 unlockClaimTime,
        uint256 indexed amount
    );

    /// @dev Emitted when the sequencer public key is updated in 'updateSigner()'.
    /// @param sequencerId unique integer to identify a sequencer.
    /// @param nonce to synchronize the events in themis.
    /// @param oldSigner old address of the sequencer.
    /// @param newSigner new address of the sequencer.
    /// @param signerPubkey public key of the sequencer.
    event SignerChange(
        uint256 indexed sequencerId,
        uint256 nonce,
        address indexed oldSigner,
        address indexed newSigner,
        bytes signerPubkey
    );
    event Relocked(uint256 indexed sequencerId, uint256 amount, uint256 total);
    event ThresholdChange(uint256 newThreshold, uint256 oldThreshold);
    event WithrawDelayTimeChange(uint256 newWithrawDelayTime, uint256 oldWithrawDelayTime);
    event ProposerBonusChange(
        uint256 newProposerBonus,
        uint256 oldProposerBonus
    );

    event RewardUpdate(uint256 newReward, uint256 oldReward);

    /// @dev Emitted when sequencer confirms the auction bid and at the time of restaking in confirmAuctionBid() and relock().
    /// @param sequencerId unique integer to identify a sequencer.
    /// @param nonce to synchronize the events in themis.
    /// @param newAmount the updated lock amount.
    event LockUpdate(
        uint256 indexed sequencerId,
        uint256 indexed nonce,
        uint256 indexed newAmount
    );
    event ClaimRewards(
        uint256 indexed sequencerId,
        uint256 indexed amount,
        uint256 indexed totalAmount
    );
   
    modifier onlyLockingPool() {
        require(lockingPool == msg.sender,
        "Invalid sender, not locking pool");
        _;
    }

    constructor(address _lockingPool) {
       lockingPool = _lockingPool;
    }


    function updateNonce(
        uint256[] calldata sequencerIds,
        uint256[] calldata nonces
    ) external onlyOwner {
        require(sequencerIds.length == nonces.length, "args length mismatch");

        for (uint256 i = 0; i < sequencerIds.length; ++i) {
            sequencerNonce[sequencerIds[i]] = nonces[i];
        }
    } 

    function logLocked(
        address signer,
        bytes memory signerPubkey,
        uint256 sequencerId,
        uint256 activationBatch,
        uint256 amount,
        uint256 total
    ) public onlyLockingPool {
        sequencerNonce[sequencerId] = sequencerNonce[sequencerId].add(1);
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

    function logUnlocked(
        address user,
        uint256 sequencerId,
        uint256 amount,
        uint256 total
    ) public onlyLockingPool {
        emit Unlocked(user, sequencerId, amount, total);
    }

    function logUnlockInit(
        address user,
        uint256 sequencerId,
        uint256 deactivationBatch,
        uint256 deactivationTime,
        uint256 unlockClaimTime,
        uint256 amount
    ) public onlyLockingPool {
        sequencerNonce[sequencerId] = sequencerNonce[sequencerId].add(1);
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

    function logSignerChange(
        uint256 sequencerId,
        address oldSigner,
        address newSigner,
        bytes memory signerPubkey
    ) public onlyLockingPool {
        sequencerNonce[sequencerId] = sequencerNonce[sequencerId].add(1);
        emit SignerChange(
            sequencerId,
            sequencerNonce[sequencerId],
            oldSigner,
            newSigner,
            signerPubkey
        );
    }

    function logRelockd(uint256 sequencerId, uint256 amount, uint256 total)
        public
        onlyLockingPool
    {
        emit Relocked(sequencerId, amount, total);
    }

    function logThresholdChange(uint256 newThreshold, uint256 oldThreshold)
        public
        onlyLockingPool
    {
        emit ThresholdChange(newThreshold, oldThreshold);
    }

    function logWithrawDelayTimeChange(uint256 newWithrawDelayTime, uint256 oldWithrawDelayTime)
        public
        onlyLockingPool
    {
        emit WithrawDelayTimeChange(newWithrawDelayTime, oldWithrawDelayTime);
    }

    function logRewardUpdate(uint256 newReward, uint256 oldReward)
        public
        onlyLockingPool
    {
        emit RewardUpdate(newReward, oldReward);
    }

    function logLockUpdate(uint256 sequencerId)
        public
        onlyLockingPool()
    {
        sequencerNonce[sequencerId] = sequencerNonce[sequencerId].add(1);
        emit LockUpdate(
            sequencerId,
            sequencerNonce[sequencerId],
            totalSequencerLock(sequencerId)
        );
    }

    function logClaimRewards(
        uint256 sequencerId,
        uint256 amount,
        uint256 totalAmount
    ) public onlyLockingPool {
        emit ClaimRewards(sequencerId, amount, totalAmount);
    }


    function totalSequencerLock(uint256 sequencerId)
        public
        view
        returns (uint256 sequencerLock)
    {
        (sequencerLock, ,  , , , , , , ) = ILockingPoolLocal(lockingPool).sequencers(sequencerId);
        return sequencerLock;
    }

     function getLockrDetails(uint256 sequencerId)
        public
        view
        returns (
            uint256 amount,
            uint256 reward,
            uint256 activationBatch,
            uint256 deactivationBatch,
            address signer,
            uint256 _status
        )
    {
       
        ILockingPoolLocal.Status status;
        (amount,reward ,activationBatch,deactivationBatch , , ,signer ,status , ) = ILockingPoolLocal(lockingPool).sequencers(sequencerId);
        _status = uint256(status);
    }
}
