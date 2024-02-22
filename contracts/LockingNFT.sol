// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC721Enumerable, ERC721} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract LockingNFT is ERC721Enumerable, Ownable {
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {
        require(bytes(name).length > 0, "invalid name");
        require(bytes(symbol).length > 0, "invalid symbol");
    }

    /**
     * @dev mint a NFT, on behalf of the user successfully applied to become a sequencer
     * @param to the signer address of sequencer
     * @param tokenId mint token id
     */
    function mint(address to, uint256 tokenId) external onlyOwner {
        require(
            balanceOf(to) == 0,
            "Sequencers MUST NOT own multiple lock position"
        );
        _safeMint(to, tokenId);
    }

    /**
     * @dev burn a NFT, give up the sequencer role on behalf of the user
     * @param tokenId the NFT token id
     */
    function burn(uint256 tokenId) external onlyOwner {
        _burn(tokenId);
    }

    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override onlyOwner {
        require(
            balanceOf(to) == 0,
            "Sequencers MUST NOT own multiple lock position"
        );
        super._transfer(from, to, tokenId);
    }
}
