import type { NextApiRequest, NextApiResponse } from 'next'

interface UserPrediction {
  id: string
  roundId: string
  prediction: boolean
  amount: number
  status: 'pending' | 'won' | 'lost'
  payout?: number
  createdAt: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ predictions: UserPrediction[] } | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId } = req.query

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' })
  }

  try {
    // In a real implementation, this would call the NEAR contract
    // For now, return mock data for development
    const mockPredictions: UserPrediction[] = [
      {
        id: '1',
        roundId: '1',
        prediction: true,
        amount: 5.0,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        roundId: '2',
        prediction: false,
        amount: 3.5,
        status: 'won',
        payout: 7.2,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ]

    res.status(200).json({ predictions: mockPredictions })
  } catch (error) {
    console.error('Error fetching user predictions:', error)
    res.status(500).json({ error: 'Failed to fetch user predictions' })
  }
} 