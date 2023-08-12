// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LockingInfo} from "../LockingInfo.sol";
import {LockingNFT} from "../LockingNFT.sol";


abstract contract ILockingPool {
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
     * @dev relock Allow sequencer to increase the amount of locked positions
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
     * @dev getL2ChainId query current l2 chain id
     */  
    function getL2ChainId() virtual public view returns(uint256);

    /**
     * @dev fetchMpcAddress query mpc address by L1 block height, used by batch-submitter
     * @param blockHeight L1 block height
     */  
    function fetchMpcAddress(uint256 blockHeight) virtual public view returns(address);
}
