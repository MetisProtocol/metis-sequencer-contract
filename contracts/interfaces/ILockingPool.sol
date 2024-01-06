// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.9;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LockingInfo} from "../LockingInfo.sol";
import {LockingNFT} from "../LockingNFT.sol";

interface ILockingPool {
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
    ) external;


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
    ) external;


     /**
     * @dev withdrawRewards withdraw current reward
     *
     * @param sequencerId sequencer id
     * @param recipient the address that receive reward tokens
     */   
    function withdrawRewards(
        uint256 sequencerId,
        address recipient
    ) external;
    
    /**
     * @dev unlock is used to unlock Metis and exit the sequencer node
     *
     * @param sequencerId sequencer id
     */    
    function unlock(uint256 sequencerId) external;

    
     /**
     * @dev unlockClaim Because unlock has a waiting period, after the waiting period is over, you can claim locked tokens
     *
     * @param sequencerId sequencer id
     */   
     function unlockClaim(uint256 sequencerId) external ;


    /**
     * @dev ownerOf query owner of the NFT 
     *
     * @param tokenId NFT token id
     */    
    function ownerOf(uint256 tokenId) external view returns (address);

     /**
     * @dev getSequencerId query sequencer id by signer address
     *
     * @param user sequencer signer address
     */   
    function getSequencerId(address user)  external  view returns (uint256);

    /**
     * @dev sequencerReward query sequencer current reward
     *
     * @param sequencerId sequencerid
     */   
    function sequencerReward(uint256 sequencerId) external view returns (uint256);

    /**
     * @dev sequencerLock return the total lock amount of sequencer
     *
     * @param sequencerId sequencer id
     */    
    function sequencerLock(uint256 sequencerId) external view returns (uint256);

     /**
     * @dev currentSequencerSetSize  get all sequencer count
     */    
     function currentSequencerSetSize() external view returns (uint256);

    /**
     * @dev currentSequencerSetTotalLock get total lock amount for all sequencers
     */  
    function currentSequencerSetTotalLock() external view returns (uint256);

     /**
     * @dev getL2ChainId query current l2 chain id
     * @param l1ChainId pass the l1 chain id
     */  
    function getL2ChainId(uint256 l1ChainId) external view returns(uint256);

    /**
     * @dev fetchMpcAddress query mpc address by L1 block height, used by batch-submitter
     * @param blockHeight L1 block height
     */  
    function fetchMpcAddress(uint256 blockHeight) external view returns(address);
}
