// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.20;

interface ILockingManager {
    /**
     * @dev Emitted when WITHDRAWAL_DELAY is updated.
     * @param _cur current withdraw delay time
     * @param _prev previours withdraw delay time
     */
    event WithrawDelayTimeChange(uint256 _cur, uint256 _prev);

    /**
     * @dev Emitted when the proxy update threshold in 'updateBlockReward()'.
     * @param newReward new block reward
     * @param oldReward  old block reward
     */
    event RewardUpdate(uint256 newReward, uint256 oldReward);

    /**
     * @dev Emitted when mpc address update in 'UpdateMpc'
     * @param _newMpc new min lock.
     */
    event UpdateMpc(address _newMpc);
}
