import type { NextApiRequest, NextApiResponse } from 'next'

interface ReferralStats {
  totalReferrals: number
  totalXpEarned: number
  referralRewards: number
  leaderboardRank: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ stats: ReferralStats } | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId } = req.query

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' })
  }

  try {
    // In a real implementation, this would call the backend API
    // For now, return mock data for development
    const mockStats: ReferralStats = {
      totalReferrals: Math.floor(Math.random() * 20),
      totalXpEarned: Math.floor(Math.random() * 100),
      referralRewards: Math.floor(Math.random() * 50),
      leaderboardRank: Math.floor(Math.random() * 100) + 1,
    }

    res.status(200).json({ stats: mockStats })
  } catch (error) {
    console.error('Error fetching referral stats:', error)
    res.status(500).json({ error: 'Failed to fetch referral stats' })
  }
} 