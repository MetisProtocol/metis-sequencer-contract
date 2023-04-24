pragma solidity ^0.8.0;

import {UpgradableProxy} from "../common/misc/UpgradableProxy.sol";

contract EventsHubProxy is UpgradableProxy {
    constructor(address _proxyTo) public UpgradableProxy(_proxyTo) {}
}
