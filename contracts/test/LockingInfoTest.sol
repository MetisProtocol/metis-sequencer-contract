// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.9;

import '../LockingInfo.sol';

contract LockingInfoTest is LockingInfo {
    constructor(address _lockingPool) LockingInfo(_lockingPool){
    }
}
