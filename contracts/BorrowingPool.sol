// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./LendingPool.sol";
import "./MockPriceOracle.sol";
import "./MockDAI.sol";

contract BorrowingPool {
    // Constants
    uint256 public constant COLLATERAL_RATIO = 150; // 150% collateralization required
    uint256 public constant LIQUIDATION_THRESHOLD = 120; // 120% triggers liquidation

    // State variables
    LendingPool public lendingPool;
    MockPriceOracle public priceOracle;
    MockDAI public daiToken;
    
    // Struct to track loan data
    struct Loan {
        uint256 collateralAmount;
        uint256 borrowedAmount;
        bool active;
    }
    
    // Track user loans
    mapping(address => Loan) public loans;
    
    // Events
    event CollateralDeposited(address indexed borrower, uint256 amount);
    event LoanTaken(address indexed borrower, uint256 collateralAmount, uint256 borrowedAmount);
    event LoanRepaid(address indexed borrower, uint256 amount);
    event CollateralWithdrawn(address indexed borrower, uint256 amount);
    event LoanLiquidated(address indexed borrower, uint256 collateralAmount, uint256 debtAmount);
    
    constructor(address payable _lendingPoolAddress, address _priceOracleAddress, address _daiTokenAddress) {
        lendingPool = LendingPool(_lendingPoolAddress);
        priceOracle = MockPriceOracle(_priceOracleAddress);
        daiToken = MockDAI(_daiTokenAddress);
    }
    
    // Deposit ETH as collateral
    function depositCollateral() external payable {
        require(msg.value > 0, "Collateral must be greater than 0");
        
        Loan storage loan = loans[msg.sender];
        
        // If loan exists, add to collateral
        if (loan.active) {
            loan.collateralAmount += msg.value;
        } else {
            // Create new loan entry with collateral
            loans[msg.sender] = Loan({
                collateralAmount: msg.value,
                borrowedAmount: 0,
                active: true
            });
        }
        
        emit CollateralDeposited(msg.sender, msg.value);
    }
    
    // Calculate maximum borrowable amount based on collateral
    function getMaxBorrowAmount(address borrower) public view returns (uint256) {
        Loan memory loan = loans[borrower];
        
        if (!loan.active || loan.collateralAmount == 0) {
            return 0;
        }
        
        // Get ETH/DAI price from oracle
        uint256 ethPrice = priceOracle.getEthPrice();
        
        // Calculate collateral value in DAI
        uint256 collateralValue = (loan.collateralAmount * ethPrice) / 1e18;
        
        // Maximum borrow amount based on collateral ratio (divide by 100 for percentage)
        return (collateralValue * 100) / COLLATERAL_RATIO;
    }
    
    // Borrow DAI tokens based on ETH collateral
    function borrowDAI(uint256 amount) external {
        require(amount > 0, "Borrow amount must be greater than 0");
        
        Loan storage loan = loans[msg.sender];
        require(loan.active, "No active collateral found");
        
        uint256 maxBorrowAmount = getMaxBorrowAmount(msg.sender);
        require(loan.borrowedAmount + amount <= maxBorrowAmount, "Insufficient collateral for borrow amount");
        
        // Update loan records
        loan.borrowedAmount += amount;
        
        // Mint and transfer DAI to borrower
        daiToken.mint(msg.sender, amount);
        
        emit LoanTaken(msg.sender, loan.collateralAmount, amount);
    }
    
    // Repay DAI loan (partial or full)
    function repayLoan(uint256 amount) external {
        Loan storage loan = loans[msg.sender];
        require(loan.active && loan.borrowedAmount > 0, "No active loan to repay");
        require(amount > 0 && amount <= loan.borrowedAmount, "Invalid repayment amount");
        
        // Transfer DAI from user to this contract
        require(daiToken.transferFrom(msg.sender, address(this), amount), "DAI transfer failed");
        
        // Burn the returned DAI
        daiToken.burn(amount);
        
        // Update loan
        loan.borrowedAmount -= amount;
        
        emit LoanRepaid(msg.sender, amount);
    }
    
    // Withdraw collateral (if loan health allows it)
    function withdrawCollateral(uint256 amount) external {
        Loan storage loan = loans[msg.sender];
        require(loan.active, "No active collateral found");
        require(amount > 0 && amount <= loan.collateralAmount, "Invalid withdrawal amount");
        
        // If there's an outstanding loan, check if remaining collateral is sufficient
        if (loan.borrowedAmount > 0) {
            uint256 remainingCollateral = loan.collateralAmount - amount;
            uint256 ethPrice = priceOracle.getEthPrice();
            uint256 remainingCollateralValue = (remainingCollateral * ethPrice) / 1e18;
            
            // Required collateral value based on the health factor
            uint256 requiredCollateralValue = (loan.borrowedAmount * COLLATERAL_RATIO) / 100;
            
            require(remainingCollateralValue >= requiredCollateralValue, "Withdrawal would put loan below safe collateral ratio");
        }
        
        // Update loan
        loan.collateralAmount -= amount;
        
        // If no more collateral and no borrowed amount, deactivate loan
        if (loan.collateralAmount == 0 && loan.borrowedAmount == 0) {
            loan.active = false;
        }
        
        // Transfer ETH back to user
        payable(msg.sender).transfer(amount);
        
        emit CollateralWithdrawn(msg.sender, amount);
    }
    
    // Check loan health (100 = healthy, <100 = unhealthy)
    function checkLoanHealth(address borrower) public view returns (uint256) {
        Loan memory loan = loans[borrower];
        
        if (!loan.active || loan.borrowedAmount == 0) {
            return 100; // No loan or no borrowed amount means fully healthy
        }
        
        uint256 ethPrice = priceOracle.getEthPrice();
        uint256 collateralValue = (loan.collateralAmount * ethPrice) / 1e18;
        
        // Required collateral value based on the liquidation threshold
        uint256 requiredCollateralValue = (loan.borrowedAmount * LIQUIDATION_THRESHOLD) / 100;
        
        if (collateralValue >= requiredCollateralValue) {
            return 100; // Healthy
        } else {
            // Health percentage (less than 100 means unhealthy)
            return (collateralValue * 100) / requiredCollateralValue;
        }
    }
    
    // Liquidate unhealthy loan (can be called by anyone)
    function liquidateLoan(address borrower) external {
        Loan storage loan = loans[borrower];
        require(loan.active && loan.borrowedAmount > 0, "No active loan to liquidate");
        
        uint256 health = checkLoanHealth(borrower);
        require(health < 100, "Loan is still healthy, cannot liquidate");
        
        // Get loan details before liquidation
        uint256 collateralAmount = loan.collateralAmount;
        uint256 debtAmount = loan.borrowedAmount;
        
        // Reset loan to prevent reentrancy
        loan.collateralAmount = 0;
        loan.borrowedAmount = 0;
        loan.active = false;
        
        // Send collateral to liquidator
        payable(msg.sender).transfer(collateralAmount);
        
        emit LoanLiquidated(borrower, collateralAmount, debtAmount);
    }
    
    // Get loan details
    function getLoanDetails(address borrower) external view returns (uint256 collateralAmount, uint256 borrowedAmount, bool active) {
        Loan memory loan = loans[borrower];
        return (loan.collateralAmount, loan.borrowedAmount, loan.active);
    }
} 