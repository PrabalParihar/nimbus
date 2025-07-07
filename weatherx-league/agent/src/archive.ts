import { create } from '@web3-storage/w3up-client';
import { gzipSync } from 'zlib';
import winston from 'winston';

// Web3.Storage client configuration
let w3Client: any = null;
let isInitialized = false;

interface ArchiveResult {
  cid: string;
  size: number;
  compressedSize: number;
  timestamp: string;
}

interface RainfallData {
  stationId: string;
  timestamp: string;
  precipitationMm: number;
  location?: {
    lat: number;
    lng: number;
  };
  metadata?: any;
}

export class Web3StorageArchive {
  private logger: winston.Logger;
  private spaceName: string;
  private email: string;

  constructor(logger: winston.Logger, spaceName = 'weatherx-rainfall-archive', email?: string) {
    this.logger = logger;
    this.spaceName = spaceName;
    this.email = email || process.env.WEB3_STORAGE_EMAIL || '';
  }

  /**
   * Initialize the Web3.Storage client and space
   */
  async initialize(): Promise<void> {
    if (isInitialized && w3Client) {
      return;
    }

    try {
      this.logger.info('Initializing Web3.Storage client...');
      
      // Create the w3up client
      w3Client = await create();
      this.logger.info('Web3.Storage client created successfully');

      // Create or get existing space
      await this.setupSpace();
      
      isInitialized = true;
      this.logger.info('Web3.Storage archive service initialized');

    } catch (error) {
      this.logger.error('Failed to initialize Web3.Storage client:', error);
      throw error;
    }
  }

  /**
   * Set up space for uploads
   */
  private async setupSpace(): Promise<void> {
    try {
      // Check if we already have spaces
      const spaces = await w3Client.spaces();
      
      if (spaces.length > 0) {
        // Use the first available space
        const space = spaces[0];
        await w3Client.setCurrentSpace(space.did());
        this.logger.info(`Using existing space: ${space.did()}`);
        return;
      }

      // Create new space if none exists
      this.logger.info(`Creating new space: ${this.spaceName}`);
      const space = await w3Client.createSpace(this.spaceName);
      await w3Client.setCurrentSpace(space.did());

      // Register the space with email if provided
      if (this.email) {
        this.logger.info(`Registering space with email: ${this.email}`);
        try {
          await w3Client.registerSpace(this.email);
          this.logger.info('Space registered successfully');
        } catch (error) {
          this.logger.warn('Space registration failed - you may need to confirm email:', error);
          // Continue without registration for now
        }
      } else {
        this.logger.warn('No email provided - space registration skipped');
      }

    } catch (error) {
      this.logger.error('Failed to setup Web3.Storage space:', error);
      throw error;
    }
  }

  /**
   * Gzip and upload JSON data to Web3.Storage
   * @param json - JSON data to compress and upload
   * @returns Promise<ArchiveResult> - Upload result with CID
   */
  async gzipAndUpload(json: any): Promise<ArchiveResult> {
    if (!isInitialized || !w3Client) {
      await this.initialize();
    }

    try {
      // Convert JSON to string and measure original size
      const jsonString = JSON.stringify(json);
      const originalSize = Buffer.byteLength(jsonString, 'utf8');
      
      this.logger.info(`Compressing JSON data (${originalSize} bytes)...`);

      // Gzip the JSON data as specified
      const buffer = Buffer.from(jsonString);
      const gzippedBuffer = gzipSync(buffer);
      const compressedSize = gzippedBuffer.length;

      this.logger.info(`Compression complete: ${originalSize} → ${compressedSize} bytes (${Math.round((1 - compressedSize/originalSize) * 100)}% reduction)`);

      // Create a File object for upload
      const filename = `rainfall-${Date.now()}.json.gz`;
      const file = new File([gzippedBuffer], filename, {
        type: 'application/gzip'
      });

      // Upload to Web3.Storage
      this.logger.info('Uploading to Web3.Storage...');
      const cid = await w3Client.uploadFile(file);
      
      this.logger.info(`Upload successful: ${cid}`);

      return {
        cid: cid.toString(),
        size: originalSize,
        compressedSize,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to gzip and upload JSON:', error);
      throw error;
    }
  }

  /**
   * Upload multiple rainfall data entries as a batch
   * @param rainfallDataArray - Array of rainfall data entries
   * @returns Promise<ArchiveResult> - Upload result with CID
   */
  async uploadRainfallBatch(rainfallDataArray: RainfallData[]): Promise<ArchiveResult> {
    const batchData = {
      type: 'rainfall_batch',
      timestamp: new Date().toISOString(),
      count: rainfallDataArray.length,
      data: rainfallDataArray
    };

    return this.gzipAndUpload(batchData);
  }

  /**
   * Upload weather prediction results
   * @param predictionData - Weather prediction data
   * @returns Promise<ArchiveResult> - Upload result with CID
   */
  async uploadPredictionData(predictionData: any): Promise<ArchiveResult> {
    const archiveData = {
      type: 'weather_prediction',
      timestamp: new Date().toISOString(),
      data: predictionData
    };

    return this.gzipAndUpload(archiveData);
  }

  /**
   * Create IPFS gateway URL for a CID
   * @param cid - Content Identifier
   * @param gateway - Gateway host (default: w3s.link)
   * @returns string - Gateway URL
   */
  createGatewayUrl(cid: string, gateway = 'w3s.link'): string {
    return `https://${cid}.ipfs.${gateway}`;
  }

  /**
   * Get client status and space information
   * @returns Promise<object> - Client status
   */
  async getStatus(): Promise<object> {
    if (!isInitialized || !w3Client) {
      return { initialized: false };
    }

    try {
      const spaces = await w3Client.spaces();
      const currentSpace = w3Client.currentSpace();

      return {
        initialized: true,
        spacesCount: spaces.length,
        currentSpace: currentSpace?.did() || null,
        spaceName: this.spaceName
      };

    } catch (error) {
      this.logger.error('Failed to get Web3.Storage status:', error);
      return { 
        initialized: true, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Export utility functions for direct use
export const web3StorageArchive = new Web3StorageArchive(
  winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [new winston.transports.Console()]
  })
);

/**
 * Simple utility function to gzip and upload JSON
 * @param json - JSON data to upload
 * @returns Promise<string> - CID of uploaded content
 */
export async function gzipAndUpload(json: any): Promise<string> {
  const result = await web3StorageArchive.gzipAndUpload(json);
  return result.cid;
}

/**
 * Initialize Web3.Storage with custom configuration
 * @param email - Email for space registration
 * @param spaceName - Custom space name
 */
export async function initializeWeb3Storage(email?: string, spaceName?: string): Promise<void> {
  if (email) {
    web3StorageArchive['email'] = email;
  }
  if (spaceName) {
    web3StorageArchive['spaceName'] = spaceName;
  }
  await web3StorageArchive.initialize();
}

export default Web3StorageArchive; 