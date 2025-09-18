# Hello FHEVM: Your First Confidential dApp Tutorial

Welcome to the world of Fully Homomorphic Encryption (FHE) on blockchain! This comprehensive tutorial will guide you through building your first confidential dApp using Zama's FHEVM technology.

## 🎯 What You'll Build

A **Privacy-Preserving Credit Assessment System** where:
- Users submit encrypted financial data (income, debt, age, credit history)
- Credit scoring happens entirely on encrypted data using FHE
- Results remain confidential while being verifiable on-chain
- No sensitive information is ever exposed

## 🧠 Learning Objectives

By completing this tutorial, you will learn:
- ✅ How to set up a React + FHEVM project from scratch
- ✅ How to write smart contracts with encrypted data types
- ✅ How to encrypt data client-side using fhevmjs
- ✅ How to perform computations on encrypted data on-chain
- ✅ How to build a complete user interface for confidential apps
- ✅ How to handle encrypted transactions and user permissions

## 📋 Prerequisites

Before starting, ensure you have:
- Basic knowledge of Solidity smart contracts
- Familiarity with React and TypeScript
- Experience with Web3 tools (MetaMask, Ethers.js)
- Node.js 18+ and npm installed
- **No prior FHE or cryptography knowledge required!**

## 🚀 Part 1: Project Setup

### Step 1: Initialize Your Project

Create a new Vite + React + TypeScript project:

```bash
# Create project
npm create vite@latest my-fhevm-dapp -- --template react-ts
cd my-fhevm-dapp

# Install dependencies
npm install

# Install FHEVM and Web3 dependencies
npm install ethers@6.15.0 fhevmjs@0.6.2

# Install development dependencies
npm install --save-dev @types/node buffer process vite-plugin-node-polyfills
```

### Step 2: Configure Vite for Web3

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  define: {
    global: 'globalThis',
  },
})
```

Update `package.json` to add engines:

```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

## 🔐 Part 2: Smart Contract Development

### Step 3: Create Your First FHE Smart Contract

Create `contracts/CreditAnalyzer.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, euint8, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title CreditAnalyzer
 * @dev A confidential credit evaluation system using Fully Homomorphic Encryption
 */
contract CreditAnalyzer is SepoliaConfig {

    address public owner;
    uint256 public totalEvaluations;

    // Credit score ranges (1-5 scale)
    uint8 constant EXCELLENT_SCORE = 5;  // 750+
    uint8 constant GOOD_SCORE = 4;       // 650-749
    uint8 constant FAIR_SCORE = 3;       // 550-649
    uint8 constant POOR_SCORE = 2;       // 450-549
    uint8 constant BAD_SCORE = 1;        // <450

    struct CreditData {
        euint32 encryptedIncome;        // Monthly income (encrypted)
        euint32 encryptedDebt;          // Total debt (encrypted)
        euint8 encryptedAge;            // Age (encrypted)
        euint8 encryptedCreditHistory;  // Credit history length in years (encrypted)
        euint8 encryptedPaymentHistory; // Payment history score 1-10 (encrypted)
        bool hasSubmitted;
        uint256 submissionTime;
    }

    struct CreditEvaluation {
        euint8 encryptedScore;          // Final credit score (encrypted)
        bool isEvaluated;
        uint256 evaluationTime;
        ebool isApproved;               // Loan approval status (encrypted)
    }

    mapping(address => CreditData) public creditSubmissions;
    mapping(address => CreditEvaluation) public creditEvaluations;

    event CreditDataSubmitted(address indexed user, uint256 timestamp);
    event CreditEvaluated(address indexed user, uint256 timestamp);
    event LoanApprovalRequested(address indexed user, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier hasSubmittedData() {
        require(creditSubmissions[msg.sender].hasSubmitted, "No credit data submitted");
        _;
    }

    constructor() {
        owner = msg.sender;
        totalEvaluations = 0;
    }

    /**
     * @dev Submit encrypted credit data for evaluation
     */
    function submitCreditData(
        euint32 _encryptedIncome,
        euint32 _encryptedDebt,
        euint8 _encryptedAge,
        euint8 _encryptedCreditHistory,
        euint8 _encryptedPaymentHistory
    ) external {
        require(!creditSubmissions[msg.sender].hasSubmitted, "Data already submitted");

        creditSubmissions[msg.sender] = CreditData({
            encryptedIncome: _encryptedIncome,
            encryptedDebt: _encryptedDebt,
            encryptedAge: _encryptedAge,
            encryptedCreditHistory: _encryptedCreditHistory,
            encryptedPaymentHistory: _encryptedPaymentHistory,
            hasSubmitted: true,
            submissionTime: block.timestamp
        });

        // Grant access permissions for contract operations
        _grantDataAccessPermissions(
            _encryptedIncome,
            _encryptedDebt,
            _encryptedAge,
            _encryptedCreditHistory,
            _encryptedPaymentHistory
        );

        emit CreditDataSubmitted(msg.sender, block.timestamp);
    }

    /**
     * @dev Evaluate credit score using encrypted computation
     */
    function evaluateCreditScore(address user) external {
        require(msg.sender == user || msg.sender == owner, "Not authorized to evaluate");
        require(creditSubmissions[user].hasSubmitted, "No credit data submitted");
        require(!creditEvaluations[user].isEvaluated, "Already evaluated");

        CreditData storage data = creditSubmissions[user];

        // Calculate credit score through FHE operations
        euint8 score = _calculateCreditScore(data);

        // Calculate loan approval (score >= 3)
        ebool approved = FHE.ge(score, FHE.asEuint8(FAIR_SCORE));

        creditEvaluations[user] = CreditEvaluation({
            encryptedScore: score,
            isEvaluated: true,
            evaluationTime: block.timestamp,
            isApproved: approved
        });

        // Grant access permissions for results
        FHE.allowThis(score);
        FHE.allowThis(approved);
        FHE.allow(score, user);
        FHE.allow(approved, user);

        totalEvaluations++;
        emit CreditEvaluated(user, block.timestamp);
    }

    /**
     * @dev Calculate credit score using FHE operations
     */
    function _calculateCreditScore(CreditData storage data) internal returns (euint8) {
        // Start with base score
        euint8 score = FHE.asEuint8(FAIR_SCORE);

        // Age bonus: +1 if age > 25, +1 more if age > 40
        ebool ageBonus = FHE.gt(data.encryptedAge, FHE.asEuint8(25));
        score = FHE.select(ageBonus, FHE.add(score, FHE.asEuint8(1)), score);

        ebool matureAge = FHE.gt(data.encryptedAge, FHE.asEuint8(40));
        score = FHE.select(matureAge, FHE.add(score, FHE.asEuint8(1)), score);

        // Credit history bonus: +1 if > 5 years, +1 more if > 10 years
        ebool historyBonus = FHE.gt(data.encryptedCreditHistory, FHE.asEuint8(5));
        score = FHE.select(historyBonus, FHE.add(score, FHE.asEuint8(1)), score);

        ebool longHistory = FHE.gt(data.encryptedCreditHistory, FHE.asEuint8(10));
        score = FHE.select(longHistory, FHE.add(score, FHE.asEuint8(1)), score);

        // Payment history bonus: +1 if > 7, +1 more if perfect (10)
        ebool paymentBonus = FHE.gt(data.encryptedPaymentHistory, FHE.asEuint8(7));
        score = FHE.select(paymentBonus, FHE.add(score, FHE.asEuint8(1)), score);

        ebool perfectPayment = FHE.eq(data.encryptedPaymentHistory, FHE.asEuint8(10));
        score = FHE.select(perfectPayment, FHE.add(score, FHE.asEuint8(1)), score);

        // Debt penalties: -1 if debt > 20k, -1 more if > 50k
        ebool highDebt = FHE.gt(data.encryptedDebt, FHE.asEuint32(20000));
        score = FHE.select(highDebt, FHE.sub(score, FHE.asEuint8(1)), score);

        ebool veryHighDebt = FHE.gt(data.encryptedDebt, FHE.asEuint32(50000));
        score = FHE.select(veryHighDebt, FHE.sub(score, FHE.asEuint8(1)), score);

        // Debt-to-income ratio penalty
        ebool debtExceedsIncome = FHE.gt(data.encryptedDebt, data.encryptedIncome);
        score = FHE.select(debtExceedsIncome, FHE.sub(score, FHE.asEuint8(2)), score);

        // Income bonus: +1 if income > 5k, +1 more if > 10k
        ebool incomeBonus = FHE.gt(data.encryptedIncome, FHE.asEuint32(5000));
        score = FHE.select(incomeBonus, FHE.add(score, FHE.asEuint8(1)), score);

        ebool highIncome = FHE.gt(data.encryptedIncome, FHE.asEuint32(10000));
        score = FHE.select(highIncome, FHE.add(score, FHE.asEuint8(1)), score);

        // Enforce score limits (1-5)
        ebool tooLow = FHE.lt(score, FHE.asEuint8(1));
        score = FHE.select(tooLow, FHE.asEuint8(1), score);

        ebool tooHigh = FHE.gt(score, FHE.asEuint8(5));
        score = FHE.select(tooHigh, FHE.asEuint8(5), score);

        return score;
    }

    /**
     * @dev Grant access permissions for encrypted data
     */
    function _grantDataAccessPermissions(
        euint32 income,
        euint32 debt,
        euint8 age,
        euint8 creditHistory,
        euint8 paymentHistory
    ) internal {
        // Allow contract to access data for computations
        FHE.allowThis(income);
        FHE.allowThis(debt);
        FHE.allowThis(age);
        FHE.allowThis(creditHistory);
        FHE.allowThis(paymentHistory);

        // Allow user to access their own data
        FHE.allow(income, msg.sender);
        FHE.allow(debt, msg.sender);
        FHE.allow(age, msg.sender);
        FHE.allow(creditHistory, msg.sender);
        FHE.allow(paymentHistory, msg.sender);
    }

    /**
     * @dev Request loan approval based on evaluation
     */
    function requestLoanApproval() external hasSubmittedData {
        require(creditEvaluations[msg.sender].isEvaluated, "Credit not evaluated yet");
        emit LoanApprovalRequested(msg.sender, block.timestamp);
    }

    // View functions
    function hasSubmittedCreditData(address user) external view returns (bool) {
        return creditSubmissions[user].hasSubmitted;
    }

    function isCreditEvaluated(address user) external view returns (bool) {
        return creditEvaluations[user].isEvaluated;
    }

    function getEvaluationStats() external view returns (uint256) {
        return totalEvaluations;
    }

    function getEncryptedCreditScore(address user) external view returns (euint8) {
        require(msg.sender == user || msg.sender == owner, "Not authorized");
        require(creditEvaluations[user].isEvaluated, "Not evaluated");
        return creditEvaluations[user].encryptedScore;
    }

    function getEncryptedLoanApproval(address user) external view returns (ebool) {
        require(msg.sender == user || msg.sender == owner, "Not authorized");
        require(creditEvaluations[user].isEvaluated, "Not evaluated");
        return creditEvaluations[user].isApproved;
    }
}
```

### 🧠 Understanding FHE Operations

The key concepts demonstrated in this contract:

1. **Encrypted Data Types**: `euint32`, `euint8`, `ebool` for different encrypted data sizes
2. **FHE Operations**: `FHE.add()`, `FHE.sub()`, `FHE.gt()`, `FHE.select()` for computations on encrypted data
3. **Access Control**: `FHE.allow()` and `FHE.allowThis()` for managing who can access encrypted data
4. **Zero-Knowledge Logic**: All computations happen on encrypted data, results remain confidential

## 💻 Part 3: Frontend Development

### Step 4: Set Up FHE Client Integration

Create `src/utils/fhe.ts`:

```typescript
import { FhevmInstance, createInstance } from 'fhevmjs'

let fhevmInstance: FhevmInstance | null = null

const FHE_CONFIG = {
  chainId: 11155111, // Sepolia testnet
}

/**
 * Initialize FHE instance for client-side encryption
 */
export async function initializeFHE(): Promise<FhevmInstance> {
  if (fhevmInstance) {
    return fhevmInstance
  }

  try {
    console.log('🔐 Initializing FHE instance...')

    fhevmInstance = await createInstance({
      chainId: FHE_CONFIG.chainId,
      network: window.ethereum
    })

    console.log('✅ FHE instance initialized successfully')
    return fhevmInstance
  } catch (error) {
    console.error('❌ Failed to initialize FHE:', error)
    throw error
  }
}

/**
 * Encrypt a 32-bit unsigned integer (for income, debt)
 */
export async function encryptUint32(value: number): Promise<Uint8Array> {
  if (!fhevmInstance) {
    throw new Error('FHE instance not initialized')
  }

  console.log(`🔒 Encrypting uint32 value: ${value}`)
  return fhevmInstance.encrypt32(value)
}

/**
 * Encrypt an 8-bit unsigned integer (for age, credit history, payment history)
 */
export async function encryptUint8(value: number): Promise<Uint8Array> {
  if (!fhevmInstance) {
    throw new Error('FHE instance not initialized')
  }

  console.log(`🔒 Encrypting uint8 value: ${value}`)
  return fhevmInstance.encrypt8(value)
}

/**
 * Convert encrypted bytes to contract-compatible format
 */
export function encryptedToUint256(encrypted: Uint8Array): string {
  const bytes = encrypted.slice(0, 32)
  const paddedBytes = new Uint8Array(32)
  paddedBytes.set(bytes)

  const hexString = '0x' + Array.from(paddedBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return BigInt(hexString).toString()
}

/**
 * Encrypt all credit data for contract submission
 */
export async function encryptCreditData(data: {
  income: number
  debt: number
  age: number
  creditHistory: number
  paymentHistory: number
}): Promise<{
  encryptedIncome: string
  encryptedDebt: string
  encryptedAge: string
  encryptedCreditHistory: string
  encryptedPaymentHistory: string
}> {
  console.log('🔐 Starting credit data encryption...')

  await initializeFHE()

  // Encrypt each field
  const [
    encryptedIncome,
    encryptedDebt,
    encryptedAge,
    encryptedCreditHistory,
    encryptedPaymentHistory
  ] = await Promise.all([
    encryptUint32(data.income),
    encryptUint32(data.debt),
    encryptUint8(data.age),
    encryptUint8(data.creditHistory),
    encryptUint8(data.paymentHistory)
  ])

  const result = {
    encryptedIncome: encryptedToUint256(encryptedIncome),
    encryptedDebt: encryptedToUint256(encryptedDebt),
    encryptedAge: encryptedToUint256(encryptedAge),
    encryptedCreditHistory: encryptedToUint256(encryptedCreditHistory),
    encryptedPaymentHistory: encryptedToUint256(encryptedPaymentHistory)
  }

  console.log('✅ Credit data encryption completed')
  return result
}
```

### Step 5: Contract Integration

Create `src/utils/constants.ts`:

```typescript
// Replace with your deployed contract address
export const CONTRACT_ADDRESS = "0x55F4A793FD9B9A39a1b17cD23310D0761EE33CCA"

export const CONTRACT_ABI = [
  "function submitCreditData(uint256, uint256, uint256, uint256, uint256) external",
  "function evaluateCreditScore(address) external",
  "function requestLoanApproval() external",
  "function hasSubmittedCreditData(address) external view returns (bool)",
  "function isCreditEvaluated(address) external view returns (bool)",
  "function getEvaluationStats() external view returns (uint256)",
  "function getEncryptedCreditScore(address) external view returns (uint256)",
  "function getEncryptedLoanApproval(address) external view returns (uint256)",
  "event CreditDataSubmitted(address indexed user, uint256 timestamp)",
  "event CreditEvaluated(address indexed user, uint256 timestamp)",
  "event LoanApprovalRequested(address indexed user, uint256 timestamp)"
]

export const SEPOLIA_CHAIN_ID = '0xaa36a7'
export const SEPOLIA_NETWORK = {
  chainId: SEPOLIA_CHAIN_ID,
  chainName: 'Sepolia Test Network',
  rpcUrls: ['https://sepolia.infura.io/v3/', 'https://rpc.sepolia.org'],
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  blockExplorerUrls: ['https://sepolia.etherscan.io/']
}
```

### Step 6: Wallet Integration Hook

Create `src/hooks/useWallet.ts`:

```typescript
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { SEPOLIA_CHAIN_ID, SEPOLIA_NETWORK } from '../utils/constants'

export function useWallet() {
  const [account, setAccount] = useState<string>('')
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [balance, setBalance] = useState<string>('0')
  const [chainId, setChainId] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  // Initialize on component mount
  useEffect(() => {
    checkConnection()
    setupEventListeners()
  }, [])

  const checkConnection = async () => {
    if (!window.ethereum) return

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await provider.listAccounts()

      if (accounts.length > 0) {
        const account = accounts[0].address
        setAccount(account)
        setProvider(provider)
        setIsConnected(true)

        await updateBalance(provider, account)
        await updateChainId(provider)
      }
    } catch (error) {
      console.error('Error checking connection:', error)
    }
  }

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!')
      return
    }

    try {
      setLoading(true)

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' })

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const account = await signer.getAddress()

      setAccount(account)
      setProvider(provider)
      setIsConnected(true)

      await updateBalance(provider, account)
      await updateChainId(provider)

      // Switch to Sepolia if needed
      await ensureSepoliaNetwork()

    } catch (error: any) {
      console.error('Error connecting wallet:', error)
      alert(error.message || 'Failed to connect wallet')
    } finally {
      setLoading(false)
    }
  }

  const ensureSepoliaNetwork = async () => {
    if (!window.ethereum) return

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      })
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SEPOLIA_NETWORK],
          })
        } catch (addError) {
          console.error('Error adding Sepolia network:', addError)
        }
      }
    }
  }

  const updateBalance = async (provider: ethers.BrowserProvider, account: string) => {
    try {
      const balance = await provider.getBalance(account)
      setBalance(ethers.formatEther(balance))
    } catch (error) {
      console.error('Error updating balance:', error)
    }
  }

  const updateChainId = async (provider: ethers.BrowserProvider) => {
    try {
      const network = await provider.getNetwork()
      setChainId(`0x${network.chainId.toString(16)}`)
    } catch (error) {
      console.error('Error updating chain ID:', error)
    }
  }

  const setupEventListeners = () => {
    if (!window.ethereum) return

    window.ethereum.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length > 0) {
        setAccount(accounts[0])
        if (provider) updateBalance(provider, accounts[0])
      } else {
        setAccount('')
        setIsConnected(false)
        setProvider(null)
      }
    })

    window.ethereum.on('chainChanged', (chainId: string) => {
      setChainId(chainId)
      window.location.reload()
    })
  }

  const networkName = chainId === SEPOLIA_CHAIN_ID ? 'Sepolia' : 'Unknown'

  return {
    account,
    isConnected,
    provider,
    balance,
    chainId,
    networkName,
    loading,
    connectWallet,
  }
}
```

### Step 7: Main App Component

Create the main `src/App.tsx`:

```typescript
import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWallet } from './hooks/useWallet'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './utils/constants'
import { encryptCreditData, initializeFHE } from './utils/fhe'

interface CreditData {
  income: string
  debt: string
  age: string
  creditHistory: string
  paymentHistory: string
}

interface UserStatus {
  hasSubmitted: boolean
  isEvaluated: boolean
  canApprove: boolean
}

function App() {
  const { account, isConnected, connectWallet, provider, balance, networkName } = useWallet()

  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [creditData, setCreditData] = useState<CreditData>({
    income: '',
    debt: '',
    age: '',
    creditHistory: '',
    paymentHistory: ''
  })

  const [userStatus, setUserStatus] = useState<UserStatus>({
    hasSubmitted: false,
    isEvaluated: false,
    canApprove: false
  })

  const [totalEvaluations, setTotalEvaluations] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')

  // Initialize contract when provider and account are available
  useEffect(() => {
    if (provider && account) {
      const signer = provider.getSigner()
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
      setContract(contractInstance)
    }
  }, [provider, account])

  // Update user status when contract is available
  useEffect(() => {
    if (contract && account) {
      updateUserStatus()
      updateStats()
    }
  }, [contract, account])

  const updateUserStatus = async () => {
    if (!contract || !account) return

    try {
      const hasSubmitted = await contract.hasSubmittedCreditData(account)
      const isEvaluated = await contract.isCreditEvaluated(account)

      setUserStatus({
        hasSubmitted,
        isEvaluated,
        canApprove: isEvaluated
      })
    } catch (error) {
      console.error('Failed to update user status:', error)
    }
  }

  const updateStats = async () => {
    if (!contract) return

    try {
      const stats = await contract.getEvaluationStats()
      setTotalEvaluations(Number(stats))
    } catch (error) {
      console.error('Failed to update stats:', error)
    }
  }

  const showMessage = (text: string, isError: boolean = false) => {
    setMessage(text)
    setTimeout(() => setMessage(''), 5000)
  }

  // Submit encrypted credit data
  const submitCreditData = async () => {
    if (!contract) {
      showMessage('Please connect your wallet first!', true)
      return
    }

    // Validate inputs
    const income = parseInt(creditData.income)
    const debt = parseInt(creditData.debt)
    const age = parseInt(creditData.age)
    const creditHistory = parseInt(creditData.creditHistory)
    const paymentHistory = parseInt(creditData.paymentHistory)

    if (isNaN(income) || isNaN(debt) || isNaN(age) || isNaN(creditHistory) || isNaN(paymentHistory)) {
      showMessage('Please enter valid numbers for all fields!', true)
      return
    }

    if (age < 18 || age > 100) {
      showMessage('Age must be between 18 and 100!', true)
      return
    }

    if (paymentHistory < 1 || paymentHistory > 10) {
      showMessage('Payment history score must be between 1 and 10!', true)
      return
    }

    try {
      setLoading(true)
      showMessage('Encrypting your data...')

      // Initialize FHE and encrypt data
      await initializeFHE()
      const encryptedData = await encryptCreditData({
        income, debt, age, creditHistory, paymentHistory
      })

      showMessage('Submitting encrypted data to blockchain...')

      // Submit to contract
      const tx = await contract.submitCreditData(
        encryptedData.encryptedIncome,
        encryptedData.encryptedDebt,
        encryptedData.encryptedAge,
        encryptedData.encryptedCreditHistory,
        encryptedData.encryptedPaymentHistory
      )

      await tx.wait()

      showMessage('✅ Encrypted credit data submitted successfully!')

      // Clear form and update status
      setCreditData({
        income: '', debt: '', age: '', creditHistory: '', paymentHistory: ''
      })

      await updateUserStatus()

    } catch (error: any) {
      console.error('Submit failed:', error)
      showMessage(error.message || 'Failed to submit credit data', true)
    } finally {
      setLoading(false)
    }
  }

  // Evaluate credit using FHE computation
  const evaluateCredit = async () => {
    if (!contract || !account) return

    try {
      setLoading(true)
      showMessage('Computing encrypted credit score...')

      const tx = await contract.evaluateCreditScore(account)
      await tx.wait()

      showMessage('✅ Credit evaluation completed using FHE!')
      await updateUserStatus()
      await updateStats()

    } catch (error: any) {
      console.error('Evaluation failed:', error)
      showMessage(error.message || 'Failed to evaluate credit', true)
    } finally {
      setLoading(false)
    }
  }

  // Request loan approval
  const requestLoanApproval = async () => {
    if (!contract) return

    try {
      setLoading(true)
      showMessage('Requesting loan approval...')

      const tx = await contract.requestLoanApproval()
      await tx.wait()

      showMessage('✅ Loan approval request submitted!')

    } catch (error: any) {
      console.error('Approval request failed:', error)
      showMessage(error.message || 'Failed to request approval', true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1>🔐 Hello FHEVM Tutorial</h1>
        <p>Privacy-Preserving Credit Assessment System</p>
        <p>Total Evaluations: {totalEvaluations}</p>
      </header>

      {!isConnected ? (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={connectWallet}
            disabled={loading}
            style={{ padding: '15px 30px', fontSize: '16px' }}
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <p><strong>Connected:</strong> {account}</p>
            <p><strong>Network:</strong> {networkName}</p>
            <p><strong>Balance:</strong> {parseFloat(balance).toFixed(4)} ETH</p>
            <p><strong>Data Submitted:</strong> {userStatus.hasSubmitted ? '✅' : '❌'}</p>
            <p><strong>Credit Evaluated:</strong> {userStatus.isEvaluated ? '✅' : '❌'}</p>
          </div>

          {!userStatus.hasSubmitted && (
            <div style={{ marginBottom: '30px' }}>
              <h2>📋 Submit Your Credit Data (Encrypted)</h2>
              <div style={{ display: 'grid', gap: '15px' }}>
                <input
                  type="number"
                  placeholder="Monthly Income (e.g., 5000)"
                  value={creditData.income}
                  onChange={(e) => setCreditData({...creditData, income: e.target.value})}
                  style={{ padding: '10px' }}
                />
                <input
                  type="number"
                  placeholder="Total Debt (e.g., 15000)"
                  value={creditData.debt}
                  onChange={(e) => setCreditData({...creditData, debt: e.target.value})}
                  style={{ padding: '10px' }}
                />
                <input
                  type="number"
                  placeholder="Age (18-100)"
                  value={creditData.age}
                  onChange={(e) => setCreditData({...creditData, age: e.target.value})}
                  style={{ padding: '10px' }}
                />
                <input
                  type="number"
                  placeholder="Credit History (years, e.g., 5)"
                  value={creditData.creditHistory}
                  onChange={(e) => setCreditData({...creditData, creditHistory: e.target.value})}
                  style={{ padding: '10px' }}
                />
                <input
                  type="number"
                  placeholder="Payment History Score (1-10)"
                  value={creditData.paymentHistory}
                  onChange={(e) => setCreditData({...creditData, paymentHistory: e.target.value})}
                  style={{ padding: '10px' }}
                />
                <button
                  onClick={submitCreditData}
                  disabled={loading}
                  style={{ padding: '15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
                >
                  {loading ? 'Submitting...' : '🔐 Submit Encrypted Data'}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {userStatus.hasSubmitted && !userStatus.isEvaluated && (
              <button
                onClick={evaluateCredit}
                disabled={loading}
                style={{ padding: '15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}
              >
                {loading ? 'Evaluating...' : '🧠 Evaluate Credit (FHE)'}
              </button>
            )}

            {userStatus.canApprove && (
              <button
                onClick={requestLoanApproval}
                disabled={loading}
                style={{ padding: '15px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '5px' }}
              >
                {loading ? 'Requesting...' : '💰 Request Loan Approval'}
              </button>
            )}
          </div>

          {message && (
            <div style={{
              padding: '15px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '5px',
              marginTop: '20px'
            }}>
              {message}
            </div>
          )}
        </div>
      )}

      <footer style={{ marginTop: '50px', textAlign: 'center', color: '#666' }}>
        <h3>🎓 What You've Learned</h3>
        <ul style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
          <li>✅ Client-side encryption using fhevmjs</li>
          <li>✅ FHE smart contract development with encrypted data types</li>
          <li>✅ Performing computations on encrypted data on-chain</li>
          <li>✅ Managing access permissions for encrypted data</li>
          <li>✅ Building user interfaces for confidential applications</li>
          <li>✅ Complete transaction flow with encrypted inputs/outputs</li>
        </ul>
        <p style={{ marginTop: '20px' }}>
          🚀 <strong>Congratulations!</strong> You've built your first confidential dApp with FHEVM!
        </p>
      </footer>
    </div>
  )
}

export default App
```

## 🚀 Part 4: Deployment and Testing

### Step 8: Install MetaMask and Get Test ETH

1. **Install MetaMask**: Download from [metamask.io](https://metamask.io)
2. **Add Sepolia Network**:
   - Network Name: Sepolia Test Network
   - RPC URL: https://sepolia.infura.io/v3/
   - Chain ID: 11155111
   - Currency: ETH
3. **Get Test ETH**: Visit [sepoliafaucet.com](https://sepoliafaucet.com) or [faucet.sepolia.dev](https://faucet.sepolia.dev)

### Step 9: Deploy Your Smart Contract

You can use Remix IDE for easy deployment:

1. Go to [remix.ethereum.org](https://remix.ethereum.org)
2. Create a new file `CreditAnalyzer.sol` and paste the contract code
3. Install the FHEVM plugin in Remix
4. Compile the contract
5. Deploy to Sepolia testnet using MetaMask
6. Copy the deployed contract address to `src/utils/constants.ts`

### Step 10: Run Your dApp

```bash
# Start development server
npm run dev
```

Open http://localhost:5173 and test your confidential credit assessment system!

## 🎯 Testing Your dApp

### Test Case 1: Good Credit Profile
- Income: $8,000
- Debt: $5,000
- Age: 35
- Credit History: 8 years
- Payment History: 9

### Test Case 2: Poor Credit Profile
- Income: $3,000
- Debt: $25,000
- Age: 22
- Credit History: 1 year
- Payment History: 4

### Test Case 3: Excellent Credit Profile
- Income: $12,000
- Debt: $2,000
- Age: 45
- Credit History: 15 years
- Payment History: 10

## 🔍 Understanding the Magic

### How FHE Works in Your dApp

1. **Client-Side Encryption**: User data is encrypted in the browser using the fhevmjs library
2. **On-Chain Computation**: Smart contract performs credit scoring directly on encrypted data
3. **Confidential Results**: Credit scores and loan approval status remain encrypted
4. **Access Control**: Only authorized parties can decrypt results

### Key FHE Operations Used

- `FHE.add()` / `FHE.sub()`: Mathematical operations on encrypted numbers
- `FHE.gt()` / `FHE.lt()` / `FHE.eq()`: Comparisons between encrypted values
- `FHE.select()`: Conditional logic (encrypted if-then-else)
- `FHE.allow()`: Grant decryption permissions

## 🚀 Next Steps

Now that you've built your first FHEVM dApp, you can:

### Extend Your Credit System
- Add more sophisticated credit scoring algorithms
- Implement encrypted credit history tracking
- Create loan amount calculations based on income/debt ratios
- Add encrypted collateral management

### Explore Advanced FHE Features
- **Threshold Decryption**: Require multiple parties to decrypt results
- **FHE Governance**: Create DAOs with encrypted voting
- **Cross-Contract FHE**: Share encrypted data between contracts
- **FHE Oracles**: Use encrypted external data feeds

### Build Other Confidential dApps
- **Private Voting Systems**: Elections with encrypted votes
- **Confidential Auctions**: Sealed-bid auctions without revealing bids
- **Private Trading**: DEX with hidden order books
- **Healthcare Records**: Medical data with privacy guarantees

## 📚 Additional Resources

- **Zama Documentation**: [docs.zama.ai](https://docs.zama.ai)
- **FHEVM GitHub**: [github.com/zama-ai/fhevm](https://github.com/zama-ai/fhevm)
- **fhevmjs Library**: [github.com/zama-ai/fhevmjs](https://github.com/zama-ai/fhevmjs)
- **Zama Community**: [community.zama.ai](https://community.zama.ai)

## 🎉 Conclusion

Congratulations! You've successfully built a complete confidential dApp using FHEVM. You now understand:

- ✅ How to implement FHE in smart contracts
- ✅ Client-side encryption and decryption
- ✅ Building user interfaces for confidential applications
- ✅ Managing encrypted data permissions and access control
- ✅ The complete development workflow for privacy-preserving dApps

**Welcome to the future of privacy-preserving blockchain applications!** 🚀

---

*This tutorial demonstrates the power of Fully Homomorphic Encryption for creating truly confidential decentralized applications. Continue experimenting and building the next generation of privacy-first Web3 applications.*