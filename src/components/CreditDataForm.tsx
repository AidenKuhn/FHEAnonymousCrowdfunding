import React from 'react'
import PresetButtons from './PresetButtons'
import type { CreditData } from '../utils/types'
import {
  INCOME_PRESETS,
  DEBT_PRESETS,
  AGE_PRESETS,
  CREDIT_HISTORY_PRESETS,
  PAYMENT_HISTORY_PRESETS
} from '../utils/constants'

interface CreditDataFormProps {
  creditData: CreditData
  setCreditData: React.Dispatch<React.SetStateAction<CreditData>>
  setPreset: (field: keyof CreditData, value: string) => void
  onSubmit: () => Promise<void>
  loading: boolean
}

const CreditDataForm: React.FC<CreditDataFormProps> = ({
  creditData,
  setCreditData,
  setPreset,
  onSubmit,
  loading
}) => {
  const handleInputChange = (field: keyof CreditData, value: string) => {
    setCreditData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async () => {
    try {
      await onSubmit()
    } catch (error) {
      console.error('Submit failed:', error)
    }
  }

  return (
    <div className="form-section">
      <h3 className="section-title">Submit Confidential Credit Data</h3>
      
      <div className="input-group">
        <label className="input-label">Monthly Income (USD)</label>
        <input
          type="number"
          className="input-field"
          placeholder="Enter monthly income"
          value={creditData.income}
          onChange={(e) => handleInputChange('income', e.target.value)}
          disabled={loading}
        />
        <PresetButtons
          presets={INCOME_PRESETS}
          onSelect={(value) => setPreset('income', value.toString())}
        />
      </div>

      <div className="input-group">
        <label className="input-label">Total Debt (USD)</label>
        <input
          type="number"
          className="input-field"
          placeholder="Enter total debt"
          value={creditData.debt}
          onChange={(e) => handleInputChange('debt', e.target.value)}
          disabled={loading}
        />
        <PresetButtons
          presets={DEBT_PRESETS}
          onSelect={(value) => setPreset('debt', value.toString())}
        />
      </div>

      <div className="input-group">
        <label className="input-label">Age</label>
        <input
          type="number"
          className="input-field"
          placeholder="Enter your age"
          min="18"
          max="100"
          value={creditData.age}
          onChange={(e) => handleInputChange('age', e.target.value)}
          disabled={loading}
        />
        <PresetButtons
          presets={AGE_PRESETS}
          onSelect={(value) => setPreset('age', value.toString())}
        />
      </div>

      <div className="input-group">
        <label className="input-label">Credit History (Years)</label>
        <input
          type="number"
          className="input-field"
          placeholder="Years of credit history"
          min="0"
          value={creditData.creditHistory}
          onChange={(e) => handleInputChange('creditHistory', e.target.value)}
          disabled={loading}
        />
        <PresetButtons
          presets={CREDIT_HISTORY_PRESETS}
          onSelect={(value) => setPreset('creditHistory', value.toString())}
        />
      </div>

      <div className="input-group">
        <label className="input-label">Payment History Score (1-10)</label>
        <input
          type="number"
          className="input-field"
          placeholder="Payment reliability score"
          min="1"
          max="10"
          value={creditData.paymentHistory}
          onChange={(e) => handleInputChange('paymentHistory', e.target.value)}
          disabled={loading}
        />
        <PresetButtons
          presets={PAYMENT_HISTORY_PRESETS}
          onSelect={(value) => setPreset('paymentHistory', value.toString())}
        />
      </div>

      <button 
        className="btn btn-primary" 
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className="loading"></span>
            Submitting...
          </>
        ) : (
          'Submit Encrypted Data to Blockchain'
        )}
      </button>
    </div>
  )
}

export default CreditDataForm