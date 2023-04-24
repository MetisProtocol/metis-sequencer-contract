pragma solidity ^0.8.0;

// note this contract interface is only for stakeManager use
abstract contract IValidatorShare {
    function withdrawRewards() virtual public;

    function unstakeClaimTokens() virtual public;

    function getLiquidRewards(address user)  virtual public view returns (uint256);
    
    function owner() virtual public view returns (address);

    function restake() virtual public returns(uint256, uint256);

    function unlock() virtual external;

    function lock() virtual external;

    function drain(
        address token,
        address payable destination,
        uint256 amount
    ) virtual external;

    function slash(uint256 valPow, uint256 delegatedAmount, uint256 totalAmountToSlash) virtual external returns (uint256);

    function updateDelegation(bool delegation) virtual external;

    function migrateOut(address user, uint256 amount) virtual external;

    function migrateIn(address user, uint256 amount) virtual external;
}
