# Web3.Storage Archive Integration

## Overview

The WeatherX League agent now includes comprehensive Web3.Storage integration for archiving rainfall data and weather predictions to IPFS. This integration follows the [Web3.Storage w3up-client documentation](https://docs-beta.web3.storage/getting-started/w3up-client/?utm_source=chatgpt.com) and provides seamless data archiving with gzip compression.

## Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Rainfall Data     │    │   Web3.Storage      │    │   Filecoin FVM      │
│   (WeatherXM API)   │────│   Archive Service   │────│   USDFC Minting     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                        │                        │
                                        ▼                        ▼
                           ┌─────────────────────┐    ┌─────────────────────┐
                           │   IPFS Network      │    │   Transaction       │
                           │   (via Web3.Storage)│    │   with CID Calldata │
                           └─────────────────────┘    └─────────────────────┘
```

## Key Features

### 1. **Gzip Compression**
- Compresses JSON data using `gzipSync(Buffer.from(JSON.stringify(data)))`
- Reduces storage costs and network transfer time
- Typical compression ratios: 60-80% for structured weather data

### 2. **IPFS Storage**
- Uses Web3.Storage w3up-client for decentralized storage
- Automatic replication across IPFS network
- Content-addressed storage with CID (Content Identifier)

### 3. **FVM Integration**
- Embeds CID in Filecoin FVM transaction calldata
- Links on-chain transactions to off-chain data
- Enables verifiable data provenance

### 4. **Multi-format Support**
- Single data entries
- Batch rainfall data uploads
- Weather prediction archives
- Custom metadata inclusion

## API Endpoints

### Archive Endpoints

#### 1. Simple Gzip and Upload
```bash
POST /api/archive/gzip-upload
Content-Type: application/json

{
  "data": {
    "message": "Hello Web3.Storage!",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cid": "bafkreiabcd1234567890abcdef1234567890abcdef1234567890abcdef12"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 2. Rainfall Batch Upload
```bash
POST /api/archive/rainfall-batch
Content-Type: application/json

{
  "rainfallData": [
    {
      "stationId": "WXM-NYC-001",
      "timestamp": "2024-01-15T10:00:00Z",
      "precipitationMm": 12.5,
      "location": { "lat": 40.7128, "lng": -74.0060 }
    },
    {
      "stationId": "WXM-NYC-002", 
      "timestamp": "2024-01-15T10:00:00Z",
      "precipitationMm": 8.3,
      "location": { "lat": 40.7589, "lng": -73.9851 }
    }
  ]
}
```

#### 3. Weather Data Archive
```bash
POST /api/archive/weather-data
Content-Type: application/json

{
  "predictionData": {
    "roundId": 1,
    "predictions": [...],
    "result": true
  },
  "metadata": {
    "source": "WeatherXM",
    "model": "GPT-4o"
  }
}
```

### FVM Integration Endpoints

#### 1. Archive and Mint USDFC
```bash
POST /api/fvm/archive-and-mint
Content-Type: application/json

{
  "rainfallData": {
    "stationId": "WXM-NYC-001",
    "precipitationMm": 15.2,
    "timestamp": "2024-01-15T10:00:00Z",
    "roundId": 1,
    "finalResult": true
  },
  "recipient": "0x742d35Cc6e842c4e8c5B3eb1e5D94F8B3E891234",
  "amount": "1000000000000000000000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "txHash": "0xabc123...",
    "cid": "bafkreiabcd1234567890abcdef1234567890abcdef1234567890abcdef12"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 2. Transaction with CID
```bash
POST /api/fvm/transaction-with-cid
Content-Type: application/json

{
  "to": "0x742d35Cc6e842c4e8c5B3eb1e5D94F8B3E891234",
  "value": "0",
  "cid": "bafkreiabcd1234567890abcdef1234567890abcdef1234567890abcdef12"
}
```

#### 3. Extract CID from Transaction
```bash
GET /api/fvm/extract-cid/0xabc123def456...
```

## Code Usage

### Basic Usage

```typescript
import { gzipAndUpload, initializeWeb3Storage } from './archive.js';

// Initialize Web3.Storage
await initializeWeb3Storage('your-email@example.com', 'my-space-name');

// Upload data
const weatherData = {
  temperature: 22.5,
  humidity: 65,
  timestamp: new Date().toISOString()
};

const cid = await gzipAndUpload(weatherData);
console.log(`Data archived: ${cid}`);
console.log(`View at: https://${cid}.ipfs.w3s.link`);
```

### Advanced Usage with Class

```typescript
import { Web3StorageArchive } from './archive.js';
import winston from 'winston';

const logger = winston.createLogger({...});
const archive = new Web3StorageArchive(logger, 'my-app-archive');

// Initialize
await archive.initialize();

// Upload with detailed response
const result = await archive.gzipAndUpload({
  type: 'rainfall_measurement',
  data: rainfallData,
  metadata: { source: 'WeatherXM' }
});

console.log(`CID: ${result.cid}`);
console.log(`Compression: ${result.size} → ${result.compressedSize} bytes`);
console.log(`Gateway URL: ${archive.createGatewayUrl(result.cid)}`);
```

### FVM Integration Example

```typescript
import { FvmRelayService } from './services/FvmRelayService.js';

const fvmService = new FvmRelayService(logger);
await fvmService.initialize(privateKey);

// Archive data and mint USDFC in single transaction
const result = await fvmService.archiveAndMintUSDFC(
  rainfallData,
  '0x742d35Cc6e842c4e8c5B3eb1e5D94F8B3E891234',
  BigInt('1000000000000000000000') // 1000 USDFC
);

console.log(`Transaction: ${result.txHash}`);
console.log(`Archive CID: ${result.cid}`);
```

## Environment Variables

```bash
# Web3.Storage configuration
WEB3_STORAGE_EMAIL=your-email@example.com

# FVM configuration (for archive integration)
FVM_RELAY_PRIVATE_KEY=your-private-key
```

## Testing

Run the comprehensive test suite:

```bash
# Test archive functionality
npm run test:archive

# Test WeatherXM integration
npm run test:rain

# Run all tests
npm test
```

## Data Flow

### 1. **Rainfall Data Collection**
```
WeatherXM API → Agent Service → JSON Processing
```

### 2. **Archive Process**
```
JSON Data → Gzip Compression → Web3.Storage Upload → CID Generated
```

### 3. **FVM Integration**
```
CID → FVM Transaction Calldata → USDFC Mint → Blockchain Storage
```

### 4. **Verification**
```
Transaction Hash → Extract CID → Verify IPFS Content → Data Integrity
```

## Benefits

### **Cost Efficiency**
- Gzip compression reduces storage costs by 60-80%
- IPFS provides decentralized, redundant storage
- Pay-per-use model through Web3.Storage

### **Data Integrity**
- Content-addressed storage ensures data immutability
- Cryptographic verification of data integrity
- Distributed storage prevents single points of failure

### **Blockchain Integration**
- On-chain CID references enable verifiable data provenance
- Smart contracts can verify data authenticity
- Cross-chain compatibility through FVM

### **Accessibility**
- IPFS gateway access for global data retrieval
- Standard HTTP(S) access through gateway URLs
- Programmatic access through IPFS protocol

## Error Handling

The system includes comprehensive error handling:

```typescript
try {
  const cid = await gzipAndUpload(data);
  // Success handling
} catch (error) {
  if (error.message.includes('space registration')) {
    // Handle space registration issues
  } else if (error.message.includes('upload')) {
    // Handle upload failures
  } else {
    // Handle other errors
  }
}
```

## Production Considerations

### **Space Management**
- Use environment-specific space names
- Implement space rotation for large datasets
- Monitor space usage and costs

### **Performance**
- Batch uploads for efficiency
- Implement retry logic for failed uploads
- Use compression for large datasets

### **Security**
- Secure private key management
- Validate data before archiving
- Implement access controls

## Migration Guide

If upgrading from a previous version:

1. **Install Dependencies**
   ```bash
   npm install @web3-storage/w3up-client
   ```

2. **Update Environment Variables**
   ```bash
   echo "WEB3_STORAGE_EMAIL=your-email@example.com" >> .env
   ```

3. **Initialize Archive Service**
   ```typescript
   import { initializeWeb3Storage } from './archive.js';
   await initializeWeb3Storage();
   ```

4. **Test Integration**
   ```bash
   npm run test:archive
   ```

## Support

For issues or questions:
- Check the [Web3.Storage documentation](https://docs-beta.web3.storage/)
- Review the test files for usage examples
- Monitor logs for detailed error information

## License

This integration is part of the WeatherX League project and follows the same MIT license terms. 