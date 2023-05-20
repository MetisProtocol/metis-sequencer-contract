pragma solidity ^0.8.0;

abstract contract IStakeManager {
    function transferFunds(
        uint256 validatorId,
        uint256 amount,
        address delegator
    ) virtual external returns (bool);

    function delegationDeposit(
        uint256 validatorId,
        uint256 amount,
        address delegator
    ) virtual external returns (bool);

    function stakeFor(
        address user,
        uint256 amount,
        // uint256 themisFee,
        bool acceptDelegation,
        bytes memory signerPubkey
    ) virtual public;

    function unstake(uint256 validatorId) virtual external;

    function totalStakedFor(address addr) virtual external view returns (uint256);

    function updateValidatorState(uint256 validatorId, int256 amount) virtual public;

    function ownerOf(uint256 tokenId) virtual public view returns (address);

    function validatorStake(uint256 validatorId) virtual public view returns (uint256);

    function epoch() virtual public view returns (uint256);

    function getRegistry() virtual public view returns (address);

    function withdrawalDelay() virtual public view returns (uint256);

    function delegatedAmount(uint256 validatorId) virtual public view returns(uint256);

    function decreaseValidatorDelegatedAmount(uint256 validatorId, uint256 amount) virtual public;

    function withdrawDelegatorsReward(uint256 validatorId) virtual public returns(uint256);

    function delegatorsReward(uint256 validatorId) virtual public view returns(uint256);
}
