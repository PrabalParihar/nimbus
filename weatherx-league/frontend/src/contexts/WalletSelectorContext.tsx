import { createContext, useContext, ReactNode } from 'react'

export interface WalletSelectorContextValue {
  selector: any
  modal: any
  accounts: any[]
  accountId: string | null
}

const WalletSelectorContext = createContext<WalletSelectorContextValue | null>(null)

export const WalletSelectorContextProvider = ({ 
  children, 
  value 
}: { 
  children: ReactNode
  value: WalletSelectorContextValue 
}) => {
  return (
    <WalletSelectorContext.Provider value={value}>
      {children}
    </WalletSelectorContext.Provider>
  )
}

export const useWalletSelector = () => {
  const context = useContext(WalletSelectorContext)
  if (!context) {
    throw new Error('useWalletSelector must be used within WalletSelectorContextProvider')
  }
  return context
} 