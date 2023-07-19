// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

// dummy interface to avoid cyclic dependency
abstract contract ILockingPoolLocal {
    enum Status {Inactive, Active, Unlockd}

    struct Sequencer {
        uint256 amount;
        uint256 reward;
        uint256 activationBatch;
        uint256 deactivationBatch;
        uint256 deactivationTime;
        uint256 unlockClaimTime;
        address signer;
        Status status;
        uint256 initialRewardPerLock;
    }

    mapping(uint256 => Sequencer) public sequencers;
 
    function currentSequencerSetTotalLock() virtual public view returns (uint256);

    // signer to Sequencer mapping
    function signerToSequencer(address sequencerAddress)
        virtual
        public
        view
        returns (uint256);

    function isSequencer(uint256 sequencerId) virtual public view returns (bool);
}