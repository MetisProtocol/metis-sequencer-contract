// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.9;

import '../proxy/ProxyPauseable.sol';

contract ProxyPauseableTest is ProxyPauseable {

    function initialize(address _gov) external initializer {
        __ProxyPauseable_init(_gov);
    }
}
