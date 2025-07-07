import { gzipAndUpload, initializeWeb3Storage, web3StorageArchive } from './archive.js';
import winston from 'winston';

// Create logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Sample rainfall data
const sampleRainfallData = {
  stationId: 'WXM-NYC-001',
  timestamp: new Date().toISOString(),
  precipitationMm: 12.5,
  location: {
    lat: 40.7128,
    lng: -74.0060
  },
  metadata: {
    temperature: 22.3,
    humidity: 68,
    pressure: 1013.25,
    source: 'WeatherXM'
  }
};

const samplePredictionData = {
  roundId: 1,
  predictions: [
    { user: 'alice.testnet', prediction: true, amount: '5000000000000000000000000' },
    { user: 'bob.testnet', prediction: false, amount: '3000000000000000000000000' }
  ],
  result: true,
  totalVolume: '8000000000000000000000000',
  timestamp: new Date().toISOString()
};

async function testArchiveFunctionality() {
  try {
    logger.info('🚀 Testing Web3.Storage Archive Functionality');

    // Test 1: Initialize Web3.Storage
    logger.info('\n1️⃣  Initializing Web3.Storage...');
    await initializeWeb3Storage('test@example.com', 'weatherx-test-archive');
    logger.info('✅ Web3.Storage initialized successfully');

    // Test 2: Simple gzipAndUpload
    logger.info('\n2️⃣  Testing gzipAndUpload function...');
    const simpleCid = await gzipAndUpload({ message: 'Hello Web3.Storage!', timestamp: Date.now() });
    logger.info(`✅ Simple upload successful: ${simpleCid}`);
    logger.info(`📖 View at: https://${simpleCid}.ipfs.w3s.link`);

    // Test 3: Upload rainfall data
    logger.info('\n3️⃣  Testing rainfall data upload...');
    const rainfallResult = await web3StorageArchive.gzipAndUpload(sampleRainfallData);
    logger.info(`✅ Rainfall data uploaded: ${rainfallResult.cid}`);
    logger.info(`📊 Compression: ${rainfallResult.size} → ${rainfallResult.compressedSize} bytes`);
    logger.info(`📖 View at: ${web3StorageArchive.createGatewayUrl(rainfallResult.cid)}`);

    // Test 4: Upload batch rainfall data
    logger.info('\n4️⃣  Testing rainfall batch upload...');
    const batchData = Array.from({ length: 5 }, (_, i) => ({
      ...sampleRainfallData,
      stationId: `WXM-NYC-00${i + 1}`,
      precipitationMm: Math.random() * 20,
      timestamp: new Date(Date.now() + i * 3600000).toISOString()
    }));
    
    const batchResult = await web3StorageArchive.uploadRainfallBatch(batchData);
    logger.info(`✅ Batch upload successful: ${batchResult.cid}`);
    logger.info(`📊 Batch compression: ${batchResult.size} → ${batchResult.compressedSize} bytes`);

    // Test 5: Upload prediction data
    logger.info('\n5️⃣  Testing prediction data upload...');
    const predictionResult = await web3StorageArchive.uploadPredictionData(samplePredictionData);
    logger.info(`✅ Prediction data uploaded: ${predictionResult.cid}`);

    // Test 6: Get status
    logger.info('\n6️⃣  Getting Web3.Storage status...');
    const status = await web3StorageArchive.getStatus();
    logger.info('✅ Status:', JSON.stringify(status, null, 2));

    logger.info('\n🎉 All tests completed successfully!');
    logger.info('\n📋 Summary:');
    logger.info(`   Simple CID: ${simpleCid}`);
    logger.info(`   Rainfall CID: ${rainfallResult.cid}`);
    logger.info(`   Batch CID: ${batchResult.cid}`);
    logger.info(`   Prediction CID: ${predictionResult.cid}`);

  } catch (error) {
    logger.error('❌ Test failed:', error);
    throw error;
  }
}

// Test function for integration with FVM
async function testFVMIntegration() {
  try {
    logger.info('\n🔗 Testing FVM Integration Concepts...');
    
    // Simulate archiving rainfall data and getting CID
    const rainfallData = {
      ...sampleRainfallData,
      roundId: 1,
      finalResult: true
    };

    const cid = await gzipAndUpload(rainfallData);
    logger.info(`📦 Archived rainfall data: ${cid}`);

    // Simulate how this CID would be used in FVM transaction calldata
    const mockTxData = {
      to: '0x1234567890123456789012345678901234567890', // USDFC contract
      data: `0x449a52f8${'0x742d35cc6e842c4e8c5b3eb1e5d94f8b3e891234'.slice(2).padStart(64, '0')}${BigInt('1000').toString(16).padStart(64, '0')}`,
      archiveCID: cid,
      metadata: {
        type: 'USDFC_MINT_WITH_ARCHIVE',
        timestamp: new Date().toISOString(),
        dataSource: 'WeatherXM',
        compressionRatio: `${Math.round((1 - 156/512) * 100)}%`
      }
    };

    logger.info('🔗 Mock FVM Transaction Data:');
    logger.info(JSON.stringify(mockTxData, null, 2));
    logger.info(`📖 Archived data viewable at: https://${cid}.ipfs.w3s.link`);

  } catch (error) {
    logger.error('❌ FVM integration test failed:', error);
  }
}

// Run tests
async function runTests() {
  try {
    await testArchiveFunctionality();
    await testFVMIntegration();
  } catch (error) {
    logger.error('Tests failed:', error);
    process.exit(1);
  }
}

// Execute if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { testArchiveFunctionality, testFVMIntegration, runTests }; 