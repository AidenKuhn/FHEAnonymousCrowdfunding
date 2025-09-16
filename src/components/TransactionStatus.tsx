import React from 'react'
import type { TransactionStatus as TxStatus } from '../utils/blockchain'

interface TransactionStatusProps {
  status: TxStatus | null
  onClose?: () => void
}

const TransactionStatus: React.FC<TransactionStatusProps> = ({ status, onClose }) => {
  if (!status) return null

  const getStatusIcon = () => {
    switch (status.status) {
      case 'pending':
        return '⏳'
      case 'confirming':
        return '🔄'
      case 'confirmed':
        return '✅'
      case 'failed':
        return '❌'
      default:
        return '📋'
    }
  }

  const getStatusColor = () => {
    switch (status.status) {
      case 'pending':
        return '#fbbf24' // yellow
      case 'confirming':
        return '#3b82f6' // blue
      case 'confirmed':
        return '#10b981' // green
      case 'failed':
        return '#ef4444' // red
      default:
        return '#6b7280' // gray
    }
  }

  const getStatusText = () => {
    switch (status.status) {
      case 'pending':
        return 'Waiting for user confirmation...'
      case 'confirming':
        return `Confirming... (${status.confirmations} confirmation${status.confirmations !== 1 ? 's' : ''})`
      case 'confirmed':
        return 'Transaction confirmed!'
      case 'failed':
        return status.error || 'Transaction failed'
      default:
        return 'Unknown status'
    }
  }

  return (
    <div className="transaction-status" style={{ borderLeftColor: getStatusColor() }}>
      <div className="transaction-header">
        <span className="status-icon">{getStatusIcon()}</span>
        <span className="status-text">{getStatusText()}</span>
        {onClose && (status.status === 'confirmed' || status.status === 'failed') && (
          <button className="close-btn" onClick={onClose}>×</button>
        )}
      </div>
      
      {status.hash && (
        <div className="transaction-details">
          <div className="detail-row">
            <span className="detail-label">Transaction Hash:</span>
            <a 
              href={`https://sepolia.etherscan.io/tx/${status.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="transaction-link"
            >
              {status.hash.slice(0, 10)}...{status.hash.slice(-8)}
            </a>
          </div>
          
          {status.blockNumber && (
            <div className="detail-row">
              <span className="detail-label">Block Number:</span>
              <span className="detail-value">{status.blockNumber}</span>
            </div>
          )}
          
          {status.gasUsed && (
            <div className="detail-row">
              <span className="detail-label">Gas Used:</span>
              <span className="detail-value">{parseInt(status.gasUsed).toLocaleString()}</span>
            </div>
          )}
          
          {status.effectiveGasPrice && (
            <div className="detail-row">
              <span className="detail-label">Gas Price:</span>
              <span className="detail-value">{parseFloat(status.effectiveGasPrice).toFixed(2)} gwei</span>
            </div>
          )}
        </div>
      )}
      
      {status.status === 'pending' && (
        <div className="pending-info">
          <p>Please confirm the transaction in your MetaMask wallet.</p>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}
      
      {status.status === 'confirming' && (
        <div className="confirming-info">
          <p>Transaction is being processed on the Sepolia network.</p>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${Math.min(status.confirmations * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionStatus