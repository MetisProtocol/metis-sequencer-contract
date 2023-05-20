pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {Registry} from "../../common/Registry.sol";
import {GovernanceLockable} from "../../common/mixin/GovernanceLockable.sol";
import {IStakeManager} from "./IStakeManager.sol";
import {StakeManagerStorage} from "./StakeManagerStorage.sol";
import {StakeManagerStorageExtension} from "./StakeManagerStorageExtension.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {EventsHub} from "../EventsHub.sol";
import {ValidatorShare} from "../validatorShare/ValidatorShare.sol";

contract StakeManagerExtension is StakeManagerStorage, StakeManagerStorageExtension {
    using SafeMath for uint256;
   
    function updateCommissionRate(uint256 validatorId, uint256 newCommissionRate) external {
        uint256 _epoch = currentEpoch;
        uint256 _lastCommissionUpdate = validators[validatorId].commission.lastCommissionUpdate;

        require( // withdrawalDelay == dynasty
            (_lastCommissionUpdate.add(WITHDRAWAL_DELAY) <= _epoch) || _lastCommissionUpdate == 0, // For initial setting of commission rate
            "Cooldown"
        );

        require(newCommissionRate <= MAX_COMMISION_RATE, "Incorrect value");
        _getOrCacheEventsHub().logUpdateCommissionRate(validatorId, newCommissionRate, validators[validatorId].commission.commissionRate);
        validators[validatorId].commission.commissionRate = newCommissionRate;
        validators[validatorId].commission.lastCommissionUpdate = _epoch;
    }

    function _getOrCacheEventsHub() private returns(EventsHub) {
        EventsHub _eventsHub = EventsHub(eventsHub);
        if (_eventsHub == EventsHub(address(0))) {
            _eventsHub = EventsHub(Registry(registry).contractMap(keccak256("eventsHub")));
            eventsHub = address(_eventsHub);
        }
        return _eventsHub;
    }
}
