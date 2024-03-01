// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MetisSequencerSet is OwnableUpgradeable {
    uint256 public epochLength;
    address public mpcAddress;

    // epoch details
    struct Epoch {
        uint256 number;
        address signer;
        uint256 startBlock;
        uint256 endBlock;
    }

    mapping(uint256 => Epoch) public epochs; // epoch number => epoch

    // current epoch id, starts from 0
    uint256 internal currentEpochId;

    // event
    event NewEpoch(
        uint256 indexed epochId,
        uint256 startBlock,
        uint256 endBlock,
        address signer
    );

    event ReCommitEpoch(
        uint256 indexed oldEpochId,
        uint256 indexed newEpochId,
        uint256 curEpochId,
        uint256 startBlock,
        uint256 endBlock,
        address newSigner
    );
    event MpcAddressUpdated(address _newMpcAddress);
    event EpochUpdated(uint256 _newLength);

    modifier onlyMpc() {
        require(msg.sender == mpcAddress, "Not Mpc");
        _;
    }

    modifier onlyMpcOrOwner() {
        require(
            msg.sender == mpcAddress || msg.sender == owner(),
            "Not Mpc or Owner"
        );
        _;
    }

    function initialize(
        address _initialSequencer,
        address _mpcAddress,
        uint256 _firstStartBlock,
        uint256 _firstEndBlock,
        uint256 _epochLength
    ) external initializer {
        mpcAddress = _mpcAddress;
        epochLength = _epochLength;

        // initial epoch
        uint256 epochId = 0;

        // initial epoch item
        epochs[epochId] = Epoch({
            number: epochId,
            signer: _initialSequencer,
            startBlock: _firstStartBlock,
            endBlock: _firstEndBlock
        });

        emit NewEpoch(
            epochId,
            _firstStartBlock,
            _firstEndBlock,
            _initialSequencer
        );

        __Ownable_init();
    }

    function UpdateMpcAddress(address _newMpc) public onlyOwner {
        require(_newMpc != address(0), "Invalid new mpc");
        mpcAddress = _newMpc;
        emit MpcAddressUpdated(_newMpc);
    }

    function UpdateEpochLength(uint256 _newLength) public onlyMpcOrOwner {
        require(_newLength > 0, "Invalid new epoch length");
        epochLength = _newLength;
        emit EpochUpdated(_newLength);
    }

    // get epoch number by block
    function getEpochByBlock(uint256 number) public view returns (uint256) {
        uint256 lastIndex = currentEpochId;
        for (uint256 i = lastIndex; i >= 0; i--) {
            Epoch memory epoch = epochs[i];
            if (epoch.startBlock <= number && number <= epoch.endBlock) {
                return epoch.number;
            }

            // not in the last epoch
            if (i == lastIndex && number > epoch.endBlock) {
                return type(uint256).max;
            }
        }

        // return default if not found any thing
        return type(uint256).max;
    }

    function currentEpochNumber() public view returns (uint256) {
        return currentEpochId;
    }

    function currentEpoch() public view returns (Epoch memory epoch) {
        epoch = epochs[currentEpochId];
    }

    // get metis sequencer
    function getMetisSequencer(uint256 number) public view returns (address) {
        if (number <= epochs[0].endBlock) {
            return epochs[0].signer;
        }

        // epoch number by block
        uint256 epochId = getEpochByBlock(number);
        if (epochId == type(uint256).max) {
            return address(0);
        }

        Epoch memory epoch = epochs[epochId];
        return epoch.signer;
    }

    function commitEpoch(
        uint256 newEpoch,
        uint256 startBlock,
        uint256 endBlock,
        address signer
    ) external onlyMpc {
        uint256 curEpochId = currentEpochId;
        // check conditions
        require(newEpoch == curEpochId + 1, "Invalid epoch id");
        require(
            endBlock > startBlock,
            "End block must be greater than start block"
        );
        require(
            (endBlock - startBlock + 1) % epochLength == 0,
            "Mismatch epoch length and block length"
        );

        Epoch storage epoch = epochs[curEpochId];
        require(
            epoch.endBlock + 1 == startBlock,
            "Start block must be greater than currentEpoch.endBlock by 1"
        );

        epochs[newEpoch] = Epoch({
            number: newEpoch,
            signer: signer,
            startBlock: startBlock,
            endBlock: endBlock
        });

        currentEpochId = newEpoch;
        emit NewEpoch(newEpoch, startBlock, endBlock, signer);
    }

    function recommitEpoch(
        uint256 oldEpochId,
        uint256 newEpochId,
        uint256 startBlock,
        uint256 endBlock,
        address newSigner
    ) external onlyMpc {
        // check start block
        require(startBlock == block.number, "Invalid start block");

        // update pre epoch info
        uint256 curEpochId = currentEpochId;
        require(oldEpochId <= curEpochId, "Invalid oldEpochId");

        // recommitEpoch occurs in the latest one epoch
        if (oldEpochId == curEpochId) {
            Epoch storage epoch = epochs[curEpochId];
            epoch.endBlock = block.number - 1;

            // craete new epoch
            require(newEpochId == curEpochId + 1, "Invalid newEpochId");
            require(
                endBlock > startBlock,
                "End block must be greater than start block"
            );

            epochs[newEpochId] = Epoch({
                number: newEpochId,
                signer: newSigner,
                startBlock: startBlock,
                endBlock: endBlock
            });
            currentEpochId = newEpochId;
        }

        // recommitEpoch occurs in the second latest epoch
        if (curEpochId > 1 && oldEpochId == curEpochId - 1) {
            Epoch storage epoch = epochs[oldEpochId];
            epoch.endBlock = block.number - 1;

            // update latest epoch
            require(newEpochId == curEpochId, "Invalid newEpochId");
            require(
                endBlock > startBlock,
                "End block must be greater than start block"
            );

            Epoch storage existNewEpoch = epochs[newEpochId];
            existNewEpoch.signer = newSigner;
            existNewEpoch.startBlock = startBlock;
            existNewEpoch.endBlock = endBlock;
        }

        emit ReCommitEpoch(
            oldEpochId,
            newEpochId,
            curEpochId,
            startBlock,
            endBlock,
            newSigner
        );
    }
}
