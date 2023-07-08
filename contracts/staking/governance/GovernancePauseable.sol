pragma solidity ^0.8.0;

import {Governable} from "../governance/Governable.sol";
import {IGovernance} from "../governance/IGovernance.sol";
import {Pauseable} from "./Pauseable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract GovernancePauseable is Pauseable, Governable {
    function initialize(address _governance) override public initializer {
        governance = IGovernance(_governance);
    }

    function setPause() override public onlyGovernance {
        super.setPause();
    }

    function setUnpause() override public onlyGovernance {
        super.setUnpause();
    }
}
