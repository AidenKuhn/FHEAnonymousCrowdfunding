import React from 'react'
import type { UserStatus } from '../utils/types'

interface ActionButtonsProps {
  userStatus: UserStatus
  onEvaluate: () => Promise<void>
  onRequestApproval: () => Promise<void>
  loading: boolean
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  userStatus,
  onEvaluate,
  onRequestApproval,
  loading
}) => {
  const handleEvaluate = async () => {
    try {
      await onEvaluate()
    } catch (error) {
      console.error('Evaluation failed:', error)
    }
  }

  const handleRequestApproval = async () => {
    try {
      await onRequestApproval()
    } catch (error) {
      console.error('Approval request failed:', error)
    }
  }

  return (
    <div className="action-buttons">
      {/* Evaluate Credit Button */}
      {userStatus.hasSubmitted && !userStatus.isEvaluated && (
        <button 
          className="btn btn-secondary" 
          onClick={handleEvaluate}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="loading"></span>
              Evaluating...
            </>
          ) : (
            'Evaluate Credit Score with FHE'
          )}
        </button>
      )}
      
      {/* Loan Approval Button */}
      {userStatus.canApprove && (
        <button 
          className="btn btn-accent" 
          onClick={handleRequestApproval}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="loading"></span>
              Requesting...
            </>
          ) : (
            'Request Loan Approval'
          )}
        </button>
      )}
    </div>
  )
}

export default ActionButtons