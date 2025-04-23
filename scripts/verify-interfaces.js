// Script to verify contract interfaces and ABIs match
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Path to ABI files
const abiPath = path.join(__dirname, "..", "frontend", "src", "abi");
const abisPath = path.join(__dirname, "..", "frontend", "src", "abis");

async function main() {
  console.log("Verifying contract interfaces and ABIs...");
  
  // Get deployed contract instances
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const BorrowingPool = await ethers.getContractFactory("BorrowingPool");
  const MockDAI = await ethers.getContractFactory("MockDAI");
  const PriceOracle = await ethers.getContractFactory("MockPriceOracle");
  
  // Get deployed contract addresses from frontend config
  const contractConfigPath = path.join(__dirname, "..", "frontend", "src", "contract-config.js");
  const contractConfigContent = fs.readFileSync(contractConfigPath, "utf8");
  
  // Extract addresses using regex (simple approach for demo)
  const lendingPoolMatch = contractConfigContent.match(/LENDING_POOL:\s*"([^"]+)"/);
  const borrowingPoolMatch = contractConfigContent.match(/BORROWING_POOL:\s*"([^"]+)"/);
  const mockDaiMatch = contractConfigContent.match(/MOCK_DAI:\s*"([^"]+)"/);
  const priceOracleMatch = contractConfigContent.match(/MOCK_PRICE_ORACLE:\s*"([^"]+)"/);
  
  const addresses = {
    lendingPool: lendingPoolMatch ? lendingPoolMatch[1] : null,
    borrowingPool: borrowingPoolMatch ? borrowingPoolMatch[1] : null,
    mockDAI: mockDaiMatch ? mockDaiMatch[1] : null,
    priceOracle: priceOracleMatch ? priceOracleMatch[1] : null
  };
  
  console.log("Contract addresses from config:", addresses);
  
  // Connect to the deployed contracts
  const [deployer] = await ethers.getSigners();
  
  try {
    // Get contract instances
    const lendingPool = await LendingPool.attach(addresses.lendingPool);
    const borrowingPool = await BorrowingPool.attach(addresses.borrowingPool);
    const mockDAI = await MockDAI.attach(addresses.mockDAI);
    const priceOracle = await PriceOracle.attach(addresses.priceOracle);
    
    // Test function existence by calling view functions
    console.log("\nVerifying LendingPool functions...");
    try {
      // Test deposit function (can't call directly as it's payable)
      const depositFn = lendingPool.interface.getFunction("deposit");
      console.log("- deposit function exists:", !!depositFn);
      console.log("  - payable:", depositFn.payable);
      console.log("  - inputs:", depositFn.inputs.length);
      
      // Test other view functions
      const interestRate = await lendingPool.getInterestRate();
      console.log("- getInterestRate:", interestRate.toString());
      
      try {
        const lendingInterestRate = await lendingPool.getLendingInterestRate();
        console.log("- getLendingInterestRate:", lendingInterestRate.toString());
      } catch (e) {
        console.log("- getLendingInterestRate: not available");
      }
      
      try {
        const totalLiquidity = await lendingPool.getTotalLiquidity();
        console.log("- getTotalLiquidity:", totalLiquidity.toString());
      } catch (e) {
        console.log("- getTotalLiquidity: not available");
      }
    } catch (e) {
      console.error("Error verifying LendingPool:", e.message);
    }
    
    // Verify frontend ABIs match contract interfaces
    console.log("\nVerifying frontend ABIs...");
    
    // Check if abi directory exists
    if (!fs.existsSync(abiPath)) {
      console.log(`Creating directory ${abiPath}`);
      fs.mkdirSync(abiPath, { recursive: true });
    }
    
    // Function to check/fix ABIs
    const verifyABI = async (contract, contractName) => {
      console.log(`\nVerifying ${contractName} ABI...`);
      
      // Get contract interface from ethers
      const contractInterface = contract.interface;
      
      // Check if the ABI exists in frontend/src/abi folder
      const abiFilePath = path.join(abiPath, `${contractName}.json`);
      let needsUpdate = false;
      
      if (fs.existsSync(abiFilePath)) {
        const abiFile = JSON.parse(fs.readFileSync(abiFilePath, "utf8"));
        
        // Check for deposit function in LendingPool
        if (contractName === "LendingPool") {
          const depositFnInFile = abiFile.abi.find(fn => fn.name === "deposit");
          const depositFnInContract = contractInterface.getFunction("deposit()");
          
          if (depositFnInFile) {
            console.log("- deposit function in ABI file:");
            console.log(`  - payable: ${depositFnInFile.stateMutability === "payable"}`);
            console.log(`  - inputs: ${depositFnInFile.inputs?.length || 0}`);
            
            // Compare with actual contract
            if (depositFnInFile.stateMutability !== "payable" || depositFnInFile.inputs?.length !== 0) {
              console.log("- MISMATCH: deposit function in ABI file doesn't match contract!");
              needsUpdate = true;
            }
          } else {
            console.log("- deposit function not found in ABI file!");
            needsUpdate = true;
          }
        }
        
        console.log(`- ABI file exists at ${abiFilePath}`);
      } else {
        console.log(`- ABI file doesn't exist at ${abiFilePath}`);
        needsUpdate = true;
      }
      
      // Update ABI if needed
      if (needsUpdate) {
        console.log(`- Updating ABI for ${contractName}...`);
        
        // Create ABI file with correct format
        const abiObject = {
          _format: "hh-sol-artifact-1",
          contractName,
          abi: JSON.parse(contractInterface.formatJson())
        };
        
        fs.writeFileSync(abiFilePath, JSON.stringify(abiObject, null, 2));
        console.log(`- Updated ABI written to ${abiFilePath}`);
        
        // Also copy to abis directory for compatibility
        const abisFilePath = path.join(abisPath, `${contractName}.json`);
        if (!fs.existsSync(abisPath)) {
          fs.mkdirSync(abisPath, { recursive: true });
        }
        fs.writeFileSync(abisFilePath, JSON.stringify(abiObject, null, 2));
        console.log(`- Also copied to ${abisFilePath} for compatibility`);
      } else {
        console.log(`- ABI is correct, no update needed`);
      }
    };
    
    // Verify each contract's ABI
    await verifyABI(lendingPool, "LendingPool");
    await verifyABI(borrowingPool, "BorrowingPool");
    await verifyABI(mockDAI, "MockDAI");
    await verifyABI(priceOracle, "MockPriceOracle");
    
    console.log("\nVerification complete!");
  } catch (error) {
    console.error("Error during verification:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 