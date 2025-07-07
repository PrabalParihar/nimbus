import type { AppProps } from 'next/app'
import { useEffect, useState } from 'react'
import { WalletSelectorContextProvider } from '../contexts/WalletSelectorContext'
import { setupWalletSelector } from '@near-wallet-selector/core'
import type { NetworkId } from '@near-wallet-selector/core'
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet'
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet'
import { setupSender } from '@near-wallet-selector/sender'
import { setupModal } from '@near-wallet-selector/modal-ui'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Head from 'next/head'
import '../styles/globals.css'
import '@near-wallet-selector/modal-ui/styles.css'

// NEAR Network Configuration
const NETWORK_ID = (process.env.NEXT_PUBLIC_NEAR_NETWORK_ID || 'testnet') as NetworkId

const CONTRACT_ID = process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID || 'prabal9.testnet'

// Create MUI theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#0ea5e9',
      light: '#38bdf8',
      dark: '#0284c7',
    },
    secondary: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
        },
      },
    },
  },
})

export default function App({ Component, pageProps }: AppProps) {
  const [selector, setSelector] = useState<any>(null)
  const [modal, setModal] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [accountId, setAccountId] = useState<string | null>(null)

  useEffect(() => {
    const initWalletSelector = async () => {
      try {
        const _selector = await setupWalletSelector({
          network: NETWORK_ID,
          modules: [
            setupMyNearWallet(),
            setupMeteorWallet(),
            setupSender(),
          ],
        })

        const _modal = setupModal(_selector, {
          contractId: CONTRACT_ID,
        })

        const state = _selector.store.getState()
        setAccounts(state.accounts)

        // Set the first account as active if available
        if (state.accounts.length > 0) {
          setAccountId(state.accounts[0].accountId)
        }

        setSelector(_selector)
        setModal(_modal)
      } catch (error) {
        console.error('Failed to initialize wallet selector:', error)
      }
    }

    initWalletSelector()
  }, [])

  useEffect(() => {
    if (!selector) return

    const subscription = selector.store.observable
      .pipe()
      .subscribe((state: any) => {
        setAccounts(state.accounts)
        if (state.accounts.length > 0) {
          setAccountId(state.accounts[0].accountId)
        } else {
          setAccountId(null)
        }
      })

    return () => subscription.unsubscribe()
  }, [selector])

  const walletSelectorContextValue = {
    selector,
    modal,
    accounts,
    accountId,
  }

  return (
    <>
      <Head>
        <title>WeatherX League - Decentralized Weather Predictions</title>
        <meta name="description" content="Predict weather patterns, earn rewards, and collect unique Storm Seer NFT badges on NEAR Protocol" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <WalletSelectorContextProvider value={walletSelectorContextValue}>
          <div className="min-h-screen bg-gradient-to-br from-storm-900 via-storm-800 to-near-900">
            <Component {...pageProps} />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                },
              }}
            />
          </div>
        </WalletSelectorContextProvider>
      </ThemeProvider>
    </>
  )
} 