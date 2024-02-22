// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title IL1ERC20Bridge
 */
interface IL1ERC20Bridge {
    /**
     * @dev deposit an amount of ERC20 to a recipient's balance on L2.
     * @param _chainid chainid
     * @param _l1Token Address of the L1 ERC20 we are depositing
     * @param _l2Token Address of the L1 respective L2 ERC20
     * @param _to L2 address to credit the withdrawal to.
     * @param _amount Amount of the ERC20 to deposit.
     * @param _l2Gas Gas limit required to complete the deposit on L2.
     * @param _data Optional data to forward to L2. This data is provided
     *        solely as a convenience for external contracts. Aside from enforcing a maximum
     *        length, these contracts provide no guarantees about its content.
     */
    function depositERC20ToByChainId(
        uint256 _chainid,
        address _l1Token,
        address _l2Token,
        address _to,
        uint256 _amount,
        uint32 _l2Gas,
        bytes calldata _data
    ) external payable;
}
