// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {
    constructor(uint256 amountToMint) ERC20("Test ERC20", "TEST") {
        mint(msg.sender, amountToMint);
    }

    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }
}
