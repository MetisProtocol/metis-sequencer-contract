pragma solidity ^0.8.0;

import {ERCProxy} from "./ERCProxy.sol";
import {DelegateProxyForwarder} from "./DelegateProxyForwarder.sol";

abstract contract DelegateProxy is ERCProxy, DelegateProxyForwarder {
    function proxyType() override external pure returns (uint256 proxyTypeId) {
        // Upgradeable proxy
        proxyTypeId = 2;
    }

    function implementation() virtual override external view returns (address);
}
