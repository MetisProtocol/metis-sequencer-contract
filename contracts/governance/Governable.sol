// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import {IGovernance} from "./IGovernance.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";


contract Governable is Initializable {
    IGovernance public governance;

    constructor() {
        _disableInitializers();
    }

    function initialize(address _governance) public virtual initializer {
        require(_governance != address(0), "invlaid _governance");
        governance = IGovernance(_governance);
    }

    
     /**
     * @dev onlyGovernance Only the gov address can be used to call the contract method
     *
     */    
    modifier onlyGovernance() {
        _assertGovernance();
        _;
    }

    function _assertGovernance() private view {
        require(
            msg.sender == address(governance),
            "Only governance contract is authorized"
        );
    }
}
