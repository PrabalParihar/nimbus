import { connect, Contract, keyStores, KeyPair, Near, Account } from 'near-api-js';
import { Logger } from 'winston';

// Contract interface types
interface Round {
  id: number;
  title: string;
  description: string;
  status: 'Open' | 'Closed' | 'Settled';
  created_at: string;
  closed_at?: string;
  settled_at?: string;
  result?: boolean;
  total_yes_amount: string;
  total_no_amount: string;
  yes_predictions: number;
  no_predictions: number;
  creator: string;
}

interface Prediction {
  round_id: number;
  predictor: string;
  amount: string;
  prediction: boolean;
  timestamp: string;
  claimed: boolean;
}

interface PredictionPoolStats {
  total_rounds: number;
  active_rounds: number;
  total_volume: string;
  total_predictions: number;
}

interface PredictionPoolContract extends Contract {
  // View methods
  get_round(args: { round_id: number }): Promise<Round | null>;
  get_user_predictions(args: { account_id: string }): Promise<Prediction[]>;
  get_stats(): Promise<PredictionPoolStats>;
  get_open_rounds(): Promise<Round[]>;
  
  // Call methods
  open_round(args: { title: string; description: string }): Promise<number>;
  close_round(args: { round_id: number }): Promise<void>;
  settle_round(args: { round_id: number; result: boolean }): Promise<void>;
  predict_yes(args: { round_id: number }, gas?: string, amount?: string): Promise<void>;
  predict_no(args: { round_id: number }, gas?: string, amount?: string): Promise<void>;
  claim_winnings(args: { prediction_index: number }): Promise<void>;
  set_platform_fee(args: { basis_points: number }): Promise<void>;
  pause_contract(): Promise<void>;
  unpause_contract(): Promise<void>;
  withdraw_fees(): Promise<void>;
}

export class ContractService {
  private logger: Logger;
  private near: Near | null = null;
  private contractId: string;
  private networkId: string;
  private nodeUrl: string;
  private walletUrl: string;
  private helperUrl: string;
  private explorerUrl: string;

  constructor(logger: Logger) {
    this.logger = logger;
    this.contractId = process.env.CONTRACT_ID || 'prediction-pool.testnet';
    this.networkId = process.env.NETWORK_ID || 'testnet';
    this.nodeUrl = process.env.NODE_URL || 'https://rpc.testnet.near.org';
    this.walletUrl = process.env.WALLET_URL || 'https://wallet.testnet.near.org';
    this.helperUrl = process.env.HELPER_URL || 'https://helper.testnet.near.org';
    this.explorerUrl = process.env.EXPLORER_URL || 'https://explorer.testnet.near.org';
  }

  private async initNear(): Promise<Near> {
    if (this.near) return this.near;

    const keyStore = new keyStores.InMemoryKeyStore();
    
    const config = {
      networkId: this.networkId,
      keyStore,
      nodeUrl: this.nodeUrl,
      walletUrl: this.walletUrl,
      helperUrl: this.helperUrl,
      explorerUrl: this.explorerUrl,
    };

    this.near = await connect(config);
    return this.near;
  }

  private async getAccount(accountId: string, privateKey: string): Promise<Account> {
    const near = await this.initNear();
    const keyPair = KeyPair.fromString(privateKey);
    await (near.connection.signer as any).keyStore.setKey(this.networkId, accountId, keyPair);
    return await near.account(accountId);
  }

  private async getContract(accountId: string, privateKey: string): Promise<PredictionPoolContract> {
    const account = await this.getAccount(accountId, privateKey);
    return new Contract(account, this.contractId, {
      viewMethods: ['get_round', 'get_user_predictions', 'get_stats', 'get_open_rounds'],
      changeMethods: [
        'open_round',
        'close_round', 
        'settle_round',
        'predict_yes',
        'predict_no',
        'claim_winnings',
        'set_platform_fee',
        'pause_contract',
        'unpause_contract',
        'withdraw_fees'
      ],
    }) as PredictionPoolContract;
  }

  private async getViewContract(): Promise<PredictionPoolContract> {
    const near = await this.initNear();
    const account = await near.account('');
    return new Contract(account, this.contractId, {
      viewMethods: ['get_round', 'get_user_predictions', 'get_stats', 'get_open_rounds'],
      changeMethods: [],
    }) as PredictionPoolContract;
  }

  // Admin methods
  async openRound(title: string, description: string, signerAccountId: string, privateKey: string): Promise<number> {
    try {
      this.logger.info(`Opening round: ${title}`);
      const contract = await this.getContract(signerAccountId, privateKey);
      
      const result = await contract.open_round({
        title,
        description
      });
      
      this.logger.info(`Round opened successfully with ID: ${result}`);
      return result;
    } catch (error) {
      this.logger.error('Error opening round:', error);
      throw error;
    }
  }

  async closeRound(roundId: number, signerAccountId: string, privateKey: string): Promise<void> {
    try {
      this.logger.info(`Closing round: ${roundId}`);
      const contract = await this.getContract(signerAccountId, privateKey);
      
      await contract.close_round({ round_id: roundId });
      
      this.logger.info(`Round ${roundId} closed successfully`);
    } catch (error) {
      this.logger.error('Error closing round:', error);
      throw error;
    }
  }

  async settleRound(roundId: number, result: boolean, signerAccountId: string, privateKey: string): Promise<void> {
    try {
      this.logger.info(`Settling round: ${roundId} with result: ${result}`);
      const contract = await this.getContract(signerAccountId, privateKey);
      
      await contract.settle_round({ round_id: roundId, result });
      
      this.logger.info(`Round ${roundId} settled successfully`);
    } catch (error) {
      this.logger.error('Error settling round:', error);
      throw error;
    }
  }

  // User methods
  async makePrediction(
    roundId: number,
    prediction: boolean,
    amount: string,
    signerAccountId: string,
    privateKey: string
  ): Promise<void> {
    try {
      this.logger.info(`Making prediction: ${prediction ? 'YES' : 'NO'} for round ${roundId} with amount ${amount}`);
      const contract = await this.getContract(signerAccountId, privateKey);
      
      const gas = '300000000000000'; // 300 TGas
      const attachedDeposit = amount;
      
      if (prediction) {
        await contract.predict_yes({ round_id: roundId }, gas, attachedDeposit);
      } else {
        await contract.predict_no({ round_id: roundId }, gas, attachedDeposit);
      }
      
      this.logger.info(`Prediction made successfully`);
    } catch (error) {
      this.logger.error('Error making prediction:', error);
      throw error;
    }
  }

  async claimWinnings(predictionIndex: number, signerAccountId: string, privateKey: string): Promise<void> {
    try {
      this.logger.info(`Claiming winnings for prediction index: ${predictionIndex}`);
      const contract = await this.getContract(signerAccountId, privateKey);
      
      await contract.claim_winnings({ prediction_index: predictionIndex });
      
      this.logger.info(`Winnings claimed successfully`);
    } catch (error) {
      this.logger.error('Error claiming winnings:', error);
      throw error;
    }
  }

  // View methods
  async getRound(roundId: number): Promise<Round | null> {
    try {
      this.logger.info(`Getting round: ${roundId}`);
      const contract = await this.getViewContract();
      
      const round = await contract.get_round({ round_id: roundId });
      
      this.logger.info(`Round data retrieved successfully`);
      return round;
    } catch (error) {
      this.logger.error('Error getting round:', error);
      throw error;
    }
  }

  async getUserPredictions(accountId: string): Promise<Prediction[]> {
    try {
      this.logger.info(`Getting predictions for user: ${accountId}`);
      const contract = await this.getViewContract();
      
      const predictions = await contract.get_user_predictions({ account_id: accountId });
      
      this.logger.info(`User predictions retrieved successfully`);
      return predictions;
    } catch (error) {
      this.logger.error('Error getting user predictions:', error);
      throw error;
    }
  }

  async getStats(): Promise<PredictionPoolStats> {
    try {
      this.logger.info('Getting contract stats');
      const contract = await this.getViewContract();
      
      const stats = await contract.get_stats();
      
      this.logger.info('Contract stats retrieved successfully');
      return stats;
    } catch (error) {
      this.logger.error('Error getting stats:', error);
      throw error;
    }
  }

  async getOpenRounds(): Promise<Round[]> {
    try {
      this.logger.info('Getting open rounds');
      const contract = await this.getViewContract();
      
      const rounds = await contract.get_open_rounds();
      
      this.logger.info('Open rounds retrieved successfully');
      return rounds;
    } catch (error) {
      this.logger.error('Error getting open rounds:', error);
      throw error;
    }
  }

  // Utility methods
  nearToYocto(amount: string): string {
    return (parseFloat(amount) * 1e24).toString();
  }

  yoctoToNear(amount: string): string {
    return (parseFloat(amount) / 1e24).toString();
  }

  formatAmount(amount: string): string {
    return parseFloat(this.yoctoToNear(amount)).toFixed(2);
  }
} 