import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import Header from './components/Header'
import StatusInfo from './components/StatusInfo'
import WalletSection from './components/WalletSection'
import CreditDataForm from './components/CreditDataForm'
import ActionButtons from './components/ActionButtons'
import MessageDisplay from './components/MessageDisplay'
import TransactionStatus from './components/TransactionStatus'
import Footer from './components/Footer'
import { useWallet } from './hooks/useWallet'
import TransactionExplanation from './components/TransactionExplanation'
import { useContract } from './hooks/useContract'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './utils/constants'
import { TransactionExecutor } from './utils/blockchain'
import { encryptCreditData, initializeFHE, getFHEStatus } from './utils/fhe'
import type { CreditData, UserStatus } from './utils/types'
import type { TransactionStatus as TxStatus } from './utils/blockchain'

function App() {
  // Wallet and contract state
  const { 
    account, 
    isConnected, 
    connectWallet, 
    balance, 
    chainId, 
    networkName,
    loading: walletLoading,
    provider
  } = useWallet()
  const { contract, loading: contractLoading } = useContract(account)
  
  // Application state
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
  const [showTransactionExplanation, setShowTransactionExplanation] = useState<boolean>(false)
  const [messageType, setMessageType] = useState<'info' | 'error'>('info')
  
  // Transaction state
  const [transactionStatus, setTransactionStatus] = useState<TxStatus | null>(null)
  const [transactionExecutor, setTransactionExecutor] = useState<TransactionExecutor | null>(null)

  // Initialize transaction executor when provider is available
  useEffect(() => {
    if (provider) {
      const executor = new TransactionExecutor(provider)
      setTransactionExecutor(executor)
    }
  }, [provider])

  // Update user status when contract is available
  useEffect(() => {
    if (contract && account) {
      updateUserStatus()
      updateStats()
    }
  }, [contract, account])

  // Clear transaction status when starting new operations
  const clearTransactionStatus = () => {
    setTransactionStatus(null)
  }

  // Update user status from contract
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

  // Update statistics from contract
  const updateStats = async () => {
    if (!contract) return

    try {
      const stats = await contract.getEvaluationStats()
      setTotalEvaluations(Number(stats))
    } catch (error) {
      console.error('Failed to update stats:', error)
    }
  }

  // Submit credit data to blockchain with complete transaction flow
  const submitCreditData = async () => {
    if (!contract || !transactionExecutor) {
      showMessage('Please connect your wallet first!', 'error')
      return
    }

    // Enhanced input validation
    const incomeStr = creditData.income.trim()
    const debtStr = creditData.debt.trim()
    const ageStr = creditData.age.trim()
    const creditHistoryStr = creditData.creditHistory.trim()
    const paymentHistoryStr = creditData.paymentHistory.trim()

    if (!incomeStr || !debtStr || !ageStr || !creditHistoryStr || !paymentHistoryStr) {
      showMessage('Please fill in all fields!', 'error')
      return
    }

    const income = parseInt(incomeStr)
    const debt = parseInt(debtStr)
    const age = parseInt(ageStr)
    const creditHistory = parseInt(creditHistoryStr)
    const paymentHistory = parseInt(paymentHistoryStr)

    // Check for NaN values
    if (isNaN(income) || isNaN(debt) || isNaN(age) || isNaN(creditHistory) || isNaN(paymentHistory)) {
      showMessage('Please enter valid numbers for all fields!', 'error')
      return
    }

    // Validate ranges
    if (age < 18 || age > 100) {
      showMessage('Age must be between 18 and 100!', 'error')
      return
    }

    if (paymentHistory < 1 || paymentHistory > 10) {
      showMessage('Payment history score must be between 1 and 10!', 'error')
      return
    }

    if (income <= 0) {
      showMessage('Income must be greater than 0!', 'error')
      return
    }

    if (debt < 0) {
      showMessage('Debt cannot be negative!', 'error')
      return
    }

    if (creditHistory < 0) {
      showMessage('Credit history cannot be negative!', 'error')
      return
    }

    // Additional business logic validation
    if (income > 10000000) { // 10M max
      showMessage('Income seems unusually high. Please verify your input.', 'error')
      return
    }

    if (debt > income * 100) { // Max debt 100x income
      showMessage('Debt amount seems unusually high compared to income.', 'error')
      return
    }

    // Check balance
    if (parseFloat(balance) === 0) {
      showMessage('Insufficient ETH balance to pay for gas fees. Please add Sepolia ETH to your wallet.', 'error')
      return
    }

    try {
      setLoading(true)
      clearTransactionStatus()
      showMessage('Initializing encryption...')

      console.log('🚀 Starting credit data submission transaction')
      console.log('📋 Validated data:', { income, debt, age, creditHistory, paymentHistory })

      // Initialize FHE if not already done
      showMessage('Setting up homomorphic encryption...')
      await initializeFHE()
      
      // Encrypt the credit data
      showMessage('Encrypting your financial data...')
      const encryptedData = await encryptCreditData({
        income,
        debt,
        age,
        creditHistory,
        paymentHistory
      })
      
      console.log('🔐 Data encrypted successfully')
      showMessage('Preparing encrypted transaction...')

      // Execute transaction with encrypted parameters
      await transactionExecutor.executeTransaction(
        contract,
        'submitCreditData',
        [
          encryptedData.encryptedIncome,
          encryptedData.encryptedDebt,
          encryptedData.encryptedAge,
          encryptedData.encryptedCreditHistory,
          encryptedData.encryptedPaymentHistory
        ],
        (status) => {
          console.log('📊 Transaction status update:', status)
          setTransactionStatus(status)
          
          if (status.status === 'pending') {
            showMessage('Transaction sent! Please confirm in MetaMask...')
          } else if (status.status === 'confirming') {
            showMessage(`Transaction confirming... (${status.confirmations} confirmations)`)
          } else if (status.status === 'confirmed') {
            showMessage('Encrypted credit data successfully submitted to blockchain! 🟢')
          } else if (status.status === 'failed') {
            showMessage(status.error || 'Transaction failed', 'error')
          }
        },
        { retries: 2, confirmations: 1 } // Enable retries
      )
      
      // Clear form and update status on success
      setCreditData({
        income: '',
        debt: '',
        age: '',
        creditHistory: '',
        paymentHistory: ''
      })
      
      await updateUserStatus()
      
      console.log('✅ Credit data submission completed successfully')

    } catch (error: any) {
      console.error('❌ Submit credit data failed:', error)
      
      // Enhanced error handling
      let errorMessage = error.message
      if (errorMessage.includes('Contract call would fail')) {
        errorMessage = 'Transaction would fail. Please check if you have already submitted data or verify your input values.'
      }
      
      showMessage(errorMessage || 'Failed to submit credit data. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Evaluate credit score using FHE with complete transaction flow
  const evaluateCredit = async () => {
    if (!contract || !account || !transactionExecutor) {
      showMessage('Please ensure wallet and contract are connected!', 'error')
      return
    }
    
    // Check balance
    if (parseFloat(balance) === 0) {
      showMessage('Insufficient ETH balance to pay for gas fees.', 'error')
      return
    }

    try {
      setLoading(true)
      clearTransactionStatus()
      showMessage('Preparing credit evaluation...')

      console.log('🧠 Starting credit evaluation transaction for:', account)
      
      await transactionExecutor.executeTransaction(
        contract,
        'evaluateCreditScore',
        [account],
        (status) => {
          console.log('📊 Evaluation status update:', status)
          setTransactionStatus(status)
          
          if (status.status === 'pending') {
            showMessage('Transaction sent! Please confirm in MetaMask...')
          } else if (status.status === 'confirming') {
            showMessage('Computing encrypted credit score...')
          } else if (status.status === 'confirmed') {
            showMessage('Credit evaluation completed using homomorphic encryption! 🟢')
          } else if (status.status === 'failed') {
            showMessage(status.error || 'Evaluation failed', 'error')
          }
        }
      )
      
      await updateUserStatus()
      await updateStats()
      
      console.log('✅ Credit evaluation completed successfully')
      
    } catch (error: any) {
      console.error('❌ Credit evaluation failed:', error)
      showMessage(error.message || 'Failed to evaluate credit score. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Request loan approval with complete transaction flow
  const requestLoanApproval = async () => {
    if (!contract || !transactionExecutor) {
      showMessage('Please ensure wallet and contract are connected!', 'error')
      return
    }
    
    // Check balance
    if (parseFloat(balance) === 0) {
      showMessage('Insufficient ETH balance to pay for gas fees.', 'error')
      return
    }
    
    try {
      setLoading(true)
      clearTransactionStatus()
      showMessage('Preparing loan approval request...')

      console.log('💰 Starting loan approval request transaction')
      
      await transactionExecutor.executeTransaction(
        contract,
        'requestLoanApproval',
        [],
        (status) => {
          console.log('📊 Approval status update:', status)
          setTransactionStatus(status)
          
          if (status.status === 'pending') {
            showMessage('Transaction sent! Please confirm in MetaMask...')
          } else if (status.status === 'confirming') {
            showMessage('Processing loan approval request...')
          } else if (status.status === 'confirmed') {
            showMessage('Loan approval request submitted successfully! 🟢')
          } else if (status.status === 'failed') {
            showMessage(status.error || 'Approval request failed', 'error')
          }
        }
      )
      
      console.log('✅ Loan approval request completed successfully')
      
    } catch (error: any) {
      console.error('❌ Loan approval request failed:', error)
      showMessage(error.message || 'Failed to request loan approval. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Show message to user
  const showMessage = (text: string, type: 'info' | 'error' = 'info') => {
    setMessage(text)
    setMessageType(type)
    
    // Auto-hide success messages after 5 seconds
    if (type !== 'error') {
      setTimeout(() => {
        setMessage('')
      }, 5000)
    }
  }

  // Handle preset value selection
  const setPreset = (field: keyof CreditData, value: string) => {
    setCreditData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const isAppLoading = walletLoading || contractLoading || loading

  return (
    <div className="container">
      <Header />
      
      <StatusInfo 
        userStatus={userStatus}
        totalEvaluations={totalEvaluations}
        balance={balance}
        networkName={networkName}
        chainId={chainId}
      />
      <div className="explanation-btn-container">
        <button 
          className="btn btn-accent explanation-btn"
          onClick={() => setShowTransactionExplanation(true)}
        >
          📚 Transaction Explanation
        </button>
      </div>

      {!isConnected ? (
        <WalletSection 
          onConnect={connectWallet}
          loading={isAppLoading}
        />
      ) : (
        <>
          <div className="wallet-address">
            Connected: {account?.slice(0, 6)}...{account?.slice(-4)}
          </div>

          {!userStatus.hasSubmitted && (
            <CreditDataForm
              creditData={creditData}
              setCreditData={setCreditData}
              setPreset={setPreset}
              onSubmit={submitCreditData}
              loading={isAppLoading}
            />
          )}

          <ActionButtons
            userStatus={userStatus}
            onEvaluate={evaluateCredit}
            onRequestApproval={requestLoanApproval}
            loading={isAppLoading}
          />
        </>
      )}

      <MessageDisplay 
        message={message}
        type={messageType}
        onClose={() => setMessage('')}
      />

      <TransactionStatus 
        status={transactionStatus}
        onClose={() => setTransactionStatus(null)}
      />
      <TransactionExplanation 
        isOpen={showTransactionExplanation}
        onClose={() => setShowTransactionExplanation(false)}
      />
      <Footer />
    </div>
  )
}

export default App