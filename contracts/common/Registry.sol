pragma solidity ^0.5.2;

import {Governable} from "./governance/Governable.sol";

contract Registry is Governable {
    // @todo hardcode constants
    bytes32 private constant STAKE_MANAGER = keccak256("stakeManager");
    bytes32 private constant VALIDATOR_SHARE = keccak256("validatorShare");
    bytes32 private constant SLASHING_MANAGER = keccak256("slashingManager");


    mapping(bytes32 => address) public contractMap;
    event ContractMapUpdated(bytes32 indexed key, address indexed previousContract, address indexed newContract);

    constructor(address _governance) public Governable(_governance) {}

    function updateContractMap(bytes32 _key, address _address) external onlyGovernance {
        emit ContractMapUpdated(_key, contractMap[_key], _address);
        contractMap[_key] = _address;
    }

    function getValidatorShareAddress() public view returns (address) {
        return contractMap[VALIDATOR_SHARE];
    }

    function getStakeManagerAddress() public view returns (address) {
        return contractMap[STAKE_MANAGER];
    }

    function getSlashingManagerAddress() public view returns (address) {
        return contractMap[SLASHING_MANAGER];
    }
}
