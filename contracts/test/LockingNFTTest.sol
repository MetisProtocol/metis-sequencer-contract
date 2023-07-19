// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import '../LockingNFT.sol';

contract LockingNFTTest is LockingNFT{
    constructor() LockingNFT("Metis Sequencer Test", "MST"){
    }
}
