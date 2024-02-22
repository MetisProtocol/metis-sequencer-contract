// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.20;

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
     * @param l2Gas bridge reward to L2 gasLimit
     */
    function withdrawRewards(
        uint256 sequencerId,
        uint32 l2Gas
    ) external payable;

    /**
     * @dev unlock is used to unlock Metis and exit the sequencer node
     *
     * @param sequencerId sequencer id
     * @param l2Gas bridge reward to L2 gasLimit
     */
    function unlock(uint256 sequencerId, uint32 l2Gas) external payable;

    /**
     * @dev unlockClaim Because unlock has a waiting period, after the waiting period is over, you can claim locked tokens
     *
     * @param sequencerId sequencer id
     * @param l2Gas bridge reward to L2 gasLimit
     */
    function unlockClaim(uint256 sequencerId, uint32 l2Gas) external payable;

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
    function getSequencerId(address user) external view returns (uint256);

    /**
     * @dev sequencerReward query sequencer current reward
     *
     * @param sequencerId sequencerid
     */
    function sequencerReward(
        uint256 sequencerId
    ) external view returns (uint256);

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
     * @dev fetchMpcAddress query mpc address by L1 block height, used by batch-submitter
     * @param blockHeight L1 block height
     */
    function fetchMpcAddress(
        uint256 blockHeight
    ) external view returns (address);
}
