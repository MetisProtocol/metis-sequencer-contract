// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import '../governance/GovernancePauseable.sol';

contract GovernancePauseableTest is GovernancePauseable {

    function initialize(address _gov) external initializer {
        __GovernancePauseable_init(_gov);
    }
}
