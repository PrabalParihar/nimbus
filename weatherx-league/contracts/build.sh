#!/bin/bash
set -e

echo "Building PredictionPool NEAR smart contract (JavaScript/TypeScript)..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the contract
echo "Compiling TypeScript contract to WASM..."
npm run build

echo "✅ Contract built successfully!"
echo "📄 WASM file: build/prediction-pool.wasm"
echo ""
echo "To deploy to testnet:"
echo "near deploy --accountId your-account.testnet --wasmFile build/prediction-pool.wasm"
echo ""
echo "To initialize:"
echo "near call your-account.testnet init '{\"owner\": \"your-account.testnet\", \"platform_fee_basis_points\": 100}' --accountId your-account.testnet" 