import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getContracts, getProvider } from '../services/contractHelpers';

// Hook for accessing all contract instances
export const useContracts = () => {
  const [contracts, setContracts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Initialize contract instances
  const initContracts = useCallback(async (signer) => {
    try {
      setLoading(true);
      setError(null);
      
      const contractInstances = await getContracts(signer);
      setContracts(contractInstances);
      
      return contractInstances;
    } catch (err) {
      console.error("Failed to initialize contracts:", err);
      setError(err.message || "Failed to initialize contracts");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Update signer when account changes
  const updateSigner = useCallback(async (newSigner) => {
    return initContracts(newSigner);
  }, [initContracts]);
  
  // Initialize with provider only on first load
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initial setup with provider only (read-only)
        const provider = getProvider();
        await initContracts(provider);
      } catch (err) {
        console.error("Failed to initialize contracts with provider:", err);
        setError(err.message || "Failed to initialize contracts");
        setLoading(false);
      }
    };
    
    initialize();
  }, [initContracts]);
  
  return {
    contracts,
    loading,
    error,
    updateSigner,
    initContracts
  };
};

// Hook for accessing a specific contract
export const useContract = (contractName) => {
  const { contracts, loading, error } = useContracts();
  
  // Get the specific contract instance
  const contract = contracts ? contracts[contractName] : null;
  
  return {
    contract,
    loading,
    error
  };
};

export default useContracts; 