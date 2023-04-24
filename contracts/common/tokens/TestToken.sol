pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

abstract contract TestToken is ERC20 {

    constructor(string memory _name, string memory _symbol)  ERC20(_name,_symbol) {
        uint256 value = 10**10 * (10**18);
        _mint(msg.sender, value);
    }
}
