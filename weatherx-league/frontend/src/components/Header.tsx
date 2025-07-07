import { useState } from 'react'
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  IconButton, 
  Menu, 
  MenuItem,
  Chip,
  useMediaQuery,
  useTheme
} from '@mui/material'
import { 
  Wallet, 
  Menu as MenuIcon, 
  LogOut, 
  User, 
  TrendingUp,
  ExternalLink 
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useWalletSelector } from '../contexts/WalletSelectorContext'

export default function Header() {
  const { selector, modal, accountId } = useWalletSelector()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const handleConnect = () => {
    if (modal) {
      modal.show()
    }
  }

  const handleDisconnect = async () => {
    if (selector) {
      const wallet = await selector.wallet()
      await wallet.signOut()
    }
    setAnchorEl(null)
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleMobileMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget)
  }

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null)
  }

  const formatAccountId = (accountId: string) => {
    if (accountId.length > 20) {
      return `${accountId.slice(0, 10)}...${accountId.slice(-6)}`
    }
    return accountId
  }

  const navigation = [
    { name: 'Predictions', href: '/', icon: TrendingUp },
    { name: 'Leaderboard', href: '/leaderboard', icon: User },
    { name: 'Documentation', href: '/docs', icon: ExternalLink, external: true },
  ]

  return (
    <AppBar 
      position="sticky" 
      className="bg-storm-900/95 backdrop-blur-md border-b border-storm-700"
      elevation={0}
    >
      <Toolbar className="px-4 lg:px-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography
            variant="h6"
            component="div"
            className="flex items-center gap-2 font-bold text-xl"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-near-400 to-purple-400 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            WeatherX League
          </Typography>
        </motion.div>

        {/* Desktop Navigation */}
        {!isMobile && (
          <Box className="flex items-center gap-6 ml-8">
            {navigation.map((item) => (
              <Button
                key={item.name}
                startIcon={<item.icon size={18} />}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className="text-storm-300 hover:text-white transition-colors"
              >
                {item.name}
              </Button>
            ))}
          </Box>
        )}

        <Box className="flex-grow" />

        {/* Network Status */}
        <Chip
          label={`${process.env.NEXT_PUBLIC_NEAR_NETWORK_ID || 'testnet'}`}
          size="small"
          className="bg-near-600 text-white mr-4 uppercase"
        />

        {/* Wallet Connection */}
        {accountId ? (
          <Box className="flex items-center gap-2">
            <Button
              startIcon={<User size={18} />}
              onClick={handleMenuClick}
              className="text-storm-300 hover:text-white border border-storm-600 hover:border-storm-500"
              variant="outlined"
            >
              {formatAccountId(accountId)}
            </Button>
            
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              className="mt-2"
            >
              <MenuItem onClick={handleMenuClose}>
                <User size={16} className="mr-2" />
                Profile
              </MenuItem>
              <MenuItem onClick={handleDisconnect}>
                <LogOut size={16} className="mr-2" />
                Disconnect
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Button
            startIcon={<Wallet size={18} />}
            onClick={handleConnect}
            variant="contained"
            className="bg-gradient-to-r from-near-500 to-purple-500 hover:from-near-600 hover:to-purple-600 text-white"
          >
            Connect Wallet
          </Button>
        )}

        {/* Mobile Menu */}
        {isMobile && (
          <>
            <IconButton
              onClick={handleMobileMenuClick}
              className="text-storm-300 ml-2"
            >
              <MenuIcon size={24} />
            </IconButton>
            
            <Menu
              anchorEl={mobileMenuAnchor}
              open={Boolean(mobileMenuAnchor)}
              onClose={handleMobileMenuClose}
              className="mt-2"
            >
              {navigation.map((item) => (
                <MenuItem 
                  key={item.name}
                  onClick={handleMobileMenuClose}
                  component="a"
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                >
                  <item.icon size={16} className="mr-2" />
                  {item.name}
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  )
} 