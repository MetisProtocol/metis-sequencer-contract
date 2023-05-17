pragma solidity ^0.8.0;

import {IGovernance} from "./IGovernance.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";


contract Governable is Initializable {
    IGovernance public governance;

    function initialize(address _governance) public virtual initializer {
        governance = IGovernance(_governance);
    }

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
