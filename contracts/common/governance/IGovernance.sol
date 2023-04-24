pragma solidity ^0.8.0;

interface IGovernance {
    function update(address target, bytes calldata data) external;
}
