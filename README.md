# Metis Sequencer Contracts

Ethereum smart contracts that power the Metis sequencer.

Users can apply to become a sequencer node by locking metis tokens, and they can also unlock tokens and exit the sequencer node.

Administrators can distribute rewards and update parameters related to reward distribution.

![This is the overall structure diagram](/images/metis_arch.png)

Main contract code function introduction:

1. LockingPool: This contract is a main function contract, allowing users to lock tokens to apply to become a sequencer, receive rewards, unlock tokens to exit the sequencer, reward distribution, and other management functions can refer to the contract source code.
2. LockingInfo: This contract keeps locked tokens information for LockingPool
3. MetisSequencerSet: This contract controls blocks production on metis layer2

# Example

Deploy

```console
$ cp .env.example .env
$ # Edit the .env with correct values
$ # deploy L1 contracts
$ npx hardhat deploy --network holesky --tags l1
$ # deploy L2 contracts
$ npx hardhat deploy --network metis-holesky --tags l2
```

Verify

```console
$ npx hardhat etherscan-verify --network holesky
$ npx hardhat etherscan-verify --network metis-holesky
```
