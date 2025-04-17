import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import LendingPoolABI from "./abis/LendingPool.json";
import BorrowingPoolABI from "./abis/BorrowingPool.json";
import MockDAIABI from "./abis/MockDAI.json";
import PriceOracleABI from "./abis/PriceOracle.json";
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
        CONTRACT_ADDRESSES.PRICE_ORACLE,
        PriceOracleABI.abi,
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
      setSuccess("Wallet connected successfully!");
      
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
    
    try {
      // Get ETH balance
      try {
        const ethBalanceWei = await providerInstance.getBalance(accountAddress);
        setEthBalance(ethers.formatEther(ethBalanceWei));
      } catch (balanceError) {
        console.error("Error fetching ETH balance:", balanceError);
        setEthBalance("0");
      }
      
      // Get interest rate - using the callContractWithFallback helper
      try {
        const interestRateBps = await callContractWithFallback(
          contractInstances.lendingPool,
          ['getLendingInterestRate', 'getInterestRate']
        );
        setInterestRate((interestRateBps.toString() / 100).toFixed(2));
      } catch (interestRateError) {
        console.error("Error fetching interest rate:", interestRateError);
        setInterestRate("0.00");
      }
      
      // Get deposit balance with accrued interest - using the callContractWithFallback helper
      try {
        const depositBalanceWei = await callContractWithFallback(
          contractInstances.lendingPool,
          ['getBalance', 'getDepositBalance'],
          [accountAddress]
        );
        setDepositBalance(ethers.formatEther(depositBalanceWei));
      } catch (balanceError) {
        console.error("Error fetching deposit balance:", balanceError);
        setDepositBalance("0");
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
    
    // Call updateData with current instances
    const dataInterval = setInterval(() => {
      updateData(provider, account, contracts);
    }, 30000);
    
    // Initial update
    updateData(provider, account, contracts);
    
    return () => clearInterval(dataInterval);
  }, [contracts, account, provider, isWalletConnected]);
  
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
      
      // Proceed with deposit with a more graceful error handling
      try {
        const tx = await contracts.lendingPool.deposit({
          value: amountToDeposit
        });
        
        await tx.wait();
        setSuccess(`Successfully deposited ${depositAmount} ETH`);
        setDepositAmount("");
        
        // Update balances
        updateData(provider, account, contracts);
      } catch (txError) {
        if (txError.code === 'INSUFFICIENT_FUNDS') {
          setError(`Transaction failed: Insufficient funds. Make sure you have enough ETH for the deposit amount plus gas fees.`);
        } else {
          setError(`Transaction failed: ${txError.message}`);
        }
        console.error("Deposit transaction error:", txError);
      }
    } catch (error) {
      console.error("Deposit error:", error);
      setError("Failed to deposit ETH. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(withdrawAmount) || parseFloat(withdrawAmount) <= 0) {
      setError("Please enter a valid withdrawal amount");
      return;
    }
    
    if (parseFloat(withdrawAmount) > parseFloat(depositBalance)) {
      setError("Insufficient balance for withdrawal");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      const tx = await contracts.lendingPool.withdraw(
        ethers.parseEther(withdrawAmount)
      );
      
      await tx.wait();
      setSuccess(`Successfully withdrew ${withdrawAmount} ETH`);
      setWithdrawAmount("");
      
      // Update balances
      updateData(provider, account, contracts);
    } catch (error) {
      console.error("Withdraw error:", error);
      setError("Failed to withdraw ETH. Please try again.");
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
              <h2>Lending Pool</h2>
              <div className="info-box">
                <p>Your Deposit: {parseFloat(depositBalance).toFixed(4)} ETH</p>
                <p>Interest Rate: {interestRate}% APR</p>
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
                      disabled={loading || !account || !contracts.lendingPool || parseFloat(depositBalance) === 0}
                    >
                      {loading ? "Processing..." : "Withdraw"}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
          
          {activeTab === "borrow" && (
            <section className="borrowing-section">
              <h2>Borrowing</h2>
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
              <h2>Dashboard</h2>
              
              <div className="dashboard-container">
                <div className="dashboard-card">
                  <h3>Lending Summary</h3>
                  <p><strong>Your Deposit:</strong> {parseFloat(depositBalance).toFixed(4)} ETH</p>
                  <p><strong>Interest Rate:</strong> {interestRate}% APR</p>
                  <p><strong>Interest Earned:</strong> {
                    parseFloat(depositBalance) > 0 ? 
                    (parseFloat(depositBalance) - (parseFloat(depositBalance) / (1 + parseFloat(interestRate)/100))).toFixed(6) : 
                    "0.000000"
                  } ETH</p>
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
