import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { SEPOLIA_CHAIN_ID, SEPOLIA_NETWORK } from '../utils/constants'

export const useWallet = () => {
  const [account, setAccount] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [balance, setBalance] = useState<string>('0')
  const [chainId, setChainId] = useState<string>('')
  const [networkName, setNetworkName] = useState<string>('')

  // Check if wallet is already connected on mount
  useEffect(() => {
    checkConnection()
    
    // Listen for account and network changes with proper cleanup
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        console.log('👤 Account changed:', accounts[0] || 'disconnected')
        if (accounts.length === 0) {
          disconnect()
        } else if (accounts[0] !== account) {
          setAccount(accounts[0])
          updateAccountInfo(accounts[0])
        }
      }

      const handleChainChanged = (chainId: string) => {
        console.log('🌐 Chain changed:', chainId)
        setChainId(chainId)
        updateNetworkInfo(chainId)
        
        // If not on Sepolia, show warning but don't disconnect
        if (chainId !== SEPOLIA_CHAIN_ID) {
          console.warn('⚠️ Not connected to Sepolia testnet')
        }
      }

      const handleConnect = (connectInfo: { chainId: string }) => {
        console.log('🔗 Wallet connected:', connectInfo)
        checkConnection()
      }

      const handleDisconnect = () => {
        console.log('❌ Wallet disconnected')
        disconnect()
      }

      // Add event listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)
      window.ethereum.on('connect', handleConnect)
      window.ethereum.on('disconnect', handleDisconnect)
      
      return () => {
        // Cleanup event listeners
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum?.removeListener('chainChanged', handleChainChanged)
        window.ethereum?.removeListener('connect', handleConnect)
        window.ethereum?.removeListener('disconnect', handleDisconnect)
      }
    }
  }, [account])

  // Update account information
  const updateAccountInfo = useCallback(async (accountAddress: string) => {
    if (!window.ethereum || !accountAddress) return

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum)
      const balance = await browserProvider.getBalance(accountAddress)
      const formattedBalance = ethers.formatEther(balance)
      setBalance(parseFloat(formattedBalance).toFixed(4))
    } catch (error) {
      console.error('Failed to update account info:', error)
      setBalance('0')
    }
  }, [])

  // Update network information
  const updateNetworkInfo = useCallback((chainId: string) => {
    const networkNames: { [key: string]: string } = {
      '0x1': 'Ethereum Mainnet',
      '0xaa36a7': 'Sepolia Testnet',
      '0x5': 'Goerli Testnet',
      '0x7a69': 'Hardhat Local'
    }
    
    setNetworkName(networkNames[chainId] || `Unknown Network (${chainId})`)
  }, [])

  const checkConnection = async () => {
    if (!window.ethereum) {
      console.log('🚫 MetaMask not detected')
      return
    }

    try {
      console.log('🔍 Checking existing wallet connection...')
      
      // Check if already connected
      const accounts = await window.ethereum.request({ 
        method: 'eth_accounts' 
      })
      
      if (accounts.length > 0) {
        console.log('✅ Wallet already connected:', accounts[0])
        
        // Get current network
        const currentChainId = await window.ethereum.request({ 
          method: 'eth_chainId' 
        })
        
        setChainId(currentChainId)
        updateNetworkInfo(currentChainId)
        
        // Initialize provider and signer
        const browserProvider = new ethers.BrowserProvider(window.ethereum)
        const jsonRpcSigner = await browserProvider.getSigner()
        
        setProvider(browserProvider)
        setSigner(jsonRpcSigner)
        setAccount(accounts[0])
        setIsConnected(true)
        
        // Update balance
        await updateAccountInfo(accounts[0])
      }
    } catch (error) {
      console.error('❌ Error checking wallet connection:', error)
    }
  }

  const connectWallet = async () => {
    if (!window.ethereum) {
      throw new Error('🚫 MetaMask not detected! Please install MetaMask to use this DApp.')
    }

    try {
      setLoading(true)
      console.log('🔗 Requesting wallet connection...')

      // Request account access - this will trigger MetaMask popup
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length === 0) {
        throw new Error('❌ No accounts found. Please unlock MetaMask.')
      }

      console.log('✅ Account connected:', accounts[0])

      // Get current chain ID
      const currentChainId = await window.ethereum.request({ 
        method: 'eth_chainId' 
      })
      
      console.log('🌐 Current network:', currentChainId)
      setChainId(currentChainId)
      updateNetworkInfo(currentChainId)

      // Check and switch to Sepolia network if needed
      if (currentChainId !== SEPOLIA_CHAIN_ID) {
        console.log('⚠️ Not on Sepolia, attempting to switch...')
        await switchToSepolia()
      }

      // Initialize ethers provider and signer
      console.log('📡 Initializing Web3 provider...')
      const browserProvider = new ethers.BrowserProvider(window.ethereum)
      const jsonRpcSigner = await browserProvider.getSigner()

      // Verify signer address matches connected account
      const signerAddress = await jsonRpcSigner.getAddress()
      if (signerAddress.toLowerCase() !== accounts[0].toLowerCase()) {
        throw new Error('❌ Signer address mismatch')
      }

      setProvider(browserProvider)
      setSigner(jsonRpcSigner)
      setAccount(accounts[0])
      setIsConnected(true)

      // Update balance
      await updateAccountInfo(accounts[0])

      console.log('🎉 Wallet connection successful!')

    } catch (error: any) {
      console.error('❌ Wallet connection failed:', error)
      setIsConnected(false)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const switchToSepolia = async () => {
    try {
      console.log('🔄 Switching to Sepolia testnet...')
      
      // First try to switch to Sepolia
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SEPOLIA_CHAIN_ID }],
        })
        console.log('✅ Successfully switched to Sepolia')
        
        // Update chain info after successful switch
        setChainId(SEPOLIA_CHAIN_ID)
        updateNetworkInfo(SEPOLIA_CHAIN_ID)
        
      } catch (switchError: any) {
        console.log('Switch error code:', switchError.code)
        
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          console.log('➕ Adding Sepolia network to MetaMask...')
          
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SEPOLIA_NETWORK]
          })
          
          console.log('✅ Sepolia network added successfully')
          setChainId(SEPOLIA_CHAIN_ID)
          updateNetworkInfo(SEPOLIA_CHAIN_ID)
          
        } else if (switchError.code === 4001) {
          // User rejected the request
          throw new Error('❌ User rejected network switch. Please switch to Sepolia testnet manually.')
        } else {
          throw switchError
        }
      }
    } catch (error: any) {
      console.error('❌ Error switching to Sepolia:', error)
      throw new Error(`Failed to switch to Sepolia testnet: ${error.message}`)
    }
  }

  const disconnect = () => {
    console.log('🔌 Disconnecting wallet...')
    setAccount(null)
    setProvider(null)
    setSigner(null)
    setIsConnected(false)
    setBalance('0')
    setChainId('')
    setNetworkName('')
  }

  // Request permissions (for explicit permission request)
  const requestPermissions = async () => {
    try {
      const permissions = await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      })
      console.log('🔑 Permissions granted:', permissions)
      return permissions
    } catch (error) {
      console.error('❌ Permission request failed:', error)
      throw error
    }
  }

  return {
    account,
    provider,
    signer,
    loading,
    isConnected,
    balance,
    chainId,
    networkName,
    connectWallet,
    disconnect,
    switchToSepolia,
    requestPermissions,
    updateAccountInfo
  }
}