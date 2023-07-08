// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import {IGovernance} from "./IGovernance.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";


contract Governance is IGovernance,Initializable,Ownable {
    address internal proxyTo;

    function update(address target, bytes memory data) override public onlyOwner {
        (bool success, ) = target.call(data); 
        require(success, "Update failed");
    }
}
