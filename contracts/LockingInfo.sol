// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {IL1ERC20Bridge} from "./interfaces/IL1ERC20Bridge.sol";
import {ILockingInfo} from "./interfaces/ILockingInfo.sol";
import {ISequencerInfo} from "./interfaces/ISequencerInfo.sol";

contract LockingInfo is ILockingInfo, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    address public bridge; // L1 metis bridge address
    address public l1Token; // L1 metis token address
    address public l2Token; // L2 metis token address
    uint256 public l2ChainId; // L2 metis chainId

    uint256 public minLock; // min lock amount
    uint256 public maxLock; // max lock amount

    uint256 public totalLocked; // the total locked amount
    uint256 public totalRewardsLiquidated;

    // Locking pool address
    address public manager;

    // the reward payer
    address public rewardPayer;

    modifier OnlyManager() {
        require(msg.sender == manager, "Not manager");
        _;
    }

    function initialize(
        address _bridge,
        address _l1Token,
        address _l2Token,
        uint256 _l2ChainId
    ) external initializer {
        bridge = _bridge;
        l1Token = _l1Token;
        l2Token = _l2Token;
        l2ChainId = _l2ChainId;

        minLock = 20_000 ether;
        maxLock = 100_000 ether;

        __Ownable_init();
    }

    function initManager(address _manager) external onlyOwner {
        require(manager == address(0), "manager has been initialized");
        manager = _manager;
    }

    /**
     * @dev updateMinAmounts Allow owner to update min lock amount
     * @param _minLock new min lock amount
     */
    function setMinLock(uint256 _minLock) external onlyOwner {
        require(_minLock > 0, "_minLock=0");
        minLock = _minLock;
        emit SetMinLock(_minLock);
    }

    /**
     * @dev setMaxLock Allow owner to update max lock amount
     * @param _maxLock new max lock amount
     */
    function setMaxLock(uint256 _maxLock) external onlyOwner {
        require(_maxLock >= minLock, "maxLock<minLock");
        maxLock = _maxLock;
        emit SetMaxLock(_maxLock);
    }

    /**
     * @dev setRewardPayer update reward payer address by owner
     * @param _payer new reward payer
     */
    function setRewardPayer(address _payer) external onlyOwner {
        rewardPayer = _payer;
        emit SetRewardPayer(_payer);
    }

    /**
     * @dev newSequencer register a new sequencer, it can only be called from manager contract
     * @param _id the sequencer id
     * @param _owner the sequencer owenr
     * @param _signer the sequencer node address
     * @param _amount the amount to lock in
     * @param _batchId current batch id
     * @param _signerPubkey the sequencer public key
     */
    function newSequencer(
        uint256 _id,
        address _owner,
        address _signer,
        uint256 _amount,
        uint256 _batchId,
        bytes calldata _signerPubkey
    ) external override OnlyManager {
        require(_amount >= minLock && _amount <= maxLock, "invalid amount");

        // use local variable to save gas
        uint256 _tatalLocked = totalLocked + _amount;
        totalLocked = _tatalLocked;

        IERC20(l1Token).safeTransferFrom(_owner, address(this), _amount);
        emit Locked(
            _signer,
            _id,
            1, // nocne starts from 1 for a new sequencer
            _batchId,
            _amount,
            _tatalLocked,
            _signerPubkey
        );
    }

    /**
     * @dev increaseLocked lock tokens to the sequencer, it can only be called from manager contract
     * @param _seqId the sequencer id
     * @param _nonce the sequencer nonce
     * @param _owner the sequencer owner address
     * @param _locked the locked amount of the sequencer at last
     * @param _incoming amount from current transaction
     * @param _fromReward use reward to lock
     */
    function increaseLocked(
        uint256 _seqId,
        uint256 _nonce,
        address _owner,
        uint256 _locked,
        uint256 _incoming,
        uint256 _fromReward
    ) external override OnlyManager {
        require(_locked <= maxLock, "locked>maxLock");

        // get increased number and transfer it into escrow
        uint256 increased = _incoming + _fromReward;
        require(increased > 0, "No new locked added");
        IERC20(l1Token).safeTransferFrom(_owner, address(this), _incoming);

        // get current total locked and emit event
        uint256 _totalLocked = totalLocked + increased;
        totalLocked = _totalLocked;

        emit Relocked(_seqId, increased, totalLocked);
        emit LockUpdate(_seqId, _nonce, _locked);
    }

    /**
     * @dev withdrawLocking is to withdraw locking
     * @param _seqId the sequencer id
     * @param _owner the sequencer owner address
     * @param _nonce the sequencer nonce
     * @param _amount amount to withdraw
     * @param _locked the locked amount of the sequencer at last
     */
    function withdrawLocking(
        uint256 _seqId,
        address _owner,
        uint256 _nonce,
        uint256 _amount,
        uint256 _locked
    ) external override OnlyManager {
        require(_amount > 0 && _locked >= minLock, "invalid amount");
        // update current locked amount
        totalLocked -= _amount;

        IERC20(l1Token).safeTransfer(_owner, _amount);
        emit Withdraw(_seqId, _amount);
        emit LockUpdate(_seqId, _nonce, _locked);
    }

    /**
     * @dev initializeUnlock the first step to unlock
     *      current reward will be distributed
     * @param _seqId the sequencer id
     * @param _reward the reward to withdraw
     * @param _seq the current sequencer state
     * @param _l2gas the l2gas for L1bridge
     */
    function initializeUnlock(
        uint256 _seqId,
        uint256 _reward,
        uint32 _l2gas,
        ISequencerInfo.Sequencer calldata _seq
    ) external payable override OnlyManager {
        _liquidateReward(_seqId, _reward, _seq.rewardRecipient, _l2gas);
        emit UnlockInit(
            _seq.signer,
            _seqId,
            _seq.nonce,
            _seq.deactivationBatch,
            _seq.deactivationTime,
            _seq.unlockClaimTime,
            _reward
        );
    }

    /**
     * @dev finalizeUnlock the last step to unlock
     * @param _operator the sequencer id
     * @param _seqId the sequencer id
     * @param _amount locked amount
     * @param _reward reward amount
     * @param _recipient recipient
     * @param _l2gas the l2gas for L1bridge
     */
    function finalizeUnlock(
        address _operator,
        uint256 _seqId,
        uint256 _amount,
        uint256 _reward,
        address _recipient,
        uint32 _l2gas
    ) external payable OnlyManager {
        // update totalLocked value
        uint256 _tatalLocked = totalLocked - _amount;
        totalLocked = _tatalLocked;

        IERC20(l1Token).safeTransfer(_operator, _amount);
        if (_reward > 0) {
            _liquidateReward(_seqId, _reward, _recipient, _l2gas);
        }
        emit Unlocked(_operator, _seqId, _amount, _tatalLocked);
    }

    function liquidateReward(
        uint256 _seqId,
        uint256 _amount,
        address _recipient,
        uint32 _l2gas
    ) external payable override OnlyManager {
        _liquidateReward(_seqId, _amount, _recipient, _l2gas);
    }

    /**
     * @dev distributeReward reward distribution
     * @param _batchId The batchId that submitted the reward is that
     */
    function distributeReward(
        uint256 _batchId,
        uint256 _totalReward
    ) external OnlyManager {
        // reward income
        IERC20(l1Token).safeTransferFrom(
            rewardPayer,
            address(this),
            _totalReward
        );
        emit BatchSubmitReward(_batchId);
    }

    /**
     * @dev logSignerChange log event SignerChange
     */
    function logSignerChange(
        uint256 sequencerId,
        address oldSigner,
        address newSigner,
        uint256 nonce,
        bytes calldata signerPubkey
    ) external OnlyManager {
        emit SignerChange(
            sequencerId,
            nonce,
            oldSigner,
            newSigner,
            signerPubkey
        );
    }

    function _liquidateReward(
        uint256 _seqId,
        uint256 _amount,
        address _recipient,
        uint32 _l2gas
    ) internal {
        _bridgeTo(_recipient, _amount, _l2gas);
        uint256 total = totalRewardsLiquidated + _amount;
        totalRewardsLiquidated = total;
        emit ClaimRewards(_seqId, _recipient, _amount, total);
    }

    function _bridgeTo(
        address _recipient,
        uint256 _amount,
        uint32 _l2gas
    ) internal {
        if (_amount == 0) {
            return;
        }

        IERC20(l1Token).safeIncreaseAllowance(bridge, _amount);
        IL1ERC20Bridge(bridge).depositERC20ToByChainId{value: msg.value}(
            l2ChainId,
            l1Token,
            l2Token,
            _recipient,
            _amount,
            _l2gas,
            ""
        );
    }
}
