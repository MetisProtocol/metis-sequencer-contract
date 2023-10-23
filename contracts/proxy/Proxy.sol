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
        require(isContract(target),"not a contract address");
        (bool success, ) = target.call(data); 
        require(success, "update failed");
    }

     /**
     * @dev The isContract method check if an address is a contract address
     * @param addr Address of target contract
     */  
    function isContract(address addr) internal view returns (bool) {
        uint256 size;
        assembly { size := extcodesize(addr) }
        return size > 0;
    }
}
