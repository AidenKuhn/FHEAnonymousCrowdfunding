// Contract configuration
export const CONTRACT_ADDRESS = "0x55F4A793FD9B9A39a1b17cD23310D0761EE33CCA"

export const CONTRACT_ABI = [
  // For testing: try with the exact function signature from Solidity
  "function submitCreditData(bytes32, bytes32, bytes32, bytes32, bytes32) external",
  "function evaluateCreditScore(address) external", 
  "function requestLoanApproval() external",
  
  // View functions for checking status
  "function hasSubmittedCreditData(address) external view returns (bool)",
  "function isCreditEvaluated(address) external view returns (bool)",
  "function getEvaluationStats() external view returns (uint256)",
  
  // Encrypted result functions  
  "function getEncryptedCreditScore(address) external view returns (bytes32)",
  "function getEncryptedLoanApproval(address) external view returns (bytes32)",
  
  // Events
  "event CreditDataSubmitted(address indexed user, uint256 timestamp)",
  "event CreditEvaluated(address indexed user, uint256 timestamp)",
  "event LoanApprovalRequested(address indexed user, uint256 timestamp)"
]

// Network configuration
export const SEPOLIA_CHAIN_ID = '0xaa36a7'
export const SEPOLIA_NETWORK = {
  chainId: SEPOLIA_CHAIN_ID,
  chainName: 'Sepolia Test Network',
  rpcUrls: [
    'https://sepolia.infura.io/v3/',
    'https://rpc.sepolia.org',
    'https://ethereum-sepolia.blockpi.network/v1/rpc/public'
  ],
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  },
  blockExplorerUrls: ['https://sepolia.etherscan.io/']
}

// Faucet URLs for getting test ETH
export const SEPOLIA_FAUCETS = [
  'https://sepoliafaucet.com/',
  'https://faucet.sepolia.dev/',
  'https://sepolia-faucet.pk910.de/'
]

// Preset values for credit data
export const INCOME_PRESETS = [
  { label: '$3,000', value: 3000 },
  { label: '$5,000', value: 5000 },
  { label: '$8,000', value: 8000 },
  { label: '$12,000', value: 12000 }
]

export const DEBT_PRESETS = [
  { label: '$0', value: 0 },
  { label: '$5,000', value: 5000 },
  { label: '$15,000', value: 15000 },
  { label: '$30,000', value: 30000 }
]

export const AGE_PRESETS = [
  { label: '25', value: 25 },
  { label: '30', value: 30 },
  { label: '40', value: 40 },
  { label: '50', value: 50 }
]

export const CREDIT_HISTORY_PRESETS = [
  { label: '2 years', value: 2 },
  { label: '5 years', value: 5 },
  { label: '10 years', value: 10 },
  { label: '15+ years', value: 15 }
]

export const PAYMENT_HISTORY_PRESETS = [
  { label: '5 - Fair', value: 5 },
  { label: '7 - Good', value: 7 },
  { label: '9 - Excellent', value: 9 },
  { label: '10 - Perfect', value: 10 }
]