import type { NextApiRequest, NextApiResponse } from 'next'

interface ContractStats {
  totalVolume: string
  totalUsers: number
  totalRounds: number
  activeRounds: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ContractStats | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // In a real implementation, this would call the NEAR contract
    // For now, return mock data for development
    const stats: ContractStats = {
      totalVolume: '1,250.5',
      totalUsers: 145,
      totalRounds: 23,
      activeRounds: 3,
    }

    res.status(200).json(stats)
  } catch (error) {
    console.error('Error fetching contract stats:', error)
    res.status(500).json({ error: 'Failed to fetch contract stats' })
  }
} 