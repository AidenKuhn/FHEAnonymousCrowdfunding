import React, { useState } from 'react'

interface TransactionExplanationProps {
  isOpen: boolean
  onClose: () => void
}

const TransactionExplanation: React.FC<TransactionExplanationProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'flow' | 'trigger' | 'state'>('flow')

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>🔍 MetaMask Transaction Implementation Principles</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab-btn ${activeTab === 'flow' ? 'active' : ''}`}
            onClick={() => setActiveTab('flow')}
          >
            Contract Interaction Flow
          </button>
          <button 
            className={`tab-btn ${activeTab === 'trigger' ? 'active' : ''}`}
            onClick={() => setActiveTab('trigger')}
          >
            Trigger Mechanism
          </button>
          <button 
            className={`tab-btn ${activeTab === 'state' ? 'active' : ''}`}
            onClick={() => setActiveTab('state')}
          >
            State Management
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'flow' && (
            <div className="explanation-section">
              <h3>📋 Contract Interaction Flow:</h3>
              <div className="flow-steps">
                <div className="flow-step">
                  <span className="step-number">1</span>
                  <span className="step-text">User clicks button</span>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <span className="step-number">2</span>
                  <span className="step-text">Call contract method</span>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <span className="step-number">3</span>
                  <span className="step-text">ethers.js sends transaction</span>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <span className="step-number">4</span>
                  <span className="step-text">MetaMask popup confirmation</span>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <span className="step-number">5</span>
                  <span className="step-text">Blockchain execution</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trigger' && (
            <div className="explanation-section">
              <h3>⚡ Trigger Mechanism:</h3>
              <ol className="numbered-list">
                <li>When contract method is called, ethers.js constructs the transaction</li>
                <li>Because contract instance uses signer, ethers.js knows user signature is required</li>
                <li>This automatically triggers MetaMask transaction confirmation popup</li>
                <li>After user confirmation, transaction is sent to Sepolia testnet</li>
                <li><code>tx.wait()</code> waits for transaction to be mined and confirmed</li>
              </ol>
            </div>
          )}

          {activeTab === 'state' && (
            <div className="explanation-section">
              <h3>🔄 State Management:</h3>
              <ul className="bullet-list">
                <li>Display loading state during transaction processing</li>
                <li>Update UI prompts and user feedback</li>
                <li>Wait for blockchain confirmation</li>
                <li>Refresh page state after transaction completion</li>
              </ul>
            </div>
          )}

          <div className="technical-summary">
            <h4>💡 Technical Implementation:</h4>
            <p>
              Interaction with smart contracts is handled through ethers.js, with MetaMask 
              as the wallet provider automatically handling transaction signing and sending.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TransactionExplanation