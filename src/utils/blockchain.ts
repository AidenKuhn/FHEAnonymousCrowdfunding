import { ethers } from 'ethers'
import type { ContractTransaction, TransactionReceipt } from 'ethers'

export interface TransactionStatus {
  hash?: string
  status: 'pending' | 'confirming' | 'confirmed' | 'failed'
  confirmations: number
  gasUsed?: string
  effectiveGasPrice?: string
  blockNumber?: number
  error?: string
}

export interface GasEstimate {
  gasLimit: bigint
  gasPrice: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  estimatedCost: string
  estimatedCostUSD?: string
}

// Transaction status tracker
export class TransactionTracker {
  private provider: ethers.BrowserProvider

  constructor(provider: ethers.BrowserProvider) {
    this.provider = provider
  }

  async trackTransaction(
    txHash: string,
    onStatusUpdate: (status: TransactionStatus) => void
  ): Promise<TransactionReceipt> {
    console.log('📡 Tracking transaction:', txHash)
    
    // Initial status
    onStatusUpdate({
      hash: txHash,
      status: 'pending',
      confirmations: 0
    })

    try {
      // Wait for transaction to be mined
      const receipt = await this.provider.waitForTransaction(txHash, 1)
      
      if (!receipt) {
        throw new Error('Transaction receipt not found')
      }

      console.log('✅ Transaction confirmed:', {
        hash: txHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status
      })

      // Update final status
      onStatusUpdate({
        hash: txHash,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        confirmations: 1,
        gasUsed: ethers.formatUnits(receipt.gasUsed, 'wei'),
        effectiveGasPrice: receipt.gasPrice ? ethers.formatUnits(receipt.gasPrice, 'gwei') : undefined,
        blockNumber: receipt.blockNumber
      })

      return receipt

    } catch (error: any) {
      console.error('❌ Transaction tracking failed:', error)
      
      onStatusUpdate({
        hash: txHash,
        status: 'failed',
        confirmations: 0,
        error: error.message
      })
      
      throw error
    }
  }
}

// Gas estimation utilities
export class GasEstimator {
  private provider: ethers.BrowserProvider

  constructor(provider: ethers.BrowserProvider) {
    this.provider = provider
  }

  async estimateContractCall(
    contract: ethers.Contract,
    methodName: string,
    args: any[] = []
  ): Promise<GasEstimate> {
    try {
      console.log(`⛽ Estimating gas for ${methodName}...`)
      console.log('📝 Arguments for estimation:', args)
      
      // Get current gas price
      const feeData = await this.provider.getFeeData()
      console.log('💰 Fee data:', {
        gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : 'null',
        maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : 'null',
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') : 'null'
      })

      // Try gas estimation with error handling
      let gasLimit: bigint
      try {
        gasLimit = await contract[methodName].estimateGas(...args)
        console.log(`📊 Estimated gas limit: ${gasLimit.toString()}`)
      } catch (estimationError: any) {
        console.warn(`⚠️ Gas estimation failed, trying fallback methods:`, estimationError.message)
        
        // Try with staticCall first to check if the transaction would succeed
        try {
          await contract[methodName].staticCall(...args)
          console.log('✅ Static call succeeded, using fallback gas limit')
          gasLimit = BigInt(300000) // Higher fallback for complex operations
        } catch (staticError: any) {
          console.error(`❌ Static call also failed:`, staticError.message)
          throw new Error(`Contract call would fail: ${staticError.message}`)
        }
      }

      // Add 50% buffer to gas limit for safety
      const bufferedGasLimit = (gasLimit * BigInt(150)) / BigInt(100)
      
      // Calculate estimated cost
      let gasPrice = feeData.gasPrice || BigInt(0)
      let maxFeePerGas = feeData.maxFeePerGas
      let maxPriorityFeePerGas = feeData.maxPriorityFeePerGas

      // Fallback gas prices if not available
      if (!gasPrice && !maxFeePerGas) {
        gasPrice = BigInt(ethers.parseUnits('20', 'gwei'))
        maxFeePerGas = gasPrice
      }

      // Use legacy gas price if EIP-1559 not available
      if (!maxFeePerGas && gasPrice > BigInt(0)) {
        maxFeePerGas = gasPrice
      }

      const estimatedCostWei = bufferedGasLimit * (maxFeePerGas || gasPrice)
      const estimatedCostEth = ethers.formatEther(estimatedCostWei)

      console.log(`💸 Estimated cost: ${estimatedCostEth} ETH`)

      return {
        gasLimit: bufferedGasLimit,
        gasPrice: gasPrice,
        maxFeePerGas: maxFeePerGas || undefined,
        maxPriorityFeePerGas: maxPriorityFeePerGas || undefined,
        estimatedCost: parseFloat(estimatedCostEth).toFixed(6)
      }

    } catch (error: any) {
      console.error(`❌ Gas estimation failed for ${methodName}:`, error)
      
      // Return safe default values if estimation fails
      const defaultGasPrice = BigInt(ethers.parseUnits('25', 'gwei'))
      return {
        gasLimit: BigInt(400000), // Higher default gas limit
        gasPrice: defaultGasPrice,
        maxFeePerGas: defaultGasPrice,
        maxPriorityFeePerGas: BigInt(ethers.parseUnits('2', 'gwei')),
        estimatedCost: '0.01' // Conservative default
      }
    }
  }
}

// Transaction executor with proper error handling
export class TransactionExecutor {
  private provider: ethers.BrowserProvider
  private gasEstimator: GasEstimator
  private transactionTracker: TransactionTracker

  constructor(provider: ethers.BrowserProvider) {
    this.provider = provider
    this.gasEstimator = new GasEstimator(provider)
    this.transactionTracker = new TransactionTracker(provider)
  }

  async executeTransaction(
    contract: ethers.Contract,
    methodName: string,
    args: any[] = [],
    onStatusUpdate: (status: TransactionStatus) => void,
    options: {
      confirmations?: number
      timeout?: number
      retries?: number
    } = {}
  ): Promise<TransactionReceipt> {
    const { confirmations = 1, timeout = 300000, retries = 1 } = options // 5 minute timeout, 1 retry

    let lastError: any = null
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retry attempt ${attempt}/${retries} for ${methodName}`)
          // Wait a bit before retry
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

        console.log(`🚀 Executing transaction: ${methodName} (attempt ${attempt + 1})`)
        console.log('📝 Arguments:', args)

        // Estimate gas first
        const gasEstimate = await this.gasEstimator.estimateContractCall(contract, methodName, args)
        console.log('⛽ Gas estimate:', gasEstimate)

        onStatusUpdate({
          status: 'pending',
          confirmations: 0
        })

        // Prepare transaction options with safe fallbacks
        const txOptions: any = {
          gasLimit: gasEstimate.gasLimit
        }

        // Use EIP-1559 if available, otherwise use legacy
        if (gasEstimate.maxFeePerGas && gasEstimate.maxPriorityFeePerGas) {
          txOptions.maxFeePerGas = gasEstimate.maxFeePerGas
          txOptions.maxPriorityFeePerGas = gasEstimate.maxPriorityFeePerGas
        } else if (gasEstimate.gasPrice) {
          txOptions.gasPrice = gasEstimate.gasPrice
        }

        // Execute the transaction
        console.log('📤 Sending transaction to blockchain...')
        console.log('⚙️ Transaction options:', {
          gasLimit: txOptions.gasLimit?.toString(),
          gasPrice: txOptions.gasPrice?.toString(),
          maxFeePerGas: txOptions.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: txOptions.maxPriorityFeePerGas?.toString()
        })
        
        const tx: ContractTransaction = await contract[methodName](...args, txOptions)

        console.log('✅ Transaction sent:', (tx as any).hash)
        console.log('📋 Transaction details:', {
          to: tx.to,
          value: tx.value?.toString() || '0',
          gasLimit: tx.gasLimit?.toString() || 'unknown',
          gasPrice: tx.gasPrice?.toString(),
          maxFeePerGas: tx.maxFeePerGas?.toString(),
          nonce: tx.nonce
        })

        // Track the transaction
        const receipt = await this.transactionTracker.trackTransaction(
          (tx as any).hash,
          onStatusUpdate
        )

        console.log('🎉 Transaction completed successfully!')
        return receipt

      } catch (error: any) {
        lastError = error
        console.error(`❌ Transaction execution failed for ${methodName} (attempt ${attempt + 1}):`, error)
        
        // Don't retry for certain errors
        if (error.code === 4001 || // User rejected
            error.message?.includes('user rejected') ||
            error.message?.includes('cancelled by user')) {
          break // Don't retry user cancellations
        }
        
        if (attempt === retries) {
          break // Last attempt, will throw error below
        }
      }
    }

    // Parse error message for user-friendly display
    let userMessage = lastError.message

    if (lastError.code === 4001) {
      userMessage = 'Transaction cancelled by user'
    } else if (lastError.code === -32603) {
      userMessage = 'Transaction failed - insufficient funds or contract error'
    } else if (lastError.message?.includes('insufficient funds')) {
      userMessage = 'Insufficient ETH balance for gas fees'
    } else if (lastError.message?.includes('user rejected')) {
      userMessage = 'Transaction rejected by user'
    } else if (lastError.message?.includes('execution reverted')) {
      userMessage = 'Contract execution failed - check your data'
    } else if (lastError.message?.includes('missing revert data')) {
      userMessage = 'Contract call failed - please check your input data and try again'
    } else if (lastError.message?.includes('CALL_EXCEPTION')) {
      userMessage = 'Contract call exception - please verify your data is correct'
    }

    onStatusUpdate({
      status: 'failed',
      confirmations: 0,
      error: userMessage
    })

    throw new Error(userMessage)
  }
}

// Utility functions for transaction management
export const waitForConfirmations = async (
  provider: ethers.BrowserProvider,
  txHash: string,
  confirmations: number = 1
): Promise<TransactionReceipt> => {
  console.log(`⏳ Waiting for ${confirmations} confirmations...`)
  
  const receipt = await provider.waitForTransaction(txHash, confirmations)
  
  if (!receipt) {
    throw new Error('Transaction not found')
  }
  
  return receipt
}

export const getTransactionStatus = async (
  provider: ethers.BrowserProvider,
  txHash: string
): Promise<TransactionReceipt | null> => {
  try {
    return await provider.getTransactionReceipt(txHash)
  } catch (error) {
    console.error('Failed to get transaction status:', error)
    return null
  }
}

export const formatGasPrice = (gasPrice: bigint): string => {
  return `${ethers.formatUnits(gasPrice, 'gwei')} gwei`
}

export const formatGasUsed = (gasUsed: bigint): string => {
  return gasUsed.toString()
}

export const calculateTransactionCost = (gasUsed: bigint, gasPrice: bigint): string => {
  const costWei = gasUsed * gasPrice
  return ethers.formatEther(costWei)
}