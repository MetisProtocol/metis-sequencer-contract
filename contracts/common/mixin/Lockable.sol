pragma solidity ^0.8.0;

contract Lockable {
    bool public locked;

    modifier onlyWhenUnlocked() {
        _assertUnlocked();
        _;
    }

    function _assertUnlocked() private view {
        require(!locked, "locked");
    }

    function lock() virtual public {
        locked = true;
    }

    function unlock() virtual public {
        locked = false;
    }
}
