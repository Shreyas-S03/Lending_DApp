const { ethers } = require("hardhat");

async function main() {
  // Get list of local test accounts from Hardhat
  const [deployer, lender, borrower] = await ethers.getSigners();

  console.log("Interacting with contracts using accounts:");
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Lender: ${lender.address}`);
  console.log(`Borrower: ${borrower.address}`);
  console.log('-----------------------------------');

  // Load contract addresses - replace these with your deployed addresses
  // Note: You should update these with the addresses from your deployment
  const lendingPoolAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const priceOracleAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const mockDaiAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const borrowingPoolAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

  // Get contract instances
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const PriceOracle = await ethers.getContractFactory("MockPriceOracle");
  const MockDAI = await ethers.getContractFactory("MockDAI");
  const BorrowingPool = await ethers.getContractFactory("BorrowingPool");

  const lendingPool = LendingPool.attach(lendingPoolAddress);
  const priceOracle = PriceOracle.attach(priceOracleAddress);
  const mockDAI = MockDAI.attach(mockDaiAddress);
  const borrowingPool = BorrowingPool.attach(borrowingPoolAddress);

  console.log("Connected to contracts:");
  console.log(`LendingPool: ${lendingPoolAddress}`);
  console.log(`PriceOracle: ${priceOracleAddress}`);
  console.log(`MockDAI: ${mockDaiAddress}`);
  console.log(`BorrowingPool: ${borrowingPoolAddress}`);
  console.log('-----------------------------------');

  // 1. Check initial ETH price
  const ethPrice = await priceOracle.getEthPrice();
  console.log(`Current ETH price: ${ethers.formatEther(ethPrice)} USD`);
  console.log('-----------------------------------');

  // 2. Lender deposits 5 ETH to the lending pool
  console.log("LENDER ACTIONS:");
  const depositAmount = ethers.parseEther("5.0");
  console.log(`Lender deposits ${ethers.formatEther(depositAmount)} ETH to LendingPool`);
  
  const lenderDepositTx = await lendingPool.connect(lender).deposit({ value: depositAmount });
  await lenderDepositTx.wait();
  
  // Check lender balance
  const lenderBalance = await lendingPool.getBalance(lender.address);
  console.log(`Lender balance after deposit: ${ethers.formatEther(lenderBalance)} ETH`);
  console.log('-----------------------------------');

  // 3. Borrower deposits 2 ETH as collateral
  console.log("BORROWER ACTIONS:");
  const collateralAmount = ethers.parseEther("2.0");
  console.log(`Borrower deposits ${ethers.formatEther(collateralAmount)} ETH as collateral`);
  
  const collateralTx = await borrowingPool.connect(borrower).depositCollateral({ value: collateralAmount });
  await collateralTx.wait();
  
  // Get max borrow amount
  const maxBorrow = await borrowingPool.getMaxBorrowAmount(borrower.address);
  console.log(`Maximum borrowable amount: ${ethers.formatEther(maxBorrow)} DAI`);
  
  // 4. Borrower borrows 2000 DAI (assuming ETH price is 2000 USD, so ~66% of collateral)
  const borrowAmount = ethers.parseEther("2000");
  console.log(`Borrower borrows ${ethers.formatEther(borrowAmount)} DAI`);
  
  const borrowTx = await borrowingPool.connect(borrower).borrowDAI(borrowAmount);
  await borrowTx.wait();
  
  // Check DAI balance
  const daiBorrowerBalance = await mockDAI.balanceOf(borrower.address);
  console.log(`Borrower DAI balance: ${ethers.formatEther(daiBorrowerBalance)} DAI`);
  
  // Check loan health
  const loanHealth = await borrowingPool.checkLoanHealth(borrower.address);
  console.log(`Loan health: ${loanHealth}%`);
  console.log('-----------------------------------');

  // 5. Simulate price drop (25% drop in ETH price) to demonstrate liquidation risk
  console.log("PRICE ORACLE ACTIONS:");
  const newEthPrice = ethers.parseEther("1500"); // ETH price drops to $1500
  console.log(`Oracle updates ETH price to ${ethers.formatEther(newEthPrice)} USD`);
  
  await priceOracle.connect(deployer).setEthPrice(newEthPrice);
  
  // Check loan health after price drop
  const loanHealthAfterDrop = await borrowingPool.checkLoanHealth(borrower.address);
  console.log(`Loan health after price drop: ${loanHealthAfterDrop}%`);
  
  // Check if loan can be liquidated
  const canLiquidate = loanHealthAfterDrop < 100;
  console.log(`Can loan be liquidated? ${canLiquidate ? "YES" : "NO"}`);
  console.log('-----------------------------------');

  // 6. Borrower repays part of the loan
  console.log("BORROWER REPAYMENT:");
  const repayAmount = ethers.parseEther("1000"); // Repay 1000 DAI
  
  // First approve the BorrowingPool to transfer DAI
  await mockDAI.connect(borrower).approve(borrowingPool.target, repayAmount);
  console.log(`Borrower approves BorrowingPool to spend ${ethers.formatEther(repayAmount)} DAI`);
  
  // Then repay
  await borrowingPool.connect(borrower).repayLoan(repayAmount);
  console.log(`Borrower repays ${ethers.formatEther(repayAmount)} DAI`);
  
  // Check updated loan details
  const [collateralRemaining, borrowedRemaining, isActive] = await borrowingPool.getLoanDetails(borrower.address);
  console.log(`Loan status: active=${isActive}, collateral=${ethers.formatEther(collateralRemaining)} ETH, debt=${ethers.formatEther(borrowedRemaining)} DAI`);
  
  // Check loan health after repayment
  const loanHealthAfterRepay = await borrowingPool.checkLoanHealth(borrower.address);
  console.log(`Loan health after repayment: ${loanHealthAfterRepay}%`);
  console.log('-----------------------------------');

  // 7. Wait for interest to accrue (simulate time passing - this won't work in a script, just for demonstration)
  console.log("INTEREST ACCRUAL:");
  console.log("In a real environment, interest would accrue over time.");
  console.log("Current interest rate: " + (await lendingPool.getInterestRate()).toString() / 100 + "%");
  console.log('-----------------------------------');

  console.log("Script execution completed!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
