// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MetisSequencerSet is OwnableUpgradeable {
    uint256 public epochLength;
    uint256 public firstStartBlock;
    uint256 public firstEndBlock;
    address public initialSequencer;
    address public mpcAddress;

    // epoch details
    struct Epoch {
        uint256 number;
        address signer;
        uint256 startBlock;
        uint256 endBlock;
    }

    mapping(uint256 => Epoch) public epochs; // epoch number => epoch
    uint256[] public epochNumbers; // recent epoch numbers

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
        __Ownable_init();

        initialSequencer = _initialSequencer;
        mpcAddress = _mpcAddress;
        firstStartBlock = _firstStartBlock;
        firstEndBlock = _firstEndBlock;
        epochLength = _epochLength;

        // initial epoch
        uint256 epochId = 0;

        // initial epoch item
        epochs[epochId] = Epoch({
            number: epochId,
            signer: initialSequencer,
            startBlock: firstStartBlock,
            endBlock: firstEndBlock
        });

        epochNumbers.push(epochId);

        emit NewEpoch(
            epochId,
            firstStartBlock,
            firstEndBlock,
            initialSequencer
        );
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
        for (uint256 i = epochNumbers.length; i > 0; ) {
            Epoch memory epoch = epochs[epochNumbers[i - 1]];
            if (epoch.startBlock <= number && number <= epoch.endBlock) {
                return epoch.number;
            }

            unchecked {
                --i;
            }
        }

        // return default if not found any thing
        return type(uint256).max;
    }

    function currentEpochNumber() public view returns (uint256) {
        return epochNumbers[epochNumbers.length - 1];
    }

    function currentEpoch() public view returns (Epoch memory epoch) {
        uint256 currentEpochId = epochNumbers[epochNumbers.length - 1];
        epoch = epochs[currentEpochId];
    }

    // get metis sequencer
    function getMetisSequencer(uint256 number) public view returns (address) {
        if (number <= firstEndBlock) {
            return initialSequencer;
        }

        // epoch number by block
        uint256 epochId = getEpochByBlock(number);
        Epoch storage epoch = epochs[epochId];
        if (epoch.number == 0) {
            return address(0);
        }
        return epoch.signer;
    }

    function commitEpoch(
        uint256 newEpoch,
        uint256 startBlock,
        uint256 endBlock,
        address signer
    ) external onlyMpc {
        uint256 currentEpochId = currentEpochNumber();
        // check conditions
        require(newEpoch == currentEpochId + 1, "Invalid epoch id");
        require(
            endBlock > startBlock,
            "End block must be greater than start block"
        );
        require(
            (endBlock - startBlock + 1) % epochLength == 0,
            "Mismatch epoch length and block length"
        );

        Epoch storage epoch = epochs[currentEpochId];
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

        epochNumbers.push(newEpoch);
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
        uint256 currentEpochId = currentEpochNumber();
        require(oldEpochId <= currentEpochId, "Invalid oldEpochId");

        // recommitEpoch occurs in the latest one epoch
        if (oldEpochId == currentEpochId) {
            Epoch storage epoch = epochs[currentEpochId];
            epoch.endBlock = block.number - 1;

            // craete new epoch
            require(newEpochId == currentEpochId + 1, "Invalid newEpochId");
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

            epochNumbers.push(newEpochId);
        }

        // recommitEpoch occurs in the second latest epoch
        if (currentEpochId > 1 && oldEpochId == currentEpochId - 1) {
            Epoch storage epoch = epochs[oldEpochId];
            epoch.endBlock = block.number - 1;

            // update latest epoch
            require(newEpochId == currentEpochId, "Invalid newEpochId");
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
            startBlock,
            endBlock,
            newSigner
        );
    }
}
