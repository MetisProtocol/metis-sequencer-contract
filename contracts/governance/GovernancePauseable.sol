// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import {IGovernance} from "../interfaces/IGovernance.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

contract GovernancePauseable is PausableUpgradeable {
    IGovernance public governance;
    
    /**
     * @dev onlyGovernance Only the gov address can be used to call the contract method
     *
     */    
    modifier onlyGovernance() {
        _assertGovernance();
        _;
    }


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(){
        _disableInitializers();
    }

    function __GovernancePauseable_init(address _governance) internal onlyInitializing {
        __Pausable_init();

        require(_governance != address(0), "invalid _governance");
        governance = IGovernance(_governance);
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

    function _assertGovernance() private view {
        require(
            msg.sender == address(governance),
            "Only governance contract is authorized"
        );
    }
}
