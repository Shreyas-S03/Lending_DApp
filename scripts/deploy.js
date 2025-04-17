const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying contracts...");
  
  // Deploy LendingPool contract
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy();
  await lendingPool.waitForDeployment();
  console.log("LendingPool deployed to:", lendingPool.target);
  
  // Deploy MockPriceOracle with initial ETH price (2000 USD with 18 decimals)
  const initialEthPrice = ethers.parseEther("2000");
  const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
  const priceOracle = await MockPriceOracle.deploy(initialEthPrice);
  await priceOracle.waitForDeployment();
  console.log("MockPriceOracle deployed to:", priceOracle.target);
  
  // Deploy MockDAI
  const MockDAI = await ethers.getContractFactory("MockDAI");
  const mockDAI = await MockDAI.deploy();
  await mockDAI.waitForDeployment();
  console.log("MockDAI deployed to:", mockDAI.target);
  
  // Deploy BorrowingPool with addresses of other contracts
  const BorrowingPool = await ethers.getContractFactory("BorrowingPool");
  const borrowingPool = await BorrowingPool.deploy(
    lendingPool.target,
    priceOracle.target,
    mockDAI.target
  );
  await borrowingPool.waitForDeployment();
  console.log("BorrowingPool deployed to:", borrowingPool.target);
  
  // Transfer ownership of MockDAI to BorrowingPool so it can mint/burn tokens
  await mockDAI.transferOwnership(borrowingPool.target);
  console.log("MockDAI ownership transferred to BorrowingPool");
  
  // Log deployment information for frontend configuration
  console.log("\nDeployment summary:");
  console.log("===================");
  console.log(`LendingPool: "${lendingPool.target}",`);
  console.log(`MockPriceOracle: "${priceOracle.target}",`);
  console.log(`MockDAI: "${mockDAI.target}",`);
  console.log(`BorrowingPool: "${borrowingPool.target}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
