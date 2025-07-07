import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import winston from 'winston';
import { AgentService } from './services/AgentService.js';
import { ContractService } from './services/ContractService.js';
import { WeatherXMService } from './services/WeatherXMService.js';
import { FvmRelayService } from './services/FvmRelayService.js';
import { initializeWeb3Storage, gzipAndUpload } from './archive.js';
import { validateRequest } from './middleware/validation.js';
import { errorHandler } from './middleware/errorHandler.js';

// Load environment variables
config();

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ],
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize services
const agentService = new AgentService(logger);
const contractService = new ContractService(logger);
const weatherService = new WeatherXMService(logger);
const fvmRelayService = new FvmRelayService(logger);

// Initialize FVM relay service and Web3.Storage
(async () => {
  try {
    await fvmRelayService.initialize(process.env.FVM_RELAY_PRIVATE_KEY);
    await fvmRelayService.start();
    logger.info('FVM Relay Service started successfully');

    // Initialize Web3.Storage
    await initializeWeb3Storage(process.env.WEB3_STORAGE_EMAIL, 'weatherx-league-archive');
    logger.info('Web3.Storage archive service initialized');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
  }
})();

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Agent Processing Endpoints
app.post('/api/agent/process', validateRequest, async (req, res) => {
  try {
    const { action, data } = req.body;
    const result = await agentService.processRequest(action, data);
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Agent processing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Weather Data Endpoints
app.get('/api/weather/rain/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    const rainData = await weatherService.getRain(stationId);
    res.json({
      success: true,
      data: rainData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Weather data error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch weather data'
    });
  }
});

app.post('/api/weather/rain/multiple', async (req, res) => {
  try {
    const { stationIds } = req.body;
    if (!Array.isArray(stationIds)) {
      return res.status(400).json({
        success: false,
        error: 'stationIds must be an array'
      });
    }
    
    const rainData = await weatherService.getRainMultiple(stationIds);
    return res.json({
      success: true,
      data: rainData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Multiple weather data error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch weather data'
    });
  }
});

app.get('/api/weather/rain/:stationId/recent', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { threshold } = req.query;
    const thresholdValue = threshold ? parseFloat(threshold as string) : 0.1;
    
    const hasRain = await weatherService.hasRecentRain(stationId, thresholdValue);
    res.json({
      success: true,
      data: { hasRecentRain: hasRain, threshold: thresholdValue },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Recent rain check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check recent rain'
    });
  }
});

// Contract Interaction Endpoints
app.post('/api/contract/round/open', async (req, res) => {
  try {
    const { title, description, signerAccountId, privateKey } = req.body;
    const roundId = await contractService.openRound(title, description, signerAccountId, privateKey);
    res.json({
      success: true,
      data: { roundId },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Open round error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to open round'
    });
  }
});

app.post('/api/contract/round/close', async (req, res) => {
  try {
    const { roundId, signerAccountId, privateKey } = req.body;
    await contractService.closeRound(roundId, signerAccountId, privateKey);
    res.json({
      success: true,
      data: { roundId },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Close round error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to close round'
    });
  }
});

app.post('/api/contract/round/settle', async (req, res) => {
  try {
    const { roundId, result, signerAccountId, privateKey } = req.body;
    await contractService.settleRound(roundId, result, signerAccountId, privateKey);
    res.json({
      success: true,
      data: { roundId, result },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Settle round error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to settle round'
    });
  }
});

app.post('/api/contract/predict', async (req, res) => {
  try {
    const { roundId, prediction, amount, signerAccountId, privateKey } = req.body;
    await contractService.makePrediction(roundId, prediction, amount, signerAccountId, privateKey);
    res.json({
      success: true,
      data: { roundId, prediction, amount },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Make prediction error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to make prediction'
    });
  }
});

app.get('/api/contract/round/:roundId', async (req, res) => {
  try {
    const { roundId } = req.params;
    const round = await contractService.getRound(parseInt(roundId));
    res.json({
      success: true,
      data: round,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get round error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get round'
    });
  }
});

app.get('/api/contract/rounds/open', async (_req, res) => {
  try {
    const openRounds = await contractService.getOpenRounds();
    res.json({
      success: true,
      data: openRounds,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get open rounds error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get open rounds'
    });
  }
});

app.get('/api/contract/stats', async (_req, res) => {
  try {
    const stats = await contractService.getStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats'
    });
  }
});

app.get('/api/contract/predictions/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const predictions = await contractService.getUserPredictions(accountId);
    res.json({
      success: true,
      data: predictions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get user predictions error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user predictions'
    });
  }
});

// Cross-chain / FVM Relay Endpoints
app.get('/api/fvm/health', async (_req, res) => {
  try {
    const health = await fvmRelayService.healthCheck();
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('FVM health check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check FVM health'
    });
  }
});

app.post('/api/fvm/relay/transaction', async (req, res) => {
  try {
    const { signedTransaction } = req.body;
    const txHash = await fvmRelayService.relayTransaction(signedTransaction);
    res.json({
      success: true,
      data: { transactionHash: txHash },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('FVM relay transaction error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to relay transaction'
    });
  }
});

app.post('/api/fvm/usdfc/mint', async (req, res) => {
  try {
    const { recipient, amount } = req.body;
    const txHash = await fvmRelayService.relayUsingUSDFC(recipient, BigInt(amount));
    res.json({
      success: true,
      data: { transactionHash: txHash },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('USDFC mint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mint USDFC'
    });
  }
});

app.get('/api/fvm/transaction/:txHash/status', async (req, res) => {
  try {
    const { txHash } = req.params;
    const status = await fvmRelayService.getTransactionStatus(txHash);
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get FVM transaction status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get transaction status'
    });
  }
});

app.get('/api/fvm/usdfc/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const balance = await fvmRelayService.getUSDFCBalance(address);
    res.json({
      success: true,
      data: { balance: balance.toString() },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get USDFC balance error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get USDFC balance'
    });
  }
});

app.post('/api/fvm/process-cross-chain', async (req, res) => {
  try {
    const { transaction } = req.body;
    const txHash = await fvmRelayService.processCrossChainTransaction(transaction);
    res.json({
      success: true,
      data: { transactionHash: txHash },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Process cross-chain transaction error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process cross-chain transaction'
    });
  }
});

// Archive / Web3.Storage Endpoints
app.post('/api/archive/gzip-upload', async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required'
      });
    }

    const cid = await gzipAndUpload(data);
    return res.json({
      success: true,
      data: { cid },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Gzip and upload error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to gzip and upload data'
    });
  }
});

app.post('/api/archive/rainfall-batch', async (req, res) => {
  try {
    const { rainfallData } = req.body;
    if (!Array.isArray(rainfallData)) {
      return res.status(400).json({
        success: false,
        error: 'rainfallData must be an array'
      });
    }

    const result = await fvmRelayService['archiveService'].uploadRainfallBatch(rainfallData);
    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Upload rainfall batch error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload rainfall batch'
    });
  }
});

app.post('/api/archive/weather-data', async (req, res) => {
  try {
    const { predictionData, metadata } = req.body;
    const cid = await fvmRelayService.archiveWeatherData(predictionData, metadata);
    res.json({
      success: true,
      data: { cid },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Archive weather data error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive weather data'
    });
  }
});

app.post('/api/fvm/archive-and-mint', async (req, res) => {
  try {
    const { rainfallData, recipient, amount } = req.body;
    if (!rainfallData || !recipient || !amount) {
      return res.status(400).json({
        success: false,
        error: 'rainfallData, recipient, and amount are required'
      });
    }

    const result = await fvmRelayService.archiveAndMintUSDFC(
      rainfallData, 
      recipient, 
      BigInt(amount)
    );
    
    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Archive and mint USDFC error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive and mint USDFC'
    });
  }
});

app.post('/api/fvm/transaction-with-cid', async (req, res) => {
  try {
    const { to, value, cid } = req.body;
    if (!to || !cid) {
      return res.status(400).json({
        success: false,
        error: 'to and cid are required'
      });
    }

    const txHash = await fvmRelayService.createTransactionWithCID(
      to, 
      BigInt(value || 0), 
      cid
    );
    
    return res.json({
      success: true,
      data: { transactionHash: txHash },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Create transaction with CID error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create transaction with CID'
    });
  }
});

app.get('/api/fvm/extract-cid/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    const cid = await fvmRelayService.extractCIDFromTransaction(txHash);
    
    res.json({
      success: true,
      data: { cid, found: !!cid },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Extract CID from transaction error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract CID from transaction'
    });
  }
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`WeatherX League Agent server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

export default app; 