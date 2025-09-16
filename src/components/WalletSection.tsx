import React from 'react'

interface WalletSectionProps {
  onConnect: () => Promise<void>
  loading: boolean
}

const WalletSection: React.FC<WalletSectionProps> = ({ onConnect, loading }) => {
  const handleConnect = async () => {
    try {
      await onConnect()
    } catch (error: any) {
      console.error('Connection failed:', error)
      // Error handling is done in the parent component
    }
  }

  return (
    <div className="wallet-section">
      <button 
        className="btn btn-primary" 
        onClick={handleConnect}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className="loading"></span>
            Connecting...
          </>
        ) : (
          'Connect MetaMask Wallet'
        )}
      </button>
    </div>
  )
}

export default WalletSection