import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import LendingPoolABI from "./abi/LendingPool.json";
import BorrowingPoolABI from "./abi/BorrowingPool.json";
import MockDAIABI from "./abi/MockDAI.json";
import MockPriceOracleABI from "./abi/MockPriceOracle.json";
import { CONTRACT_ADDRESSES } from "./contract-config";
import "./App.css";
import { callContractWithFallback } from './hooks/useContractFunction';

function App() {
  // State variables
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [contracts, setContracts] = useState({
    lendingPool: null,
    borrowingPool: null,
    mockDAI: null,
    priceOracle: null
  });
  
  // Balances and info
  const [ethBalance, setEthBalance] = useState("0");
  const [depositBalance, setDepositBalance] = useState("0");
  const [daiBalance, setDaiBalance] = useState("0");
  const [ethPrice, setEthPrice] = useState("0");
  const [interestRate, setInterestRate] = useState("0");
  
  // Loan information
  const [collateralAmount, setCollateralAmount] = useState("0");
  const [borrowedAmount, setBorrowedAmount] = useState("0");
  const [maxBorrowAmount, setMaxBorrowAmount] = useState("0");
  const [loanHealth, setLoanHealth] = useState("0");
  const [loanActive, setLoanActive] = useState(false);
  
  // User input amounts
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [collateralDepositAmount, setCollateralDepositAmount] = useState("");
  const [collateralWithdrawAmount, setCollateralWithdrawAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  
  // UI state
  const [activeTab, setActiveTab] = useState("lend");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [isLocalNetwork, setIsLocalNetwork] = useState(false);
  
  // In the state variables section, add a new state to track the original deposit amount
  const [originalDepositAmount, setOriginalDepositAmount] = useState("0");
  
  // Initialize the app - only check for Ethereum provider, don't connect automatically
  useEffect(() => {
    // Setup event listeners for account changes once provider is available
    if (window.ethereum && isWalletConnected) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          handleDisconnect();
        } else {
          // User switched accounts, reload the page to refresh state
          window.location.reload();
        }
      });
      
      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
    
    // Cleanup
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged");
        window.ethereum.removeAllListeners("chainChanged");
      }
    };
  }, [isWalletConnected]);
  
  // Connect wallet function
  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("MetaMask not found! Please install MetaMask to use this dApp.");
      return;
    }
    
    try {
      setConnectingWallet(true);
      setError("");
      
      // Prompt user to connect with MetaMask
        const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await window.ethereum.request({ 
        method: "eth_requestAccounts" 
      });
      
      if (accounts.length === 0) {
        setError("No accounts found or user rejected the connection.");
        setConnectingWallet(false);
        return;
      }

        const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // Check if this is a local network (for UI elements only)
      const { chainId } = await provider.getNetwork();
      setIsLocalNetwork(chainId === 31337n || chainId === 1337n);
      
      // Create contract instances
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
        MockPriceOracleABI.abi,
        signer
      );

        setProvider(provider);
        setSigner(signer);
      setAccount(address);
      setContracts({
        lendingPool,
        borrowingPool,
        mockDAI,
        priceOracle
      });
      setIsWalletConnected(true);
      setSuccess("Wallet connected successfully! Note: This is a test dApp, so MetaMask may show security warnings. These are normal and you can safely confirm transactions.");
      
      // Update balances and data immediately after connection
      updateData(provider, address, { lendingPool, borrowingPool, mockDAI, priceOracle });
      
    } catch (error) {
      console.error("Connection error:", error);
      setError("Failed to connect wallet. Please try again.");
    } finally {
      setConnectingWallet(false);
      setLoading(false);
    }
  };
  
  // Disconnect wallet function
  const handleDisconnect = () => {
    setProvider(null);
    setSigner(null);
    setAccount("");
    setContracts({
      lendingPool: null,
      borrowingPool: null,
      mockDAI: null,
      priceOracle: null
    });
    setEthBalance("0");
    setDepositBalance("0");
    setDaiBalance("0");
    setCollateralAmount("0");
    setBorrowedAmount("0");
    setMaxBorrowAmount("0");
    setLoanHealth("0");
    setLoanActive(false);
    setIsWalletConnected(false);
  };
  
  // Update data function (extracted to be called immediately after connection and on intervals)
  const updateData = async (providerInstance, accountAddress, contractInstances) => {
    if (!contractInstances.lendingPool || !contractInstances.borrowingPool || 
        !contractInstances.mockDAI || !contractInstances.priceOracle || !accountAddress) {
      return;
    }
    
    console.log("Updating data for account:", accountAddress);
    
    try {
      // Check the contract balance directly to debug issues
      try {
        const contractBalance = await providerInstance.getBalance(contractInstances.lendingPool.target);
        console.log("LendingPool contract balance:", ethers.formatEther(contractBalance), "ETH");
      } catch (e) {
        console.error("Failed to check contract balance:", e);
      }
      
      // Get ETH balance
      try {
        const ethBalanceWei = await providerInstance.getBalance(accountAddress);
        setEthBalance(ethers.formatEther(ethBalanceWei));
        console.log("ETH balance updated:", ethers.formatEther(ethBalanceWei));
      } catch (balanceError) {
        console.error("Error fetching ETH balance:", balanceError);
        setEthBalance("0");
      }
      
      // Get deposit balance and interest info
      try {
        // First get the actual deposit info from the contract (without interest)
        const depositInfo = await contractInstances.lendingPool.deposits(accountAddress);
        const originalDepositWei = depositInfo.amount;
        const originalAmount = ethers.formatEther(originalDepositWei);
        setOriginalDepositAmount(originalAmount);
        console.log("Original deposit amount:", originalAmount);
        
        // Then get the balance including pending interest
        const depositBalanceWei = await contractInstances.lendingPool.getBalance(accountAddress);
        console.log("Deposit balance with interest:", depositBalanceWei.toString());
        const formattedBalance = ethers.formatEther(depositBalanceWei);
        console.log("Setting deposit balance to:", formattedBalance);
        setDepositBalance(formattedBalance);
        
      } catch (balanceError) {
        console.error("Error fetching deposit balance:", balanceError);
        setDepositBalance("0");
        setOriginalDepositAmount("0");
      }
      
      // Get interest rate
      try {
        const interestRatePoints = await contractInstances.lendingPool.getInterestRate();
        const rate = interestRatePoints / 100; // Convert basis points to percentage
        console.log("Interest rate from contract:", rate);
        setInterestRate(rate);
      } catch (interestError) {
        console.error("Error fetching interest rate:", interestError);
        setInterestRate("3"); // Default to 3%
      }
      
      // Get DAI balance
      try {
        const daiBalanceWei = await contractInstances.mockDAI.balanceOf(accountAddress);
        setDaiBalance(ethers.formatEther(daiBalanceWei));
      } catch (daiError) {
        console.error("Error fetching DAI balance:", daiError);
        setDaiBalance("0");
      }
      
      // Get ETH price from oracle
      try {
        const ethPriceWei = await contractInstances.priceOracle.getEthPrice();
        setEthPrice(ethers.formatEther(ethPriceWei));
      } catch (priceError) {
        console.error("Error fetching ETH price:", priceError);
        setEthPrice("0");
      }
      
      // Get loan details
      try {
        const [collateral, borrowed, active] = await contractInstances.borrowingPool.getLoanDetails(accountAddress);
        setCollateralAmount(ethers.formatEther(collateral));
        setBorrowedAmount(ethers.formatEther(borrowed));
        setLoanActive(active);
        
        // Get max borrow amount
        if (active) {
          const maxBorrow = await contractInstances.borrowingPool.getMaxBorrowAmount(accountAddress);
          setMaxBorrowAmount(ethers.formatEther(maxBorrow));
          
          // Get loan health
          try {
            const health = await contractInstances.borrowingPool.checkLoanHealth(accountAddress);
            setLoanHealth(health.toString());
          } catch (healthError) {
            console.error("Error fetching loan health:", healthError);
            setLoanHealth("0");
          }
      } else {
          setMaxBorrowAmount("0");
          setLoanHealth("0");
        }
      } catch (loanError) {
        console.error("Error fetching loan details:", loanError);
        setCollateralAmount("0");
        setBorrowedAmount("0");
        setLoanActive(false);
        setMaxBorrowAmount("0");
        setLoanHealth("0");
      }
    } catch (error) {
      console.error("Error updating data:", error);
    }
  };
  
  // Update balances and loan information on an interval
  useEffect(() => {
    if (!isWalletConnected) return;
    
    // Initial update
    updateData(provider, account, contracts);
    
    // Call updateData with current instances more frequently (every 10 seconds)
    const dataInterval = setInterval(() => {
      updateData(provider, account, contracts);
    }, 10000); // Changed from 30000 to 10000
    
    return () => clearInterval(dataInterval);
  }, [contracts, account, provider, isWalletConnected]);
  
  // Add a function to manually refresh data
  const refreshData = () => {
    if (!isWalletConnected) return;
    
    setLoading(true);
    console.log("Manual refresh requested");
    
    // Update data and then set loading to false
    updateData(provider, account, contracts)
      .then(() => {
        setLoading(false);
        setSuccess("Data refreshed successfully");
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess("");
        }, 3000);
      })
      .catch((error) => {
        console.error("Error refreshing data:", error);
        setLoading(false);
        setError("Failed to refresh data");
        
        // Clear error message after 3 seconds
        setTimeout(() => {
          setError("");
        }, 3000);
      });
  };
  
  // LENDING FUNCTIONS
  const handleDeposit = async () => {
    if (!depositAmount || isNaN(depositAmount) || parseFloat(depositAmount) <= 0) {
      setError("Please enter a valid deposit amount");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      // Check ETH balance before attempting deposit to provide a better error message
      const currentBalance = await provider.getBalance(account);
      const amountToDeposit = ethers.parseEther(depositAmount);
      
      // Assume some gas will be needed (roughly 0.01 ETH)
      const estimatedGas = ethers.parseEther("0.01");
      
      if (currentBalance < (amountToDeposit + estimatedGas)) {
        setError(`Insufficient funds. You have ${ethers.formatEther(currentBalance)} ETH, but need at least ${depositAmount} ETH plus gas.`);
        setLoading(false);
        return;
      }
      
      console.log("Depositing", depositAmount, "ETH to contract:", contracts.lendingPool.target);
      console.log("Contract ABI:", JSON.stringify(LendingPoolABI.abi.find(item => item.name === "deposit")));
      
      const tx = await contracts.lendingPool.deposit({
        value: amountToDeposit,
        gasLimit: 500000 // Set a high gas limit to ensure the transaction goes through
      });
      
      console.log("Deposit transaction sent:", tx.hash);
      console.log("Waiting for transaction to be mined...");
      
      const receipt = await tx.wait();
      console.log("Transaction mined:", receipt);
      
      setSuccess(`Successfully deposited ${depositAmount} ETH`);
      setDepositAmount("");
      
      // Update data
      setTimeout(() => {
        updateData(provider, account, contracts);
      }, 1000);
    } catch (error) {
      console.error("Deposit error:", error);
      setError(`Failed to deposit ETH: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(withdrawAmount) || parseFloat(withdrawAmount) <= 0) {
      setError("Please enter a valid withdrawal amount");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      // Get current balance with interest for validation
      const currentBalanceWithInterest = await contracts.lendingPool.getBalance(account);
      
      // Convert the withdrawal amount to Wei
      const amountToWithdraw = ethers.parseEther(withdrawAmount);
      
      // Check if the requested withdrawal amount is greater than the balance with interest
      if (amountToWithdraw > currentBalanceWithInterest) {
        setError(`Cannot withdraw more than your current balance with interest (${ethers.formatEther(currentBalanceWithInterest)} ETH)`);
        setLoading(false);
        return;
      }
      
      console.log("Withdrawing", withdrawAmount, "ETH (including interest)");
      console.log("Current balance with interest:", ethers.formatEther(currentBalanceWithInterest), "ETH");
      
      // Execute the withdrawal transaction
      const tx = await contracts.lendingPool.withdraw(amountToWithdraw, {
        gasLimit: 500000
      });
      
      console.log("Withdraw transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction mined:", receipt);
      
      setSuccess(`Successfully withdrew ${withdrawAmount} ETH including interest`);
      setWithdrawAmount("");
      
      // Update data immediately
      setTimeout(() => {
        updateData(provider, account, contracts);
      }, 1000);
    } catch (error) {
      console.error("Withdraw error:", error);
      
      // Provide more helpful error messages
      if (error.message.includes("Insufficient balance")) {
        setError("Withdrawal failed: The contract's internal balance calculation might differ slightly from what's displayed. Try withdrawing a slightly smaller amount.");
      } else {
        setError(`Failed to withdraw ETH: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // BORROWING FUNCTIONS
  const handleDepositCollateral = async () => {
    if (!collateralDepositAmount || isNaN(collateralDepositAmount) || parseFloat(collateralDepositAmount) <= 0) {
      setError("Please enter a valid collateral amount");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      const tx = await contracts.borrowingPool.depositCollateral({
        value: ethers.parseEther(collateralDepositAmount)
      });
      
      await tx.wait();
      setSuccess(`Successfully deposited ${collateralDepositAmount} ETH as collateral`);
      setCollateralDepositAmount("");
      
      // Update data
      updateData(provider, account, contracts);
    } catch (error) {
      console.error("Collateral deposit error:", error);
      setError("Failed to deposit collateral. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleBorrow = async () => {
    if (!borrowAmount || isNaN(borrowAmount) || parseFloat(borrowAmount) <= 0) {
      setError("Please enter a valid borrow amount");
      return;
    }
    
    if (parseFloat(borrowAmount) > parseFloat(maxBorrowAmount)) {
      setError(`Borrow amount exceeds maximum allowed (${maxBorrowAmount} DAI)`);
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      const tx = await contracts.borrowingPool.borrowDAI(
        ethers.parseEther(borrowAmount)
      );
      
      await tx.wait();
      setSuccess(`Successfully borrowed ${borrowAmount} DAI`);
      setBorrowAmount("");
      
      // Update data
      updateData(provider, account, contracts);
    } catch (error) {
      console.error("Borrow error:", error);
      setError("Failed to borrow DAI. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleRepay = async () => {
    if (!repayAmount || isNaN(repayAmount) || parseFloat(repayAmount) <= 0) {
      setError("Please enter a valid repay amount");
      return;
    }
    
    if (parseFloat(repayAmount) > parseFloat(daiBalance)) {
      setError("Insufficient DAI balance for repayment");
      return;
    }
    
    if (parseFloat(repayAmount) > parseFloat(borrowedAmount)) {
      setError("Repay amount exceeds borrowed amount");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      // First approve the BorrowingPool to spend DAI
      const approveTx = await contracts.mockDAI.approve(
        CONTRACT_ADDRESSES.BORROWING_POOL,
        ethers.parseEther(repayAmount)
      );
      await approveTx.wait();
      
      // Then repay
      const repayTx = await contracts.borrowingPool.repayLoan(
        ethers.parseEther(repayAmount)
      );
      await repayTx.wait();
      
      setSuccess(`Successfully repaid ${repayAmount} DAI`);
      setRepayAmount("");
      
      // Update data
      updateData(provider, account, contracts);
    } catch (error) {
      console.error("Repay error:", error);
      setError("Failed to repay DAI. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleWithdrawCollateral = async () => {
    if (!collateralWithdrawAmount || isNaN(collateralWithdrawAmount) || parseFloat(collateralWithdrawAmount) <= 0) {
      setError("Please enter a valid collateral withdrawal amount");
      return;
    }
    
    if (parseFloat(collateralWithdrawAmount) > parseFloat(collateralAmount)) {
      setError("Withdrawal amount exceeds deposited collateral");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      const tx = await contracts.borrowingPool.withdrawCollateral(
        ethers.parseEther(collateralWithdrawAmount)
      );
      
      await tx.wait();
      setSuccess(`Successfully withdrew ${collateralWithdrawAmount} ETH of collateral`);
      setCollateralWithdrawAmount("");
      
      // Update data
      updateData(provider, account, contracts);
    } catch (error) {
      console.error("Collateral withdrawal error:", error);
      setError("Failed to withdraw collateral. This may be due to an unsafe loan-to-value ratio.");
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function for rendering status
  const getLoanHealthStatus = () => {
    if (!loanActive || parseFloat(borrowedAmount) === 0) {
      return <span className="status-neutral">No active loan</span>;
    }
    
    const healthValue = parseInt(loanHealth);
    
    if (healthValue >= 100) {
      return <span className="status-good">Healthy ({healthValue}%)</span>;
    } else if (healthValue >= 80) {
      return <span className="status-warning">Warning ({healthValue}%)</span>;
    } else {
      return <span className="status-danger">At risk ({healthValue}%)</span>;
    }
  };
  
  // Helper function to safely try contract calls with better error handling
  const tryAgain = async (fn, errorMessage = "Transaction failed") => {
    try {
      return await fn();
    } catch (error) {
      console.error(errorMessage, error);
      // Extract user-friendly message from error
      if (error.code === 'INSUFFICIENT_FUNDS') {
        setError("Insufficient funds for this transaction including gas fees.");
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        setError("Transaction would fail: " + (error.reason || "check your inputs and try again"));
      } else if (error.reason) {
        setError(error.reason);
      } else {
        setError(errorMessage);
      }
      return null;
    }
  };
  
  // Add this function in a suitable location in the component
  const triggerImportantDataUpdate = () => {
    console.log("Triggering important data update");
    // Run update 3 times with delays to ensure we get the latest state
    updateData(provider, account, contracts);
    
    setTimeout(() => {
      updateData(provider, account, contracts);
    }, 2000);
    
    setTimeout(() => {
      updateData(provider, account, contracts);
    }, 5000);
  };

  // Add this function at the appropriate location in your component
  const showBorrowingExplanation = () => {
    setSuccess(`
      How borrowing works:
      1. Deposit ETH as collateral in the Borrowing Pool
      2. Based on your collateral value and the ETH price, you can borrow DAI (up to 66% of your collateral value)
      3. DAI is minted directly by the BorrowingPool contract when you borrow
      4. To repay, you must approve the borrowing contract to spend your DAI, then call repay
      5. Keep your loan health above 120% to avoid liquidation
    `);
    
    // Clear the message after 15 seconds
    setTimeout(() => {
      setSuccess("");
    }, 15000);
  };

  // Add a lending explanation function
  const showLendingExplanation = () => {
    setSuccess(`
      How lending works:
      1. Deposit ETH into the LendingPool to earn 5% APR interest
      2. Your deposited ETH acts as liquidity for the platform
      3. Interest accrues continuously and compounds with each transaction
      4. Withdraw your ETH plus earned interest at any time
      5. The Lending Pool is separate from the Borrowing Pool, but both form the complete DeFi system
    `);
    
    // Clear the message after 15 seconds
    setTimeout(() => {
      setSuccess("");
    }, 15000);
  };

  // Add a dashboard explanation function
  const showDashboardExplanation = () => {
    setSuccess(`
      How this DeFi platform works:
      1. Lending: Users deposit ETH to earn interest (currently 5% APR)
      2. Borrowing: Users deposit ETH as collateral and borrow DAI stablecoins
      3. Collateralization: Each loan requires 150% collateral (e.g., $150 in ETH to borrow $100 DAI)
      4. Liquidation: If collateral value falls below 120% of loan value, the loan can be liquidated
      5. The platform uses a price oracle to track ETH/USD price for collateral calculations
    `);
    
    // Clear the message after 15 seconds
    setTimeout(() => {
      setSuccess("");
    }, 15000);
  };

  // Helper function to calculate a safe maximum withdrawal amount (99.5% of the displayed balance with interest)
  const getSafeWithdrawalAmount = () => {
    if (parseFloat(depositBalance) <= 0) return "0";
    
    // Apply a small safety margin (99.5%) to avoid potential rounding/calculation differences
    const safeAmount = parseFloat(depositBalance) * 0.995;
    return safeAmount.toFixed(6);
  };
  
  // Function to set the withdrawal amount to the maximum safe amount
  const setMaxWithdrawal = () => {
    setWithdrawAmount(getSafeWithdrawalAmount());
  };

  return (
    <div className="app-container">
      <header>
      <h1>Decentralized Lending & Borrowing</h1>
        <div className="wallet-info">
          {isWalletConnected ? (
            <>
              <p>Connected Wallet: {account ? `${account.substring(0, 6)}...${account.substring(38)}` : "Not connected"}</p>
              <p>ETH Balance: {parseFloat(ethBalance).toFixed(4)} ETH</p>
              <p>DAI Balance: {parseFloat(daiBalance).toFixed(2)} DAI</p>
              <div className="wallet-buttons">
                <button className="disconnect-btn" onClick={handleDisconnect}>Disconnect Wallet</button>
              </div>
            </>
          ) : (
            <button 
              className="connect-btn" 
              onClick={connectWallet} 
              disabled={connectingWallet}
            >
              {connectingWallet ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </header>
      
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}
      
      {!isWalletConnected ? (
        <div className="welcome-container">
          <div className="welcome-message">
            <h2>Welcome to the Decentralized Lending & Borrowing Platform</h2>
            <p>Connect your MetaMask wallet to get started</p>
            <button 
              className="connect-btn-large" 
              onClick={connectWallet}
              disabled={connectingWallet}
            >
              {connectingWallet ? "Connecting..." : "Connect Wallet"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="tabs">
            <button 
              className={activeTab === "lend" ? "active" : ""} 
              onClick={() => setActiveTab("lend")}
            >
              Lending
            </button>
            <button 
              className={activeTab === "borrow" ? "active" : ""} 
              onClick={() => setActiveTab("borrow")}
            >
              Borrowing
            </button>
            <button 
              className={activeTab === "dashboard" ? "active" : ""} 
              onClick={() => setActiveTab("dashboard")}
            >
              Dashboard
            </button>
          </div>
          
          {activeTab === "lend" && (
            <section className="lending-section">
              <div className="section-header">
                <h2>Lending Pool</h2>
                <button 
                  className="info-btn" 
                  onClick={showLendingExplanation}
                >
                  How It Works
                </button>
              </div>
              <div className="info-box">
                <p>Your Principal Deposit: {parseFloat(originalDepositAmount).toFixed(4)} ETH</p>
                <p>Current Balance with Interest: {parseFloat(depositBalance).toFixed(4)} ETH</p>
                <p>Accrued Interest: {(parseFloat(depositBalance) - parseFloat(originalDepositAmount)).toFixed(6)} ETH</p>
                <p>Interest Rate: {interestRate}% APR</p>
                <p className="interest-explainer">
                  <i>Note: Interest is calculated in real-time but officially credited to your account only when you make a deposit or withdrawal.</i>
                </p>
              </div>
              
              <div className="action-container">
                <div className="action-box">
                  <h3>Deposit ETH</h3>
                  <p>Earn {interestRate}% APR on your deposits</p>
                  <div className="input-group">
      <input
        type="text"
        placeholder="Amount in ETH"
        value={depositAmount}
        onChange={(e) => setDepositAmount(e.target.value)}
      />
                    <button 
                      onClick={handleDeposit} 
                      disabled={loading || !account || !contracts.lendingPool}
                    >
                      {loading ? "Processing..." : "Deposit"}
                    </button>
                  </div>
                </div>
                
                <div className="action-box">
                  <h3>Withdraw ETH</h3>
                  <p>Withdraw your deposited ETH with interest</p>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Amount in ETH"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                    <button 
                      onClick={handleWithdraw} 
                      disabled={loading || !account || !contracts.lendingPool || parseFloat(depositBalance) <= 0}
                    >
                      {loading ? "Processing..." : "Withdraw"}
                    </button>
                  </div>
                  {parseFloat(depositBalance) > 0 && (
                    <button 
                      className="max-btn" 
                      onClick={setMaxWithdrawal}
                    >
                      Withdraw Max ({getSafeWithdrawalAmount()} ETH)
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}
          
          {activeTab === "borrow" && (
            <section className="borrowing-section">
              <div className="section-header">
                <h2>Borrowing</h2>
                <button 
                  className="info-btn" 
                  onClick={showBorrowingExplanation}
                >
                  How It Works
                </button>
              </div>
              <div className="info-box">
                <p>ETH Price: ${parseFloat(ethPrice).toFixed(2)} USD</p>
                <p>Collateral Deposited: {parseFloat(collateralAmount).toFixed(4)} ETH</p>
                <p>Borrowed Amount: {parseFloat(borrowedAmount).toFixed(2)} DAI</p>
                <p>Available to Borrow: {parseFloat(maxBorrowAmount) - parseFloat(borrowedAmount) > 0 ? 
                  (parseFloat(maxBorrowAmount) - parseFloat(borrowedAmount)).toFixed(2) : "0.00"} DAI</p>
                <p>Loan Health: {getLoanHealthStatus()}</p>
              </div>
              
              <div className="action-container">
                <div className="action-box">
                  <h3>Deposit Collateral</h3>
                  <p>Deposit ETH as collateral to borrow DAI</p>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Amount in ETH"
                      value={collateralDepositAmount}
                      onChange={(e) => setCollateralDepositAmount(e.target.value)}
                    />
                    <button 
                      onClick={handleDepositCollateral} 
                      disabled={loading || !account || !contracts.borrowingPool}
                    >
                      {loading ? "Processing..." : "Deposit Collateral"}
                    </button>
                  </div>
                </div>
                
                <div className="action-box">
                  <h3>Borrow DAI</h3>
                  <p>Borrow DAI against your ETH collateral</p>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Amount in DAI"
                      value={borrowAmount}
                      onChange={(e) => setBorrowAmount(e.target.value)}
                    />
                    <button 
                      onClick={handleBorrow} 
                      disabled={loading || !account || !contracts.borrowingPool || 
                        parseFloat(collateralAmount) === 0 || 
                        parseFloat(maxBorrowAmount) <= parseFloat(borrowedAmount)}
                    >
                      {loading ? "Processing..." : "Borrow DAI"}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="action-container">
                <div className="action-box">
                  <h3>Repay Loan</h3>
                  <p>Repay your borrowed DAI</p>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Amount in DAI"
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                    />
                    <button 
                      onClick={handleRepay} 
                      disabled={loading || !account || !contracts.borrowingPool || 
                        parseFloat(borrowedAmount) === 0 || parseFloat(daiBalance) === 0}
                    >
                      {loading ? "Processing..." : "Repay DAI"}
                    </button>
                  </div>
                </div>
                
                <div className="action-box">
                  <h3>Withdraw Collateral</h3>
                  <p>Withdraw your ETH collateral</p>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Amount in ETH"
                      value={collateralWithdrawAmount}
                      onChange={(e) => setCollateralWithdrawAmount(e.target.value)}
                    />
                    <button 
                      onClick={handleWithdrawCollateral} 
                      disabled={loading || !account || !contracts.borrowingPool || 
                        parseFloat(collateralAmount) === 0}
                    >
                      {loading ? "Processing..." : "Withdraw Collateral"}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
          
          {activeTab === "dashboard" && (
            <section className="dashboard-section">
              <div className="dashboard-header">
                <h2>Dashboard</h2>
                <div className="dashboard-actions">
                  <button 
                    className="info-btn" 
                    onClick={showDashboardExplanation}
                    style={{ marginRight: '10px' }}
                  >
                    How It Works
                  </button>
                  <button 
                    className="refresh-btn" 
                    onClick={refreshData}
                    disabled={loading}
                  >
                    {loading ? "Refreshing..." : "Refresh Data"}
                  </button>
                </div>
              </div>
              
              <div className="dashboard-container">
                <div className="dashboard-card">
                  <h3>Lending Summary</h3>
                  <p><strong>Principal Deposit:</strong> {parseFloat(originalDepositAmount).toFixed(4)} ETH</p>
                  <p><strong>Current Balance with Interest:</strong> {parseFloat(depositBalance).toFixed(4)} ETH</p>
                  <p><strong>Accrued Interest:</strong> {(parseFloat(depositBalance) - parseFloat(originalDepositAmount)).toFixed(6)} ETH</p>
                  <p><strong>Interest Rate:</strong> {interestRate}% APR</p>
                  <p className="interest-explainer">
                    <i>Interest is automatically added to your balance when you make a deposit or withdrawal.</i>
                  </p>
                </div>
                
                <div className="dashboard-card">
                  <h3>Borrowing Summary</h3>
                  <p><strong>Collateral:</strong> {parseFloat(collateralAmount).toFixed(4)} ETH</p>
                  <p><strong>Collateral Value:</strong> ${(parseFloat(collateralAmount) * parseFloat(ethPrice)).toFixed(2)}</p>
                  <p><strong>Borrowed:</strong> {parseFloat(borrowedAmount).toFixed(2)} DAI</p>
                  <p><strong>Loan-to-Value Ratio:</strong> {
                    parseFloat(collateralAmount) > 0 ? 
                    ((parseFloat(borrowedAmount) / (parseFloat(collateralAmount) * parseFloat(ethPrice))) * 100).toFixed(2) : 
                    "0.00"
                  }%</p>
                  <p><strong>Loan Health:</strong> {getLoanHealthStatus()}</p>
                </div>
                
                <div className="dashboard-card">
                  <h3>Market Information</h3>
                  <p><strong>ETH Price:</strong> ${parseFloat(ethPrice).toFixed(2)} USD</p>
                  <p><strong>Lending APR:</strong> {interestRate}%</p>
                  <p><strong>Required Collateral Ratio:</strong> 150%</p>
                  <p><strong>Liquidation Threshold:</strong> 120%</p>
                </div>
              </div>
            </section>
          )}
        </>
      )}
      
      <footer>
        <p>Decentralized Lending &amp; Borrowing Platform on Ethereum</p>
        <p>© 2023 All rights reserved</p>
      </footer>
    </div>
  );
}

export default App;
