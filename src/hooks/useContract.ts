import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/constants'

export const useContract = (account: string | null) => {
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    if (account && window.ethereum) {
      initializeContract()
    } else {
      setContract(null)
    }
  }, [account])

  const initializeContract = async () => {
    try {
      setLoading(true)
      
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
      
      setContract(contractInstance)
    } catch (error) {
      console.error('Failed to initialize contract:', error)
      setContract(null)
    } finally {
      setLoading(false)
    }
  }

  return {
    contract,
    loading
  }
}