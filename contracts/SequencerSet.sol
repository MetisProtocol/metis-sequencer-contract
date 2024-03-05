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

    mapping(uint256 number => Epoch epoch) public epochs; // epoch number => epoch

    // current epoch number, starts from 0
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

        // We do not check if the length between the start and end block matches the epoch length
        // the epoch length can only be used for next epoch
        require(
            _firstStartBlock > block.number &&
                _firstEndBlock > _firstStartBlock,
            "Invalid block range"
        );

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
    // It returns Max(uint256) if the height doesn't exist in any epochs
    function getEpochByBlock(uint256 _number) public view returns (uint256) {
        uint256 lastIndex = currentEpochId + 1;
        for (uint256 i = lastIndex; i > 0; i--) {
            Epoch memory epoch = epochs[i - 1];
            if (epoch.startBlock <= _number && _number <= epoch.endBlock) {
                return epoch.number;
            }

            // not in the last epoch
            if (i == lastIndex && _number > epoch.endBlock) {
                return type(uint256).max;
            }
        }

        // return default if not found any thing
        return type(uint256).max;
    }

    function currentEpochNumber() public view returns (uint256) {
        return currentEpochId;
    }

    // currentEpoch returns the latest epoch
    function currentEpoch() public view returns (Epoch memory epoch) {
        epoch = epochs[currentEpochId];
    }

    // finalizedEpoch returns the finalized epoch
    // the epoch won't be recommitted by `recommitEpoch`
    // if there is no such epoch, the second return value will be false
    function finalizedEpoch()
        public
        view
        returns (Epoch memory epoch, bool exist)
    {
        uint256 lastIndex = currentEpochId + 1;
        for (uint256 i = lastIndex; i > 0; i--) {
            epoch = epochs[i - 1];
            if (block.number > epoch.endBlock) {
                return (epoch, true);
            }
        }
        // It's epoch 0 but not exist
        return (epoch, false);
    }

    // finalizedBlock returns the finalized block number
    function finalizedBlock() public view returns (uint256) {
        (Epoch memory epoch, bool exist) = finalizedEpoch();
        if (exist) {
            return epoch.endBlock;
        }
        // the last block of epoch 0
        // since the startBlock must not be 0, so it's safe to minus 1
        return epoch.startBlock - 1;
    }

    // get metis sequencer by block number
    function getMetisSequencer(uint256 _number) public view returns (address) {
        if (_number <= epochs[0].endBlock) {
            return epochs[0].signer;
        }

        // epoch number by block
        uint256 epochId = getEpochByBlock(_number);
        if (epochId == type(uint256).max) {
            return address(0);
        }

        Epoch memory epoch = epochs[epochId];
        return epoch.signer;
    }

    function commitEpoch(
        uint256 _newEpoch,
        uint256 _startBlock,
        uint256 _endBlock,
        address _signer
    ) external onlyMpc {
        uint256 curEpochId = currentEpochId;

        // the last epoch should be finished
        if (curEpochId > 1) {
            require(
                epochs[curEpochId - 1].endBlock < block.number,
                "The last epoch not finished"
            );
        }

        // check conditions
        require(_newEpoch == curEpochId + 1, "Invalid new epoch number");
        require(
            _endBlock > _startBlock,
            "End block must be greater than start block"
        );
        require(
            _endBlock - _startBlock + 1 == epochLength,
            "Mismatch epoch length and block length"
        );
        require(
            epochs[curEpochId].endBlock + 1 == _startBlock,
            "Start block must be greater than currentEpoch.endBlock by 1"
        );
        require(_signer != address(0), "Invalid signer");

        epochs[_newEpoch] = Epoch({
            number: _newEpoch,
            signer: _signer,
            startBlock: _startBlock,
            endBlock: _endBlock
        });

        currentEpochId = _newEpoch;
        emit NewEpoch(_newEpoch, _startBlock, _endBlock, _signer);
    }

    function recommitEpoch(
        uint256 _oldEpochId,
        uint256 _newEpochId,
        uint256 _startBlock,
        uint256 _endBlock,
        address _newSigner
    ) external onlyMpc {
        // check start block
        require(_startBlock == block.number, "Invalid start block");
        require(_newSigner != address(0), "Invalid signer");

        // Note: We do not check if the length between the start and end block matches the epoch length

        uint256 curEpochId = currentEpochId;
        // recommitEpoch occurs in the latest epoch
        if (_oldEpochId == curEpochId) {
            Epoch storage epoch = epochs[curEpochId];
            epoch.endBlock = block.number - 1;

            // craete new epoch
            require(_newEpochId == curEpochId + 1, "Invalid newEpochId");
            require(
                _endBlock > _startBlock,
                "End block must be greater than start block"
            );

            epochs[_newEpochId] = Epoch({
                number: _newEpochId,
                signer: _newSigner,
                startBlock: _startBlock,
                endBlock: _endBlock
            });
            currentEpochId = _newEpochId;
        }
        // recommitEpoch occurs in last but one epoch
        else if (_oldEpochId + 1 == curEpochId) {
            Epoch storage epoch = epochs[_oldEpochId];
            // ensure that finilized epoch can't be changed
            require(
                epoch.endBlock > block.number,
                "The last epoch is finished"
            );
            epoch.endBlock = block.number - 1;

            // update latest epoch
            require(_newEpochId == curEpochId, "Invalid newEpochId");
            require(
                _endBlock > _startBlock,
                "End block must be greater than start block"
            );

            Epoch storage existNewEpoch = epochs[_newEpochId];
            existNewEpoch.signer = _newSigner;
            existNewEpoch.startBlock = _startBlock;
            existNewEpoch.endBlock = _endBlock;
        } else {
            revert("Invalid oldEpochId");
        }

        emit ReCommitEpoch(
            _oldEpochId,
            _newEpochId,
            curEpochId,
            _startBlock,
            _endBlock,
            _newSigner
        );
    }
}
