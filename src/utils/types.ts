export interface CreditData {
  income: string
  debt: string
  age: string
  creditHistory: string
  paymentHistory: string
}

export interface UserStatus {
  hasSubmitted: boolean
  isEvaluated: boolean
  canApprove: boolean
}

export interface ContractError extends Error {
  reason?: string
  code?: string
  data?: any
}

declare global {
  interface Window {
    ethereum?: any
  }
}