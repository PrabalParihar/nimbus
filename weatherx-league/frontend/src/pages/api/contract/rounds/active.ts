import type { NextApiRequest, NextApiResponse } from 'next'

interface Round {
  id: string
  description: string
  endTime: string
  yesAmount: number
  noAmount: number
  status: 'active' | 'closed' | 'settled'
  result?: boolean
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ rounds: Round[] } | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // In a real implementation, this would call the NEAR contract
    // For now, return mock data for development
    const mockRounds: Round[] = [
      {
        id: '1',
        description: 'Will it rain in Seattle tomorrow?',
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        yesAmount: 45.2,
        noAmount: 67.8,
        status: 'active',
      },
      {
        id: '2',
        description: 'Will there be a thunderstorm in Miami this week?',
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        yesAmount: 23.5,
        noAmount: 31.2,
        status: 'active',
      },
      {
        id: '3',
        description: 'Will it snow in Denver this month?',
        endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        yesAmount: 12.3,
        noAmount: 8.7,
        status: 'active',
      },
    ]

    res.status(200).json({ rounds: mockRounds })
  } catch (error) {
    console.error('Error fetching active rounds:', error)
    res.status(500).json({ error: 'Failed to fetch active rounds' })
  }
} 