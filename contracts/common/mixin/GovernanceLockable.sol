pragma solidity ^0.8.0;

import {Governable} from "../governance/Governable.sol";
import {Lockable} from "./Lockable.sol";

contract GovernanceLockable is Lockable, Governable {
    constructor(address governance) public Governable(governance) {}

    function lock() override public onlyGovernance {
        super.lock();
    }

    function unlock() override public onlyGovernance {
        super.unlock();
    }
}
