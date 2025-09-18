# 🚀 FHEVM dApp Deployment Guide

This guide provides detailed instructions for deploying and testing your FHEVM confidential credit assessment dApp.

## 📋 Prerequisites Checklist

Before deploying, ensure you have:

- ✅ Node.js 18+ installed
- ✅ MetaMask wallet extension
- ✅ Sepolia testnet ETH (for gas fees)
- ✅ Basic understanding of blockchain transactions
- ✅ Code editor (VS Code recommended)

## 🔧 Environment Setup

### 1. Install Required Software

```bash
# Check Node.js version (should be 18+)
node --version

# Install or update npm
npm install -g npm@latest

# Install Git (if not installed)
# Download from: https://git-scm.com/downloads
```

### 2. Clone and Setup Project

```bash
# Clone the repository
git clone https://github.com/your-username/fhevm-credit-dapp.git
cd fhevm-credit-dapp

# Install dependencies
npm install

# Verify installation
npm run type-check
```

### 3. Configure MetaMask

#### Add Sepolia Network:
1. Open MetaMask → Networks → Add Network
2. Fill in these details:
   - **Network Name**: Sepolia Test Network
   - **RPC URL**: `https://sepolia.infura.io/v3/`
   - **Chain ID**: `11155111`
   - **Currency Symbol**: `ETH`
   - **Block Explorer**: `https://sepolia.etherscan.io/`

#### Get Test ETH:
Visit these faucets to get free Sepolia ETH:
- [sepoliafaucet.com](https://sepoliafaucet.com)
- [faucet.sepolia.dev](https://faucet.sepolia.dev)
- [sepolia-faucet.pk910.de](https://sepolia-faucet.pk910.de)

**Recommended**: Get at least 0.1 ETH for multiple transactions.

## 📄 Smart Contract Deployment

### Option 1: Using Remix IDE (Recommended for Beginners)

1. **Open Remix IDE**: Go to [remix.ethereum.org](https://remix.ethereum.org)

2. **Install FHEVM Plugin**:
   - Go to Plugin Manager
   - Search for "FHEVM"
   - Install the official Zama FHEVM plugin

3. **Create Contract File**:
   - Create new file: `contracts/CreditAnalyzer.sol`
   - Copy the contract code from the tutorial
   - Ensure you have the correct imports

4. **Compile Contract**:
   - Go to Solidity Compiler tab
   - Select compiler version: `0.8.24`
   - Click "Compile CreditAnalyzer.sol"
   - Verify no compilation errors

5. **Deploy Contract**:
   - Go to Deploy & Run Transactions tab
   - Environment: Select "Injected Provider - MetaMask"
   - Ensure MetaMask is connected to Sepolia
   - Contract: Select "CreditAnalyzer"
   - Click "Deploy"
   - Confirm transaction in MetaMask
   - **Save the contract address!**

### Option 2: Using Hardhat (Advanced)

```bash
# Install Hardhat
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Initialize Hardhat project
npx hardhat init

# Install FHEVM dependencies
npm install @fhevm/solidity

# Create deployment script
# See hardhat.config.js and deploy script examples below
```

Create `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

Create `scripts/deploy.js`:

```javascript
async function main() {
  const CreditAnalyzer = await ethers.getContractFactory("CreditAnalyzer");
  const creditAnalyzer = await CreditAnalyzer.deploy();

  await creditAnalyzer.deployed();

  console.log("CreditAnalyzer deployed to:", creditAnalyzer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Deploy:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

## ⚙️ Frontend Configuration

### 1. Update Contract Address

After deploying your contract, update `src/utils/constants.ts`:

```typescript
// Replace with your deployed contract address
export const CONTRACT_ADDRESS = "0xYourContractAddressHere"
```

### 2. Verify Configuration

Check these configuration files:

**`package.json`** - Ensure correct dependencies:
```json
{
  "dependencies": {
    "ethers": "6.15.0",
    "fhevmjs": "0.6.2",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
```

**`vite.config.ts`** - Ensure Web3 polyfills:
```typescript
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true }
    })
  ]
})
```

### 3. Environment Variables (Optional)

Create `.env` file for configuration:

```bash
# .env
VITE_CONTRACT_ADDRESS=0xYourContractAddress
VITE_CHAIN_ID=11155111
VITE_NETWORK_NAME=Sepolia
```

Update constants to use environment variables:

```typescript
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0xYourDefaultAddress"
```

## 🏃‍♂️ Running the Application

### 1. Development Mode

```bash
# Start development server
npm run dev

# Server will start on http://localhost:5173
```

### 2. Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Serve production build
npx http-server dist -p 3000
```

### 3. Type Checking

```bash
# Run TypeScript type checking
npm run type-check
```

## 🧪 Testing Your dApp

### Test Scenario 1: Complete User Flow

1. **Connect Wallet**:
   - Click "Connect Wallet"
   - Approve connection in MetaMask
   - Verify you're on Sepolia network

2. **Submit Credit Data**:
   - Use these test values:
     - Income: 8000
     - Debt: 5000
     - Age: 35
     - Credit History: 8
     - Payment History: 9
   - Click "Submit Encrypted Data"
   - Confirm transaction in MetaMask
   - Wait for confirmation

3. **Evaluate Credit**:
   - Click "Evaluate Credit (FHE)"
   - Confirm transaction in MetaMask
   - Wait for FHE computation to complete

4. **Request Loan Approval**:
   - Click "Request Loan Approval"
   - Confirm final transaction

### Test Scenario 2: Edge Cases

**Test different credit profiles**:

**Poor Credit**:
- Income: 2000, Debt: 30000, Age: 20, History: 1, Payment: 3

**Excellent Credit**:
- Income: 15000, Debt: 1000, Age: 45, History: 15, Payment: 10

**Boundary Values**:
- Test age limits (18, 100)
- Test payment history limits (1, 10)
- Test with zero debt
- Test with very high income

### Test Scenario 3: Error Handling

**Network Issues**:
- Switch to wrong network (test network switching)
- Try with insufficient ETH balance
- Test with invalid input values

**Transaction Failures**:
- Try submitting data twice (should fail)
- Try evaluating before submitting data
- Try requesting approval before evaluation

## 🔍 Debugging Common Issues

### Issue 1: FHE Initialization Fails

**Symptoms**: "Failed to initialize FHE" error

**Solutions**:
```javascript
// Check browser console for specific errors
// Try refreshing the page
// Ensure MetaMask is connected to Sepolia
// Clear browser cache and localStorage
```

### Issue 2: Transaction Fails

**Symptoms**: Transaction reverts or fails to submit

**Debug Steps**:
1. Check MetaMask transaction details
2. Verify gas fees are sufficient
3. Check contract address is correct
4. Ensure network is Sepolia
5. Verify input validation

### Issue 3: Encryption Errors

**Symptoms**: "Encryption failed" or data appears unencrypted

**Solutions**:
```typescript
// Add more detailed logging
console.log('FHE Instance:', fhevmInstance)
console.log('Encryption input:', data)
console.log('Encryption result:', encryptedData)

// Verify fhevmjs version
npm list fhevmjs
```

### Issue 4: Contract Interaction Fails

**Symptoms**: "Contract call failed" errors

**Debug Checklist**:
- ✅ Contract address is correct
- ✅ ABI matches deployed contract
- ✅ MetaMask connected to right network
- ✅ Sufficient ETH balance
- ✅ Data types match contract expectations

## 📊 Monitoring and Analytics

### 1. Transaction Monitoring

Monitor your contract on Sepolia Etherscan:
```
https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS
```

### 2. Event Logging

Add comprehensive logging to track user interactions:

```typescript
// Track FHE operations
console.log('🔐 FHE initialized:', await getFHEStatus())
console.log('📊 Encrypting data:', data)
console.log('✅ Transaction confirmed:', txHash)

// Monitor contract events
contract.on('CreditDataSubmitted', (user, timestamp) => {
  console.log('📝 Credit data submitted:', { user, timestamp })
})

contract.on('CreditEvaluated', (user, timestamp) => {
  console.log('🧠 Credit evaluated:', { user, timestamp })
})
```

### 3. Performance Monitoring

Track key metrics:

```typescript
// Measure encryption time
const start = performance.now()
await encryptCreditData(data)
const encryptionTime = performance.now() - start
console.log(`⏱️ Encryption took: ${encryptionTime}ms`)

// Track transaction confirmations
let confirmations = 0
const receipt = await tx.wait()
console.log(`⛓️ Transaction confirmed with ${confirmations} confirmations`)
```

## 🚀 Deployment to Production

### 1. Mainnet Deployment Considerations

**Before deploying to mainnet**:
- ✅ Thorough security audit
- ✅ Comprehensive testing on testnets
- ✅ Gas optimization
- ✅ Emergency pause functionality
- ✅ Upgrade mechanisms (if needed)

### 2. Hosting Options

**Frontend Hosting**:
- **Vercel**: `vercel --prod`
- **Netlify**: `netlify deploy --prod`
- **IPFS**: `ipfs add -r dist/`
- **GitHub Pages**: Push to `gh-pages` branch

### 3. Domain and SSL

Configure custom domain with HTTPS:
```bash
# Example with Vercel
vercel domains add yourdomain.com
vercel domains verify yourdomain.com
```

## 🛡️ Security Best Practices

### 1. Frontend Security

```typescript
// Input sanitization
const sanitizeInput = (input: string) => {
  return input.trim().replace(/[^0-9]/g, '')
}

// Validate encrypted data integrity
const validateEncryption = (encrypted: Uint8Array) => {
  return encrypted && encrypted.length > 0
}
```

### 2. Smart Contract Security

```solidity
// Add reentrancy protection
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract CreditAnalyzer is SepoliaConfig, ReentrancyGuard {
    function submitCreditData(...) external nonReentrant {
        // Implementation
    }
}

// Add access control
import "@openzeppelin/contracts/access/Ownable.sol";

// Rate limiting
mapping(address => uint256) public lastSubmission;
require(block.timestamp > lastSubmission[msg.sender] + 1 hours, "Rate limited");
```

### 3. FHE Security

```typescript
// Secure key management
// Never log private keys or sensitive data
// Use secure random number generation
// Implement proper access controls
```

## 📈 Performance Optimization

### 1. Frontend Optimization

```typescript
// Lazy load FHE initialization
const lazyInitFHE = async () => {
  if (!fhevmInstance) {
    fhevmInstance = await createInstance(config)
  }
  return fhevmInstance
}

// Batch encryption operations
const encryptBatch = async (values: number[]) => {
  return Promise.all(values.map(v => encrypt(v)))
}
```

### 2. Gas Optimization

```solidity
// Pack structs efficiently
struct CreditData {
    uint128 encryptedIncome;    // Reduce from uint256 if possible
    uint128 encryptedDebt;      // Pack into single storage slot
    uint64 encryptedAge;
    uint64 encryptedCreditHistory;
    uint64 encryptedPaymentHistory;
    bool hasSubmitted;
    uint32 submissionTime;      // Use uint32 for timestamps
}

// Use events for data that doesn't need storage
event CreditScoreCalculated(address indexed user, uint256 score);
```

## 🎯 Success Checklist

Before considering your deployment successful, verify:

- ✅ Smart contract deployed and verified on Sepolia
- ✅ Frontend connects to MetaMask successfully
- ✅ FHE encryption/decryption works correctly
- ✅ All user flows complete without errors
- ✅ Transaction monitoring and logging in place
- ✅ Error handling for all edge cases
- ✅ Performance metrics meet requirements
- ✅ Security best practices implemented
- ✅ Documentation updated and complete

## 🆘 Getting Help

If you encounter issues:

1. **Check Browser Console**: Most errors appear in browser dev tools
2. **MetaMask Issues**: Reset MetaMask if connections fail
3. **Transaction Issues**: Use Sepolia Etherscan to debug
4. **FHE Issues**: Check Zama documentation and community forums
5. **General Questions**:
   - [Zama Community](https://community.zama.ai)
   - [GitHub Issues](https://github.com/zama-ai/fhevm/issues)
   - [Discord](https://discord.gg/zama)

## 🎉 Congratulations!

You've successfully deployed your first FHEVM confidential dApp! Your privacy-preserving credit assessment system is now live and demonstrating the power of Fully Homomorphic Encryption on blockchain.

**What you've accomplished**:
- ✅ Deployed a smart contract with FHE capabilities
- ✅ Built a user interface for confidential operations
- ✅ Implemented client-side encryption
- ✅ Created a complete testing framework
- ✅ Established monitoring and debugging workflows

**Next steps**:
- Explore advanced FHE features
- Build more complex confidential applications
- Contribute to the FHEVM ecosystem
- Share your experience with the community

Welcome to the future of privacy-preserving blockchain applications! 🚀