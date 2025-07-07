import { useState, useEffect } from 'react'
import { Container, Typography, Card, CardContent, Tabs, Tab, Box, Avatar, Chip, Grid } from '@mui/material'
import { Trophy, Users, TrendingUp, Star, Crown, Medal, Award } from 'lucide-react'
import { motion } from 'framer-motion'
import Head from 'next/head'

import Header from '../components/Header'
import { useNearContract } from '../hooks/useNearContract'
import { useReferral } from '../hooks/useReferral'

interface LeaderboardEntry {
  account_id: string
  xp: number
  rank: number
  predictions?: number
  success_rate?: number
  referrals?: number
  xp_earned?: number
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState(0)
  const [predictionLeaderboard, setPredictionLeaderboard] = useState<LeaderboardEntry[]>([])
  const [referralLeaderboard, setReferralLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const { getLeaderboard } = useNearContract()
  const { getReferralLeaderboard } = useReferral()

  useEffect(() => {
    const fetchLeaderboards = async () => {
      try {
        setLoading(true)
        
        const [predictionData, referralData] = await Promise.all([
          getLeaderboard(50),
          getReferralLeaderboard(50),
        ])

        setPredictionLeaderboard(predictionData)
        setReferralLeaderboard(referralData)
      } catch (error) {
        console.error('Error fetching leaderboards:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboards()
  }, [getLeaderboard, getReferralLeaderboard])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  const formatAccountId = (accountId: string) => {
    if (accountId.length > 20) {
      return `${accountId.slice(0, 10)}...${accountId.slice(-6)}`
    }
    return accountId
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="text-yellow-400" size={24} />
      case 2:
        return <Medal className="text-gray-400" size={24} />
      case 3:
        return <Award className="text-amber-600" size={24} />
      default:
        return <Trophy className="text-storm-400" size={20} />
    }
  }

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600'
      case 2:
        return 'bg-gradient-to-r from-gray-400 to-gray-600'
      case 3:
        return 'bg-gradient-to-r from-amber-500 to-amber-700'
      default:
        return 'bg-gradient-to-r from-storm-600 to-storm-700'
    }
  }

  const LeaderboardCard = ({ entry, type }: { entry: LeaderboardEntry; type: 'prediction' | 'referral' }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: entry.rank * 0.05 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className={`mb-3 ${entry.rank <= 3 ? 'ring-2 ring-yellow-400/20' : ''}`}>
        <CardContent className="p-4">
          <Box className="flex items-center justify-between">
            <Box className="flex items-center gap-4">
              {/* Rank */}
              <Box className={`w-12 h-12 rounded-full flex items-center justify-center ${getRankBadgeColor(entry.rank)}`}>
                {entry.rank <= 3 ? (
                  getRankIcon(entry.rank)
                ) : (
                  <Typography className="font-bold text-white">
                    {entry.rank}
                  </Typography>
                )}
              </Box>

              {/* Avatar and Account */}
              <Box className="flex items-center gap-3">
                <Avatar className="bg-storm-700">
                  {entry.account_id.slice(0, 2).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography className="font-medium text-storm-100">
                    {formatAccountId(entry.account_id)}
                  </Typography>
                  <Typography className="text-sm text-storm-400">
                    {type === 'prediction' ? `${entry.xp} XP` : `${entry.referrals} Referrals`}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Stats */}
            <Box className="text-right">
              {type === 'prediction' ? (
                <>
                  <Typography className="text-lg font-bold text-near-400">
                    {entry.xp?.toLocaleString()} XP
                  </Typography>
                  {entry.success_rate && (
                    <Typography className="text-sm text-storm-300">
                      {entry.success_rate}% Success Rate
                    </Typography>
                  )}
                </>
              ) : (
                <>
                  <Typography className="text-lg font-bold text-purple-400">
                    {entry.xp_earned} XP Earned
                  </Typography>
                  <Typography className="text-sm text-storm-300">
                    {entry.referrals} Successful Referrals
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  )

  return (
    <>
      <Head>
        <title>Leaderboard - WeatherX League</title>
        <meta name="description" content="View top performers in weather predictions and referral rankings" />
      </Head>

      <div className="min-h-screen">
        <Header />
        
        <Container maxWidth="lg" className="py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Typography
              variant="h1"
              className="text-3xl md:text-4xl font-bold text-center mb-2"
            >
              🏆 Leaderboard
            </Typography>
            <Typography
              variant="subtitle1"
              className="text-center text-storm-300 mb-8"
            >
              Top performers in weather predictions and referral rewards
            </Typography>
          </motion.div>

          {/* Stats Overview */}
          <Grid container spacing={4} className="mb-8">
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent className="text-center p-6">
                  <TrendingUp className="text-near-400 mx-auto mb-2" size={32} />
                  <Typography className="text-2xl font-bold text-near-400">
                    {predictionLeaderboard.length}
                  </Typography>
                  <Typography className="text-storm-400">Active Predictors</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent className="text-center p-6">
                  <Users className="text-purple-400 mx-auto mb-2" size={32} />
                  <Typography className="text-2xl font-bold text-purple-400">
                    {referralLeaderboard.length}
                  </Typography>
                  <Typography className="text-storm-400">Referral Champions</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent className="text-center p-6">
                  <Star className="text-yellow-400 mx-auto mb-2" size={32} />
                  <Typography className="text-2xl font-bold text-yellow-400">
                    {predictionLeaderboard.reduce((sum, entry) => sum + (entry.xp || 0), 0).toLocaleString()}
                  </Typography>
                  <Typography className="text-storm-400">Total XP Earned</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Leaderboard Tabs */}
          <Card>
            <CardContent className="p-0">
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                className="border-b border-storm-600"
                variant="fullWidth"
              >
                <Tab
                  label={
                    <Box className="flex items-center gap-2">
                      <TrendingUp size={20} />
                      Prediction Leaders
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box className="flex items-center gap-2">
                      <Users size={20} />
                      Referral Champions
                    </Box>
                  }
                />
              </Tabs>

              {/* Tab Content */}
              <Box className="p-6">
                {activeTab === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Typography variant="h6" className="mb-4 flex items-center gap-2">
                      <Trophy className="text-near-400" size={20} />
                      Top Weather Predictors
                    </Typography>
                    
                    {loading ? (
                      <Box className="text-center py-12">
                        <Typography className="text-storm-400">Loading leaderboard...</Typography>
                      </Box>
                    ) : predictionLeaderboard.length > 0 ? (
                      <Box>
                        {predictionLeaderboard.map((entry) => (
                          <LeaderboardCard
                            key={entry.account_id}
                            entry={entry}
                            type="prediction"
                          />
                        ))}
                      </Box>
                    ) : (
                      <Box className="text-center py-12">
                        <Typography className="text-storm-400">No prediction data available</Typography>
                      </Box>
                    )}
                  </motion.div>
                )}

                {activeTab === 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Typography variant="h6" className="mb-4 flex items-center gap-2">
                      <Users className="text-purple-400" size={20} />
                      Top Referral Champions
                    </Typography>
                    
                    {loading ? (
                      <Box className="text-center py-12">
                        <Typography className="text-storm-400">Loading leaderboard...</Typography>
                      </Box>
                    ) : referralLeaderboard.length > 0 ? (
                      <Box>
                        {referralLeaderboard.map((entry) => (
                          <LeaderboardCard
                            key={entry.account_id}
                            entry={entry}
                            type="referral"
                          />
                        ))}
                      </Box>
                    ) : (
                      <Box className="text-center py-12">
                        <Typography className="text-storm-400">No referral data available</Typography>
                      </Box>
                    )}
                  </motion.div>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8"
          >
            <Card className="bg-gradient-to-r from-near-900/50 to-purple-900/50 border border-near-500/20">
              <CardContent className="text-center p-8">
                <Typography variant="h5" className="mb-2">
                  Ready to Climb the Ranks? 🚀
                </Typography>
                <Typography className="text-storm-300 mb-4">
                  Make accurate weather predictions and refer friends to earn XP and climb the leaderboard!
                </Typography>
                <Box className="flex gap-4 justify-center">
                  <Chip
                    label="Start Predicting"
                    className="bg-near-600 text-white cursor-pointer hover:bg-near-700"
                    onClick={() => window.location.href = '/'}
                  />
                  <Chip
                    label="Invite Friends"
                    className="bg-purple-600 text-white cursor-pointer hover:bg-purple-700"
                    onClick={() => window.location.href = '/?tab=referral'}
                  />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Container>
      </div>
    </>
  )
}