import { useState, useEffect } from 'react'
import { Box, Typography, Card, CardContent, Grid, Chip, Dialog, DialogContent, DialogTitle, Button, CircularProgress } from '@mui/material'
import { Trophy, Star, Zap, Award, ExternalLink, Copy, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

interface Badge {
  id: string
  tokenId: string
  bgHue: number
  rarity: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  xp: number
  mintedAt: string
  metadata?: {
    name: string
    description: string
    attributes: Array<{
      trait_type: string
      value: string | number
    }>
  }
}

interface BadgeGalleryProps {
  accountId: string
}

export default function BadgeGallery({ accountId }: BadgeGalleryProps) {
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    fetchBadges()
  }, [accountId])

  const fetchBadges = async () => {
    try {
      setLoading(true)
      
      // Fetch badges from Flow blockchain via agent API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_AGENT_API_URL}/api/badges/${accountId}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setBadges(data.badges || [])
      } else {
        // Mock data for development
        setBadges([
          {
            id: '1',
            tokenId: '1',
            bgHue: 240,
            rarity: 'Gold',
            xp: 750,
            mintedAt: '2024-01-15T10:30:00Z',
            metadata: {
              name: 'Storm Seer #1',
              description: 'A legendary weather prediction badge',
              attributes: [
                { trait_type: 'Rarity', value: 'Gold' },
                { trait_type: 'XP', value: 750 },
                { trait_type: 'Hue', value: 240 },
              ]
            }
          },
          {
            id: '2',
            tokenId: '2',
            bgHue: 120,
            rarity: 'Silver',
            xp: 350,
            mintedAt: '2024-01-10T14:20:00Z',
            metadata: {
              name: 'Storm Seer #2',
              description: 'A skilled weather prediction badge',
              attributes: [
                { trait_type: 'Rarity', value: 'Silver' },
                { trait_type: 'XP', value: 350 },
                { trait_type: 'Hue', value: 120 },
              ]
            }
          },
          {
            id: '3',
            tokenId: '3',
            bgHue: 300,
            rarity: 'Bronze',
            xp: 150,
            mintedAt: '2024-01-05T09:15:00Z',
            metadata: {
              name: 'Storm Seer #3',
              description: 'A promising weather prediction badge',
              attributes: [
                { trait_type: 'Rarity', value: 'Bronze' },
                { trait_type: 'XP', value: 150 },
                { trait_type: 'Hue', value: 300 },
              ]
            }
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching badges:', error)
      toast.error('Failed to load badges')
    } finally {
      setLoading(false)
    }
  }

  const generateBadgeSVG = (badge: Badge) => {
    const hue = badge.bgHue
    const saturation = 80
    const lightness = 50
    
    return `
      <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bgGradient-${badge.id}" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:hsl(${hue}, ${saturation}%, ${lightness + 20}%)" />
            <stop offset="100%" style="stop-color:hsl(${hue}, ${saturation}%, ${lightness}%)" />
          </radialGradient>
          <filter id="glow-${badge.id}">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Background Circle -->
        <circle cx="100" cy="100" r="90" fill="url(#bgGradient-${badge.id})" stroke="hsl(${hue}, ${saturation}%, ${lightness - 20}%)" stroke-width="3"/>
        
        <!-- Inner Ring -->
        <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
        
        <!-- Storm Icon -->
        <g transform="translate(100, 100)" filter="url(#glow-${badge.id})">
          <!-- Lightning Bolt -->
          <path d="M -15 -30 L 5 -5 L -5 -5 L 15 20 L -5 0 L 5 0 Z" fill="white" stroke="hsl(${hue}, 100%, 90%)" stroke-width="1"/>
          
          <!-- Rain Drops -->
          <circle cx="-25" cy="15" r="3" fill="rgba(255,255,255,0.8)"/>
          <circle cx="25" cy="10" r="3" fill="rgba(255,255,255,0.8)"/>
          <circle cx="0" cy="25" r="3" fill="rgba(255,255,255,0.8)"/>
          <circle cx="-10" cy="30" r="2" fill="rgba(255,255,255,0.6)"/>
          <circle cx="15" cy="28" r="2" fill="rgba(255,255,255,0.6)"/>
        </g>
        
        <!-- Rarity Badge -->
        <rect x="10" y="10" width="60" height="20" rx="10" fill="rgba(0,0,0,0.8)"/>
        <text x="40" y="24" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white">
          ${badge.rarity}
        </text>
        
        <!-- XP Display -->
        <rect x="130" y="170" width="60" height="20" rx="10" fill="rgba(0,0,0,0.8)"/>
        <text x="160" y="184" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white">
          ${badge.xp} XP
        </text>
      </svg>
    `
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Bronze': return 'bg-amber-600'
      case 'Silver': return 'bg-gray-400'
      case 'Gold': return 'bg-yellow-500'
      case 'Platinum': return 'bg-purple-500'
      default: return 'bg-gray-600'
    }
  }

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'Bronze': return <Award size={16} />
      case 'Silver': return <Star size={16} />
      case 'Gold': return <Trophy size={16} />
      case 'Platinum': return <Zap size={16} />
      default: return <Award size={16} />
    }
  }

  const handleCopyToken = async (tokenId: string) => {
    try {
      await navigator.clipboard.writeText(tokenId)
      setCopiedToken(tokenId)
      toast.success('Token ID copied!')
      setTimeout(() => setCopiedToken(null), 2000)
    } catch (error) {
      toast.error('Failed to copy token ID')
    }
  }

  const handleBadgeClick = (badge: Badge) => {
    setSelectedBadge(badge)
  }

  const handleCloseModal = () => {
    setSelectedBadge(null)
  }

  if (loading) {
    return (
      <Box className="flex items-center justify-center py-12">
        <CircularProgress className="text-near-400" />
      </Box>
    )
  }

  if (badges.length === 0) {
    return (
      <Box className="text-center py-12">
        <Trophy className="mx-auto mb-4 text-storm-400" size={48} />
        <Typography className="text-storm-300 mb-2">No badges yet</Typography>
        <Typography className="text-storm-400 text-sm">
          Make successful predictions to earn Storm Seer badges!
        </Typography>
      </Box>
    )
  }

  return (
    <Box className="space-y-4">
      {/* Badge Grid */}
      <Grid container spacing={3}>
        {badges.map((badge) => (
          <Grid item xs={12} sm={6} md={4} key={badge.id}>
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Card 
                className="cursor-pointer badge-glow hover:shadow-2xl transition-all duration-300"
                onClick={() => handleBadgeClick(badge)}
              >
                <CardContent className="p-4">
                  {/* Badge SVG */}
                  <Box 
                    className="badge-svg mx-auto mb-3"
                    dangerouslySetInnerHTML={{ 
                      __html: generateBadgeSVG(badge) 
                    }}
                  />
                  
                  {/* Badge Info */}
                  <Box className="text-center">
                    <Typography className="font-bold mb-1">
                      {badge.metadata?.name || `Badge #${badge.tokenId}`}
                    </Typography>
                    
                    <Box className="flex items-center justify-center gap-2 mb-2">
                      <Chip
                        icon={getRarityIcon(badge.rarity)}
                        label={badge.rarity}
                        size="small"
                        className={`${getRarityColor(badge.rarity)} text-white`}
                      />
                    </Box>
                    
                    <Typography className="text-sm text-storm-400">
                      {badge.xp} XP • #{badge.tokenId}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Badge Detail Modal */}
      <Dialog 
        open={Boolean(selectedBadge)} 
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="text-center">
          {selectedBadge?.metadata?.name || `Badge #${selectedBadge?.tokenId}`}
        </DialogTitle>
        <DialogContent>
          {selectedBadge && (
            <Box className="space-y-4">
              {/* Large Badge Display */}
              <Box 
                className="badge-svg mx-auto"
                dangerouslySetInnerHTML={{ 
                  __html: generateBadgeSVG(selectedBadge) 
                }}
              />
              
              {/* Badge Details */}
              <Box className="space-y-3">
                <Box className="flex items-center justify-between">
                  <Typography className="text-storm-400">Token ID:</Typography>
                  <Box className="flex items-center gap-2">
                    <Typography className="font-mono">
                      #{selectedBadge.tokenId}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => handleCopyToken(selectedBadge.tokenId)}
                      startIcon={copiedToken === selectedBadge.tokenId ? <Check size={16} /> : <Copy size={16} />}
                      className="min-w-0 px-2"
                    >
                      {copiedToken === selectedBadge.tokenId ? 'Copied!' : 'Copy'}
                    </Button>
                  </Box>
                </Box>
                
                <Box className="flex items-center justify-between">
                  <Typography className="text-storm-400">Rarity:</Typography>
                  <Chip
                    icon={getRarityIcon(selectedBadge.rarity)}
                    label={selectedBadge.rarity}
                    size="small"
                    className={`${getRarityColor(selectedBadge.rarity)} text-white`}
                  />
                </Box>
                
                <Box className="flex items-center justify-between">
                  <Typography className="text-storm-400">XP:</Typography>
                  <Typography className="font-bold text-near-400">
                    {selectedBadge.xp} XP
                  </Typography>
                </Box>
                
                <Box className="flex items-center justify-between">
                  <Typography className="text-storm-400">Color Hue:</Typography>
                  <Box className="flex items-center gap-2">
                    <Box 
                      className="w-6 h-6 rounded-full border-2 border-white"
                      style={{ backgroundColor: `hsl(${selectedBadge.bgHue}, 80%, 50%)` }}
                    />
                    <Typography className="font-mono">
                      {selectedBadge.bgHue}°
                    </Typography>
                  </Box>
                </Box>
                
                <Box className="flex items-center justify-between">
                  <Typography className="text-storm-400">Minted:</Typography>
                  <Typography>
                    {new Date(selectedBadge.mintedAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
              
              {/* Description */}
              {selectedBadge.metadata?.description && (
                <Box className="bg-storm-800 p-3 rounded-lg">
                  <Typography className="text-sm text-storm-300">
                    {selectedBadge.metadata.description}
                  </Typography>
                </Box>
              )}
              
              {/* Action Buttons */}
              <Box className="flex gap-2 pt-2">
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ExternalLink size={16} />}
                  href={`https://flowscan.org/account/${accountId}/collection/StormSeer`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Flow
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleCloseModal}
                  className="bg-gradient-to-r from-near-500 to-purple-500"
                >
                  Close
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
} 