// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.9;


contract TestBridge  {
   
    constructor()  {
    }

    function depositERC20ToByChainId (
        uint256 _chainid,
        address _l1Token,
        address _l2Token,
        address _to,
        uint _amount,
        uint32 _l2Gas,
        bytes calldata _data
    )external payable{
    }
}
