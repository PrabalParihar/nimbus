import { useState, useCallback } from 'react'
import { useNearContract } from './useNearContract'
import toast from 'react-hot-toast'

interface ReferralStats {
  totalReferrals: number
  totalXpEarned: number
  referralRewards: number
  leaderboardRank: number
}

export const useReferral = () => {
  const { addXp, getUserXp } = useNearContract()
  const [processing, setProcessing] = useState(false)

  const generateReferralLink = useCallback((accountId: string): string => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://weatherx-league.vercel.app'
    return `${baseUrl}?ref=${encodeURIComponent(accountId)}`
  }, [])

  const processReferral = useCallback(async (referrerAccountId: string, newUserAccountId: string) => {
    if (!referrerAccountId || !newUserAccountId) return
    
    // Don't process self-referrals
    if (referrerAccountId === newUserAccountId) return

    try {
      setProcessing(true)

      // Check if this referral has already been processed
      const existingReferral = await checkExistingReferral(referrerAccountId, newUserAccountId)
      if (existingReferral) {
        console.log('Referral already processed')
        return
      }

      // Add +5 XP to the referrer
      await addXp(referrerAccountId, 5)

      // Record the referral
      await recordReferral(referrerAccountId, newUserAccountId)

      toast.success(`Welcome! Your referrer ${referrerAccountId} earned +5 XP!`)
      
      // Optional: Send analytics event
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'referral_processed', {
          event_category: 'referral',
          event_label: referrerAccountId,
          value: 5,
        })
      }

    } catch (error) {
      console.error('Error processing referral:', error)
      toast.error('Failed to process referral')
    } finally {
      setProcessing(false)
    }
  }, [addXp])

  const checkExistingReferral = useCallback(async (referrerAccountId: string, newUserAccountId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_AGENT_API_URL}/api/referrals/check`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            referrer: referrerAccountId,
            referee: newUserAccountId,
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        return data.exists
      }

      return false
    } catch (error) {
      console.error('Error checking existing referral:', error)
      return false
    }
  }, [])

  const recordReferral = useCallback(async (referrerAccountId: string, newUserAccountId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_AGENT_API_URL}/api/referrals/record`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            referrer: referrerAccountId,
            referee: newUserAccountId,
            timestamp: new Date().toISOString(),
            reward: 5, // XP reward
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to record referral')
      }

      return await response.json()
    } catch (error) {
      console.error('Error recording referral:', error)
      throw error
    }
  }, [])

  const getReferralStats = useCallback(async (accountId: string): Promise<ReferralStats> => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_AGENT_API_URL}/api/referrals/stats/${accountId}`
      )

      if (response.ok) {
        const data = await response.json()
        return data.stats
      }

      // Fallback to mock data
      return {
        totalReferrals: 0,
        totalXpEarned: 0,
        referralRewards: 0,
        leaderboardRank: 0,
      }
    } catch (error) {
      console.error('Error fetching referral stats:', error)
      return {
        totalReferrals: 0,
        totalXpEarned: 0,
        referralRewards: 0,
        leaderboardRank: 0,
      }
    }
  }, [])

  const getReferralLeaderboard = useCallback(async (limit: number = 10) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_AGENT_API_URL}/api/referrals/leaderboard?limit=${limit}`
      )

      if (response.ok) {
        const data = await response.json()
        return data.leaderboard
      }

      // Fallback to mock data
      return [
        { account_id: 'alice.testnet', referrals: 45, xp_earned: 225, rank: 1 },
        { account_id: 'bob.testnet', referrals: 32, xp_earned: 160, rank: 2 },
        { account_id: 'charlie.testnet', referrals: 28, xp_earned: 140, rank: 3 },
      ]
    } catch (error) {
      console.error('Error fetching referral leaderboard:', error)
      return []
    }
  }, [])

  const processReferralMilestone = useCallback(async (accountId: string, milestone: 'silver' | 'gold' | 'platinum') => {
    const xpRewards = {
      silver: 10,
      gold: 25,
      platinum: 50,
    }

    try {
      // Get the user's referrer
      const referrer = await getUserReferrer(accountId)
      if (!referrer) return

      const xpReward = xpRewards[milestone]
      await addXp(referrer, xpReward)

      // Record milestone referral bonus
      await recordReferralMilestone(referrer, accountId, milestone, xpReward)

      toast.success(`Your referrer earned +${xpReward} XP for your ${milestone} achievement!`)
    } catch (error) {
      console.error('Error processing referral milestone:', error)
    }
  }, [addXp])

  const getUserReferrer = useCallback(async (accountId: string): Promise<string | null> => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_AGENT_API_URL}/api/referrals/referrer/${accountId}`
      )

      if (response.ok) {
        const data = await response.json()
        return data.referrer
      }

      return null
    } catch (error) {
      console.error('Error fetching user referrer:', error)
      return null
    }
  }, [])

  const recordReferralMilestone = useCallback(async (
    referrerAccountId: string, 
    refereeAccountId: string, 
    milestone: string, 
    xpReward: number
  ) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_AGENT_API_URL}/api/referrals/milestone`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            referrer: referrerAccountId,
            referee: refereeAccountId,
            milestone,
            xp_reward: xpReward,
            timestamp: new Date().toISOString(),
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to record referral milestone')
      }

      return await response.json()
    } catch (error) {
      console.error('Error recording referral milestone:', error)
      throw error
    }
  }, [])

  // Friend.tech inspired bonding curve calculation
  const calculateBondingCurvePrice = useCallback((referralCount: number): number => {
    // Simple bonding curve: price = referralCount^2 * 0.01 NEAR
    // More referrals = exponentially higher rewards
    return Math.pow(referralCount, 2) * 0.01
  }, [])

  const calculateBondingCurveRewards = useCallback(async (accountId: string): Promise<number> => {
    try {
      const stats = await getReferralStats(accountId)
      const baseReward = calculateBondingCurvePrice(stats.totalReferrals)
      
      // Add multipliers for different achievements
      let multiplier = 1
      if (stats.totalReferrals >= 50) multiplier = 2
      else if (stats.totalReferrals >= 20) multiplier = 1.5
      else if (stats.totalReferrals >= 10) multiplier = 1.25

      return baseReward * multiplier
    } catch (error) {
      console.error('Error calculating bonding curve rewards:', error)
      return 0
    }
  }, [getReferralStats, calculateBondingCurvePrice])

  return {
    generateReferralLink,
    processReferral,
    getReferralStats,
    getReferralLeaderboard,
    processReferralMilestone,
    calculateBondingCurveRewards,
    processing,
  }
} 