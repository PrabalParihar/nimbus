import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Container, Grid, Typography, Box, Card, CardContent, Button, Chip } from '@mui/material'
import { TrendingUp, Zap, Trophy, Users, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

import { useWalletSelector } from '../contexts/WalletSelectorContext'
import StakeForm from '../components/StakeForm'
import OddsTicker from '../components/OddsTicker'
import BadgeGallery from '../components/BadgeGallery'
import Header from '../components/Header'
import ReferralWidget from '../components/ReferralWidget'
import PredictionStats from '../components/PredictionStats'
import { useNearContract } from '../hooks/useNearContract'
import { useReferral } from '../hooks/useReferral'

export default function Home() {
  const router = useRouter()
  const { accountId } = useWalletSelector()
  const { contractStats, getActiveRounds, getUserPredictions, refetch: refetchStats } = useNearContract()
  const { processReferral, generateReferralLink } = useReferral()
  
  const [activeRounds, setActiveRounds] = useState<any[]>([])
  const [userPredictions, setUserPredictions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Process referral on mount
  useEffect(() => {
    const referralCode = router.query.ref as string
    if (referralCode && accountId) {
      processReferral(referralCode, accountId)
    }
  }, [router.query.ref, accountId, processReferral])

  // Fetch active rounds and user data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch active rounds using NEAR contract hook
        const rounds = await getActiveRounds()
        setActiveRounds(rounds || [])

        // Fetch user predictions if logged in
        if (accountId) {
          const predictions = await getUserPredictions(accountId)
          setUserPredictions(predictions || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load data')
        
        // Fallback to empty arrays to prevent errors
        setActiveRounds([])
        setUserPredictions([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accountId, getActiveRounds, getUserPredictions])

  const handlePredictionSuccess = async () => {
    refetchStats()
    toast.success('Prediction submitted successfully!')
    
    // Refresh data after successful prediction
    try {
      const rounds = await getActiveRounds()
      setActiveRounds(rounds || [])
      
      if (accountId) {
        const predictions = await getUserPredictions(accountId)
        setUserPredictions(predictions || [])
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  }

  return (
    <>
      <Head>
        <title>WeatherX League - Predict Weather, Earn Rewards</title>
        <meta 
          name="description" 
          content="Join the decentralized weather prediction platform. Stake NEAR tokens, predict weather outcomes, and earn Storm Seer NFT badges with unique colors." 
        />
      </Head>

      <div className="min-h-screen">
        <Header />
        
        {/* Hero Section */}
        <motion.section 
          className="relative py-20 px-4 text-center"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <Container maxWidth="lg">
            <motion.div variants={itemVariants}>
              <Typography
                variant="h1"
                className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-near-400 to-purple-400 bg-clip-text text-transparent mb-6"
              >
                WeatherX League
              </Typography>
              <Typography
                variant="h2"
                className="text-xl md:text-2xl text-storm-300 mb-8 max-w-3xl mx-auto"
              >
                Predict weather patterns with NEAR Protocol. Earn rewards and collect unique Storm Seer NFT badges powered by native randomness.
              </Typography>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-wrap gap-4 justify-center mb-12">
              <Chip 
                icon={<TrendingUp size={16} />} 
                label={`$${contractStats?.totalVolume || '0'} Volume`}
                className="bg-storm-700 text-storm-100"
              />
              <Chip 
                icon={<Users size={16} />} 
                label={`${contractStats?.totalUsers || '0'} Predictors`}
                className="bg-storm-700 text-storm-100"
              />
              <Chip 
                icon={<Trophy size={16} />} 
                label={`${contractStats?.totalRounds || '0'} Rounds`}
                className="bg-storm-700 text-storm-100"
              />
            </motion.div>

            {/* Referral Widget */}
            {accountId && (
              <motion.div variants={itemVariants} className="mb-12">
                <ReferralWidget 
                  accountId={accountId}
                  generateReferralLink={generateReferralLink}
                />
              </motion.div>
            )}
          </Container>
        </motion.section>

        {/* Odds Ticker */}
        <motion.section 
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <OddsTicker rounds={activeRounds} />
        </motion.section>

        {/* Main Content */}
        <Container maxWidth="xl" className="pb-20">
          <Grid container spacing={4}>
            {/* Left Column - Prediction Interface */}
            <Grid item xs={12} lg={8}>
              <motion.div variants={itemVariants}>
                <Card className="mb-6">
                  <CardContent className="p-6">
                    <Typography variant="h3" className="mb-6 flex items-center gap-2">
                      <Zap className="text-yellow-400" size={24} />
                      Make Your Prediction
                    </Typography>
                    
                    {loading ? (
                      <div className="loading-shimmer h-64 rounded-lg"></div>
                    ) : (
                      <StakeForm 
                        activeRounds={activeRounds}
                        onSuccess={handlePredictionSuccess}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Prediction Stats */}
                <motion.div variants={itemVariants}>
                  <PredictionStats 
                    userPredictions={userPredictions}
                    contractStats={contractStats}
                  />
                </motion.div>
              </motion.div>
            </Grid>

            {/* Right Column - Badge Gallery */}
            <Grid item xs={12} lg={4}>
              <motion.div variants={itemVariants}>
                <Card className="sticky top-4">
                  <CardContent className="p-6">
                    <Typography variant="h3" className="mb-6 flex items-center gap-2">
                      <Trophy className="text-yellow-400" size={24} />
                      Storm Seer Badges
                    </Typography>
                    
                    {accountId ? (
                      <BadgeGallery accountId={accountId} />
                    ) : (
                      <Box className="text-center py-12">
                        <Typography className="text-storm-400 mb-4">
                          Connect your wallet to view your Storm Seer badges
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<ExternalLink size={16} />}
                          className="border-storm-500 text-storm-300 hover:border-storm-400"
                        >
                          Connect Wallet
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>

          {/* Recent Activity */}
          {userPredictions.length > 0 && (
            <motion.section 
              variants={itemVariants}
              className="mt-12"
            >
              <Card>
                <CardContent className="p-6">
                  <Typography variant="h3" className="mb-6">
                    Your Recent Predictions
                  </Typography>
                  
                  <div className="grid gap-4">
                    {userPredictions.slice(0, 5).map((prediction: any, index: number) => (
                      <motion.div
                        key={prediction.id || index}
                        className="flex items-center justify-between p-4 rounded-lg bg-storm-800 border border-storm-600"
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div>
                          <Typography className="font-medium">
                            Round #{prediction.roundId}
                          </Typography>
                          <Typography className="text-sm text-storm-400">
                            {prediction.prediction ? 'YES' : 'NO'} • {prediction.amount} NEAR
                          </Typography>
                        </div>
                        <div className="text-right">
                          <Typography 
                            className={`font-medium ${
                              prediction.status === 'won' 
                                ? 'text-green-400' 
                                : prediction.status === 'lost'
                                ? 'text-red-400'
                                : 'text-yellow-400'
                            }`}
                          >
                            {prediction.status === 'won' && '+'}
                            {prediction.payout || 'Pending'}
                          </Typography>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          )}
        </Container>
      </div>
    </>
  )
} 