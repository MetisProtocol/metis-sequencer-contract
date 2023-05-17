pragma solidity ^0.8.0;

import {IGovernance} from "./IGovernance.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";


contract Governance is IGovernance,Initializable {
    address internal proxyTo;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }

    function initialize(address newOwner) public initializer {
        owner = newOwner;
    }

    function update(address target, bytes memory data) override public onlyOwner {
        (bool success, ) = target.call(data); 
        require(success, "Update failed");
    }
}
