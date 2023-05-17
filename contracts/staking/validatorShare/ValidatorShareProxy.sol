pragma solidity ^0.8.0;

import {UpgradableProxy} from "../../common/misc/UpgradableProxy.sol";
import {Registry} from "../../common/Registry.sol";

contract ValidatorShareProxy is UpgradableProxy {
    constructor(address _registry) public UpgradableProxy(_registry) {}

    function loadImplementation() override internal view returns (address) {
        return Registry(super.loadImplementation()).getValidatorShareAddress();
    }
}
