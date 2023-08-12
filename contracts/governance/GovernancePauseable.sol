// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import {Governable} from "./Governable.sol";
import {IGovernance} from "./IGovernance.sol";
import {Pausable} from "./Pausable.sol";

contract GovernancePauseable is Pausable, Governable {
     /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(){
        _disableInitializers();
    }

    function initialize(address _governance) override public initializer {
        require(_governance != address(0),"invalid _governance");
        governance = IGovernance(_governance);
    }

    /**
     * @dev setPause can set the contract not suspended status
     */  
    function setPause() public onlyGovernance {
        _pause();
    }

    /**
     * @dev setUnpause can cancel the suspended state
     */  
    function setUnpause() public onlyGovernance {
        _unpause();
    }
}
