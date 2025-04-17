import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../contract-config';

// Import ABIs
import LendingPoolABI from '../abis/LendingPool.json';
import BorrowingPoolABI from '../abis/BorrowingPool.json';
import MockDAIABI from '../abis/MockDAI.json';
import PriceOracleABI from '../abis/PriceOracle.json';

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
      CONTRACT_ADDRESSES.PRICE_ORACLE,
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
    const tx = await lendingPool.deposit({ value: amount });
    return await tx.wait();
  } catch (error) {
    console.error("Error depositing to lending pool:", error);
    throw error;
  }
};

export const withdrawFromLendingPool = async (lendingPool, amount) => {
  try {
    const tx = await lendingPool.withdraw(amount);
    return await tx.wait();
  } catch (error) {
    console.error("Error withdrawing from lending pool:", error);
    throw error;
  }
};

// Get interest rate - handles both function names
export const getInterestRate = async (lendingPool) => {
  try {
    // First try getLendingInterestRate (from ABI)
    try {
      return await lendingPool.getLendingInterestRate();
    } catch (e) {
      // Fall back to getInterestRate (from contract)
      return await lendingPool.getInterestRate();
    }
  } catch (error) {
    console.error("Error getting interest rate:", error);
    return ethers.BigNumber.from(0);
  }
};

// Borrowing Pool Functions
export const borrowFromPool = async (borrowingPool, amount) => {
  try {
    const tx = await borrowingPool.borrowDAI(amount);
    return await tx.wait();
  } catch (error) {
    console.error("Error borrowing from pool:", error);
    throw error;
  }
};

export const depositCollateral = async (borrowingPool, amount) => {
  try {
    const tx = await borrowingPool.depositCollateral({ value: amount });
    return await tx.wait();
  } catch (error) {
    console.error("Error depositing collateral:", error);
    throw error;
  }
};

export const repayLoan = async (borrowingPool, amount) => {
  try {
    const tx = await borrowingPool.repayLoan(amount);
    return await tx.wait();
  } catch (error) {
    console.error("Error repaying loan:", error);
    throw error;
  }
};

// Token Functions
export const approveDAI = async (mockDAI, spender, amount) => {
  try {
    const tx = await mockDAI.approve(spender, amount);
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
    return ethers.BigNumber.from(0);
  }
};

// Oracle Functions
export const getEthPrice = async (priceOracle) => {
  try {
    return await priceOracle.getEthPrice();
  } catch (error) {
    console.error("Error getting ETH price:", error);
    return ethers.BigNumber.from(0);
  }
}; 