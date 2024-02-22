// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC20Permit, ERC20} from "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

contract TestERC20 is ERC20Permit {
    constructor(
        uint256 amountToMint
    ) ERC20("Test ERC20", "TEST") ERC20Permit("Test ERC20") {
        mint(msg.sender, amountToMint);
    }

    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }
}
