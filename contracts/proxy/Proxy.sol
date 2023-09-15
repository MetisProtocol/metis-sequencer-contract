// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.9;

import {IProxy} from "../interfaces/IProxy.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract Proxy is IProxy, OwnableUpgradeable {
    address internal proxyTo;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
   
    function initialize() external initializer {
        __Ownable_init();
    }

    /**
     * @dev The update method is a proxy that forwards calldata to the target contract
     * @param target Address of target contract
     * @param data calldata to target
     */  
    function update(address target, bytes memory data) override external onlyOwner {
        require(target != address(0),"invalid target");
        (bool success, ) = target.call(data); 
        require(success, "Update failed");
    }
}
