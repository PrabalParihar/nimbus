# Cross-Chain Integration Example

This document demonstrates how to use the NEAR ⟷ Filecoin FVM cross-chain functionality in the WeatherX League prediction pool.

## Overview

When a prediction round is settled, the contract automatically:
1. **Builds a FVM payload** for `USDFC.mintTo(winner, amount)`
2. **Signs the payload** using NEAR Chain Signatures with secp256k1
3. **Emits an event** for off-chain relay to FVM Wallaby
4. **Mints USDFC tokens** to the winner on Filecoin FVM

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   NEAR Contract │    │ Chain Signatures │    │   FVM Wallaby   │
│ PredictionPool  │◄──►│   v1.signer     │    │   USDFC.sol     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       ▲
         │                       │                       │
         ▼                       ▼                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Cross-Chain TX  │    │  Signed Payload │    │  Agent Relay    │
│   Storage       │───►│   secp256k1     │───►│    Service      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Contract Integration

### Enhanced settle_round Function

```typescript
@call({})
settle_round({ 
  round_id, 
  result, 
  winner_address 
}: { 
  round_id: number; 
  result: boolean; 
  winner_address: string; 
}): void {
  this.assert_owner();
  
  // ... existing settlement logic ...
  
  // Calculate winning pool amount for cross-chain mint
  const winning_pool_amount = result ? round.total_yes_amount : round.total_no_amount;
  
  if (winning_pool_amount > BigInt(0) && winner_address) {
    // Convert NEAR to USDFC (1 NEAR = 1000 USDFC)
    const usdfc_amount = winning_pool_amount / BigInt('1000000000000000000000');
    
    // Create cross-chain transaction
    const cross_chain_tx = new CrossChainTransaction(round_id, winner_address, usdfc_amount);
    const tx_index = this.cross_chain_transactions.length;
    this.cross_chain_transactions.push(cross_chain_tx);
    
    // Build and sign FVM payload
    const payload = this.build_fvm_mint_payload(winner_address, usdfc_amount);
    this.sign_fvm_transaction(payload, tx_index);
  }
}
```

### Cross-Chain Transaction Flow

```typescript
// 1. Build FVM mint payload
let payload = build_fvm_mint(winner_addr, amount);

// 2. Sign using NEAR Chain Signatures
let sig = chainsig::sign_secp256k1(payload, 0); // key derivation path 0

// 3. Relay signed payload to FVM Wallaby
// This happens off-chain via the agent service
```

## Usage Examples

### 1. Deploy and Initialize Contract

```bash
# Deploy contract
near deploy --wasmFile build/prediction-pool.wasm --accountId prediction-pool.testnet

# Initialize with cross-chain support
near call prediction-pool.testnet init '{
  "owner": "admin.testnet",
  "platform_fee_basis_points": 100
}' --accountId admin.testnet
```

### 2. Create and Settle Prediction Round

```bash
# Open prediction round
near call prediction-pool.testnet open_round '{
  "title": "Will it rain tomorrow?",
  "description": "Weather prediction for NYC"
}' --accountId admin.testnet

# Make predictions
near call prediction-pool.testnet predict_yes '{
  "round_id": 1
}' --accountId alice.testnet --deposit 5

near call prediction-pool.testnet predict_no '{
  "round_id": 1
}' --accountId bob.testnet --deposit 3

# Close round
near call prediction-pool.testnet close_round '{
  "round_id": 1
}' --accountId admin.testnet

# Settle round with cross-chain mint
near call prediction-pool.testnet settle_round '{
  "round_id": 1,
  "result": true,
  "winner_address": "0x742d35cc6e842c4e8c5b3eb1e5d94f8b3e891234"
}' --accountId admin.testnet
```

### 3. Monitor Cross-Chain Transactions

```bash
# Get cross-chain transaction status
near view prediction-pool.testnet get_cross_chain_transaction '{
  "tx_index": 0
}'

# Get all pending transactions
near view prediction-pool.testnet get_pending_cross_chain_transactions '{}'
```

## Agent Service Integration

### FVM Relay Service

The agent service includes a complete FVM relay service that:

1. **Listens for NEAR events** containing signed payloads
2. **Relays transactions** to FVM Wallaby network
3. **Updates transaction status** back to NEAR contract
4. **Monitors USDFC balances** and transfers

### API Endpoints

```bash
# Health check for FVM connectivity
GET /api/fvm/health

# Relay a signed transaction
POST /api/fvm/relay/transaction
{
  "signedTransaction": {
    "transaction": { ... },
    "signature": { ... }
  }
}

# Direct USDFC mint (alternative approach)
POST /api/fvm/usdfc/mint
{
  "recipient": "0x742d35cc6e842c4e8c5b3eb1e5d94f8b3e891234",
  "amount": "1000"
}

# Check transaction status
GET /api/fvm/transaction/0x1234.../status

# Get USDFC balance
GET /api/fvm/usdfc/balance/0x742d35cc6e842c4e8c5b3eb1e5d94f8b3e891234

# Process cross-chain transaction from NEAR
POST /api/fvm/process-cross-chain
{
  "transaction": {
    "round_id": 1,
    "winner": "0x742d35cc6e842c4e8c5b3eb1e5d94f8b3e891234",
    "amount": "1000",
    "signed_payload": "...",
    "status": "signed"
  }
}
```

## Configuration

### Environment Variables

```bash
# Agent Service (.env)
PORT=3000
NODE_ENV=development

# NEAR Configuration
CONTRACT_ID=prediction-pool.testnet
NETWORK_ID=testnet
NODE_URL=https://rpc.testnet.near.org

# FVM Configuration
FVM_RELAY_PRIVATE_KEY=0x1234567890abcdef...  # Private key for gas payments
USDFC_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
```

### Contract Constants

```typescript
// Chain Signatures configuration
const CHAIN_SIGNATURES_CONTRACT = 'v1.signer-prod.testnet';
const FVM_WALLABY_CHAIN_ID = 31415926;
const USDFC_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
```

## Testing the Integration

### 1. Test Contract Functions

```javascript
// Test cross-chain transaction creation
const result = await contract.settle_round({
  round_id: 1,
  result: true,
  winner_address: "0x742d35cc6e842c4e8c5b3eb1e5d94f8b3e891234"
});

// Verify transaction was created
const crossChainTx = await contract.get_cross_chain_transaction({ tx_index: 0 });
console.log('Cross-chain transaction:', crossChainTx);
```

### 2. Test FVM Relay Service

```javascript
import { FvmRelayService } from './services/FvmRelayService.js';

const relayService = new FvmRelayService(logger);
await relayService.initialize(process.env.FVM_RELAY_PRIVATE_KEY);

// Test USDFC mint
const txHash = await relayService.relayUsingUSDFC(
  "0x742d35cc6e842c4e8c5b3eb1e5d94f8b3e891234",
  BigInt("1000")
);
console.log('USDFC mint transaction:', txHash);
```

### 3. Test Event Listening

```javascript
// Listen for USDFC Transfer events
await relayService.listenForUSDFCEvents((event) => {
  console.log('USDFC Transfer detected:', event);
  
  // Update NEAR contract with confirmation
  // This would typically trigger an oracle or callback
});
```

## Security Considerations

### 1. Chain Signatures Security

- Uses **secp256k1** signatures compatible with Ethereum/Filecoin
- **Key derivation path 0** for predictable address generation
- **Multi-party computation** ensures no single point of failure

### 2. Relay Service Security

- **Private key management** for gas payments only
- **Transaction validation** before relay
- **Rate limiting** and **access controls**
- **Error handling** and **transaction monitoring**

### 3. Cross-Chain Validation

- **Amount limits** and **recipient validation**
- **Signature verification** before relay
- **Status tracking** and **failure handling**
- **Audit trails** for all cross-chain operations

## Technical References

- **NEAR Chain Signatures**: https://docs.near.org/chain-abstraction/chain-signatures/getting-started
- **Filecoin FVM**: https://docs.filecoin.io/smart-contracts/fundamentals/the-fvm
- **Ethers.js Events**: https://medium.com/@filbuilders/decoding-filecoin-listening-to-smart-contract-events-with-ethers-js-89910675dc21
- **USDFC SDK**: https://github.com/Secured-Finance/stablecoin-sdk

## Example Output

When a prediction round is settled with cross-chain functionality:

```json
{
  "round_settled": {
    "round_id": 1,
    "result": true,
    "cross_chain_transaction": {
      "tx_index": 0,
      "winner": "0x742d35cc6e842c4e8c5b3eb1e5d94f8b3e891234",
      "amount": "1000",
      "status": "signed",
      "created_at": "1699123456789"
    }
  },
  "fvm_transaction": {
    "hash": "0xabcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
    "status": "confirmed",
    "usdfc_minted": "1000"
  }
}
```

This integration enables seamless cross-chain value transfer from NEAR prediction pools to Filecoin FVM USDFC tokens, creating a truly decentralized and interoperable prediction market system. 