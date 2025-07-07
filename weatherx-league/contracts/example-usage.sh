#!/bin/bash

# Example usage of PredictionPool NEAR Smart Contract (JavaScript/TypeScript)
# Replace CONTRACT_ID with your deployed contract account ID
CONTRACT_ID="prediction-pool.your-account.testnet"
OWNER="your-account.testnet"
USER1="user1.testnet"
USER2="user2.testnet"

echo "🎯 PredictionPool Contract Example Usage (JavaScript/TypeScript)"
echo "============================================================="

# Initialize the contract (only needed once after deployment)
echo "0. Initializing contract..."
near call $CONTRACT_ID init \
  '{"owner": "'$OWNER'", "platform_fee_basis_points": 100}' \
  --accountId $OWNER \
  --gas 10000000000000

echo ""

# 1. Create a new prediction round
echo "1. Creating new prediction round..."
near call $CONTRACT_ID open_round \
  '{"title": "Will it rain in NYC tomorrow?", "description": "Weather prediction for New York City on December 15th"}' \
  --accountId $OWNER \
  --gas 10000000000000

echo ""

# 2. Make predictions
echo "2. Making predictions..."

# User1 bets 5 NEAR on YES
echo "   User1 betting 5 NEAR on YES..."
near call $CONTRACT_ID predict_yes \
  '{"round_id": 1}' \
  --accountId $USER1 \
  --amount 5 \
  --gas 15000000000000

# User2 bets 3 NEAR on NO
echo "   User2 betting 3 NEAR on NO..."
near call $CONTRACT_ID predict_no \
  '{"round_id": 1}' \
  --accountId $USER2 \
  --amount 3 \
  --gas 15000000000000

echo ""

# 3. View round information
echo "3. Viewing round information..."
near view $CONTRACT_ID get_round '{"round_id": 1}'

echo ""

# 4. View user predictions
echo "4. Viewing user predictions..."
near view $CONTRACT_ID get_user_predictions '{"account_id": "'$USER1'"}'

echo ""

# 5. View contract stats
echo "5. Viewing contract statistics..."
near view $CONTRACT_ID get_stats '{}'

echo ""

# 6. View open rounds
echo "6. Viewing open rounds..."
near view $CONTRACT_ID get_open_rounds '{}'

echo ""

# 7. Close the round (owner only)
echo "7. Closing round (owner only)..."
near call $CONTRACT_ID close_round \
  '{"round_id": 1}' \
  --accountId $OWNER \
  --gas 10000000000000

echo ""

# 8. Settle the round with result (let's say YES won)
echo "8. Settling round with result: YES won..."
near call $CONTRACT_ID settle_round \
  '{"round_id": 1, "result": true}' \
  --accountId $OWNER \
  --gas 10000000000000

echo ""

# 9. Claim winnings (User1 should win since they bet YES)
echo "9. User1 claiming winnings..."
near call $CONTRACT_ID claim_winnings \
  '{"prediction_index": 0}' \
  --accountId $USER1 \
  --gas 20000000000000

echo ""

# 10. View final round state
echo "10. Final round state..."
near view $CONTRACT_ID get_round '{"round_id": 1}'

echo ""
echo "✅ Example completed!"
echo ""
echo "Key takeaways:"
echo "- User1 bet 5 NEAR on YES and won"
echo "- User2 bet 3 NEAR on NO and lost"
echo "- User1 gets back their 5 NEAR + proportional share of the 3 NEAR from User2"
echo "- Platform takes a small fee from the losing pool"
echo ""
echo "Total pool: 8 NEAR"
echo "Winner gets: ~5 NEAR (original) + ~2.85 NEAR (from loser) = ~7.85 NEAR"
echo "Platform fee: ~0.15 NEAR (1% of losing pool)" 