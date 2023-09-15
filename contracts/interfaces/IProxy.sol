// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.9;

interface IProxy {
    /**
     * @dev The update method is a proxy that forwards calldata to the target contract
     * @param target Address of target contract
     * @param data calldata to target
     */  
    function update(address target, bytes calldata data) external;
}
