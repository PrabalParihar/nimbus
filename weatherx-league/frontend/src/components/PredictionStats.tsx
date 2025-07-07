import { Box, Typography, Card, CardContent, Grid, LinearProgress, Chip } from '@mui/material'
import { TrendingUp, Target, Trophy, Zap, Users, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'

interface PredictionStatsProps {
  userPredictions: any[]
  contractStats: any
}

export default function PredictionStats({ userPredictions, contractStats }: PredictionStatsProps) {
  const calculateUserStats = () => {
    if (!userPredictions || userPredictions.length === 0) {
      return {
        totalPredictions: 0,
        successRate: 0,
        totalStaked: 0,
        totalWinnings: 0,
        netProfit: 0,
        averageStake: 0,
        bestStreak: 0,
        currentStreak: 0,
      }
    }

    const totalPredictions = userPredictions.length
    const successfulPredictions = userPredictions.filter(p => p.status === 'won').length
    const successRate = totalPredictions > 0 ? (successfulPredictions / totalPredictions) * 100 : 0
    
    const totalStaked = userPredictions.reduce((sum, p) => sum + (p.amount || 0), 0)
    const totalWinnings = userPredictions
      .filter(p => p.status === 'won')
      .reduce((sum, p) => sum + (p.payout || 0), 0)
    
    const netProfit = totalWinnings - totalStaked
    const averageStake = totalStaked / totalPredictions
    
    // Calculate streaks
    let currentStreak = 0
    let bestStreak = 0
    let tempStreak = 0
    
    const sortedPredictions = [...userPredictions].sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )
    
    for (let i = 0; i < sortedPredictions.length; i++) {
      const prediction = sortedPredictions[i]
      if (prediction.status === 'won') {
        if (i === 0) currentStreak++
        tempStreak++
        bestStreak = Math.max(bestStreak, tempStreak)
      } else {
        if (i === 0) currentStreak = 0
        tempStreak = 0
      }
    }

    return {
      totalPredictions,
      successRate,
      totalStaked,
      totalWinnings,
      netProfit,
      averageStake,
      bestStreak,
      currentStreak,
    }
  }

  const userStats = calculateUserStats()

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 70) return 'text-green-400'
    if (rate >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-400'
    if (profit < 0) return 'text-red-400'
    return 'text-storm-300'
  }

  const statCards = [
    {
      title: 'Total Predictions',
      value: userStats.totalPredictions,
      icon: Target,
      color: 'text-near-400',
      bgColor: 'bg-near-500/20',
    },
    {
      title: 'Success Rate',
      value: `${userStats.successRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: getSuccessRateColor(userStats.successRate),
      bgColor: 'bg-green-500/20',
      progress: userStats.successRate,
    },
    {
      title: 'Total Staked',
      value: `${userStats.totalStaked.toFixed(2)} NEAR`,
      icon: DollarSign,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
    },
    {
      title: 'Net Profit',
      value: `${userStats.netProfit >= 0 ? '+' : ''}${userStats.netProfit.toFixed(2)} NEAR`,
      icon: Trophy,
      color: getProfitColor(userStats.netProfit),
      bgColor: 'bg-yellow-500/20',
    },
    {
      title: 'Current Streak',
      value: userStats.currentStreak,
      icon: Zap,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
    },
    {
      title: 'Best Streak',
      value: userStats.bestStreak,
      icon: Users,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
    },
  ]

  return (
    <Box className="space-y-6">
      {/* User Stats Grid */}
      <Grid container spacing={3}>
        {statCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} key={stat.title}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full">
                <CardContent className="p-4">
                  <Box className="flex items-center justify-between mb-3">
                    <Box className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon size={20} className={stat.color} />
                    </Box>
                    <Typography className="text-xs text-storm-400 uppercase tracking-wider">
                      {stat.title}
                    </Typography>
                  </Box>
                  
                  <Typography className={`text-2xl font-bold ${stat.color} mb-2`}>
                    {stat.value}
                  </Typography>
                  
                  {stat.progress !== undefined && (
                    <Box className="mt-3">
                      <LinearProgress 
                        variant="determinate" 
                        value={stat.progress} 
                        className="h-2 rounded-full bg-storm-700"
                        sx={{
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: stat.progress >= 70 ? '#10b981' : 
                                           stat.progress >= 50 ? '#f59e0b' : '#ef4444',
                          }
                        }}
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Performance Summary */}
      <Card>
        <CardContent className="p-6">
          <Typography variant="h6" className="mb-4 flex items-center gap-2">
            <TrendingUp className="text-near-400" size={20} />
            Performance Summary
          </Typography>
          
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Box className="space-y-4">
                <Box className="flex items-center justify-between">
                  <Typography className="text-storm-300">Average Stake:</Typography>
                  <Typography className="font-medium text-purple-400">
                    {userStats.averageStake.toFixed(2)} NEAR
                  </Typography>
                </Box>
                
                <Box className="flex items-center justify-between">
                  <Typography className="text-storm-300">Total Winnings:</Typography>
                  <Typography className="font-medium text-green-400">
                    {userStats.totalWinnings.toFixed(2)} NEAR
                  </Typography>
                </Box>
                
                <Box className="flex items-center justify-between">
                  <Typography className="text-storm-300">ROI:</Typography>
                  <Typography className={`font-medium ${getProfitColor(userStats.netProfit)}`}>
                    {userStats.totalStaked > 0 
                      ? `${((userStats.netProfit / userStats.totalStaked) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </Typography>
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box className="space-y-4">
                <Box className="flex items-center justify-between">
                  <Typography className="text-storm-300">Active Predictions:</Typography>
                  <Typography className="font-medium text-yellow-400">
                    {userPredictions.filter(p => p.status === 'pending').length}
                  </Typography>
                </Box>
                
                <Box className="flex items-center justify-between">
                  <Typography className="text-storm-300">Rank:</Typography>
                  <Chip 
                    label={userStats.successRate >= 70 ? 'Expert' : 
                           userStats.successRate >= 50 ? 'Intermediate' : 'Beginner'} 
                    size="small"
                    className={`${
                      userStats.successRate >= 70 ? 'bg-green-600' :
                      userStats.successRate >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                    } text-white`}
                  />
                </Box>
                
                <Box className="flex items-center justify-between">
                  <Typography className="text-storm-300">Global Rank:</Typography>
                  <Typography className="font-medium text-near-400">
                    #{contractStats?.userRank || 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      {userStats.totalPredictions > 0 && (
        <Card className="bg-gradient-to-r from-storm-800/50 to-near-900/50 border border-near-500/20">
          <CardContent className="p-4">
            <Typography variant="h6" className="mb-3 flex items-center gap-2">
              <Zap className="text-yellow-400" size={20} />
              Performance Tips
            </Typography>
            
            <Box className="space-y-2 text-sm">
              {userStats.successRate < 50 && (
                <Typography className="text-storm-300">
                  💡 Try analyzing weather patterns more carefully before predicting
                </Typography>
              )}
              {userStats.averageStake < 1 && (
                <Typography className="text-storm-300">
                  💡 Consider increasing your stake size for better potential returns
                </Typography>
              )}
              {userStats.currentStreak === 0 && userStats.bestStreak > 0 && (
                <Typography className="text-storm-300">
                  💡 You had a {userStats.bestStreak} prediction streak before - you can do it again!
                </Typography>
              )}
              {userStats.currentStreak >= 3 && (
                <Typography className="text-storm-300">
                  🔥 You're on fire! Keep this {userStats.currentStreak} prediction streak going!
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  )
} 