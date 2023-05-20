pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";


// contract StakingNFT is ERC721Full, Ownable {
contract StakingNFT is ERC721Enumerable, Ownable {
    constructor(string memory name, string memory symbol)
        public
        ERC721(name, symbol)
    {
        // solhint-disable-previous-line no-empty-blocks
    }

    function mint(address to, uint256 tokenId) public onlyOwner {
        require(
            balanceOf(to) == 0,
            "Validators MUST NOT own multiple stake position"
        );
        _mint(to, tokenId);
    }

    function burn(uint256 tokenId) public onlyOwner {
        _burn(tokenId);
    }

    function _transferFrom(address from, address to, uint256 tokenId) internal {
        require(
            balanceOf(to) == 0,
            "Validators MUST NOT own multiple stake position"
        );
        super.transferFrom(from, to, tokenId);
    }
}
