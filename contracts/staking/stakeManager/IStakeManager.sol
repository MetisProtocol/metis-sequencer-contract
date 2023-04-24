pragma solidity ^0.8.0;

abstract contract IStakeManager {
    // validator replacement
    function startAuction(
        uint256 validatorId,
        uint256 amount,
        bool acceptDelegation,
        bytes calldata signerPubkey
    ) virtual external;

    function confirmAuctionBid(uint256 validatorId, uint256 heimdallFee) virtual external;

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

    function unstake(uint256 validatorId) virtual external;

    function totalStakedFor(address addr) virtual external view returns (uint256);

    function stakeFor(
        address user,
        uint256 amount,
        uint256 heimdallFee,
        bool acceptDelegation,
        bytes memory signerPubkey
    ) virtual public;

    function checkSignatures(
        uint256 blockInterval,
        bytes32 voteHash,
        bytes32 stateRoot,
        address proposer,
        uint[3][] calldata sigs
    ) virtual external returns (uint256);

    function updateValidatorState(uint256 validatorId, int256 amount) virtual public;

    function ownerOf(uint256 tokenId) virtual public view returns (address);

    function slash(bytes calldata slashingInfoList) virtual external returns (uint256);

    function validatorStake(uint256 validatorId) virtual public view returns (uint256);

    function epoch() virtual public view returns (uint256);

    function getRegistry() virtual public view returns (address);

    function withdrawalDelay() virtual public view returns (uint256);

    function delegatedAmount(uint256 validatorId) virtual public view returns(uint256);

    function decreaseValidatorDelegatedAmount(uint256 validatorId, uint256 amount) virtual public;

    function withdrawDelegatorsReward(uint256 validatorId) virtual public returns(uint256);

    function delegatorsReward(uint256 validatorId) virtual public view returns(uint256);

    function dethroneAndStake(
        address auctionUser,
        uint256 heimdallFee,
        uint256 validatorId,
        uint256 auctionAmount,
        bool acceptDelegation,
        bytes calldata signerPubkey
    ) virtual external;
}
