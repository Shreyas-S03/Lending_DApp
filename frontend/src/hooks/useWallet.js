import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { checkNetwork } from '../services/contractHelpers';

export const useWallet = () => {
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [networkCorrect, setNetworkCorrect] = useState(false);

  // Initialize provider from window.ethereum
  useEffect(() => {
    const initProvider = async () => {
      if (window.ethereum) {
        try {
          const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
          const network = await web3Provider.getNetwork();
          
          setProvider(web3Provider);
          setChainId(network.chainId);
          setNetworkCorrect(checkNetwork(network.chainId));
        } catch (err) {
          console.error("Failed to initialize provider:", err);
          setError("Failed to initialize provider");
        }
      } else {
        setError("Metamask is not installed");
      }
    };
    
    initProvider();
  }, []);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    if (!provider) {
      setError("Provider not available");
      return false;
    }
    
    try {
      setConnecting(true);
      setError(null);
      
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      const address = accounts[0];
      const signerInstance = provider.getSigner(address);
      
      setAccount(address);
      setSigner(signerInstance);
      setIsConnected(true);
      
      // Check network
      const network = await provider.getNetwork();
      setNetworkCorrect(checkNetwork(network.chainId));
      
      return true;
    } catch (err) {
      console.error("Failed to connect wallet:", err);
      setError(err.message || "Failed to connect wallet");
      return false;
    } finally {
      setConnecting(false);
    }
  }, [provider]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setSigner(null);
    setIsConnected(false);
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;
    
    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        // User disconnected their wallet
        disconnectWallet();
      } else if (accounts[0] !== account) {
        // User switched accounts
        const address = accounts[0];
        const signerInstance = provider?.getSigner(address);
        
        setAccount(address);
        setSigner(signerInstance);
        setIsConnected(true);
      }
    };

    const handleChainChanged = (chainIdHex) => {
      // Handle chain change - page reload recommended by MetaMask
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [account, provider, disconnectWallet]);

  // Check initial connection status
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (err) {
          console.error("Failed to check wallet connection:", err);
        }
      }
    };
    
    checkConnection();
  }, [connectWallet]);

  return {
    account,
    signer,
    provider,
    chainId,
    isConnected,
    networkCorrect,
    connecting,
    error,
    connectWallet,
    disconnectWallet
  };
};

export default useWallet; 