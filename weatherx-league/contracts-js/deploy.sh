#!/bin/bash

# WeatherX League PredictionPool Contract Deployment Script

set -e

echo "🚀 Deploying WeatherX League PredictionPool Contract"

# Build the contract
echo "📦 Building contract..."
npm run build

# Check if WASM file exists
if [ ! -f "build/prediction_pool.wasm" ]; then
    echo "❌ Build failed: prediction_pool.wasm not found"
    exit 1
fi

echo "✅ Contract built successfully"

# Generate unique account name
TIMESTAMP=$(date +%s)
ACCOUNT_NAME="weatherx-pool-${TIMESTAMP}.testnet"

echo "🆔 Creating account: $ACCOUNT_NAME"

# Login check
if [ ! -d ~/.near-credentials/testnet ]; then
    echo "❌ Not logged in to NEAR CLI. Please run 'near login' first."
    exit 1
fi

# Create account
echo "🏗️  Creating testnet account..."
near create-account $ACCOUNT_NAME --masterAccount testnet --initialBalance 50

# Deploy contract
echo "📤 Deploying contract..."
near deploy --wasmFile build/prediction_pool.wasm --accountId $ACCOUNT_NAME

# Initialize contract
echo "⚙️  Initializing contract..."
near call $ACCOUNT_NAME init '{"owner":"'$ACCOUNT_NAME'","platform_fee_basis_points":100}' --accountId $ACCOUNT_NAME

echo "✅ Contract deployed successfully!"
echo "📋 Contract Details:"
echo "   Account ID: $ACCOUNT_NAME"
echo "   Network: testnet"
echo "   Explorer: https://testnet.nearblocks.io/address/$ACCOUNT_NAME"

# Save contract info
echo "CONTRACT_ID=$ACCOUNT_NAME" > .env
echo "NETWORK=testnet" >> .env

echo "💾 Contract ID saved to .env file"
echo "🎉 Deployment complete!" 