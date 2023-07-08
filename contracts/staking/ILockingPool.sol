// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LockingInfo} from "./LockingInfo.sol";
import {LockingNFT} from "./LockingNFT.sol";


abstract contract ILockingPool {
    enum Status {Inactive, Active, Unlocked}  // Unlocked means sequencer exist

    struct State {
        uint256 amount;
        uint256 lockerCount;
    }

    struct StateChange {
        int256 amount;
        int256 lockerCount;
    }

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

    uint256 constant MAX_COMMISION_RATE = 100;
    uint256 constant REWARD_PRECISION = 10**25;
    uint256 internal constant INCORRECT_SEQUENCER_ID = 2**256 - 1;
    uint256 internal constant INITIALIZED_AMOUNT = 1;

    IERC20 public token;
    address public registry;
    address public bridge;
    address public l1Token;
    address public l2Token;
    uint32 public l2Gas;
    LockingInfo public logger;
    LockingNFT public NFTContract;
    uint256 public WITHDRAWAL_DELAY; 
    uint256 public currentBatch;
    uint256 public totalLocked;
    uint256 public NFTCounter;
    uint256 public totalRewards;
    uint256 public totalRewardsLiquidated;
    uint256 public rewardPerLock;
    address[] public signers;
    uint256 public currentUnlockedInit;

    // genesis/governance variables
    uint256 public BLOCK_REWARD; // update via governance
    uint256 public minDeposit; // in ERC20 token
    uint256 public signerUpdateLimit;
    address public mpcAddress;
    uint256 public sequencerThreshold; // 100
 
    mapping(uint256 => Sequencer) public sequencers;
    mapping(address => uint256) public signerToSequencer;

    // current Batch lock power and lockers count
    State public sequencerState;
    mapping(uint256 => StateChange) public sequencerStateChanges;

    // sequencerId to last signer update Batch
    mapping(uint256 => uint256) public latestSignerUpdateBatch;

    // mpc history
    struct MpcHistoryItem {
        uint256 startBlock;
        address newMpcAddress;
    }
    MpcHistoryItem[] public mpcHistory; // recent mpc

    modifier onlySequencer(uint256 sequencerId) {
        _assertSequencer(sequencerId);
        _;
    }

    function _assertSequencer(uint256 sequencerId) private view {
        require(NFTContract.ownerOf(sequencerId) == msg.sender);
    }

    modifier onlyMpc() {
        _assertMpc();
        _;
    }

    function _assertMpc() private view {
        require(
            msg.sender == address(mpcAddress),
            "Only mpc address is authorized"
        );
    }

    function lockFor(
        address user,
        uint256 amount,
        bytes memory signerPubkey
    ) virtual public;

    function unlock(uint256 sequencerId, bool withdrawRewardToL2) virtual external;

    function totalLockedFor(address addr) virtual external view returns (uint256);

    function ownerOf(uint256 tokenId) virtual public view returns (address);

    function sequencerLock(uint256 sequencerId) virtual public view returns (uint256);

    function batch() virtual public view returns (uint256);

    function withdrawalDelay() virtual public view returns (uint256);
}
