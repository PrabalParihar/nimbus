# PredictionPool Contract Deployment Guide

## Overview

This guide covers deploying the WeatherX League PredictionPool smart contract to NEAR Protocol testnet.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **NEAR CLI** installed globally
3. **NEAR testnet account** for deployment

### Install NEAR CLI

```bash
npm install -g near-cli
```

### Login to NEAR CLI

```bash
near login
```

This will open a browser window for authentication with your NEAR testnet account.

## Quick Deployment

### Automatic Deployment

Use the provided deployment script:

```bash
./deploy.sh
```

This script will:
- Build the contract to WASM
- Create a unique testnet account
- Deploy the contract
- Initialize it with default settings
- Save contract details to `.env` file

### Manual Deployment

1. **Build the contract:**

```bash
npm run build
```

2. **Create a testnet account:**

```bash
ACCOUNT_NAME="your-contract-name.testnet"
near create-account $ACCOUNT_NAME --masterAccount testnet --initialBalance 50
```

3. **Deploy the contract:**

```bash
near deploy --wasmFile build/prediction_pool.wasm --accountId $ACCOUNT_NAME
```

4. **Initialize the contract:**

```bash
near call $ACCOUNT_NAME init '{"owner":"'$ACCOUNT_NAME'","platform_fee_basis_points":100}' --accountId $ACCOUNT_NAME
```

## Contract Configuration

### Initialization Parameters

- `owner`: Account ID that will own the contract
- `platform_fee_basis_points`: Fee percentage (100 = 1%, 1000 = 10%)

### Example Initialization

```bash
near call $CONTRACT_ID init '{
  "owner": "your-account.testnet",
  "platform_fee_basis_points": 250
}' --accountId your-account.testnet
```

## Contract Interaction

### Admin Functions

#### Open a new prediction round:

```bash
near call $CONTRACT_ID open_round '{
  "title": "Will it rain in Seattle tomorrow?",
  "description": "Weather prediction for Seattle on July 7, 2024"
}' --accountId $OWNER_ACCOUNT
```

#### Close a prediction round:

```bash
near call $CONTRACT_ID close_round '{
  "round_id": 1
}' --accountId $OWNER_ACCOUNT
```

#### Settle a round with results:

```bash
near call $CONTRACT_ID settle_round '{
  "round_id": 1,
  "result": true,
  "winner_address": "0x1234...5678"
}' --accountId $OWNER_ACCOUNT
```

### User Functions

#### Make a prediction (YES):

```bash
near call $CONTRACT_ID predict_yes '{
  "round_id": 1
}' --accountId user.testnet --amount 5
```

#### Make a prediction (NO):

```bash
near call $CONTRACT_ID predict_no '{
  "round_id": 1
}' --accountId user.testnet --amount 3
```

#### Claim winnings:

```bash
near call $CONTRACT_ID claim_winnings '{
  "prediction_index": 0
}' --accountId user.testnet
```

### View Functions

#### Get round information:

```bash
near view $CONTRACT_ID get_round '{"round_id": 1}'
```

#### Get contract statistics:

```bash
near view $CONTRACT_ID get_stats '{}'
```

#### Get open rounds:

```bash
near view $CONTRACT_ID get_open_rounds '{}'
```

#### Get user predictions:

```bash
near view $CONTRACT_ID get_user_predictions '{"account_id": "user.testnet"}'
```

#### Get leaderboard:

```bash
near view $CONTRACT_ID get_leaderboard '{"limit": 10}'
```

## Cross-Chain Features

The contract supports cross-chain functionality with Filecoin FVM:

### Cross-chain transaction flow:

1. When a round is settled, cross-chain transactions are created
2. NEAR Chain Signatures sign the FVM transaction
3. Off-chain relay service submits to Filecoin FVM Wallaby
4. USDFC tokens are minted to the winner

### View cross-chain transactions:

```bash
near view $CONTRACT_ID get_pending_cross_chain_transactions '{}'
```

### Update cross-chain status (relay service):

```bash
near call $CONTRACT_ID update_cross_chain_status '{
  "tx_index": 0,
  "status": "confirmed",
  "fvm_tx_hash": "0xabcd...ef12"
}' --accountId relay-service.testnet
```

## Environment Configuration

After deployment, update your frontend `.env` file:

```env
NEXT_PUBLIC_NEAR_CONTRACT_ID=your-contract-id.testnet
NEXT_PUBLIC_NEAR_NETWORK_ID=testnet
```

## Testing

### Run contract tests:

```bash
npm test
```

### Test specific functions:

```bash
# Test basic functionality
near call $CONTRACT_ID open_round '{"title":"Test Round","description":"Test"}' --accountId $OWNER
near call $CONTRACT_ID predict_yes '{"round_id":1}' --accountId user.testnet --amount 1
near view $CONTRACT_ID get_round '{"round_id":1}'
```

## Monitoring

### Check contract status:

```bash
near state $CONTRACT_ID
```

### View transaction history:

Visit the NEAR Explorer: https://testnet.nearblocks.io/address/your-contract-id.testnet

### Check logs:

```bash
near call $CONTRACT_ID get_stats '{}' --accountId any-account.testnet
```

## Troubleshooting

### Common Issues

1. **Build fails**: Ensure all dependencies are installed with `npm install`
2. **Deployment fails**: Check NEAR CLI login status with `near login`
3. **Initialization fails**: Verify account has sufficient NEAR balance
4. **Function calls fail**: Check function parameters and account permissions

### Error Messages

- `"Only owner can call this method"`: Use the contract owner account
- `"Round not found"`: Check if the round ID exists
- `"Contract is paused"`: Admin needs to unpause the contract
- `"Minimum prediction is 1 NEAR"`: Increase the attached amount

## Security Considerations

1. **Owner Account**: Keep the owner account secure
2. **Platform Fees**: Set reasonable fee percentages
3. **Pause Function**: Use pause for emergency situations
4. **Storage**: Monitor storage usage and costs

## Production Deployment

For mainnet deployment:

1. Change `--networkId` to `mainnet`
2. Use `--masterAccount` with a mainnet account
3. Test thoroughly on testnet first
4. Consider multi-sig for owner account
5. Set up monitoring and alerts

## Support

For deployment issues:
- Check NEAR CLI documentation
- Visit NEAR Discord for community support
- Review contract logs for specific errors 