// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title LendingPool
 * @dev Handles deposits from lenders and manages interest rates
 */
contract LendingPool {
    // Track user balances and deposit timestamps
    struct UserDeposit {
        uint256 amount;
        uint256 depositTime;
        uint256 lastInterestCalcTime;
    }
    
    mapping(address => UserDeposit) public deposits;
    
    // Total pool size in ETH
    uint256 public totalDeposits;
    
    // Interest rate (annual) in basis points (3% = 300)
    uint256 public interestRateBasisPoints = 300;
    
    // Owner of the contract
    address public owner;
    
    // Events
    event Deposited(address indexed lender, uint256 amount);
    event Withdrawn(address indexed lender, uint256 amount);
    event InterestRateUpdated(uint256 newRate);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // Deposit ETH into the lending pool
    function deposit() external payable {
        require(msg.value > 0, "Deposit must be greater than 0");
        
        // Calculate any pending interest first if user has an existing deposit
        if (deposits[msg.sender].amount > 0) {
            _calculateInterest(msg.sender);
        } else {
            // New deposit
            deposits[msg.sender] = UserDeposit({
                amount: 0,
                depositTime: block.timestamp,
                lastInterestCalcTime: block.timestamp
            });
        }
        
        // Update user's deposit amount
        deposits[msg.sender].amount += msg.value;
        totalDeposits += msg.value;
        
        emit Deposited(msg.sender, msg.value);
    }
    
    // Withdraw ETH from the lending pool (including interest)
    function withdraw(uint256 amount) external {
        // Calculate pending interest first
        _calculateInterest(msg.sender);
        
        require(deposits[msg.sender].amount >= amount, "Insufficient balance");
        
        deposits[msg.sender].amount -= amount;
        totalDeposits -= amount;
        
        payable(msg.sender).transfer(amount);
        emit Withdrawn(msg.sender, amount);
    }
    
    // Calculate pending interest for a user
    function _calculateInterest(address user) internal {
        UserDeposit storage userDeposit = deposits[user];
        
        // Skip if no deposit or just deposited
        if (userDeposit.amount == 0 || userDeposit.lastInterestCalcTime == block.timestamp) {
            return;
        }
        
        // Calculate time elapsed since last interest calculation
        uint256 timeElapsed = block.timestamp - userDeposit.lastInterestCalcTime;
        
        // Calculate interest: principal * rate * timeElapsed / (365 days * 10000)
        // Rate is in basis points (100 = 1%)
        uint256 interest = (userDeposit.amount * interestRateBasisPoints * timeElapsed) / (365 days * 10000);
        
        // Add interest to user's balance
        userDeposit.amount += interest;
        totalDeposits += interest;
        
        // Update last interest calculation time
        userDeposit.lastInterestCalcTime = block.timestamp;
    }
    
    // View function to check current balance including pending interest
    function getBalance(address user) external view returns (uint256) {
        UserDeposit memory userDeposit = deposits[user];
        
        // If no deposit, return 0
        if (userDeposit.amount == 0) {
            return 0;
        }
        
        // Calculate pending interest (read-only)
        uint256 timeElapsed = block.timestamp - userDeposit.lastInterestCalcTime;
        uint256 pendingInterest = (userDeposit.amount * interestRateBasisPoints * timeElapsed) / (365 days * 10000);
        
        return userDeposit.amount + pendingInterest;
    }
    
    // Get total pool balance (contract balance)
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // Set a new interest rate (only owner)
    function setInterestRate(uint256 newRateBasisPoints) external onlyOwner {
        require(newRateBasisPoints <= 1000, "Interest rate too high"); // Max 10%
        interestRateBasisPoints = newRateBasisPoints;
        emit InterestRateUpdated(newRateBasisPoints);
    }
    
    // Get current annual interest rate in basis points
    function getInterestRate() external view returns (uint256) {
        return interestRateBasisPoints;
    }
    
    // Allow the contract to receive ETH
    receive() external payable {}
}
