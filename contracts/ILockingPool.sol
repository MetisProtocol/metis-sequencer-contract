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
        uint256 amount;         // sequencer current lock amount 
        uint256 reward;         // sequencer current reward
        uint256 activationBatch;    // sequencer activation batch id
        uint256 deactivationBatch;  // sequencer deactivation batch id
        uint256 deactivationTime;   // sequencer deactivation timestamp
        uint256 unlockClaimTime;    // sequencer unlock lock amount timestamp, has a withdraw delay time
        address signer;             // sequencer signer address
        Status status;              // sequencer status
        uint256 initialRewardPerLock; // initialRewardPerLock
    }

    uint256 constant MAX_COMMISION_RATE = 100;
    uint256 constant REWARD_PRECISION = 10**25;
    uint256 internal constant INCORRECT_SEQUENCER_ID = 2**256 - 1;
    uint256 internal constant INITIALIZED_AMOUNT = 1;

    IERC20 public token;       // lock token address
    address public bridge;     // L1 metis bridge address
    address public l1Token;    // L1 metis token address
    address public l2Token;    // L2 metis token address
    uint32 public l2Gas;        // bridge metis to l2 gaslimit
    LockingInfo public logger;  // logger lockingPool event
    LockingNFT public NFTContract;  // NFT for locker
    uint256 public WITHDRAWAL_DELAY;    // delay time for unlock
    uint256 public currentBatch;    // current batch id
    uint256 public totalLocked;     // total locked amount of all sequencers
    uint256 public NFTCounter;      // current nft holder count
    uint256 public totalRewardsLiquidated; // total rewards had been liquidated
    uint256 public rewardPerLock;   // current reward per block
    address[] public signers; // all signers
    uint256 public currentUnlockedInit; // sequencer unlock queue count, need have a limit

    // genesis/governance variables
    uint256 public BLOCK_REWARD; // update via governance
    uint256 public minLock; // min lock Metis token 
    uint256 public signerUpdateLimit; // sequencer signer need have a update limit
    address public mpcAddress; // current mpc address for batch submit reward 
    uint256 public sequencerThreshold; // maximum sequencer limit
 
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


     /**
     * @dev lockFor is used to lock Metis and participate in the sequencer block node application
     *
     * @param signer sequencer signer address
     * @param amount Amount of L1 metis token to lock for.
     * @param signerPubkey sequencer signer pubkey
     */    
    function lockFor(
        address signer,
        uint256 amount,
        bytes memory signerPubkey
    ) virtual public;


     /**
     * @dev relock is used to lock Metis again
     *
     * @param sequencerId sequencer id
     * @param amount Amount of L1 metis token to relock for.
     * @param lockRewards Whether to lock the current reward
     */   
    function relock(
        uint256 sequencerId,
        uint256 amount,
        bool lockRewards
    ) virtual public;


     /**
     * @dev withdrawRewards withdraw current reward
     *
     * @param sequencerId sequencer id
     * @param withdrawToL2 Whether the current reward is withdrawn to L2
     */   
    function withdrawRewards(
        uint256 sequencerId, 
        bool withdrawToL2
    ) virtual public;
    
    /**
     * @dev unlock is used to unlock Metis and exit the sequencer node
     *
     * @param sequencerId sequencer id
     * @param withdrawRewardToL2 Whether the current reward is withdrawn to L2
     */    
    function unlock(uint256 sequencerId, bool withdrawRewardToL2) virtual external;

    
     /**
     * @dev unlockClaim Because unlock has a waiting period, after the waiting period is over, you can claim locked tokens
     *
     * @param sequencerId sequencer id
     * @param withdrawToL2 Whether the current reward is withdrawn to L2
     */   
     function unlockClaim(uint256 sequencerId, bool withdrawToL2) virtual public ;


    /**
     * @dev ownerOf query owner of the NFT 
     *
     * @param tokenId NFT token id
     */    
    function ownerOf(uint256 tokenId) virtual public view returns (address);

     /**
     * @dev getSequencerId query sequencer id by signer address
     *
     * @param user sequencer signer address
     */   
    function getSequencerId(address user)  virtual public  view returns (uint256);

    /**
     * @dev sequencerReward query sequencer current reward
     *
     * @param sequencerId sequencerid
     */   
    function sequencerReward(uint256 sequencerId) virtual public view returns (uint256);

    /**
     * @dev sequencerLock return the total lock amount of sequencer
     *
     * @param sequencerId sequencer id
     */    
    function sequencerLock(uint256 sequencerId) virtual public view returns (uint256);

    /**
     * @dev withdrawalDelay return current withdrawal delay time
     */    
    function withdrawalDelay() virtual public view returns (uint256);

     /**
     * @dev currentSequencerSetSize  get all sequencer count
     */    
     function currentSequencerSetSize() virtual public view returns (uint256);

    /**
     * @dev currentSequencerSetTotalLock get total lock amount for all sequencers
     */  
    function currentSequencerSetTotalLock() virtual public view returns (uint256);

    /**
     * @dev isSequencer Query whether an id is a sequencer
     * @param sequencerId sequencer id
     */  
    function isSequencer(uint256 sequencerId) virtual public view returns (bool);

     /**
     * @dev getL2ChainId query current  l2 chain id
     */  
    function getL2ChainId() virtual public view returns(uint256);

    /**
     * @dev fetchMpcAddress query mpc address by L1 block height, used by batch-submitter
     * @param blockHeight L1 block height
     */  
    function fetchMpcAddress(uint256 blockHeight) virtual public view returns(address);
}
