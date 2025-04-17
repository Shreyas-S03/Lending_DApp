// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract MockPriceOracle {
    // ETH/USD price in 18 decimals (e.g., 2000 * 10^18 = 2000 USD per ETH)
    uint256 private ethPrice;
    
    // Owner can update the price
    address public owner;
    
    event PriceUpdated(uint256 newPrice);
    
    constructor(uint256 _initialEthPrice) {
        ethPrice = _initialEthPrice;
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // Set a new ETH/USD price (only by owner)
    function setEthPrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "Price must be greater than 0");
        ethPrice = _newPrice;
        emit PriceUpdated(_newPrice);
    }
    
    // Get the current ETH/USD price
    function getEthPrice() external view returns (uint256) {
        return ethPrice;
    }
    
    // Transfer ownership (optional)
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "New owner cannot be zero address");
        owner = _newOwner;
    }
} 