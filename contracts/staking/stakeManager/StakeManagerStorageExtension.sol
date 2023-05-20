pragma solidity ^0.8.0;

contract StakeManagerStorageExtension {
    address public eventsHub;
    uint256 public rewardPerStake;
    address public extensionCode;
    address[] public signers;
    uint256 constant BLOCK_REWARD_PRECISION = 100;
}   
