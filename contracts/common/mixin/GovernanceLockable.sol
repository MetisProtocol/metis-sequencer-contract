pragma solidity ^0.8.0;

import {Governable} from "../governance/Governable.sol";
import {IGovernance} from "../governance/IGovernance.sol";
import {Lockable} from "./Lockable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract GovernanceLockable is Lockable, Governable {
    function initialize(address _governance) override public initializer {
        governance = IGovernance(_governance);
    }

    function lock() override public onlyGovernance {
        super.lock();
    }

    function unlock() override public onlyGovernance {
        super.unlock();
    }
}
