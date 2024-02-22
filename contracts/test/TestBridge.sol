// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IL1ERC20Bridge} from "../interfaces/IL1ERC20Bridge.sol";

contract TestBridge is IL1ERC20Bridge {
    event ERC20DepositInitiated(
        address indexed _l1Token,
        address indexed _l2Token,
        address indexed _from,
        address _to,
        uint256 _amount,
        bytes _data
    );

    function depositERC20ToByChainId(
        uint256,
        address _l1Token,
        address _l2Token,
        address _to,
        uint256 _amount,
        uint32,
        bytes calldata _data
    ) external payable override {
        emit ERC20DepositInitiated(
            _l1Token,
            _l2Token,
            msg.sender,
            _to,
            _amount,
            _data
        );
    }
}
