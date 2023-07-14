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

     /**
     * @dev setPause can set the contract not suspended status
     */  
    function setPause() virtual public {
        pause = true;
    }

     /**
     * @dev setUnpause can cancel the suspended state
     */  
    function setUnpause() virtual public {
        pause = false;
    }
}
