// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ILockingPool} from "./interfaces/ILockingPool.sol";
import {LockingInfo} from "./LockingInfo.sol";
import {LockingNFT} from "./LockingNFT.sol";
import {IL1ERC20Bridge} from "./interfaces/IL1ERC20Bridge.sol";

contract LockingPool is ILockingPool, OwnableUpgradeable, PausableUpgradeable {
    using SafeERC20 for IERC20;

    enum Status {
        Inactive,
        Active,
        Unlocked
    } // Unlocked means sequencer exist

    struct MpcHistoryItem {
        uint256 startBlock;
        address newMpcAddress;
    }

    struct State {
        uint256 amount;
        uint256 lockerCount;
    }

    struct StateChange {
        int256 amount;
        int256 lockerCount;
    }

    struct Sequencer {
        uint256 amount; // sequencer current lock amount
        uint256 reward; // sequencer current reward
        uint256 activationBatch; // sequencer activation batch id
        uint256 deactivationBatch; // sequencer deactivation batch id
        uint256 deactivationTime; // sequencer deactivation timestamp
        uint256 unlockClaimTime; // sequencer unlock lock amount timestamp, has a withdraw delay time
        address signer; // sequencer signer address
        address rewardRecipient; // seqeuncer rewarder recipient address
        Status status; // sequencer status
    }

    uint256 internal constant INCORRECT_SEQUENCER_ID = 2 ** 256 - 1;

    address public bridge; // L1 metis bridge address
    address public l1Token; // L1 metis token address
    address public l2Token; // L2 metis token address
    LockingInfo public logger; // logger lockingPool event
    LockingNFT public NFTContract; // NFT for locker
    uint256 public WITHDRAWAL_DELAY; // delay time for unlock
    uint256 public currentBatch; // current batch id
    uint256 public totalLocked; // total locked amount of all sequencers
    uint256 public NFTCounter; // current nft holder count
    uint256 public totalRewardsLiquidated; // total rewards had been liquidated
    address[] public signers; // all signers
    uint256 public currentUnlockedInit; // sequencer unlock queue count, need have a limit
    uint256 public lastRewardEpochId; // the last epochId for update reward
    uint256 public lastRewardTime; // the last reward time for update reward

    // genesis variables
    uint256 public perSecondReward; // reward per second
    uint256 public minLock; // min lock Metis token
    uint256 public maxLock; // max lock Metis token
    uint256 public signerUpdateLimit; // sequencer signer need have a update limit,how many batches are not allowed to update the signer
    address public mpcAddress; // current mpc address for batch submit reward
    uint256 public sequencerThreshold; // maximum sequencer limit

    mapping(uint256 => Sequencer) public sequencers;
    mapping(address => uint256) public signerToSequencer;
    mapping(uint256 => bool) public batchSubmitHistory; // batch submit

    // current Batch lock power and lockers count
    State public sequencerState;
    mapping(uint256 => StateChange) public sequencerStateChanges;

    // sequencerId to last signer update Batch
    mapping(uint256 => uint256) public latestSignerUpdateBatch;

    // white address list who can lock token
    mapping(address => bool) public whiteListAddresses;
    // A whitelist address can only be bound to one sequencer
    mapping(address => address) public whiteListBoundSequencer;

    // mpc history
    MpcHistoryItem[] public mpcHistory; // recent mpc

    uint256 public l2ChainId; // the l2 chainId

    /**
     * @dev Emitted when nft contract update in 'UpdateLockingInfo'
     * @param _newLockingInfo new contract address.
     */
    event UpdateLockingInfo(address _newLockingInfo);
    /**
     * @dev Emitted when nft contract update in 'UpdateNFTContract'
     * @param _newNftContract new contract address.
     */
    event UpdateNFTContract(address _newNftContract);

    /**
     * @dev Emitted when current batch update in 'SetCurrentBatch'
     * @param _newCurrentBatch new batch id.
     */
    event SetCurrentBatch(uint256 _newCurrentBatch);

    /**
     * @dev Emitted when signer update limit update in 'UpdateSignerUpdateLimit'
     * @param _newLimit new limit.
     */
    event UpdateSignerUpdateLimit(uint256 _newLimit);

    /**
     * @dev Emitted when min lock amount update in 'UpdateMinAmounts'
     * @param _newMinLock new min lock.
     */
    event UpdateMinAmounts(uint256 _newMinLock);

    /**
     * @dev Emitted when min lock amount update in 'UpdateMaxAmounts'
     * @param _newMaxLock new max lock.
     */
    event UpdateMaxAmounts(uint256 _newMaxLock);

    /**
     * @dev Emitted when mpc address update in 'UpdateMpc'
     * @param _newMpc new min lock.
     */
    event UpdateMpc(address _newMpc);

    /**
     * @dev Emitted when white address update in 'setWhiteListAddress'
     * @param user the address who can lock token
     * @param verified white address state
     */
    event WhiteListAdded(address user, bool verified);

    /**
     * @dev Emitted when reward recipient address update in 'setSequencerRewardRecipient'
     * @param sequencerId the sequencerId
     * @param recipient the address receive reward token
     */
    event SequencerRewardRecipientChanged(
        uint256 sequencerId,
        address recipient
    );

    function initialize(
        address _bridge,
        address _l1Token,
        address _l2Token,
        address _NFTContract,
        address _mpc,
        uint256 _l2ChainId
    ) external initializer {
        require(_bridge != address(0), "invalid _bridge");
        require(_l1Token != address(0), "invalid _l1Token");
        require(_l2Token != address(0), "invalid _l2Token");
        require(_NFTContract != address(0), "invalid _NFTContract");
        require(_mpc != address(0), "_mpc is zero address");

        bridge = _bridge;
        l1Token = _l1Token;
        l2Token = _l2Token;
        NFTContract = LockingNFT(_NFTContract);

        require(!isContract(_mpc), "_mpc is a contract");
        mpcAddress = _mpc;

        mpcHistory.push(
            MpcHistoryItem({startBlock: block.number, newMpcAddress: _mpc})
        );

        WITHDRAWAL_DELAY = 21 days; // sequencer exit withdraw delay time
        currentBatch = 1; // default start from batch 1
        perSecondReward = 1 * (10 ** 8); // per second reward
        minLock = 20000 * (10 ** 18); // min lock amount
        maxLock = 100000 * (10 ** 18); // max lock amount
        signerUpdateLimit = 10; // how many batches are not allowed to update the signer
        sequencerThreshold = 10; // allow max sequencers
        NFTCounter = 1; // sequencer id

        l2ChainId = _l2ChainId; // the l2 chainId

        __Ownable_init();
        __Pausable_init();
    }

    /**
        Admin Methods
     */

    /**
     * @dev forceUnlock Allow owner to force a sequencer node to exit
     * @param sequencerId unique integer to identify a sequencer.
     * @param l2Gas bridge reward to L2 gasLimit
     */
    function forceUnlock(uint256 sequencerId, uint32 l2Gas) external onlyOwner {
        Status status = sequencers[sequencerId].status;
        require(
            sequencers[sequencerId].activationBatch > 0 &&
                sequencers[sequencerId].deactivationBatch == 0 &&
                status == Status.Active,
            "invalid sequencer status"
        );
        _unlock(sequencerId, currentBatch, true, l2Gas);
    }

    /**
     * @dev updateNFTContract Allow owner update the NFT contract address
     * @param _nftContract new NFT contract address
     */
    function updateNFTContract(address _nftContract) external onlyOwner {
        require(_nftContract != address(0), "invalid _nftContract");
        NFTContract = LockingNFT(_nftContract);
        emit UpdateNFTContract(_nftContract);
    }

    /**
     * @dev updateLockingInfo Allow owner update the locking info contract address
     * @param _lockingInfo new locking info contract address
     */
    function updateLockingInfo(address _lockingInfo) external onlyOwner {
        require(_lockingInfo != address(0), "invalid _lockingInfo");
        logger = LockingInfo(_lockingInfo);
        emit UpdateLockingInfo(_lockingInfo);
    }

    /**
     * @dev updateSequencerThreshold  Allow owner to set max sequencer threshold
     * @param newThreshold the new threshold
     */
    function updateSequencerThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold != 0, "invalid newThreshold");
        sequencerThreshold = newThreshold;
        logger.logThresholdChange(newThreshold, sequencerThreshold);
    }

    /**
     * @dev updatePerSecondReward  Allow owner to set per block reward
     * @param newReward the new reward
     */
    function updatePerSecondReward(uint256 newReward) external onlyOwner {
        require(newReward != 0, "invalid newReward");
        perSecondReward = newReward;
        logger.logRewardUpdate(newReward, perSecondReward);
    }

    /**
     *  @dev updateWithdrawDelayTimeValue Allow owner to set withdraw delay time.
     *  @param newWithdrawDelayTime new withdraw delay time
     */
    function updateWithdrawDelayTimeValue(
        uint256 newWithdrawDelayTime
    ) external onlyOwner {
        require(newWithdrawDelayTime > 0, "invalid newWithdrawDelayTime");
        WITHDRAWAL_DELAY = newWithdrawDelayTime;
        logger.logWithrawDelayTimeChange(
            newWithdrawDelayTime,
            WITHDRAWAL_DELAY
        );
    }

    /**
     * @dev updateSignerUpdateLimit Allow owner to set signer update max limit
     * @param _limit new limit
     */
    function updateSignerUpdateLimit(uint256 _limit) external onlyOwner {
        require(_limit > 0, "invalid _limit");
        signerUpdateLimit = _limit;
        emit UpdateSignerUpdateLimit(_limit);
    }

    /**
     * @dev updateMinAmounts Allow owner to update min lock amount
     * @param _minLock new min lock amount
     */
    function updateMinAmounts(uint256 _minLock) external onlyOwner {
        require(_minLock > 0, "invalid _minLock");
        minLock = _minLock;
        emit UpdateMinAmounts(_minLock);
    }

    /**
     * @dev updateMaxAmounts Allow owner to update max lock amount
     * @param _maxLock new max lock amount
     */
    function updateMaxAmounts(uint256 _maxLock) external onlyOwner {
        require(_maxLock > 0, "invalid _maxLock");
        maxLock = _maxLock;
        emit UpdateMaxAmounts(_maxLock);
    }

    /**
     * @dev updateMpc Allow owner to update new mpc address
     * @param _newMpc new mpc
     */
    function updateMpc(address _newMpc) external onlyOwner {
        require(!isContract(_newMpc), "_newMpc is a contract");
        require(_newMpc != address(0), "_newMpc is zero address");
        mpcAddress = _newMpc;
        mpcHistory.push(
            MpcHistoryItem({startBlock: block.number, newMpcAddress: _newMpc})
        );

        emit UpdateMpc(_newMpc);
    }

    /**
     * @dev setWhiteListAddress Allow owner to update white address list
     * @param user the address who can lock token
     * @param verified white address state
     */
    function setWhiteListAddress(
        address user,
        bool verified
    ) external onlyOwner {
        require(whiteListAddresses[user] != verified, "state not change");
        whiteListAddresses[user] = verified;

        emit WhiteListAdded(user, verified);
    }

    /**
     * @dev setPause can set the contract not suspended status
     */
    function setPause() external onlyOwner {
        _pause();
    }

    /**
     * @dev setUnpause can cancel the suspended state
     */
    function setUnpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev lockFor is used to lock Metis and participate in the sequencer block node application
     * @param user sequencer signer address
     * @param amount Amount of L1 metis token to lock for.
     * @param signerPubkey sequencer signer pubkey
     */
    function lockFor(
        address user,
        uint256 amount,
        bytes memory signerPubkey
    ) external override whenNotPaused {
        require(
            whiteListAddresses[msg.sender],
            "msg sender should be in the white list"
        );
        require(
            currentSequencerSetSize() < sequencerThreshold,
            "no more slots"
        );
        require(amount >= minLock, "amount less than minLock");
        require(amount <= maxLock, "amount large than maxLock");
        require(
            whiteListBoundSequencer[msg.sender] == address(0),
            "had bound sequencer"
        );

        _lockFor(user, amount, signerPubkey);
        whiteListBoundSequencer[msg.sender] = user;
        _transferTokenFrom(msg.sender, address(this), amount);
    }

    /**
     * @dev unlock is used to unlock Metis and exit the sequencer node
     *
     * @param sequencerId sequencer id
     * @param l2Gas bridge reward to L2 gasLimit
     */
    function unlock(
        uint256 sequencerId,
        uint32 l2Gas
    ) external payable override {
        require(
            whiteListAddresses[msg.sender],
            "msg sender should be in the white list"
        );
        require(
            whiteListBoundSequencer[msg.sender] ==
                sequencers[sequencerId].signer,
            "whiteAddress and boundSequencer mismatch"
        );
        require(
            sequencers[sequencerId].rewardRecipient != address(0),
            "rewardRecipient not set"
        );

        Status status = sequencers[sequencerId].status;
        require(
            sequencers[sequencerId].activationBatch > 0 &&
                sequencers[sequencerId].deactivationBatch == 0 &&
                status == Status.Active,
            "invalid sequencer status"
        );

        uint256 exitBatch = currentBatch + 1; // notice period
        _unlock(sequencerId, exitBatch, false, l2Gas);
    }

    /**
     * @dev unlockClaim Because unlock has a waiting period, after the waiting period is over, you can claim locked tokens
     *
     * @param sequencerId sequencer id
     * @param l2Gas bridge reward to L2 gasLimit
     */
    function unlockClaim(
        uint256 sequencerId,
        uint32 l2Gas
    ) external payable override {
        require(
            whiteListAddresses[msg.sender],
            "msg sender should be in the white list"
        );
        require(
            whiteListBoundSequencer[msg.sender] ==
                sequencers[sequencerId].signer,
            "whiteAddress and boundSequencer mismatch"
        );
        require(
            sequencers[sequencerId].rewardRecipient != address(0),
            "rewardRecipient not set"
        );

        uint256 deactivationBatch = sequencers[sequencerId].deactivationBatch;
        uint256 unlockClaimTime = sequencers[sequencerId].unlockClaimTime;

        // can only claim after WITHDRAWAL_DELAY
        require(
            deactivationBatch > 0 &&
                unlockClaimTime <= block.timestamp &&
                sequencers[sequencerId].status != Status.Unlocked,
            "claim not allowed"
        );

        uint256 amount = sequencers[sequencerId].amount;
        uint256 newTotalLocked = totalLocked - amount;
        totalLocked = newTotalLocked;

        // Check for unclaimed rewards
        _liquidateRewards(
            sequencerId,
            sequencers[sequencerId].rewardRecipient,
            l2Gas
        );

        sequencers[sequencerId].amount = 0;
        sequencers[sequencerId].signer = address(0);

        signerToSequencer[
            sequencers[sequencerId].signer
        ] = INCORRECT_SEQUENCER_ID;
        sequencers[sequencerId].status = Status.Unlocked;

        // Reduce the number of unlockInit queue
        currentUnlockedInit--;

        // withdraw locked token
        _transferToken(msg.sender, amount);

        logger.logUnlocked(msg.sender, sequencerId, amount, newTotalLocked);
        NFTContract.burn(sequencerId);
    }

    /**
     * @dev relock Allow sequencer to increase the amount of locked positions
     * @param sequencerId unique integer to identify a sequencer.
     * @param amount Amount of L1 metis token to relock for.
     * @param lockRewards Whether to lock the current rewards
     */
    function relock(
        uint256 sequencerId,
        uint256 amount,
        bool lockRewards
    ) external override whenNotPaused {
        require(
            sequencers[sequencerId].amount > 0,
            "invalid sequencer locked amount"
        );
        require(sequencers[sequencerId].deactivationBatch == 0, "no relocking");
        require(
            whiteListAddresses[msg.sender],
            "msg sender should be in the white list"
        );
        require(
            whiteListBoundSequencer[msg.sender] ==
                sequencers[sequencerId].signer,
            "whiteAddress and boundSequencer mismatch"
        );

        uint256 relockAmount = amount;

        if (lockRewards) {
            amount = amount + sequencers[sequencerId].reward;
            sequencers[sequencerId].reward = 0;
        }
        require(amount > 0, "invalid relock amount");

        uint256 newTotalLocked = totalLocked + amount;
        totalLocked = newTotalLocked;
        sequencers[sequencerId].amount =
            sequencers[sequencerId].amount +
            amount;
        require(
            sequencers[sequencerId].amount <= maxLock,
            "amount large than maxLock"
        );

        updateTimeline(int256(amount), 0, 0);
        _transferTokenFrom(msg.sender, address(this), relockAmount);

        logger.logLockUpdate(sequencerId, sequencers[sequencerId].amount);
        logger.logRelockd(
            sequencerId,
            sequencers[sequencerId].amount,
            newTotalLocked
        );
    }

    /**
     * @dev withdrawRewards withdraw current rewards
     *
     * @param sequencerId unique integer to identify a sequencer.
     * @param l2Gas bridge reward to L2 gasLimit
     */
    function withdrawRewards(
        uint256 sequencerId,
        uint32 l2Gas
    ) external payable override {
        require(
            whiteListAddresses[msg.sender],
            "msg sender should be in the white list"
        );
        require(
            whiteListBoundSequencer[msg.sender] ==
                sequencers[sequencerId].signer,
            "whiteAddress and boundSequencer mismatch"
        );

        Sequencer storage sequencerInfo = sequencers[sequencerId];
        _liquidateRewards(sequencerId, sequencerInfo.rewardRecipient, l2Gas);
    }

    /**
     * @dev updateSigner Allow sqeuencer to update new signers to replace old signer addresses，and NFT holder will be transfer driectly
     * @param sequencerId unique integer to identify a sequencer.
     * @param signerPubkey the new signer pubkey address
     */
    function updateSigner(
        uint256 sequencerId,
        bytes memory signerPubkey
    ) external {
        require(
            whiteListAddresses[msg.sender],
            "msg sender should be in the white list"
        );
        require(
            whiteListBoundSequencer[msg.sender] ==
                sequencers[sequencerId].signer,
            "whiteAddress and boundSequencer mismatch"
        );
        require(
            sequencers[sequencerId].deactivationBatch == 0,
            "exited sequencer"
        );

        address signer = _getAndAssertSigner(signerPubkey);
        uint256 _currentBatch = currentBatch;
        require(
            _currentBatch >=
                latestSignerUpdateBatch[sequencerId] + signerUpdateLimit,
            "not allowed"
        );

        address currentSigner = sequencers[sequencerId].signer;
        // update signer event
        logger.logSignerChange(
            sequencerId,
            currentSigner,
            signer,
            signerPubkey
        );

        // swap signer in the list
        _removeSigner(currentSigner);
        _insertSigner(signer);

        signerToSequencer[currentSigner] = INCORRECT_SEQUENCER_ID;
        signerToSequencer[signer] = sequencerId;
        sequencers[sequencerId].signer = signer;
        whiteListBoundSequencer[msg.sender] = signer;

        // reset update time to current time
        latestSignerUpdateBatch[sequencerId] = _currentBatch;

        // transfer NFT driectly
        NFTContract.transferFrom(msg.sender, signer, sequencerId);
    }

    /**
     * @dev batchSubmitRewards Allow to submit L2 sequencer block information, and attach Metis reward tokens for reward distribution
     * @param batchId The batchId that submitted the reward is that
     * @param payeer Who Pays the Reward Tokens
     * @param startEpoch The startEpoch that submitted the reward is that
     * @param endEpoch The endEpoch that submitted the reward is that
     * @param _sequencers Those sequencers can receive rewards
     * @param finishedBlocks How many blocks each sequencer finished.
     * @param signature Confirmed by mpc and signed for reward distribution
     */
    function batchSubmitRewards(
        uint256 batchId,
        address payeer,
        uint256 startEpoch,
        uint256 endEpoch,
        address[] memory _sequencers,
        uint256[] memory finishedBlocks,
        bytes memory signature
    ) external payable returns (uint256) {
        uint256 nextBatch = currentBatch + 1;
        require(nextBatch == batchId, "invalid batch id");
        require(_sequencers.length == finishedBlocks.length, "mismatch length");
        require(lastRewardEpochId < startEpoch, "invalid startEpoch");
        require(startEpoch < endEpoch, "invalid endEpoch");

        lastRewardEpochId = endEpoch;
        // check mpc signature
        bytes32 operationHash = keccak256(
            abi.encodePacked(
                block.chainid,
                batchId,
                startEpoch,
                endEpoch,
                _sequencers,
                finishedBlocks,
                address(this)
            )
        );
        operationHash = ECDSA.toEthSignedMessageHash(operationHash);
        address signer = ECDSA.recover(operationHash, signature);
        require(signer == mpcAddress, "invalid mpc signature");

        // calc total reward
        uint256 totalReward = perSecondReward *
            (block.timestamp - lastRewardTime);
        lastRewardTime = block.timestamp;

        // calc total finished blocks
        uint256 totalFinishedBlocks;
        for (uint256 i = 0; i < finishedBlocks.length; ) {
            unchecked {
                totalFinishedBlocks += finishedBlocks[i];
                ++i;
            }
        }

        // distribute reward
        for (uint256 i = 0; i < _sequencers.length; ) {
            require(
                signerToSequencer[_sequencers[i]] > 0,
                "sequencer not exist"
            );
            require(
                isSequencer(signerToSequencer[_sequencers[i]]),
                "invalid sequencer"
            );

            uint256 reward = _calculateReward(
                totalReward,
                totalFinishedBlocks,
                finishedBlocks[i]
            );
            _increaseReward(_sequencers[i], reward);

            unchecked {
                ++i;
            }
        }

        _finalizeCommit();
        logger.logBatchSubmitReward(batchId);

        // reward income
        IERC20(l1Token).safeTransferFrom(payeer, address(this), totalReward);
        return totalReward;
    }

    /**
     * @dev setSequencerRewardRecipient Allow sequencer owner to set a reward recipient
     * @param sequencerId The sequencerId
     * @param recipient Who will receive the reward token
     */
    function setSequencerRewardRecipient(
        uint256 sequencerId,
        address recipient
    ) external {
        require(
            whiteListAddresses[msg.sender],
            "msg sender should be in the white list"
        );
        require(
            whiteListBoundSequencer[msg.sender] ==
                sequencers[sequencerId].signer,
            "whiteAddress and boundSequencer mismatch"
        );
        require(recipient != address(0), "invalid recipient");

        Sequencer storage sequencerInfo = sequencers[sequencerId];
        sequencerInfo.rewardRecipient = recipient;

        emit SequencerRewardRecipientChanged(sequencerId, recipient);
    }

    // query owenr by NFT token id
    function ownerOf(uint256 tokenId) external view override returns (address) {
        return NFTContract.ownerOf(tokenId);
    }

    // query current lock amount by sequencer id
    function sequencerLock(
        uint256 sequencerId
    ) external view override returns (uint256) {
        return sequencers[sequencerId].amount;
    }

    // get sequencer id by address
    function getSequencerId(
        address user
    ) external view override returns (uint256) {
        return NFTContract.tokenOfOwnerByIndex(user, 0);
    }

    //  get sequencer reward by sequencer id
    function sequencerReward(
        uint256 sequencerId
    ) external view override returns (uint256) {
        return sequencers[sequencerId].reward;
    }

    // get total lock amount for all sequencers
    function currentSequencerSetTotalLock()
        external
        view
        override
        returns (uint256)
    {
        return sequencerState.amount;
    }

    /**
     * @dev fetchMpcAddress query mpc address by L1 block height, used by batch-submitter
     * @param blockHeight the L1 block height
     */
    function fetchMpcAddress(
        uint256 blockHeight
    ) external view override returns (address) {
        address result;
        for (uint256 i = mpcHistory.length - 1; i >= 0; i--) {
            if (blockHeight >= mpcHistory[i].startBlock) {
                result = mpcHistory[i].newMpcAddress;
                break;
            }
        }

        return result;
    }

    /*
        public functions
    */

    // query whether an id is a sequencer
    function isSequencer(uint256 sequencerId) public view returns (bool) {
        return
            _isSequencer(
                sequencers[sequencerId].status,
                sequencers[sequencerId].amount,
                sequencers[sequencerId].deactivationBatch,
                currentBatch
            );
    }

    // get all sequencer count
    function currentSequencerSetSize() public view override returns (uint256) {
        return sequencerState.lockerCount;
    }

    /*
        internal functions
    */

    /**
     * @dev updateTimeline Used to update sequencerState information
     * @param amount The number of locked positions changed
     * @param lockerCount The number of lock sequencer changed
     * @param targetBatch When does the change take effect
     */
    function updateTimeline(
        int256 amount,
        int256 lockerCount,
        uint256 targetBatch
    ) internal {
        if (targetBatch == 0) {
            // update total lock and sequencer count
            if (amount > 0) {
                sequencerState.amount = sequencerState.amount + uint256(amount);
            } else if (amount < 0) {
                sequencerState.amount =
                    sequencerState.amount -
                    uint256(amount * -1);
            }

            if (lockerCount > 0) {
                sequencerState.lockerCount =
                    sequencerState.lockerCount +
                    uint256(lockerCount);
            } else if (lockerCount < 0) {
                sequencerState.lockerCount =
                    sequencerState.lockerCount -
                    uint256(lockerCount * -1);
            }
        } else {
            sequencerStateChanges[targetBatch].amount += amount;
            sequencerStateChanges[targetBatch].lockerCount += lockerCount;
        }
    }

    function _lockFor(
        address user,
        uint256 amount,
        bytes memory signerPubkey
    ) internal returns (uint256) {
        address signer = _getAndAssertSigner(signerPubkey);
        require(user == signer, "user and signerPubkey mismatch");

        uint256 _currentBatch = currentBatch;
        uint256 sequencerId = NFTCounter;

        uint256 newTotalLocked = totalLocked + amount;
        totalLocked = newTotalLocked;

        sequencers[sequencerId] = Sequencer({
            reward: 0,
            amount: amount,
            activationBatch: _currentBatch,
            deactivationBatch: 0,
            deactivationTime: 0,
            unlockClaimTime: 0,
            signer: signer,
            rewardRecipient: address(0),
            status: Status.Active
        });

        latestSignerUpdateBatch[sequencerId] = _currentBatch;

        signerToSequencer[signer] = sequencerId;
        updateTimeline(int256(amount), 1, 0);
        NFTCounter = sequencerId + 1;
        _insertSigner(signer);

        logger.logLocked(
            signer,
            signerPubkey,
            sequencerId,
            _currentBatch,
            amount,
            newTotalLocked
        );
        NFTContract.mint(user, sequencerId);
        return sequencerId;
    }

    // The function restricts the sequencer's exit if the number of total locked sequencers divided by 3 is less than the number of
    // sequencers that have already exited. This would effectively freeze the sequencer's unlock function until a sufficient number of
    // new sequencers join the system.
    function _unlock(
        uint256 sequencerId,
        uint256 exitBatch,
        bool force,
        uint32 l2Gas
    ) internal {
        if (!force) {
            // Ensure that the number of exit sequencer is less than 1/3 of the total
            require(
                currentUnlockedInit + 1 <= sequencerState.lockerCount / 3,
                "unlock not allowed"
            );
        }

        uint256 amount = sequencers[sequencerId].amount;
        address sequencer = NFTContract.ownerOf(sequencerId);

        sequencers[sequencerId].status = Status.Inactive;
        sequencers[sequencerId].deactivationBatch = exitBatch;
        sequencers[sequencerId].deactivationTime = block.timestamp;
        sequencers[sequencerId].unlockClaimTime =
            block.timestamp +
            WITHDRAWAL_DELAY;

        uint256 targetBatch = exitBatch <= currentBatch ? 0 : exitBatch;
        updateTimeline(-(int256(amount)), -1, targetBatch);

        currentUnlockedInit++;

        _removeSigner(sequencers[sequencerId].signer);
        _liquidateRewards(
            sequencerId,
            sequencers[sequencerId].rewardRecipient,
            l2Gas
        );

        logger.logUnlockInit(
            sequencer,
            sequencerId,
            exitBatch,
            sequencers[sequencerId].deactivationTime,
            sequencers[sequencerId].unlockClaimTime,
            amount
        );
    }

    function _finalizeCommit() internal {
        uint256 nextBatch = currentBatch + 1;
        batchSubmitHistory[nextBatch] = true;

        StateChange memory changes = sequencerStateChanges[nextBatch];
        updateTimeline(changes.amount, changes.lockerCount, 0);

        delete sequencerStateChanges[currentBatch];

        currentBatch = nextBatch;
    }

    function _insertSigner(address newSigner) internal {
        signers.push(newSigner);

        uint256 lastIndex = signers.length - 1;
        uint256 i = lastIndex;
        for (; i > 0; --i) {
            address signer = signers[i - 1];
            if (signer < newSigner) {
                break;
            }
            signers[i] = signer;
        }

        if (i != lastIndex) {
            signers[i] = newSigner;
        }
    }

    function _removeSigner(address signerToDelete) internal {
        uint256 totalSigners = signers.length;
        for (uint256 i = 0; i < totalSigners; i++) {
            if (signers[i] == signerToDelete) {
                signers[i] = signers[totalSigners - 1];
                signers.pop();
                break;
            }
        }
    }

    function isContract(address _target) internal view returns (bool) {
        if (_target == address(0)) {
            return false;
        }
        return _target.code.length > 0;
    }

    function _calculateReward(
        uint256 totalRewards,
        uint256 totalBlocks,
        uint256 finishedBlocks
    ) internal pure returns (uint256) {
        // rewards are based on BlockInterval multiplied on `perSecondReward`
        return totalRewards * (finishedBlocks / totalBlocks);
    }

    /**
        Private Methods
     */

    function _increaseReward(address sequencer, uint256 reward) private {
        uint256 sequencerId = signerToSequencer[sequencer];
        // update reward
        sequencers[sequencerId].reward += reward;
    }

    function _liquidateRewards(
        uint256 sequencerId,
        address recipient,
        uint32 l2Gas
    ) private {
        require(recipient != address(0), "invalid reward recipient");
        uint256 reward = sequencers[sequencerId].reward;
        totalRewardsLiquidated = totalRewardsLiquidated + reward;
        sequencers[sequencerId].reward = 0;

        // withdraw reward to L2
        IERC20(l1Token).safeIncreaseAllowance(bridge, reward);
        IL1ERC20Bridge(bridge).depositERC20ToByChainId{value: msg.value}(
            l2ChainId,
            l1Token,
            l2Token,
            recipient,
            reward,
            l2Gas,
            ""
        );
        logger.logClaimRewards(
            sequencerId,
            recipient,
            reward,
            totalRewardsLiquidated
        );
    }

    function _transferToken(address destination, uint256 amount) private {
        IERC20(l1Token).safeTransfer(destination, amount);
    }

    function _transferTokenFrom(
        address from,
        address destination,
        uint256 amount
    ) private {
        IERC20(l1Token).safeTransferFrom(from, destination, amount);
    }

    function _getAndAssertSigner(
        bytes memory pub
    ) private view returns (address) {
        require(pub.length == 64, "not pub");
        address signer = address(uint160(uint256(keccak256(pub))));
        require(
            signer != address(0) && signerToSequencer[signer] == 0,
            "invalid signer"
        );
        return signer;
    }

    function _isSequencer(
        Status status,
        uint256 amount,
        uint256 deactivationBatch,
        uint256 _currentBatch
    ) private pure returns (bool) {
        return (amount > 0 &&
            (deactivationBatch == 0 ||
                deactivationBatch > _currentBatch ||
                status == Status.Active));
    }
}
