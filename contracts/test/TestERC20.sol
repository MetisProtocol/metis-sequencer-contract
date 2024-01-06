// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.9;

import '@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol';

contract TestERC20 is ERC20Permit {
    constructor(uint256 amountToMint) ERC20('Test ERC20', 'TEST') ERC20Permit('Test ERC20') {
        mint(msg.sender, amountToMint);
    }

    function mint(address _to, uint256 _amount) public{
        _mint(_to, _amount);
    }
}
