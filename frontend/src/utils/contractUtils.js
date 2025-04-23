import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../contract-config';

// Import ABIs - make sure we use the correct path
import LendingPoolABI from '../abi/LendingPool.json';
import BorrowingPoolABI from '../abi/BorrowingPool.json';
import MockDAIABI from '../abi/MockDAI.json';
import PriceOracleABI from '../abi/MockPriceOracle.json';

// Get contract instances
export const getContractInstances = async (signer) => {
  try {
    const lendingPool = new ethers.Contract(
      CONTRACT_ADDRESSES.LENDING_POOL,
      LendingPoolABI.abi,
      signer
    );
    
    const borrowingPool = new ethers.Contract(
      CONTRACT_ADDRESSES.BORROWING_POOL,
      BorrowingPoolABI.abi,
      signer
    );
    
    const mockDAI = new ethers.Contract(
      CONTRACT_ADDRESSES.MOCK_DAI,
      MockDAIABI.abi,
      signer
    );
    
    const priceOracle = new ethers.Contract(
      CONTRACT_ADDRESSES.MOCK_PRICE_ORACLE,
      PriceOracleABI.abi,
      signer
    );
    
    return { lendingPool, borrowingPool, mockDAI, priceOracle };
  } catch (error) {
    console.error("Error initializing contracts:", error);
    return null;
  }
};

// Lending Pool Functions
export const depositToLendingPool = async (lendingPool, amount) => {
  try {
    console.log("Depositing to lending pool with amount:", amount.toString());
    const tx = await lendingPool.deposit({ 
      value: amount,
      gasLimit: 500000 // Set high gas limit to avoid estimation issues
    });
    console.log("Deposit transaction sent:", tx.hash);
    return await tx.wait();
  } catch (error) {
    console.error("Error depositing to lending pool:", error);
    throw error;
  }
};

export const withdrawFromLendingPool = async (lendingPool, amount) => {
  try {
    console.log("Withdrawing from lending pool:", amount.toString());
    const tx = await lendingPool.withdraw(amount, {
      gasLimit: 500000 // Set high gas limit to avoid estimation issues
    });
    console.log("Withdraw transaction sent:", tx.hash);
    return await tx.wait();
  } catch (error) {
    console.error("Error withdrawing from lending pool:", error);
    throw error;
  }
};

// Get interest rate - handles both function names
export const getInterestRate = async (lendingPool) => {
  try {
    // Try multiple function names in sequence
    try {
      console.log("Trying getLendingInterestRate...");
      return await lendingPool.getLendingInterestRate();
    } catch (e1) {
      console.log("getLendingInterestRate failed:", e1.message);
      try {
        console.log("Trying getInterestRate...");
        return await lendingPool.getInterestRate();
      } catch (e2) {
        console.log("getInterestRate failed:", e2.message);
        try {
          console.log("Trying to access interestRateBasisPoints directly...");
          return await lendingPool.interestRateBasisPoints();
        } catch (e3) {
          console.log("interestRateBasisPoints access failed:", e3.message);
          throw e3;
        }
      }
    }
  } catch (error) {
    console.error("Error getting interest rate:", error);
    return ethers.parseUnits("300", 0); // Default to 300 basis points (3%)
  }
};

// Borrowing Pool Functions
export const borrowFromPool = async (borrowingPool, amount) => {
  try {
    const tx = await borrowingPool.borrowDAI(amount, {
      gasLimit: 500000 // Set high gas limit to avoid estimation issues
    });
    return await tx.wait();
  } catch (error) {
    console.error("Error borrowing from pool:", error);
    throw error;
  }
};

export const depositCollateral = async (borrowingPool, amount) => {
  try {
    const tx = await borrowingPool.depositCollateral({ 
      value: amount,
      gasLimit: 500000 // Set high gas limit to avoid estimation issues
    });
    return await tx.wait();
  } catch (error) {
    console.error("Error depositing collateral:", error);
    throw error;
  }
};

export const repayLoan = async (borrowingPool, amount) => {
  try {
    const tx = await borrowingPool.repayLoan(amount, {
      gasLimit: 500000 // Set high gas limit to avoid estimation issues
    });
    return await tx.wait();
  } catch (error) {
    console.error("Error repaying loan:", error);
    throw error;
  }
};

// Token Functions
export const approveDAI = async (mockDAI, spender, amount) => {
  try {
    const tx = await mockDAI.approve(spender, amount, {
      gasLimit: 200000 // Set high gas limit to avoid estimation issues
    });
    return await tx.wait();
  } catch (error) {
    console.error("Error approving DAI:", error);
    throw error;
  }
};

export const getDAIBalance = async (mockDAI, address) => {
  try {
    return await mockDAI.balanceOf(address);
  } catch (error) {
    console.error("Error getting DAI balance:", error);
    return ethers.parseUnits("0", 18);
  }
};

// Oracle Functions
export const getEthPrice = async (priceOracle) => {
  try {
    return await priceOracle.getEthPrice();
  } catch (error) {
    console.error("Error getting ETH price:", error);
    return ethers.parseUnits("1000", 0); // Default fallback price
  }
}; 