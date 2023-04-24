pragma solidity ^0.8.0;

import {ProxyStorage} from "../misc/ProxyStorage.sol";
import {IGovernance} from "./IGovernance.sol";


contract Governance is ProxyStorage, IGovernance {
    function update(address target, bytes memory data) override public onlyOwner {
        (bool success, ) = target.call(data); 
        require(success, "Update failed");
    }
}
