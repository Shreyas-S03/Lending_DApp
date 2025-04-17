import { useState, useEffect } from 'react';
import { ethers } from "ethers";

/**
 * Custom hook to check which function name is available on a contract
 * and store it for future use.
 * 
 * @param {Object} contract - The ethers contract instance
 * @param {Array<string>} possibleFunctionNames - Array of possible function names
 * @param {string} defaultFunctionName - Default function name to use if none are found
 * @returns {string} The actual function name to use
 */
export const useContractFunction = (contract, possibleFunctionNames, defaultFunctionName) => {
  const [functionName, setFunctionName] = useState(defaultFunctionName);
  
  useEffect(() => {
    const checkFunction = async () => {
      if (!contract) return;
      
      for (const name of possibleFunctionNames) {
        if (typeof contract[name] === 'function') {
          setFunctionName(name);
          console.log(`Found function ${name} on contract`);
          return;
        }
      }
      
      console.warn(`None of the function names [${possibleFunctionNames.join(', ')}] found, using default: ${defaultFunctionName}`);
    };
    
    checkFunction();
  }, [contract, possibleFunctionNames, defaultFunctionName]);
  
  return functionName;
};

// This utility function helps manage contract calls with fallbacks for naming differences
export const callContractFunction = async (contract, functionName, args = [], options = {}) => {
  try {
    // Check if the function exists on the contract
    if (typeof contract[functionName] === 'function') {
      return await contract[functionName](...args, options);
    }
    
    // If not found, try camelCase version (for compatibility with different contract styles)
    const camelCaseName = functionName.charAt(0).toLowerCase() + functionName.slice(1);
    if (typeof contract[camelCaseName] === 'function') {
      return await contract[camelCaseName](...args, options);
    }
    
    throw new Error(`Function ${functionName} not found on contract`);
  } catch (error) {
    console.error(`Error calling ${functionName}:`, error);
    throw error;
  }
};

// Function with fallbacks for different possible function naming conventions
export const callContractWithFallback = async (contract, functionNames, args = [], options = {}) => {
  // If a single function name is provided, convert to array
  const fnNames = Array.isArray(functionNames) ? functionNames : [functionNames];
  
  let lastError = null;
  
  // Try each function name until one works
  for (const fnName of fnNames) {
    try {
      return await callContractFunction(contract, fnName, args, options);
    } catch (error) {
      lastError = error;
      // Continue to the next function name
    }
  }
  
  // If we get here, none of the function names worked
  throw lastError || new Error("Failed to call contract function");
}; 