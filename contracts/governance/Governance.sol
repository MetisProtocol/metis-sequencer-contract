// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import {IGovernance} from "./IGovernance.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract Governance is IGovernance,OwnableUpgradeable {
    address internal proxyTo;
   
    function initialize() public initializer {
        __Ownable_init();
    }

    /**
     * @dev The update method is a proxy that forwards calldata to the target contract
     * @param target Address of target contract
     * @param data calldata to target
     */  
    function update(address target, bytes memory data) override public onlyOwner {
        (bool success, ) = target.call(data); 
        require(success, "Update failed");
    }
}