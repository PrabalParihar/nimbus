import { NearBindgen, near, call, view, initialize, LookupMap, Vector } from 'near-sdk-js';

// Minimum prediction amount (1 NEAR in yoctoNEAR)
const MIN_PREDICTION_AMOUNT = BigInt('1000000000000000000000000');

// Chain Signatures configuration
const CHAIN_SIGNATURES_CONTRACT = 'v1.signer-prod.testnet';
const FVM_WALLABY_CHAIN_ID = 31415926;
const USDFC_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890'; // Replace with actual USDFC contract address

// Cross-chain transaction types
class CrossChainTransaction {
  round_id: number;
  winner: string;
  amount: bigint;
  fvm_tx_hash?: string;
  signed_payload?: string;
  status: 'pending' | 'signed' | 'relayed' | 'confirmed' | 'failed';
  created_at: bigint;

  constructor(round_id: number, winner: string, amount: bigint) {
    this.round_id = round_id;
    this.winner = winner;
    this.amount = amount;
    this.status = 'pending';
    this.created_at = near.blockTimestamp();
  }
}

// Filecoin transaction payload structure
class FvmMintPayload {
  to: string;
  data: string;
  value: string;
  gas: string;
  gasPrice: string;
  nonce: number;
  chainId: number;

  constructor(to: string, recipient: string, amount: bigint, nonce: number) {
    this.to = to;
    this.data = this.build_mint_data(recipient, amount);
    this.value = '0';
    this.gas = '100000';
    this.gasPrice = '1000000000'; // 1 gwei
    this.nonce = nonce;
    this.chainId = FVM_WALLABY_CHAIN_ID;
  }

  private build_mint_data(recipient: string, amount: bigint): string {
    // ERC20 mintTo function selector: 0x449a52f8
    // mintTo(address,uint256)
    const functionSelector = '0x449a52f8';
    const paddedRecipient = recipient.slice(2).padStart(64, '0');
    const paddedAmount = amount.toString(16).padStart(64, '0');
    return functionSelector + paddedRecipient + paddedAmount;
  }
}

// Round status enumeration
enum RoundStatus {
  Open = 'Open',
  Closed = 'Closed',
  Settled = 'Settled'
}

// Data structures with proper serialization
class Round {
  id: number;
  title: string;
  description: string;
  status: RoundStatus;
  created_at: bigint;
  closed_at?: bigint;
  settled_at?: bigint;
  result?: boolean;
  total_yes_amount: bigint;
  total_no_amount: bigint;
  yes_predictions: number;
  no_predictions: number;
  creator: string;

  constructor(
    id: number,
    title: string,
    description: string,
    creator: string
  ) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.status = RoundStatus.Open;
    this.created_at = near.blockTimestamp();
    this.total_yes_amount = BigInt(0);
    this.total_no_amount = BigInt(0);
    this.yes_predictions = 0;
    this.no_predictions = 0;
    this.creator = creator;
  }
}

class Prediction {
  round_id: number;
  predictor: string;
  amount: bigint;
  prediction: boolean; // true = yes, false = no
  timestamp: bigint;
  claimed: boolean;

  constructor(
    round_id: number,
    predictor: string,
    amount: bigint,
    prediction: boolean
  ) {
    this.round_id = round_id;
    this.predictor = predictor;
    this.amount = amount;
    this.prediction = prediction;
    this.timestamp = near.blockTimestamp();
    this.claimed = false;
  }
}

class PredictionPoolStats {
  total_rounds: number;
  active_rounds: number;
  total_volume: bigint;
  total_predictions: number;

  constructor(
    total_rounds: number,
    active_rounds: number,
    total_volume: bigint,
    total_predictions: number
  ) {
    this.total_rounds = total_rounds;
    this.active_rounds = active_rounds;
    this.total_volume = total_volume;
    this.total_predictions = total_predictions;
  }
}

@NearBindgen({})
export class PredictionPool {
  owner: string;
  next_round_id: number;
  rounds: LookupMap<Round>;
  predictions: Vector<Prediction>;
  user_predictions: LookupMap<Vector<number>>; // user -> prediction indices
  platform_fee_basis_points: number; // 100 = 1%
  total_volume: bigint;
  paused: boolean;
  cross_chain_transactions: Vector<CrossChainTransaction>;
  fvm_nonce: number;

  constructor() {
    this.owner = '';
    this.next_round_id = 1;
    this.rounds = new LookupMap('rounds');
    this.predictions = new Vector('predictions');
    this.user_predictions = new LookupMap('user_predictions');
    this.platform_fee_basis_points = 0;
    this.total_volume = BigInt(0);
    this.paused = false;
    this.cross_chain_transactions = new Vector('cross_chain_txs');
    this.fvm_nonce = 0;
  }

  @initialize({})
  init({ owner, platform_fee_basis_points }: { owner: string; platform_fee_basis_points: number }) {
    this.owner = owner;
    this.platform_fee_basis_points = platform_fee_basis_points;
    this.next_round_id = 1;
    this.rounds = new LookupMap('rounds');
    this.predictions = new Vector('predictions');
    this.user_predictions = new LookupMap('user_predictions');
    this.total_volume = BigInt(0);
    this.paused = false;
    this.cross_chain_transactions = new Vector('cross_chain_txs');
    this.fvm_nonce = 0;

    near.log(`PredictionPool initialized with owner: ${owner}, fee: ${platform_fee_basis_points} basis points`);
  }

  // Admin functions (owner only)
  @call({})
  open_round({ title, description }: { title: string; description: string }): number {
    this.assert_owner();
    if (this.paused) throw new Error('Contract is paused');
    if (title.length === 0 || title.length > 100) throw new Error('Invalid title length');
    if (description.length > 500) throw new Error('Description too long');

    const round_id = this.next_round_id;
    const round = new Round(round_id, title, description, near.predecessorAccountId());

    this.rounds.set(round_id.toString(), round);
    this.next_round_id += 1;

    near.log(`Round ${round_id} opened: ${title}`);
    return round_id;
  }

  @call({})
  close_round({ round_id }: { round_id: number }): void {
    this.assert_owner();
    const round = this.rounds.get(round_id.toString());
    if (!round) throw new Error('Round not found');
    if (round.status !== RoundStatus.Open) throw new Error('Round is not open');

    round.status = RoundStatus.Closed;
    round.closed_at = near.blockTimestamp();
    this.rounds.set(round_id.toString(), round);

    near.log(`Round ${round_id} closed`);
  }

  @call({})
  settle_round({ round_id, result, winner_address }: { round_id: number; result: boolean; winner_address: string }): void {
    this.assert_owner();
    const round = this.rounds.get(round_id.toString());
    if (!round) throw new Error('Round not found');
    if (round.status !== RoundStatus.Closed) throw new Error('Round must be closed first');

    round.status = RoundStatus.Settled;
    round.result = result;
    round.settled_at = near.blockTimestamp();
    this.rounds.set(round_id.toString(), round);

    // Calculate total winning pool amount for cross-chain mint
    const winning_pool_amount = result ? round.total_yes_amount : round.total_no_amount;
    
    if (winning_pool_amount > BigInt(0) && winner_address) {
      // Convert NEAR amount to USDFC amount (1 NEAR = 1000 USDFC for example)
      const usdfc_amount = winning_pool_amount / BigInt('1000000000000000000000'); // Convert from yoctoNEAR to NEAR, then to USDFC
      
      // Create cross-chain transaction
      const cross_chain_tx = new CrossChainTransaction(round_id, winner_address, usdfc_amount);
      const tx_index = this.cross_chain_transactions.length;
      this.cross_chain_transactions.push(cross_chain_tx);
      
      // Build FVM payload for USDFC.mintTo
      const payload = this.build_fvm_mint_payload(winner_address, usdfc_amount);
      
      // Sign the payload using NEAR Chain Signatures
      this.sign_fvm_transaction(payload, tx_index);
    }

    near.log(`Round ${round_id} settled with result: ${result ? 'YES' : 'NO'}`);
  }

  // User functions
  @call({ payableFunction: true })
  predict_yes({ round_id }: { round_id: number }): void {
    this.predict_internal(round_id, true);
  }

  @call({ payableFunction: true })
  predict_no({ round_id }: { round_id: number }): void {
    this.predict_internal(round_id, false);
  }

  private predict_internal(round_id: number, prediction: boolean): void {
    if (this.paused) throw new Error('Contract is paused');
    const amount = near.attachedDeposit();
    if (amount < MIN_PREDICTION_AMOUNT) throw new Error('Minimum prediction is 1 NEAR');

    const round = this.rounds.get(round_id.toString());
    if (!round) throw new Error('Round not found');
    if (round.status !== RoundStatus.Open) throw new Error('Round is not open');

    const predictor = near.predecessorAccountId();

    // Create prediction
    const prediction_data = new Prediction(round_id, predictor, amount, prediction);

    // Update round totals
    if (prediction) {
      round.total_yes_amount += amount;
      round.yes_predictions += 1;
    } else {
      round.total_no_amount += amount;
      round.no_predictions += 1;
    }

    // Store prediction
    const prediction_index = this.predictions.length;
    this.predictions.push(prediction_data);

    // Update user prediction indices
    let user_preds = this.user_predictions.get(predictor);
    if (!user_preds) {
      user_preds = new Vector(`user_${predictor}`);
    }
    user_preds.push(prediction_index);
    this.user_predictions.set(predictor, user_preds);

    // Update round and totals
    this.rounds.set(round_id.toString(), round);
    this.total_volume += amount;

    // Log the prediction
    near.log(`Prediction made: ${this.yocto_to_near(amount)} NEAR on ${prediction ? 'YES' : 'NO'} for round ${round_id}`);
  }

  @call({})
  claim_winnings({ prediction_index }: { prediction_index: number }): void {
    const prediction = this.predictions.get(prediction_index);
    if (!prediction) throw new Error('Prediction not found');
    if (prediction.predictor !== near.predecessorAccountId()) throw new Error('Not your prediction');
    if (prediction.claimed) throw new Error('Already claimed');

    const round = this.rounds.get(prediction.round_id.toString());
    if (!round) throw new Error('Round not found');
    if (round.status !== RoundStatus.Settled) throw new Error('Round not settled');
    if (round.result === undefined) throw new Error('No result available');

    const won = prediction.prediction === round.result;
    if (!won) throw new Error('Prediction was incorrect');

    // Calculate winnings
    const total_winning_pool = prediction.prediction ? round.total_yes_amount : round.total_no_amount;
    const total_losing_pool = prediction.prediction ? round.total_no_amount : round.total_yes_amount;

    if (total_winning_pool === BigInt(0)) throw new Error('No winning pool');

    const platform_fee = (total_losing_pool * BigInt(this.platform_fee_basis_points)) / BigInt(10000);
    const net_losing_pool = total_losing_pool - platform_fee;

    const winnings = prediction.amount + (prediction.amount * net_losing_pool) / total_winning_pool;

    // Mark as claimed
    prediction.claimed = true;
    this.predictions.replace(prediction_index, prediction);

    near.log(`Claiming ${this.yocto_to_near(winnings)} NEAR for prediction ${prediction_index}`);

    // Return winnings to user
    const promise = near.promiseBatchCreate(prediction.predictor);
    near.promiseBatchActionTransfer(promise, winnings);
    near.promiseReturn(promise);
  }

  // View functions
  @view({})
  get_round({ round_id }: { round_id: number }): Round | null {
    return this.rounds.get(round_id.toString());
  }

  @view({})
  get_user_predictions({ account_id }: { account_id: string }): Prediction[] {
    const indices = this.user_predictions.get(account_id);
    if (!indices) {
      return [];
    }

    const predictions: Prediction[] = [];
    for (let i = 0; i < indices.length; i++) {
      const index = indices.get(i);
      const prediction = this.predictions.get(index!);
      if (prediction) {
        predictions.push(prediction);
      }
    }
    return predictions;
  }

  @view({})
  get_stats(): PredictionPoolStats {
    let active_rounds = 0;
    const total_rounds = this.next_round_id - 1;
    
    // Simple loop to count active rounds
    for (let i = 1; i <= total_rounds; i++) {
      const round = this.rounds.get(i.toString());
      if (round && round.status === RoundStatus.Open) {
        active_rounds += 1;
      }
    }

    return new PredictionPoolStats(
      total_rounds,
      active_rounds,
      this.total_volume,
      this.predictions.length
    );
  }

  @view({})
  get_open_rounds(): Round[] {
    const open_rounds: Round[] = [];
    const total_rounds = this.next_round_id - 1;
    
    // Simple loop to get open rounds
    for (let i = 1; i <= total_rounds; i++) {
      const round = this.rounds.get(i.toString());
      if (round && round.status === RoundStatus.Open) {
        open_rounds.push(round);
      }
    }
    return open_rounds;
  }

  // Admin functions
  @call({})
  set_platform_fee({ basis_points }: { basis_points: number }): void {
    this.assert_owner();
    if (basis_points > 1000) throw new Error('Fee cannot exceed 10%');
    this.platform_fee_basis_points = basis_points;
  }

  @call({})
  pause_contract(): void {
    this.assert_owner();
    this.paused = true;
  }

  @call({})
  unpause_contract(): void {
    this.assert_owner();
    this.paused = false;
  }

  @call({})
  withdraw_fees(): void {
    this.assert_owner();
    const balance = near.accountBalance();
    const storage_cost = BigInt(near.storageUsage()) * near.storageByteCost();
    const available = balance - storage_cost;

    const promise = near.promiseBatchCreate(this.owner);
    near.promiseBatchActionTransfer(promise, available);
    near.promiseReturn(promise);
  }

  // Helper functions
  private assert_owner(): void {
    if (near.predecessorAccountId() !== this.owner) {
      throw new Error('Only owner can call this method');
    }
  }

  private yocto_to_near(amount: bigint): string {
    return (Number(amount) / 1e24).toFixed(2);
  }

  // Cross-chain helper methods
  private build_fvm_mint_payload(winner_address: string, amount: bigint): FvmMintPayload {
    const payload = new FvmMintPayload(
      USDFC_CONTRACT_ADDRESS,
      winner_address,
      amount,
      this.fvm_nonce++
    );
    
    near.log(`Built FVM mint payload: ${JSON.stringify(payload)}`);
    return payload;
  }

  private sign_fvm_transaction(payload: FvmMintPayload, tx_index: number): void {
    // Serialize the transaction payload for signing
    const serialized_payload = this.serialize_fvm_payload(payload);
    
    // Call NEAR Chain Signatures to sign the payload
    const promise = near.promiseBatchCreate(CHAIN_SIGNATURES_CONTRACT);
    
    // Add function call to sign with secp256k1 (key derivation path 0)
    near.promiseBatchActionFunctionCall(
      promise,
      'sign',
      JSON.stringify({
        payload: Array.from(serialized_payload),
        path: '0',
        key_version: 0
      }),
      BigInt('25000000000000000000000'), // 0.025 NEAR for signing
      BigInt('300000000000000') // 300 TGas
    );

    // Set callback to handle the signature result
    const callback_promise = near.promiseBatchThen(promise, near.currentAccountId());
    near.promiseBatchActionFunctionCall(
      callback_promise,
      'on_signature_result',
      JSON.stringify({
        tx_index: tx_index,
        payload: payload
      }),
      BigInt(0),
      BigInt('30000000000000') // 30 TGas
    );

    near.promiseReturn(callback_promise);
  }

  private serialize_fvm_payload(payload: FvmMintPayload): Uint8Array {
    // Create RLP-encoded transaction for Filecoin FVM
    const transaction_data = {
      nonce: payload.nonce,
      gasPrice: payload.gasPrice,
      gasLimit: payload.gas,
      to: payload.to,
      value: payload.value,
      data: payload.data,
      chainId: payload.chainId
    };
    
    // Simple serialization (in production, use proper RLP encoding)
    const serialized = JSON.stringify(transaction_data);
    return new TextEncoder().encode(serialized);
  }

  @call({})
  on_signature_result({ tx_index, payload }: { tx_index: number; payload: FvmMintPayload }): void {
    // This callback is called after the signature is generated
    const signature_result = near.promiseResult(0);
    
    if (signature_result.length === 0) {
      near.log('Signature failed');
      const tx = this.cross_chain_transactions.get(tx_index)!;
      tx.status = 'failed';
      this.cross_chain_transactions.replace(tx_index, tx);
      return;
    }

    try {
      const signature_data = JSON.parse(signature_result);
      const signed_payload = JSON.stringify({
        transaction: payload,
        signature: signature_data
      });

      // Update transaction status
      const tx = this.cross_chain_transactions.get(tx_index)!;
      tx.signed_payload = signed_payload;
      tx.status = 'signed';
      this.cross_chain_transactions.replace(tx_index, tx);

      near.log(`Transaction ${tx_index} signed successfully. Ready for relay to FVM Wallaby.`);
      
      // Emit event for off-chain relay service
      near.log(`CROSS_CHAIN_TX_READY:${tx_index}:${signed_payload}`);
      
    } catch (error) {
      near.log(`Error processing signature: ${error}`);
      const tx = this.cross_chain_transactions.get(tx_index)!;
      tx.status = 'failed';
      this.cross_chain_transactions.replace(tx_index, tx);
    }
  }

  // View functions for cross-chain transactions
  @view({})
  get_cross_chain_transaction({ tx_index }: { tx_index: number }): CrossChainTransaction | null {
    return this.cross_chain_transactions.get(tx_index);
  }

  @view({})
  get_pending_cross_chain_transactions(): CrossChainTransaction[] {
    const pending_txs: CrossChainTransaction[] = [];
    for (let i = 0; i < this.cross_chain_transactions.length; i++) {
      const tx = this.cross_chain_transactions.get(i);
      if (tx && (tx.status === 'pending' || tx.status === 'signed')) {
        pending_txs.push(tx);
      }
    }
    return pending_txs;
  }

  @call({})
  update_cross_chain_status({ tx_index, status, fvm_tx_hash }: { tx_index: number; status: string; fvm_tx_hash?: string }): void {
    // This can be called by authorized relay service
    const tx = this.cross_chain_transactions.get(tx_index);
    if (!tx) throw new Error('Transaction not found');

    tx.status = status as any;
    if (fvm_tx_hash) {
      tx.fvm_tx_hash = fvm_tx_hash;
    }
    
    this.cross_chain_transactions.replace(tx_index, tx);
    near.log(`Cross-chain transaction ${tx_index} status updated to ${status}`);
  }
} 