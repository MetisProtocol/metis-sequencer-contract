pragma solidity ^0.8.0;
import {Governable} from "./governance/Governable.sol";
import {IGovernance} from "./governance/IGovernance.sol";

contract Registry is Governable {
    // @todo hardcode constants
    bytes32 private constant STAKE_MANAGER = keccak256("stakeManager");
    bytes32 private constant EVENT_HUB = keccak256("eventsHub");

    mapping(bytes32 => address) public contractMap;
    event ContractMapUpdated(bytes32 indexed key, address indexed previousContract, address indexed newContract);

    function initialize(address _governance) override public initializer {
        governance = IGovernance(_governance);
    }

    function updateContractMap(bytes32 _key, address _address) external onlyGovernance {
        emit ContractMapUpdated(_key, contractMap[_key], _address);
        contractMap[_key] = _address;
    }
    
    function getStakeManagerAddress() public view returns (address) {
        return contractMap[STAKE_MANAGER];
    }

    function getEventHubAddress() public view returns (address) {
        return contractMap[STAKE_MANAGER];
    }
}