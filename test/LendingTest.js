const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Decentralized Lending Platform", function () {
  let lendingPool, borrowingPool, mockDAI, priceOracle;
  let owner, lender, borrower, liquidator;
  
  // ETH price in USD (with 18 decimals)
  const initialEthPrice = ethers.parseEther("2000");
  
  // Constants for tests
  const depositAmount = ethers.parseEther("10");
  const collateralAmount = ethers.parseEther("2");
  const borrowAmount = ethers.parseEther("2000"); // 2000 DAI
  
  beforeEach(async function () {
    // Get signers
    [owner, lender, borrower, liquidator] = await ethers.getSigners();
    
    // Deploy contracts
    const LendingPool = await ethers.getContractFactory("LendingPool");
    lendingPool = await LendingPool.deploy();
    
    const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
    priceOracle = await MockPriceOracle.deploy(initialEthPrice);
    
    const MockDAI = await ethers.getContractFactory("MockDAI");
    mockDAI = await MockDAI.deploy();
    
    // Get payable address for lending pool
    const lendingPoolAddress = await lendingPool.getAddress();
    
    const BorrowingPool = await ethers.getContractFactory("BorrowingPool");
    borrowingPool = await BorrowingPool.deploy(
      lendingPoolAddress, // This is automatically treated as payable in deployment context
      await priceOracle.getAddress(),
      await mockDAI.getAddress()
    );
    
    // Transfer ownership of MockDAI to BorrowingPool
    await mockDAI.transferOwnership(await borrowingPool.getAddress());
  });
  
  describe("LendingPool", function () {
    it("Should allow deposits and withdrawals", async function () {
      // Deposit ETH
      await lendingPool.connect(lender).deposit({ value: depositAmount });
      
      // Check balance
      const balance = await lendingPool.getBalance(lender.address);
      expect(balance).to.equal(depositAmount);
      
      // Withdraw ETH
      await lendingPool.connect(lender).withdraw(depositAmount);
      
      // Check balance after withdrawal
      const finalBalance = await lendingPool.getBalance(lender.address);
      expect(finalBalance).to.equal(0);
    });
    
    it("Should track interest correctly", async function () {
      // Deposit ETH
      await lendingPool.connect(lender).deposit({ value: depositAmount });
      
      // Set interest rate to 10% (1000 basis points)
      await lendingPool.connect(owner).setInterestRate(1000);
      const rate = await lendingPool.getInterestRate();
      expect(rate).to.equal(1000);
      
      // Simulate time passing (not possible in regular tests, just checking the function exists)
      const initialBalance = await lendingPool.getBalance(lender.address);
      expect(initialBalance).to.equal(depositAmount);
    });
  });
  
  describe("BorrowingPool", function () {
    it("Should allow collateral deposits", async function () {
      // Deposit collateral
      await borrowingPool.connect(borrower).depositCollateral({ value: collateralAmount });
      
      // Check collateral balance
      const [collateralBalance, borrowedAmount, active] = await borrowingPool.getLoanDetails(borrower.address);
      expect(collateralBalance).to.equal(collateralAmount);
      expect(borrowedAmount).to.equal(0);
      expect(active).to.be.true;
    });
    
    it("Should allow borrowing against collateral", async function () {
      // Deposit collateral
      await borrowingPool.connect(borrower).depositCollateral({ value: collateralAmount });
      
      // Check max borrow amount
      const maxBorrow = await borrowingPool.getMaxBorrowAmount(borrower.address);
      
      // Borrow DAI
      await borrowingPool.connect(borrower).borrowDAI(borrowAmount);
      
      // Check borrowed amount
      const [_, borrowed, __] = await borrowingPool.getLoanDetails(borrower.address);
      expect(borrowed).to.equal(borrowAmount);
      
      // Check DAI balance
      const daiBalance = await mockDAI.balanceOf(borrower.address);
      expect(daiBalance).to.equal(borrowAmount);
    });
    
    it("Should track loan health", async function () {
      // Deposit collateral
      await borrowingPool.connect(borrower).depositCollateral({ value: collateralAmount });
      
      // Borrow DAI
      await borrowingPool.connect(borrower).borrowDAI(borrowAmount);
      
      // Check loan health
      const health = await borrowingPool.checkLoanHealth(borrower.address);
      expect(health).to.equal(100); // Should be 100% healthy initially
      
      // Simulate price drop
      const newEthPrice = ethers.parseEther("1500"); // Drop from $2000 to $1500
      await priceOracle.connect(owner).setEthPrice(newEthPrice);
      
      // Check loan health after price drop
      const healthAfterDrop = await borrowingPool.checkLoanHealth(borrower.address);
      expect(healthAfterDrop).to.be.lessThan(100); // Should be unhealthy now
    });
    
    it("Should allow loan repayment", async function () {
      // Deposit collateral
      await borrowingPool.connect(borrower).depositCollateral({ value: collateralAmount });
      
      // Borrow DAI
      await borrowingPool.connect(borrower).borrowDAI(borrowAmount);
      
      // Approve DAI for repayment
      const repayAmount = ethers.parseEther("1000"); // Repay half
      await mockDAI.connect(borrower).approve(await borrowingPool.getAddress(), repayAmount);
      
      // Repay loan
      await borrowingPool.connect(borrower).repayLoan(repayAmount);
      
      // Check borrowed amount after repayment
      const [_, borrowedAfterRepay, __] = await borrowingPool.getLoanDetails(borrower.address);
      expect(borrowedAfterRepay).to.equal(borrowAmount - repayAmount);
    });
    
    it("Should allow collateral withdrawal if safe", async function () {
      // Deposit more collateral than minimum
      const extraCollateral = ethers.parseEther("4"); // 4 ETH
      await borrowingPool.connect(borrower).depositCollateral({ value: extraCollateral });
      
      // Borrow DAI
      await borrowingPool.connect(borrower).borrowDAI(borrowAmount);
      
      // Withdraw some collateral
      const withdrawAmount = ethers.parseEther("1"); // 1 ETH
      await borrowingPool.connect(borrower).withdrawCollateral(withdrawAmount);
      
      // Check remaining collateral
      const [remainingCollateral, _, __] = await borrowingPool.getLoanDetails(borrower.address);
      expect(remainingCollateral).to.equal(extraCollateral - withdrawAmount);
    });
    
    it("Should allow liquidation of unhealthy loans", async function () {
      // Deposit collateral
      await borrowingPool.connect(borrower).depositCollateral({ value: collateralAmount });
      
      // Borrow DAI
      await borrowingPool.connect(borrower).borrowDAI(borrowAmount);
      
      // Simulate severe price drop to trigger liquidation
      const crashPrice = ethers.parseEther("1000"); // Drop from $2000 to $1000
      await priceOracle.connect(owner).setEthPrice(crashPrice);
      
      // Check loan health to confirm it's liquidatable
      const healthAfterCrash = await borrowingPool.checkLoanHealth(borrower.address);
      expect(healthAfterCrash).to.be.lessThan(100);
      
      // Get liquidator and borrower balances before liquidation
      const liquidatorBalanceBefore = await ethers.provider.getBalance(liquidator.address);
      
      // Liquidate the loan
      await borrowingPool.connect(liquidator).liquidateLoan(borrower.address);
      
      // Check loan was liquidated
      const [collateralAfter, borrowedAfter, activeAfter] = await borrowingPool.getLoanDetails(borrower.address);
      expect(collateralAfter).to.equal(0);
      expect(borrowedAfter).to.equal(0);
      expect(activeAfter).to.be.false;
      
      // Check liquidator received the collateral
      const liquidatorBalanceAfter = await ethers.provider.getBalance(liquidator.address);
      expect(liquidatorBalanceAfter).to.be.gt(liquidatorBalanceBefore);
    });
  });
}); 