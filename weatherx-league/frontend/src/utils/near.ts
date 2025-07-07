/**
 * NEAR Protocol utility functions for BigInt handling
 */

// Convert yoctoNEAR (BigInt) to NEAR (number)
export function yoctoToNear(yoctoAmount: string | bigint): number {
  const amount = typeof yoctoAmount === 'string' ? BigInt(yoctoAmount) : yoctoAmount
  return Number(amount) / 1e24
}

// Convert yoctoNEAR (BigInt) to formatted NEAR string
export function formatNearAmount(yoctoAmount: string | bigint, decimals: number = 2): string {
  const nearAmount = yoctoToNear(yoctoAmount)
  return nearAmount.toFixed(decimals)
}

// Convert NEAR to yoctoNEAR for contract calls
export function nearToYocto(nearAmount: number): string {
  return (BigInt(Math.floor(nearAmount * 1e24))).toString()
}

// Safe BigInt conversion with fallback
export function safeBigIntToNumber(value: any, fallback: number = 0): number {
  try {
    if (typeof value === 'bigint') {
      return Number(value)
    }
    if (typeof value === 'string') {
      return Number(BigInt(value))
    }
    return Number(value) || fallback
  } catch (error) {
    console.warn('Failed to convert BigInt to number:', value)
    return fallback
  }
}

// Safe BigInt conversion to string
export function safeBigIntToString(value: any, fallback: string = '0'): string {
  try {
    if (typeof value === 'bigint') {
      return value.toString()
    }
    if (typeof value === 'string') {
      return value
    }
    return String(value) || fallback
  } catch (error) {
    console.warn('Failed to convert BigInt to string:', value)
    return fallback
  }
}

// Format large numbers with commas
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

// Parse contract response and handle BigInt values
export function parseContractResponse<T>(response: any): T {
  if (response === null || response === undefined) {
    return response
  }

  if (Array.isArray(response)) {
    return response.map(parseContractResponse) as T
  }

  if (typeof response === 'object') {
    const parsed: any = {}
    for (const [key, value] of Object.entries(response)) {
      // Convert common BigInt fields
      if (key.includes('amount') || key.includes('volume') || key.includes('timestamp')) {
        if (typeof value === 'string' && value.match(/^\d+$/)) {
          // Keep as string for amounts to preserve precision
          parsed[key] = value
        } else {
          parsed[key] = parseContractResponse(value)
        }
      } else {
        parsed[key] = parseContractResponse(value)
      }
    }
    return parsed as T
  }

  return response
}

// Convert contract round data
export function parseRoundData(round: any) {
  if (!round) return null

  return {
    ...round,
    id: String(round.id),
    title: round.title || '',
    description: round.description || '',
    status: round.status || 'Open',
    yesAmount: yoctoToNear(round.total_yes_amount || '0'),
    noAmount: yoctoToNear(round.total_no_amount || '0'),
    yes_predictions: safeBigIntToNumber(round.yes_predictions, 0),
    no_predictions: safeBigIntToNumber(round.no_predictions, 0),
  }
}

// Convert contract prediction data
export function parsePredictionData(prediction: any) {
  if (!prediction) return null

  return {
    ...prediction,
    round_id: String(prediction.round_id),
    amount: yoctoToNear(prediction.amount || '0'),
    timestamp: safeBigIntToString(prediction.timestamp),
  }
}

// Convert contract stats data
export function parseStatsData(stats: any) {
  if (!stats) return null

  return {
    totalRounds: safeBigIntToNumber(stats.total_rounds, 0),
    activeRounds: safeBigIntToNumber(stats.active_rounds, 0),
    totalVolume: formatNearAmount(stats.total_volume || '0'),
    totalPredictions: safeBigIntToNumber(stats.total_predictions, 0),
  }
} 