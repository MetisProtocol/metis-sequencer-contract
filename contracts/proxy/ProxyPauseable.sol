// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.9;

import {IProxy} from "../interfaces/IProxy.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

contract ProxyPauseable is PausableUpgradeable {
    IProxy public Proxy;
    
    /**
     * @dev onlyProxy Only the proxy address can be used to call the contract method
     *
     */    
    modifier onlyProxy() {
        _assertProxy();
        _;
    }


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(){
        _disableInitializers();
    }

    function __ProxyPauseable_init(address _Proxy) internal onlyInitializing {
        __Pausable_init();

        require(_Proxy != address(0), "invalid _Proxy");
        Proxy = IProxy(_Proxy);
    }

    /**
     * @dev setPause can set the contract not suspended status
     */  
    function setPause() external onlyProxy {
        _pause();
    }

    /**
     * @dev setUnpause can cancel the suspended state
     */  
    function setUnpause() external onlyProxy {
        _unpause();
    }

    function _assertProxy() private view {
        require(
            msg.sender == address(Proxy),
            "Only Proxy contract is authorized"
        );
    }
}
