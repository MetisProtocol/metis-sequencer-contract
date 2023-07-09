// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

contract Pauseable {
    bool public pause;

    modifier onlyWhenUnpaused() {
        _assertUnpause();
        _;
    }

    function _assertUnpause() private view {
        require(!pause, "pause");
    }

    function setPause() virtual public {
        pause = true;
    }

    function setUnpause() virtual public {
        pause = false;
    }
}
