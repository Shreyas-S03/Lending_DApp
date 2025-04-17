import { ethers } from 'ethers';
import contractConfig from '../contract-config';

// Contract ABIs
import LendingPoolABI from '../abis/LendingPool.json';
import BorrowingPoolABI from '../abis/BorrowingPool.json';
import MockDaiABI from '../abis/MockDAI.json';
import PriceOracleABI from '../abis/PriceOracle.json';

// Supported network IDs - add all networks your dApp supports
const SUPPORTED_NETWORKS = [
  1337, // Local development
  31337, // Hardhat
  80001, // Mumbai testnet
  // Add mainnet and other networks as needed
];

/**
 * Check if the connected network is supported
 * @param {number} chainId - The chain ID to check
 * @returns {boolean} - Whether the network is supported
 */
export const checkNetwork = (chainId) => {
  return SUPPORTED_NETWORKS.includes(chainId);
};

// Get contract instances with provider or signer
export const getContractInstance = (address, abi, signerOrProvider) => {
  return new ethers.Contract(address, abi, signerOrProvider);
};

// Get provider based on environment
export const getProvider = () => {
  // For local development
  if (window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum);
  }
  
  // Fallback to a public RPC
  return new ethers.providers.JsonRpcProvider("http://localhost:8545");
};

// Get contract instances for the dApp
export const getContracts = async (signer) => {
  if (!signer) {
    throw new Error('Signer is required to initialize contracts');
  }

  try {
    const lendingPool = new ethers.Contract(
      contractConfig.LENDING_POOL,
      LendingPoolABI.abi,
      signer
    );

    const borrowingPool = new ethers.Contract(
      contractConfig.BORROWING_POOL,
      BorrowingPoolABI.abi,
      signer
    );

    const mockDai = new ethers.Contract(
      contractConfig.MOCK_DAI,
      MockDaiABI.abi,
      signer
    );

    const priceOracle = new ethers.Contract(
      contractConfig.PRICE_ORACLE,
      PriceOracleABI.abi,
      signer
    );

    return {
      lendingPool,
      borrowingPool,
      mockDai,
      priceOracle
    };
  } catch (error) {
    console.error('Failed to initialize contracts:', error);
    throw error;
  }
};

/**
 * Format an amount as a human-readable string with the specified token symbol
 * @param {ethers.BigNumber} amount - The amount to format
 * @param {number} decimals - Number of decimals in the token
 * @param {string} symbol - Token symbol
 * @returns {string} - Formatted amount with symbol
 */
export const formatAmount = (amount, decimals = 18, symbol = '') => {
  if (!amount) return '0';
  
  const formattedAmount = ethers.utils.formatUnits(amount, decimals);
  const trimmedAmount = parseFloat(formattedAmount).toFixed(4);
  
  return symbol ? `${trimmedAmount} ${symbol}` : trimmedAmount;
};

/**
 * Parse a string amount to wei (BigNumber)
 * @param {string} amount - Amount as string
 * @param {number} decimals - Number of decimals
 * @returns {ethers.BigNumber} - Amount as BigNumber
 */
export const parseAmount = (amount, decimals = 18) => {
  try {
    return ethers.utils.parseUnits(amount, decimals);
  } catch (error) {
    console.error('Error parsing amount:', error);
    return ethers.BigNumber.from(0);
  }
};

/**
 * Get the network name from chain ID
 * @param {number} chainId - The chain ID
 * @returns {string} - Network name
 */
export const getNetworkName = (chainId) => {
  const networks = {
    1: 'Ethereum Mainnet',
    3: 'Ropsten Testnet',
    4: 'Rinkeby Testnet',
    5: 'Goerli Testnet',
    42: 'Kovan Testnet',
    56: 'Binance Smart Chain',
    137: 'Polygon Mainnet',
    80001: 'Mumbai Testnet',
    1337: 'Local Development',
    31337: 'Hardhat Network'
  };
  
  return networks[chainId] || `Unknown Network (${chainId})`;
}; 