# contracts
Ethereum smart contracts that power the Metis sequencer.

Users can apply to become a sequencer node by locking metis tokens. Of course, users can also unlock tokens and exit the sequencer node. Administrators can distribute rewards and update parameters related to reward distribution

![This is the overall structure diagram](/images/metis_arch.png)

Main contract code function introduction:
1. LockingNFT: Every user who successfully locks tokens and applies to become a sequencer will get an NFT. The tokenId of the NFT is the sequence id corresponding to the sequencer. On the contrary, when the unlocked token exits the sequencer, the corresponding NFT token will be destroyed
2. LockingInfo: This contract is mainly called by the LockingPool main contract, records and sends events on the chain
3. LockingPool: This contract is a main function contract, allowing users to lock tokens to apply to become a sequencer, receive rewards, unlock tokens to exit the sequencer, reward distribution, and other management functions can refer to the contract source code.

## Install Dependencies
```
npm install
```

## Compile Contracts
```
npm run compile
```

## Run Deploy
```
> set .env
npm run deploy
```
****
## Others
```
see scripts
```
