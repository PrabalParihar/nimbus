import { useState, useEffect } from 'react'
import { Box, Typography, Chip, Card } from '@mui/material'
import { TrendingUp, TrendingDown, Activity, Users } from 'lucide-react'
import { motion } from 'framer-motion'

interface OddsTickerProps {
  rounds: any[]
}

export default function OddsTicker({ rounds }: OddsTickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Auto-scroll through rounds
  useEffect(() => {
    if (rounds.length <= 1) return

    const interval = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % rounds.length)
        setIsAnimating(false)
      }, 300)
    }, 4000)

    return () => clearInterval(interval)
  }, [rounds.length])

  const calculateOdds = (round: any) => {
    const yesAmount = round.yesAmount || 0
    const noAmount = round.noAmount || 0
    const totalAmount = yesAmount + noAmount

    if (totalAmount === 0) {
      return { yesOdds: 50, noOdds: 50, trend: 'neutral' }
    }

    const yesOdds = (yesAmount / totalAmount) * 100
    const noOdds = (noAmount / totalAmount) * 100

    // Determine trend based on which side has more volume
    const trend = yesAmount > noAmount ? 'yes' : noAmount > yesAmount ? 'no' : 'neutral'

    return { yesOdds: yesOdds.toFixed(1), noOdds: noOdds.toFixed(1), trend }
  }

  const formatVolume = (amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`
    }
    return amount.toFixed(1)
  }

  if (rounds.length === 0) {
    return (
      <Box className="odds-ticker py-4 px-6 bg-storm-800 border-y border-storm-600">
        <Typography className="text-center text-storm-400">
          No active prediction rounds
        </Typography>
      </Box>
    )
  }

  const currentRound = rounds[currentIndex]
  const odds = calculateOdds(currentRound)
  const totalVolume = (currentRound.yesAmount || 0) + (currentRound.noAmount || 0)

  return (
    <Box className="odds-ticker py-4 px-6 bg-gradient-to-r from-storm-800 via-storm-700 to-storm-800 border-y border-storm-600 overflow-hidden">
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, y: isAnimating ? -20 : 0 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        {/* Round Info */}
        <Box className="flex items-center gap-4">
          <Box className="flex items-center gap-2">
            <Activity size={20} className="text-near-400" />
            <Typography className="font-bold text-lg">
              Round #{currentRound.id}
            </Typography>
          </Box>
          
          <Typography className="text-storm-300 hidden md:block">
            {currentRound.description || 'Weather Prediction'}
          </Typography>

          <Chip
            label={currentRound.status}
            size="small"
            className="bg-green-600 text-white"
          />
        </Box>

        {/* Odds Display */}
        <Box className="flex items-center gap-6">
          {/* YES Odds */}
          <Box className="flex items-center gap-2">
            <Box className="text-center">
              <Typography className="text-xs text-storm-400">YES</Typography>
              <Typography className="text-lg font-bold text-green-400">
                {odds.yesOdds}%
              </Typography>
            </Box>
            {odds.trend === 'yes' && (
              <TrendingUp size={16} className="text-green-400" />
            )}
          </Box>

          {/* Separator */}
          <Box className="h-6 w-px bg-storm-600" />

          {/* NO Odds */}
          <Box className="flex items-center gap-2">
            <Box className="text-center">
              <Typography className="text-xs text-storm-400">NO</Typography>
              <Typography className="text-lg font-bold text-red-400">
                {odds.noOdds}%
              </Typography>
            </Box>
            {odds.trend === 'no' && (
              <TrendingDown size={16} className="text-red-400" />
            )}
          </Box>

          {/* Volume */}
          <Box className="flex items-center gap-2 ml-4">
            <Users size={16} className="text-storm-400" />
            <Box className="text-center">
              <Typography className="text-xs text-storm-400">Volume</Typography>
              <Typography className="text-sm font-medium text-near-400">
                {formatVolume(totalVolume)} NEAR
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Round Indicators */}
        {rounds.length > 1 && (
          <Box className="flex items-center gap-1 ml-4">
            {rounds.map((_, index) => (
              <Box
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-near-400' : 'bg-storm-600'
                }`}
              />
            ))}
          </Box>
        )}
      </motion.div>

      {/* Scrolling Market Data */}
      <motion.div
        className="mt-2 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Box className="flex items-center gap-8 text-sm text-storm-400">
          <Box className="flex items-center gap-2">
            <Typography>Total Rounds:</Typography>
            <Typography className="text-storm-300 font-medium">
              {rounds.length}
            </Typography>
          </Box>
          
          <Box className="flex items-center gap-2">
            <Typography>Active Volume:</Typography>
            <Typography className="text-storm-300 font-medium">
              {formatVolume(
                rounds.reduce((sum, round) => sum + (round.yesAmount || 0) + (round.noAmount || 0), 0)
              )} NEAR
            </Typography>
          </Box>
          
          <Box className="flex items-center gap-2">
            <Typography>Market Trend:</Typography>
            <Box className="flex items-center gap-1">
              {odds.trend === 'yes' ? (
                <TrendingUp size={14} className="text-green-400" />
              ) : odds.trend === 'no' ? (
                <TrendingDown size={14} className="text-red-400" />
              ) : (
                <Activity size={14} className="text-storm-400" />
              )}
              <Typography className={`font-medium ${
                odds.trend === 'yes' ? 'text-green-400' : 
                odds.trend === 'no' ? 'text-red-400' : 'text-storm-400'
              }`}>
                {odds.trend === 'yes' ? 'Bullish Rain' : 
                 odds.trend === 'no' ? 'Bearish Rain' : 'Neutral'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </motion.div>
    </Box>
  )
} 