// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
contract Counter {
    uint256 public value;
    event Changed(address indexed sender, uint256 value);
    function set(uint256 next) external { value = next; emit Changed(msg.sender, next); }
}
