pragma solidity ^0.8.0;
import { Lockable } from "./Lockable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract OwnableLockable is Lockable, Ownable {
    function lock() virtual override public onlyOwner {
        super.lock();
    }

    function unlock() virtual override public onlyOwner {
        super.unlock();
    }
}
