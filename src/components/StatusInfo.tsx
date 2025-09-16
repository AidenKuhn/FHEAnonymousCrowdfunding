import React from 'react'
import type { UserStatus } from '../utils/types'

interface StatusInfoProps {
  userStatus: UserStatus
  totalEvaluations: number
  balance?: string
  networkName?: string
  chainId?: string
}

const StatusInfo: React.FC<StatusInfoProps> = ({ 
  userStatus, 
  totalEvaluations, 
  balance = '0',
  networkName = 'Unknown',
  chainId = ''
}) => {
  const getStatusMessage = () => {
    if (!userStatus.hasSubmitted) {
      return '📝 Submit your financial data for confidential evaluation'
    }
    
    if (!userStatus.isEvaluated) {
      return '🔄 Evaluate your credit score using encrypted computation'
    }
    
    if (userStatus.canApprove) {
      return '✅ Request loan approval based on your score'
    }
    
    return 'Credit evaluation complete!'
  }

  const isOnSepolia = chainId === '0xaa36a7'
  const hasInsufficientBalance = parseFloat(balance) === 0

  return (
    <div className="status-info">
      <div className="status-row">
        <span className="status-label">Network:</span>
        <span className={`status-value ${isOnSepolia ? 'network-correct' : 'network-warning'}`}>
          {networkName}
          {!isOnSepolia && chainId && ' ⚠️'}
        </span>
      </div>
      
      <div className="status-row">
        <span className="status-label">ETH Balance:</span>
        <span className={`status-value ${hasInsufficientBalance ? 'balance-warning' : ''}`}>
          {balance} ETH
          {hasInsufficientBalance && ' ⚠️'}
        </span>
      </div>
      
      <div className="status-row">
        <span className="status-label">Data Submitted:</span>
        <span className="status-value">
          {userStatus.hasSubmitted ? '✅ Yes' : '❌ No'}
        </span>
      </div>
      
      <div className="status-row">
        <span className="status-label">Credit Evaluated:</span>
        <span className="status-value">
          {userStatus.isEvaluated ? '✅ Yes' : '❌ No'}
        </span>
      </div>
      
      <div className="status-row">
        <span className="status-label">Total Evaluations:</span>
        <span className="status-value">{totalEvaluations}</span>
      </div>
      
      <div className="status-row">
        <span className="status-label">Status:</span>
        <span className="status-value">{getStatusMessage()}</span>
      </div>
      
      {!isOnSepolia && chainId && (
        <div className="network-warning-message">
          ⚠️ Please switch to Sepolia testnet to use this DApp
        </div>
      )}
      
      {hasInsufficientBalance && (
        <div className="balance-warning-message">
          ⚠️ You need Sepolia ETH to pay for gas fees. Get free testnet ETH from a faucet.
        </div>
      )}
    </div>
  )
}

export default StatusInfo