// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IL1ERC20Bridge} from "../interfaces/IL1ERC20Bridge.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TestBridge is IL1ERC20Bridge {
    event ERC20DepositInitiated(
        address indexed _l1Token,
        address indexed _l2Token,
        address indexed _from,
        address _to,
        uint256 _amount,
        bytes _data
    );

    // checking on deploying
    address public metis;
    // checking on deploying
    address public l2TokenBridge;

    mapping(address addr => uint256 balance) public l2Balances;

    function depositERC20ToByChainId(
        uint256,
        address _l1Token,
        address _l2Token,
        address _to,
        uint256 _amount,
        uint32,
        bytes calldata _data
    ) external payable override {
        require(msg.value > 0, "bridge fee required");
        IERC20(_l1Token).transferFrom(msg.sender, address(this), _amount);
        l2Balances[_to] += _amount;

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
