pragma solidity ^0.8.0;

// note this contract interface is only for stakeManager use
abstract contract IValidatorShare {
    function withdrawRewards()  virtual external;

    function unstakeClaimTokens()  virtual external;

    function getLiquidRewards(address user)  virtual  external view returns (uint256);
    
    function owner() virtual  external view returns (address);

    function restake() virtual  external returns(uint256, uint256);

    function unlock() virtual  external;

    function lock() virtual  external;

    function drain(
        address token,
        address payable destination,
        uint256 amount
    )  virtual external;

    function updateDelegation(bool delegation) virtual  external;

    function migrateOut(address user, uint256 amount) virtual external;

    function migrateIn(address user, uint256 amount) virtual  external;
}
