// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import '../governance/Governable.sol';

contract GovernableTest is Governable {

    function initialize(address _gov) external initializer {
        __Governable_init(_gov);
    }

    function test() external onlyGovernance{
    }
}
