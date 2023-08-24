// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import {Governable} from "./Governable.sol";
import {IGovernance} from "../interfaces/IGovernance.sol";
import {Pausable} from "./Pausable.sol";

contract GovernancePauseable is Pausable, Governable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(){
        _disableInitializers();
    }

    function __GovernancePauseable_init(address _governance) internal onlyInitializing {
        __Pauseable_init();
        __Governable_init(_governance);
    }

    /**
     * @dev setPause can set the contract not suspended status
     */  
    function setPause() external onlyGovernance {
        _pause();
    }

    /**
     * @dev setUnpause can cancel the suspended state
     */  
    function setUnpause() external onlyGovernance {
        _unpause();
    }
}
