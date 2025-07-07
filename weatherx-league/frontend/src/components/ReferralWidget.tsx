import { useState, useEffect } from 'react'
import { Box, Typography, Card, CardContent, Button, TextField, IconButton, Chip, Tooltip } from '@mui/material'
import { Share2, Copy, Check, Users, Gift, TrendingUp, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

interface ReferralStats {
  totalReferrals: number
  totalXpEarned: number
  referralRewards: number
  leaderboardRank: number
}

interface ReferralWidgetProps {
  accountId: string
  generateReferralLink: (accountId: string) => string
}

export default function ReferralWidget({ accountId, generateReferralLink }: ReferralWidgetProps) {
  const [referralLink, setReferralLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    totalXpEarned: 0,
    referralRewards: 0,
    leaderboardRank: 0
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (accountId) {
      const link = generateReferralLink(accountId)
      setReferralLink(link)
      fetchReferralStats()
    }
  }, [accountId, generateReferralLink])

  const fetchReferralStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_AGENT_API_URL}/api/referrals/stats/${accountId}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      } else {
        // Mock data for development
        setStats({
          totalReferrals: 12,
          totalXpEarned: 60, // 12 * 5 XP
          referralRewards: 2.4, // Some bonus rewards
          leaderboardRank: 15
        })
      }
    } catch (error) {
      console.error('Error fetching referral stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success('Referral link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join WeatherX League',
          text: 'Predict weather patterns and earn Storm Seer NFT badges with me on WeatherX League!',
          url: referralLink,
        })
      } catch (error) {
        // Fallback to copy if sharing fails
        handleCopyLink()
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      handleCopyLink()
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-gradient-to-br from-purple-900/30 via-storm-800/50 to-near-900/30 border border-purple-500/20">
        <CardContent className="p-6">
          <Box className="text-center mb-6">
            <Typography variant="h5" className="font-bold mb-2 flex items-center justify-center gap-2">
              <Gift className="text-purple-400" size={24} />
              Referral Program
            </Typography>
            <Typography className="text-storm-300">
              Earn +5 XP for every friend you refer! Friend.tech inspired bonding curve rewards.
            </Typography>
          </Box>

          {/* Referral Stats */}
          <Box className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Box className="text-center">
              <Typography className="text-2xl font-bold text-purple-400">
                {stats.totalReferrals}
              </Typography>
              <Typography className="text-xs text-storm-400">Referrals</Typography>
            </Box>
            <Box className="text-center">
              <Typography className="text-2xl font-bold text-near-400">
                {stats.totalXpEarned}
              </Typography>
              <Typography className="text-xs text-storm-400">XP Earned</Typography>
            </Box>
            <Box className="text-center">
              <Typography className="text-2xl font-bold text-green-400">
                {stats.referralRewards}
              </Typography>
              <Typography className="text-xs text-storm-400">NEAR Rewards</Typography>
            </Box>
            <Box className="text-center">
              <Typography className="text-2xl font-bold text-yellow-400">
                #{stats.leaderboardRank}
              </Typography>
              <Typography className="text-xs text-storm-400">Leaderboard</Typography>
            </Box>
          </Box>

          {/* Referral Link */}
          <Box className="space-y-3">
            <Typography className="text-storm-300 font-medium">
              Your Referral Link:
            </Typography>
            
            <Box className="flex items-center gap-2">
              <TextField
                value={referralLink}
                fullWidth
                variant="outlined"
                size="small"
                InputProps={{
                  readOnly: true,
                  className: "referral-link font-mono text-sm",
                }}
                className="flex-1"
              />
              
              <Tooltip title="Copy Link">
                <IconButton
                  onClick={handleCopyLink}
                  className="text-purple-400 hover:text-purple-300"
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Share">
                <IconButton
                  onClick={handleShare}
                  className="text-near-400 hover:text-near-300"
                >
                  <Share2 size={20} />
                </IconButton>
              </Tooltip>
            </Box>

            <Box className="flex flex-wrap gap-2">
              <Button
                variant="outlined"
                size="small"
                onClick={handleCopyLink}
                startIcon={copied ? <Check size={16} /> : <Copy size={16} />}
                className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              
              <Button
                variant="outlined"
                size="small"
                onClick={handleShare}
                startIcon={<Share2 size={16} />}
                className="border-near-500 text-near-400 hover:bg-near-500/10"
              >
                Share
              </Button>
            </Box>
          </Box>

          {/* Referral Benefits */}
          <Box className="mt-6 p-4 bg-storm-800/50 rounded-lg">
            <Typography className="font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="text-purple-400" size={18} />
              Referral Benefits
            </Typography>
            
            <Box className="space-y-2 text-sm">
              <Box className="flex items-center justify-between">
                <Typography className="text-storm-300">Friend joins & makes first prediction:</Typography>
                <Chip label="+5 XP" size="small" className="bg-purple-600 text-white" />
              </Box>
              <Box className="flex items-center justify-between">
                <Typography className="text-storm-300">Friend reaches Silver badge:</Typography>
                <Chip label="+10 XP" size="small" className="bg-purple-600 text-white" />
              </Box>
              <Box className="flex items-center justify-between">
                <Typography className="text-storm-300">Friend reaches Gold badge:</Typography>
                <Chip label="+25 XP" size="small" className="bg-purple-600 text-white" />
              </Box>
              <Box className="flex items-center justify-between">
                <Typography className="text-storm-300">Bonding curve rewards:</Typography>
                <Chip label="NEAR Tokens" size="small" className="bg-near-600 text-white" />
              </Box>
            </Box>
          </Box>

          {/* Social Links */}
          <Box className="mt-6 flex justify-center gap-4">
            <Button
              variant="outlined"
              size="small"
              startIcon={<ExternalLink size={16} />}
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                `Join me on WeatherX League! Predict weather patterns and earn Storm Seer NFT badges 🌩️ ${referralLink}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
            >
              Tweet
            </Button>
            
            <Button
              variant="outlined"
              size="small"
              startIcon={<Users size={16} />}
              href={`https://discord.gg/weatherx-league`}
              target="_blank"
              rel="noopener noreferrer"
              className="border-storm-500 text-storm-400 hover:bg-storm-500/10"
            >
              Discord
            </Button>
          </Box>

          {/* Leaderboard Link */}
          <Box className="mt-4 text-center">
            <Button
              variant="text"
              size="small"
              startIcon={<TrendingUp size={16} />}
              href="/leaderboard"
              className="text-storm-400 hover:text-storm-300"
            >
              View Referral Leaderboard
            </Button>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  )
} 