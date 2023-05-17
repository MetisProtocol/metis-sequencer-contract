pragma solidity ^0.8.0;

import { StakeManagerStorage } from "../../staking/stakeManager/StakeManagerStorage.sol";
import { GovernanceLockable } from "../mixin/GovernanceLockable.sol";
import {IGovernance} from "../governance/IGovernance.sol";

// import {IValidatorShare} from "../../staking/validatorShare/IValidatorShare.sol";
import {IValidatorShare} from "../../staking/validatorShare/IValidatorShare.sol";

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

// Inheriting from Initializable as well to keep the storage layout same
contract DrainStakeManager is StakeManagerStorage {
    address public owner;

    modifier onlyOwner() {
    require(msg.sender == owner, "ONLY_OWNER");
    _;
    }

    function initialize(address _owner, address _governance) public initializer {
        owner = owner;
        governance = IGovernance(_governance);
    }

    function drain(address destination, uint amount) external onlyOwner {
        require(token.transfer(destination, amount), "Drain failed");
    }

    function drainValidatorShares(
        uint256 validatorId,
        address _token,
        address payable destination,
        uint256 amount
    ) external onlyOwner {
        address contractAddr = validators[validatorId].contractAddress;
        require(contractAddr != address(0x0), "unknown validator or no delegation enabled");
        IValidatorShare validatorShare = IValidatorShare(contractAddr);
        validatorShare.drain(_token, destination, amount);
    }
}
