pragma solidity ^0.8.0;

import {ValidatorShare} from "./ValidatorShare.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";


contract ValidatorShareFactory {
    address immutable tokenValidatorShare;

    event ProxyDeployed(address proxyAddress);

    constructor() {
        UpgradeableBeacon _tokenBeacon = new UpgradeableBeacon(address(new ValidatorShare('Validator Share Token','VST')));
        _tokenBeacon.transferOwnership(msg.sender);
        tokenValidatorShare = address(_tokenBeacon);
    }

    function create(uint256 validatorId, address loggerAddress,address registry) external returns (address) {
        BeaconProxy proxy = new BeaconProxy(
            tokenValidatorShare,
            abi.encodeWithSelector(ValidatorShare.initialize.selector, validatorId, loggerAddress, msg.sender)
        );
        emit ProxyDeployed(address(proxy));
        return address(proxy);
    }
    /**
   */
    // function create(uint256 validatorId, address loggerAddress, address registry) public returns (address) {
    //     ValidatorShareProxy proxy = new ValidatorShareProxy(registry);

    //     // proxy.transferOwnership(msg.sender);

    //     address proxyAddr = address(proxy);
    //     (bool success, bytes memory data) = proxyAddr.call{gas:gasleft()}(
    //         abi.encodeWithSelector(
    //             ValidatorShare(proxyAddr).initialize.selector, 
    //             validatorId, 
    //             loggerAddress, 
    //             msg.sender
    //         )
    //     );
    //     require(success, string(data));

    //     return proxyAddr;
    // }
}

