# Decentralized Lending and Borrowing DApp

A fully functional decentralized finance (DeFi) application that enables users to lend and borrow assets on Ethereum. This platform demonstrates core DeFi lending principles including collateralization, interest accrual, and loan health monitoring.

## 🌟 Overview

This DApp simulates a simplified version of popular lending protocols like Aave or Compound, allowing users to:

- **Lend ETH**: Deposit ETH into a lending pool and earn interest over time
- **Borrow DAI**: Use ETH as collateral to borrow a stablecoin (DAI)
- **Monitor Positions**: Track loan health, interest earned, and collateral ratios
- **Manage Risk**: Maintain healthy loan-to-value ratios to avoid liquidation

## 🏗️ Technical Architecture

### Smart Contracts

The core functionality is implemented through four Solidity smart contracts:

1. **LendingPool.sol**
   - Manages ETH deposits and withdrawals
   - Calculates and distributes interest to lenders
   - Tracks individual deposit balances

2. **BorrowingPool.sol**
   - Handles collateral deposits and withdrawals
   - Implements borrowing and repayment logic
   - Enforces loan health requirements
   - Calculates maximum borrowing capacity

3. **MockDAI.sol**
   - ERC20 token implementation representing DAI
   - Used for borrowing and repayment functions
   - Can be minted during development for testing

4. **MockPriceOracle.sol**
   - Provides ETH/USD price data
   - Used to calculate collateralization ratios
   - In production, would be replaced with a real oracle like Chainlink

### Frontend Application

The React-based frontend provides an intuitive interface for interacting with the smart contracts:

- **Wallet Integration**: Seamless MetaMask connection
- **Lending Interface**: Deposit and withdraw ETH with interest tracking
- **Borrowing Interface**: Manage collateral, borrow DAI, and monitor loan health
- **Dashboard**: View all positions, balances, and important metrics

## 🔧 Technical Specifications

- **Collateralization Ratio**: 150% (users must deposit $1.50 of ETH to borrow $1.00 of DAI)
- **Liquidation Threshold**: 120% (loans below this health are at risk)
- **Interest Rate Model**: Fixed APR, configurable by contract owner
- **Network Compatibility**: Hardhat Network (local), Ethereum testnets (Goerli, Sepolia)
- **Contract Interaction**: ethers.js for type-safe contract communication

## 🚀 Getting Started

### Prerequisites

- Node.js (v14+) and npm
- MetaMask browser extension
- Git

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd lending-dapp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   cd frontend
   npm install
   cd ..
   ```

### Running the DApp

1. **Start a local Ethereum node**:
   
   In your first terminal:
   ```bash
   npx hardhat node
   ```
   This creates a local blockchain with prefunded accounts for development.

2. **Deploy contracts**:
   
   In a second terminal:
   ```bash
   npm run deploy
   ```
   This deploys all contracts to your local network and outputs the contract addresses.
   
   **Important**: After deployment, copy the output contract addresses and update them in `frontend/src/contract-config.js`

3. **Start the frontend**:
   
   In a third terminal:
   ```bash
   cd frontend
   npm start
   ```
   This launches the React application on http://localhost:3000

### Connecting MetaMask

1. Add the local Hardhat network to MetaMask with these settings:
   - **Network Name**: Hardhat Local
   - **RPC URL**: http://127.0.0.1:8545/
   - **Chain ID**: 31337
   - **Currency Symbol**: ETH

2. Import a development account:
   - In the Hardhat terminal, copy a private key from one of the prefunded accounts
   - In MetaMask, click "Import Account" and paste the private key

   Example terminal output showing account private keys:
   ```
   Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
   Use these private keys to import accounts into MetaMask for testing.

## 📋 Using the Platform

### Lending
1. Navigate to the "Lending" tab
2. Enter the amount of ETH you wish to deposit
3. Click "Deposit" and confirm the transaction in MetaMask
4. Your deposit will begin earning interest immediately
5. To withdraw, enter an amount and click "Withdraw"

### Borrowing
1. Navigate to the "Borrowing" tab
2. First, deposit ETH as collateral
3. Based on your collateral value, you can borrow DAI up to your maximum borrow limit
4. Monitor your loan health - keep it above 120% to avoid potential liquidation
5. To repay your loan, enter an amount and click "Repay DAI"
6. Once your loan is repaid, you can withdraw your collateral

### Dashboard
The dashboard provides a comprehensive view of:
- Your current positions
- Interest earned
- Loan health
- Market conditions

## 💻 Development and Testing

### Running Tests
```bash
npx hardhat test
```

### Modifying Smart Contracts
1. Edit contracts in the `contracts/` directory
2. Compile with:
   ```bash
   npx hardhat compile
   ```
3. Deploy changes:
   ```bash
   npm run deploy
   ```

### Troubleshooting
- **MetaMask Connection Issues**: Ensure you're connected to the correct network (Chain ID 31337)
- **Transaction Failures**: Check console logs for detailed error messages
- **Insufficient Funds**: Make sure your account has enough ETH for the transaction and gas
- **Contract Interaction Errors**: Verify that the contract addresses in `frontend/src/contract-config.js` match your deployed contracts. These addresses change each time you restart the Hardhat node and redeploy.

## 🔒 Security Considerations

This is a demonstration project and includes several simplifications:
- Fixed interest rates instead of dynamic market-based rates
- Simplified price oracle without time-weighted averages
- No governance mechanisms for parameter adjustments

In a production environment, additional security measures would include:
- Formal smart contract audits
- Timelocks for critical parameter changes
- Emergency pause functionality
- Gradual liquidation mechanisms

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- OpenZeppelin for secure contract libraries
- Hardhat for the development environment
- ethers.js for blockchain interaction
- React for the frontend framework
