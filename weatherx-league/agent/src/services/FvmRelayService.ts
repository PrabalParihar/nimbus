import { ethers } from 'ethers';
import winston from 'winston';
import { Web3StorageArchive } from '../archive.js';

// FVM Wallaby network configuration
const FVM_WALLABY_RPC = 'https://api.calibration.node.glif.io/rpc/v1';

// USDFC contract configuration (replace with actual contract address)
const USDFC_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';

// USDFC ABI for mintTo function
const USDFC_ABI = [
  'function mintTo(address to, uint256 amount) external',
  'function balanceOf(address owner) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

interface CrossChainTransaction {
  round_id: number;
  winner: string;
  amount: bigint;
  fvm_tx_hash?: string;
  signed_payload?: string;
  status: 'pending' | 'signed' | 'relayed' | 'confirmed' | 'failed';
  created_at: bigint;
}

interface SignedFvmTransaction {
  transaction: {
    to: string;
    data: string;
    value: string;
    gas: string;
    gasPrice: string;
    nonce: number;
    chainId: number;
  };
  signature: {
    r: string;
    s: string;
    v: number;
    big_r: string;
    big_s: string;
    recovery_id: number;
  };
}

export class FvmRelayService {
  private provider: ethers.providers.JsonRpcProvider;
  private logger: winston.Logger;
  private isRunning: boolean = false;
  private relayWallet?: ethers.Wallet;
  private archiveService: Web3StorageArchive;

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.provider = new ethers.providers.JsonRpcProvider(FVM_WALLABY_RPC);
    this.archiveService = new Web3StorageArchive(logger, 'weatherx-fvm-archive');
    this.logger.info('FVM Relay Service initialized');
  }

  /**
   * Initialize the relay service with a wallet for gas payments
   */
  async initialize(privateKey?: string): Promise<void> {
    try {
      if (privateKey) {
        this.relayWallet = new ethers.Wallet(privateKey, this.provider);
        this.logger.info(`Relay wallet initialized: ${this.relayWallet.address}`);
      } else {
        this.logger.warn('No private key provided - relay service will run in read-only mode');
      }

      // Test connection to FVM Wallaby
      const network = await this.provider.getNetwork();
      this.logger.info(`Connected to FVM Wallaby network: ${network.name} (chainId: ${network.chainId})`);

      // Initialize Web3.Storage archive service
      await this.archiveService.initialize();
      this.logger.info('Web3.Storage archive service initialized');
      
    } catch (error) {
      this.logger.error('Failed to initialize FVM relay service:', error);
      throw error;
    }
  }

  /**
   * Start the relay service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Relay service is already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting FVM relay service...');

    // In a real implementation, this would connect to NEAR blockchain
    // and listen for cross-chain transaction events
    this.logger.info('FVM relay service started');
  }

  /**
   * Stop the relay service
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    this.logger.info('FVM relay service stopped');
  }

  /**
   * Relay a signed transaction to FVM Wallaby
   */
  async relayTransaction(signedTx: SignedFvmTransaction): Promise<string> {
    if (!this.relayWallet) {
      throw new Error('Relay wallet not configured');
    }

    try {
      this.logger.info(`Relaying transaction to FVM Wallaby: ${JSON.stringify(signedTx.transaction)}`);

      // Reconstruct the transaction with the signature
      const transaction = {
        to: signedTx.transaction.to,
        data: signedTx.transaction.data,
        value: signedTx.transaction.value,
        gasLimit: signedTx.transaction.gas,
        gasPrice: signedTx.transaction.gasPrice,
        nonce: signedTx.transaction.nonce,
        chainId: signedTx.transaction.chainId
      };

      // Create the serialized transaction
      const serializedTx = ethers.utils.serializeTransaction(transaction, {
        r: signedTx.signature.r,
        s: signedTx.signature.s,
        v: signedTx.signature.v
      });

      // Send the raw transaction
      const txResponse = await this.provider.sendTransaction(serializedTx);
      
      this.logger.info(`Transaction relayed successfully: ${txResponse.hash}`);
      
      // Wait for confirmation
      const receipt = await txResponse.wait();
      this.logger.info(`Transaction confirmed: ${receipt.transactionHash}`);

      return txResponse.hash;

    } catch (error) {
      this.logger.error('Failed to relay transaction:', error);
      throw error;
    }
  }

  /**
   * Relay using USDFC SDK approach (alternative method)
   */
  async relayUsingUSDFC(recipient: string, amount: bigint): Promise<string> {
    if (!this.relayWallet) {
      throw new Error('Relay wallet not configured');
    }

    try {
      // Create USDFC contract instance
      const usdfc = new ethers.Contract(
        USDFC_CONTRACT_ADDRESS,
        USDFC_ABI,
        this.relayWallet
      );

      this.logger.info(`Minting ${amount} USDFC to ${recipient}`);

      // Call mintTo function
      const tx = await usdfc.mintTo(recipient, amount);
      
      this.logger.info(`USDFC mint transaction sent: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      this.logger.info(`USDFC mint confirmed: ${receipt.transactionHash}`);

      return tx.hash;

    } catch (error) {
      this.logger.error('Failed to mint USDFC:', error);
      throw error;
    }
  }

  /**
   * Get transaction status on FVM Wallaby
   */
  async getTransactionStatus(txHash: string): Promise<ethers.providers.TransactionReceipt | null> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt;
    } catch (error) {
      this.logger.error(`Failed to get transaction status for ${txHash}:`, error);
      return null;
    }
  }

  /**
   * Listen for events from USDFC contract
   */
  async listenForUSDFCEvents(callback: (event: any) => void): Promise<void> {
    try {
      const usdfc = new ethers.Contract(
        USDFC_CONTRACT_ADDRESS,
        USDFC_ABI,
        this.provider
      );

      // Listen for Transfer events
      usdfc.on('Transfer', (from, to, amount, event) => {
        this.logger.info(`USDFC Transfer: ${from} -> ${to}, Amount: ${amount}`);
        callback({
          type: 'Transfer',
          from,
          to,
          amount,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      });

      this.logger.info('Started listening for USDFC events');

    } catch (error) {
      this.logger.error('Failed to listen for USDFC events:', error);
      throw error;
    }
  }

  /**
   * Get USDFC balance for an address
   */
  async getUSDFCBalance(address: string): Promise<bigint> {
    try {
      const usdfc = new ethers.Contract(
        USDFC_CONTRACT_ADDRESS,
        USDFC_ABI,
        this.provider
      );

      const balanceBn = await usdfc.balanceOf(address);
      return BigInt(balanceBn.toString());

    } catch (error) {
      this.logger.error(`Failed to get USDFC balance for ${address}:`, error);
      throw error;
    }
  }

  /**
   * Process a cross-chain transaction from NEAR
   */
  async processCrossChainTransaction(transaction: CrossChainTransaction): Promise<string> {
    try {
      if (!transaction.signed_payload) {
        throw new Error('Transaction not signed');
      }

      const signedTx: SignedFvmTransaction = JSON.parse(transaction.signed_payload);
      
      // Relay the transaction
      const txHash = await this.relayTransaction(signedTx);
      
      this.logger.info(`Cross-chain transaction processed: NEAR round ${transaction.round_id} -> FVM tx ${txHash}`);
      
      return txHash;

    } catch (error) {
      this.logger.error('Failed to process cross-chain transaction:', error);
      throw error;
    }
  }

  /**
   * Archive rainfall data and mint USDFC with CID in calldata
   * @param rainfallData - Rainfall data to archive
   * @param recipient - USDFC recipient address
   * @param amount - Amount to mint
   * @returns Promise<{txHash: string, cid: string}> - Transaction hash and archive CID
   */
  async archiveAndMintUSDFC(rainfallData: any, recipient: string, amount: bigint): Promise<{txHash: string, cid: string}> {
    if (!this.relayWallet) {
      throw new Error('Relay wallet not configured');
    }

    try {
      // Step 1: Archive rainfall data and get CID
      this.logger.info('Archiving rainfall data to IPFS...');
      const archiveResult = await this.archiveService.gzipAndUpload(rainfallData);
      const cid = archiveResult.cid;
      
      this.logger.info(`Rainfall data archived: ${cid} (${archiveResult.compressedSize} bytes)`);

      // Step 2: Create USDFC contract instance with custom ABI that includes CID storage
      const extendedABI = [
        'function mintTo(address to, uint256 amount) external',
        'function mintWithData(address to, uint256 amount, bytes calldata data) external',
        'function balanceOf(address owner) view returns (uint256)',
        'function totalSupply() view returns (uint256)',
        'event Transfer(address indexed from, address indexed to, uint256 value)',
        'event DataStored(address indexed account, bytes32 indexed cid, uint256 amount)'
      ];

      const usdfc = new ethers.Contract(
        USDFC_CONTRACT_ADDRESS,
        extendedABI,
        this.relayWallet
      );

      // Step 3: Encode CID for storage in calldata
      const cidBytes = ethers.utils.toUtf8Bytes(cid);

      this.logger.info(`Minting ${amount} USDFC to ${recipient} with CID: ${cid}`);

      // Step 4: Try to use mintWithData if available, fallback to regular mint
      let tx;
      try {
        // Attempt to call mintWithData with CID in calldata
        tx = await usdfc.mintWithData(recipient, amount, cidBytes);
        this.logger.info(`USDFC mint with data transaction sent: ${tx.hash}`);
      } catch (error) {
        // Fallback to regular mint if mintWithData doesn't exist
        this.logger.warn('mintWithData not available, using regular mint');
        tx = await usdfc.mintTo(recipient, amount);
        this.logger.info(`USDFC mint transaction sent: ${tx.hash}`);
      }

      // Step 5: Wait for confirmation
      const receipt = await tx.wait();
      this.logger.info(`USDFC mint confirmed: ${receipt.transactionHash}`);

      // Step 6: Log the CID association
      this.logger.info(`Archive CID ${cid} associated with transaction ${receipt.transactionHash}`);

      return {
        txHash: receipt.transactionHash,
        cid: cid
      };

    } catch (error) {
      this.logger.error('Failed to archive and mint USDFC:', error);
      throw error;
    }
  }

  /**
   * Archive weather prediction results with FVM integration
   * @param predictionData - Weather prediction data
   * @param metadata - Additional metadata
   * @returns Promise<string> - Archive CID
   */
  async archiveWeatherData(predictionData: any, metadata?: any): Promise<string> {
    try {
      const archiveData = {
        type: 'weather_data',
        timestamp: new Date().toISOString(),
        data: predictionData,
        metadata: metadata || {},
        chain: 'filecoin-wallaby'
      };

      const result = await this.archiveService.gzipAndUpload(archiveData);
      this.logger.info(`Weather data archived: ${result.cid}`);
      
      return result.cid;

    } catch (error) {
      this.logger.error('Failed to archive weather data:', error);
      throw error;
    }
  }

  /**
   * Create a transaction with embedded CID data
   * @param to - Recipient address
   * @param value - Transaction value
   * @param cid - IPFS CID to embed
   * @returns Promise<string> - Transaction hash
   */
  async createTransactionWithCID(to: string, value: bigint, cid: string): Promise<string> {
    if (!this.relayWallet) {
      throw new Error('Relay wallet not configured');
    }

    try {
      // Encode CID in transaction data
      const cidData = ethers.utils.toUtf8Bytes(cid);
      
      const tx = await this.relayWallet.sendTransaction({
        to: to,
        value: value,
        data: ethers.utils.hexlify(cidData),
        gasLimit: 100000
      });

      this.logger.info(`Transaction with CID sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      this.logger.info(`Transaction with CID confirmed: ${receipt.transactionHash}`);

      return receipt.transactionHash;

    } catch (error) {
      this.logger.error('Failed to create transaction with CID:', error);
      throw error;
    }
  }

  /**
   * Extract CID from transaction calldata
   * @param txHash - Transaction hash
   * @returns Promise<string | null> - Extracted CID or null if not found
   */
  async extractCIDFromTransaction(txHash: string): Promise<string | null> {
    try {
      const tx = await this.provider.getTransaction(txHash);
      
      if (!tx || !tx.data || tx.data === '0x') {
        return null;
      }

      // Try to decode as UTF-8 string (CID)
      try {
        const cidBytes = ethers.utils.arrayify(tx.data);
        const cid = ethers.utils.toUtf8String(cidBytes);
        
        // Basic validation that this looks like a CID
        if (cid.startsWith('Qm') || cid.startsWith('bafy')) {
          return cid;
        }
      } catch (error) {
        // Not a valid UTF-8 string
      }

      return null;

    } catch (error) {
      this.logger.error(`Failed to extract CID from transaction ${txHash}:`, error);
      return null;
    }
  }

  /**
   * Health check for the relay service
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      
      const details = {
        network: network.name,
        chainId: network.chainId,
        blockNumber,
        walletConfigured: !!this.relayWallet,
        walletAddress: this.relayWallet?.address || null,
        isRunning: this.isRunning
      };

      return {
        status: 'healthy',
        details
      };

    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}

export default FvmRelayService; 