// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";


// contract LockingNFT is ERC721Full, Ownable {
contract LockingNFT is ERC721Enumerable, Ownable {
    constructor(string memory name, string memory symbol) ERC721(name, symbol)
    {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev mint a NFT, on behalf of the user successfully applied to become a sequencer
     * @param to the signer address of sequencer
     * @param tokenId mint token id
     */
    function mint(address to, uint256 tokenId) public onlyOwner {
        require(
            balanceOf(to) == 0,
            "Sequencers MUST NOT own multiple stake position"
        );
        _mint(to, tokenId);
    }

     /**
     * @dev burn a NFT, give up the sequencer role on behalf of the user
     * @param tokenId the NFT token id
     */
    function burn(uint256 tokenId) public onlyOwner {
        _burn(tokenId);
    }

    function _transferFrom(address from, address to, uint256 tokenId) internal {
        require(
            balanceOf(to) == 0,
            "Sequencers MUST NOT own multiple stake position"
        );
        super.transferFrom(from, to, tokenId);
    }
}
