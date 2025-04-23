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
    console.log(`Calling ${functionName} with args:`, args, "and options:", options);
    
    // Check if the function exists on the contract
    if (typeof contract[functionName] === 'function') {
      // Add gas estimation if not provided in options
      if (!options.gasLimit) {
        try {
          // Try to estimate gas
          console.log(`Estimating gas for ${functionName}...`);
          const gasEstimate = await contract.estimateGas[functionName](...args, {
            ...options
          });
          // Add 20% buffer to the gas estimate
          options.gasLimit = Math.floor(gasEstimate.toString() * 1.2);
          console.log(`Gas estimation successful: ${options.gasLimit}`);
        } catch (gasError) {
          console.warn(`Failed to estimate gas for ${functionName}:`, gasError);
          // Set a high default gas limit for common operations
          options.gasLimit = 500000;
          console.log(`Using default gas limit: ${options.gasLimit}`);
        }
      }
      
      console.log(`Executing ${functionName} with gasLimit:`, options.gasLimit);
      return await contract[functionName](...args, options);
    }
    
    // If not found, try camelCase version (for compatibility with different contract styles)
    const camelCaseName = functionName.charAt(0).toLowerCase() + functionName.slice(1);
    if (typeof contract[camelCaseName] === 'function') {
      console.log(`Function ${functionName} not found, trying ${camelCaseName} instead`);
      return await contract[camelCaseName](...args, options);
    }
    
    throw new Error(`Function ${functionName} not found on contract with address ${contract.target}`);
  } catch (error) {
    console.error(`Error calling ${functionName}:`, error);
    throw error;
  }
};

// Function with fallbacks for different possible function naming conventions
export const callContractWithFallback = async (contract, functionNames, args = [], options = {}) => {
  if (!contract) throw new Error("Contract is not initialized");
  
  // If a single function name is provided, convert to array
  const fnNames = Array.isArray(functionNames) ? functionNames : [functionNames];
  
  let lastError = null;
  let successfulFnName = null;
  
  console.log(`Attempting to call one of these functions: [${fnNames.join(', ')}]`);
  
  // Try each function name until one works
  for (const fnName of fnNames) {
    try {
      console.log(`Trying function name: ${fnName}`);
      
      // Set a default gas limit if not provided
      if (!options.gasLimit) {
        options.gasLimit = 500000;
      }
      
      const result = await callContractFunction(contract, fnName, args, options);
      successfulFnName = fnName; // Remember which function name worked
      console.log(`Successfully called ${fnName}`);
      return result;
    } catch (error) {
      console.warn(`Error calling ${fnName}:`, error);
      lastError = error;
      // Continue to the next function name
    }
  }
  
  // If we get here, none of the function names worked
  const errorMsg = `None of the functions [${fnNames.join(', ')}] could be called successfully`;
  console.error(errorMsg, lastError);
  throw lastError || new Error(errorMsg);
}; 