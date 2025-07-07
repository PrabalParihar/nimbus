import { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  FormControl, 
  FormLabel, 
  RadioGroup, 
  FormControlLabel, 
  Radio, 
  Card, 
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material'
import { 
  CloudRain, 
  Sun, 
  DollarSign, 
  Calendar, 
  MapPin,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { utils } from 'near-api-js'

import { useWalletSelector } from '../contexts/WalletSelectorContext'
import { formatNearAmount, safeBigIntToNumber } from '../utils/near'

const CONTRACT_ID = process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID || 'prediction-pool.testnet'

const predictionSchema = z.object({
  roundId: z.string().min(1, 'Please select a round'),
  prediction: z.enum(['yes', 'no'], { required_error: 'Please select your prediction' }),
  amount: z.string().min(1, 'Please enter an amount').refine(
    (val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num > 0 && num <= 100
    },
    'Amount must be between 0 and 100 NEAR'
  ),
})

type PredictionFormData = z.infer<typeof predictionSchema>

interface StakeFormProps {
  activeRounds: any[]
  onSuccess?: () => void
}

export default function StakeForm({ activeRounds, onSuccess }: StakeFormProps) {
  const { selector, accountId } = useWalletSelector()
  const [loading, setLoading] = useState(false)
  const [selectedRound, setSelectedRound] = useState<any>(null)
  const [userBalance, setUserBalance] = useState<string>('0')

  const { control, handleSubmit, watch, formState: { errors }, reset } = useForm<PredictionFormData>({
    resolver: zodResolver(predictionSchema),
    defaultValues: {
      roundId: '',
      prediction: 'yes',
      amount: '',
    },
  })

  const watchRoundId = watch('roundId')
  const watchAmount = watch('amount')

  // Update selected round when form changes
  useEffect(() => {
    if (watchRoundId) {
      const round = activeRounds.find(r => r.id === watchRoundId)
      setSelectedRound(round)
    }
  }, [watchRoundId, activeRounds])

  // Fetch user balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!accountId || !selector) return
      
      try {
        const wallet = await selector.wallet()
        const account = await wallet.account()
        const balance = await account.getAccountBalance()
        
        // Handle BigInt balance value safely
        const nearBalance = utils.format.formatNearAmount(balance.available)
        const balanceNum = parseFloat(nearBalance || '0')
        setUserBalance(balanceNum.toFixed(2))
      } catch (error) {
        console.error('Error fetching balance:', error)
        setUserBalance('0.00')
      }
    }

    fetchBalance()
  }, [accountId, selector])

  const onSubmit = async (data: PredictionFormData) => {
    if (!accountId || !selector) {
      toast.error('Please connect your wallet first')
      return
    }

    setLoading(true)
    
    try {
      const wallet = await selector.wallet()
      const amountInYocto = utils.format.parseNearAmount(data.amount)
      
      if (!amountInYocto) {
        throw new Error('Invalid amount')
      }

      // Call the predict function with attached deposit
      const result = await wallet.signAndSendTransaction({
        receiverId: CONTRACT_ID,
        actions: [
          {
            type: 'FunctionCall',
            params: {
              methodName: 'predict',
              args: {
                round_id: data.roundId,
                prediction: data.prediction === 'yes',
              },
              gas: '300000000000000', // 300 TGas
              deposit: amountInYocto,
            },
          },
        ],
      })

      console.log('Transaction result:', result)
      
      toast.success('Prediction submitted successfully!')
      reset()
      onSuccess?.()
      
    } catch (error: any) {
      console.error('Transaction error:', error)
      
      if (error.message?.includes('insufficient funds')) {
        toast.error('Insufficient NEAR balance')
      } else if (error.message?.includes('Round not found')) {
        toast.error('Round not found or expired')
      } else if (error.message?.includes('User rejected')) {
        toast.error('Transaction cancelled')
      } else {
        toast.error('Transaction failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const calculatePotentialPayout = () => {
    if (!selectedRound || !watchAmount) return '0'
    
    const amount = parseFloat(watchAmount)
    // Handle potential BigInt values safely
    const yesPool = safeBigIntToNumber(selectedRound.yesAmount, 0)
    const noPool = safeBigIntToNumber(selectedRound.noAmount, 0)
    const totalPool = yesPool + noPool + amount
    
    // Simple payout calculation (total pool / winning pool)
    const winningPool = watch('prediction') === 'yes' ? yesPool : noPool
    return totalPool > 0 ? (totalPool / (amount + winningPool)).toFixed(2) : '0'
  }

  if (!accountId) {
    return (
      <Card className="text-center p-8">
        <CardContent>
          <AlertCircle className="mx-auto mb-4 text-storm-400" size={48} />
          <Typography variant="h6" className="mb-2 text-storm-300">
            Connect Your Wallet
          </Typography>
          <Typography className="text-storm-400 mb-4">
            Connect your NEAR wallet to start making predictions
          </Typography>
        </CardContent>
      </Card>
    )
  }

  if (activeRounds.length === 0) {
    return (
      <Card className="text-center p-8">
        <CardContent>
          <Calendar className="mx-auto mb-4 text-storm-400" size={48} />
          <Typography variant="h6" className="mb-2 text-storm-300">
            No Active Rounds
          </Typography>
          <Typography className="text-storm-400">
            No prediction rounds are currently active. Check back soon!
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box component="form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Balance Display */}
        <Box className="flex justify-between items-center p-4 bg-storm-800 rounded-lg">
          <Typography className="text-storm-300">Your Balance:</Typography>
          <Typography className="font-bold text-near-400">
            {userBalance} NEAR
          </Typography>
        </Box>

        {/* Round Selection */}
        <FormControl fullWidth error={!!errors.roundId}>
          <FormLabel className="text-storm-300 mb-2">Select Round</FormLabel>
          <Controller
            name="roundId"
            control={control}
            render={({ field }) => (
              <Box className="grid gap-3">
                {activeRounds.map((round) => (
                  <Card
                    key={round.id}
                    className={`cursor-pointer transition-all ${
                      field.value === round.id 
                        ? 'ring-2 ring-near-500 bg-near-900/20' 
                        : 'hover:bg-storm-800'
                    }`}
                    onClick={() => field.onChange(round.id)}
                  >
                    <CardContent className="p-4">
                      <Box className="flex items-center justify-between mb-2">
                        <Typography className="font-medium">
                          Round #{round.id}
                        </Typography>
                        <Chip
                          label={round.status}
                          size="small"
                          className="bg-green-600 text-white"
                        />
                      </Box>
                      
                      <Box className="flex items-center gap-2 mb-2">
                        <MapPin size={16} className="text-storm-400" />
                        <Typography className="text-sm text-storm-300">
                          {round.location || 'Global Weather'}
                        </Typography>
                      </Box>
                      
                      <Typography className="text-sm text-storm-400 mb-3">
                        {round.description || 'Will it rain in the next 24 hours?'}
                      </Typography>
                      
                      <Box className="flex items-center justify-between">
                        <Box className="flex gap-4">
                          <Box className="text-center">
                            <Typography className="text-xs text-storm-400">YES Pool</Typography>
                            <Typography className="text-sm font-medium text-green-400">
                              {safeBigIntToNumber(round.yesAmount, 0).toFixed(1)} NEAR
                            </Typography>
                          </Box>
                          <Box className="text-center">
                            <Typography className="text-xs text-storm-400">NO Pool</Typography>
                            <Typography className="text-sm font-medium text-red-400">
                              {safeBigIntToNumber(round.noAmount, 0).toFixed(1)} NEAR
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Typography className="text-xs text-storm-400">
                          Ends: {new Date(round.endTime).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          />
          {errors.roundId && (
            <Typography className="text-red-400 text-sm mt-1">
              {errors.roundId.message}
            </Typography>
          )}
        </FormControl>

        {/* Prediction Selection */}
        <FormControl error={!!errors.prediction}>
          <FormLabel className="text-storm-300 mb-2">Your Prediction</FormLabel>
          <Controller
            name="prediction"
            control={control}
            render={({ field }) => (
              <RadioGroup
                {...field}
                row
                className="gap-4"
              >
                <FormControlLabel
                  value="yes"
                  control={<Radio />}
                  label={
                    <Box className="flex items-center gap-2">
                      <CloudRain size={20} className="text-blue-400" />
                      <Typography>YES - It will rain</Typography>
                    </Box>
                  }
                  className="mr-0"
                />
                <FormControlLabel
                  value="no"
                  control={<Radio />}
                  label={
                    <Box className="flex items-center gap-2">
                      <Sun size={20} className="text-yellow-400" />
                      <Typography>NO - It won't rain</Typography>
                    </Box>
                  }
                  className="mr-0"
                />
              </RadioGroup>
            )}
          />
          {errors.prediction && (
            <Typography className="text-red-400 text-sm mt-1">
              {errors.prediction.message}
            </Typography>
          )}
        </FormControl>

        {/* Amount Input */}
        <Controller
          name="amount"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Stake Amount"
              type="number"
              fullWidth
              error={!!errors.amount}
              helperText={errors.amount?.message}
              InputProps={{
                startAdornment: <DollarSign size={20} className="text-storm-400 mr-2" />,
                endAdornment: <Typography className="text-storm-400">NEAR</Typography>,
              }}
              className="bg-storm-800 rounded-lg"
            />
          )}
        />

        {/* Prediction Summary */}
        {selectedRound && watchAmount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-storm-800 to-storm-700 border border-storm-600">
              <CardContent className="p-4">
                <Typography className="font-medium mb-3 flex items-center gap-2">
                  <TrendingUp size={20} className="text-near-400" />
                  Prediction Summary
                </Typography>
                
                <Box className="grid grid-cols-2 gap-4">
                  <Box>
                    <Typography className="text-sm text-storm-400">Your Stake</Typography>
                    <Typography className="font-medium text-near-400">
                      {watchAmount} NEAR
                    </Typography>
                  </Box>
                  <Box>
                    <Typography className="text-sm text-storm-400">Potential Payout</Typography>
                    <Typography className="font-medium text-green-400">
                      {calculatePotentialPayout()} NEAR
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-near-500 to-purple-500 hover:from-near-600 hover:to-purple-600 disabled:opacity-50"
        >
          {loading ? (
            <Box className="flex items-center gap-2">
              <CircularProgress size={20} className="text-white" />
              <Typography>Processing...</Typography>
            </Box>
          ) : (
            <Typography className="font-medium">
              Submit Prediction
            </Typography>
          )}
        </Button>
      </Box>
    </motion.div>
  )
} 