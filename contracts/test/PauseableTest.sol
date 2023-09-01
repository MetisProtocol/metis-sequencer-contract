// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import '../governance/Pausable.sol';

contract PauseableTest is Pausable {

    function initialize() external initializer {
        __Pauseable_init();
    }

    function setPause() external{
        _pause();
    }

    function setUnpause() external{
        _unpause();
    }
}
