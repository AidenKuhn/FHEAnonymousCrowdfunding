import React from 'react'

interface MessageDisplayProps {
  message: string
  type: 'info' | 'error'
  onClose: () => void
}

const MessageDisplay: React.FC<MessageDisplayProps> = ({ message, type, onClose }) => {
  if (!message) return null

  return (
    <div className={`message ${type === 'error' ? 'error' : ''}`}>
      <span>{message}</span>
      {type === 'error' && (
        <button 
          className="message-close"
          onClick={onClose}
          aria-label="Close message"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default MessageDisplay