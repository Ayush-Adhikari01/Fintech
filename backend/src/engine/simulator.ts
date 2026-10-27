import { query } from '../db/connection';
import { Account, Counterparty } from '../types';
import { processTransactionPipeline, IngestTransactionInput, getSocketIO } from './pipeline';
import { config } from '../config';

// Simple Linear Congruential Generator (LCG) for reproducible pseudo-random numbers
class PseudoRandom {
  private seed: number;

  constructor(seed: number = 42) {
    this.seed = seed;
  }

  setSeed(seed: number): void {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  choice<T>(arr: T[] | readonly T[]): T {
    const idx = Math.floor(this.next() * arr.length);
    return arr[idx];
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

class TransactionSimulator {
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private intervalMs: number = config.simulator.defaultIntervalMs;
  private timer: NodeJS.Timeout | null = null;
  private prng: PseudoRandom;
  private generatedCount: number = 0;

  constructor() {
    this.prng = new PseudoRandom(config.simulator.defaultSeed);
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      intervalMs: this.intervalMs,
      generatedCount: this.generatedCount,
    };
  }

  public setIntervalMs(ms: number) {
    this.intervalMs = Math.max(500, Math.min(10000, ms));
    if (this.isRunning && !this.isPaused) {
      this.pause();
      this.resume();
    }
  }

  public setSeed(seed: number) {
    this.prng.setSeed(seed);
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.scheduleNextTick();
    this.broadcastStatus();
  }

  public pause() {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.broadcastStatus();
  }

  public resume() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.scheduleNextTick();
    this.broadcastStatus();
  }

  public stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.broadcastStatus();
  }

  private scheduleNextTick() {
    if (!this.isRunning || this.isPaused) return;
    this.timer = setTimeout(async () => {
      try {
        await this.generateSingleTransaction();
      } catch (err) {
        console.error('[Simulator] Error processing tick:', err);
      }
      this.scheduleNextTick();
    }, this.intervalMs);
  }

  public async generateSingleTransaction(customOverrides?: Partial<IngestTransactionInput>) {
    const accounts = query<Account>('SELECT * FROM accounts WHERE status = "ACTIVE";');
    const counterparties = query<Counterparty>('SELECT * FROM counterparties;');

    if (accounts.length === 0 || counterparties.length === 0) {
      throw new Error('No active accounts or counterparties available for simulation.');
    }

    const sender = this.prng.choice(accounts);
    const counterparty = this.prng.choice(counterparties);
    const channels = ['WEB', 'MOBILE', 'API', 'SWIFT', 'ATM'] as const;
    const types = ['WIRE', 'ACH', 'INSTANT', 'CROSS_BORDER'] as const;

    const channel = this.prng.choice(channels as readonly ('WEB' | 'MOBILE' | 'API' | 'SWIFT' | 'ATM')[]);
    const type = this.prng.choice(types as readonly ('WIRE' | 'ACH' | 'INSTANT' | 'CROSS_BORDER')[]);

    // Roll random chance for typology injection
    // 70% normal, 10% high-value, 10% structuring, 10% sanctions/high-risk
    const roll = this.prng.next();
    let amount = Math.round(this.prng.range(25, 4500) * 100) / 100;
    let originCountry = 'US';
    let destCountry = counterparty.country;

    if (roll > 0.90) {
      // High-risk country or sanctioned counterparty
      const highRisk = ['IR', 'KP', 'SY', 'RU', 'MM'];
      destCountry = this.prng.choice(highRisk);
      amount = Math.round(this.prng.range(8000, 35000) * 100) / 100;
    } else if (roll > 0.80) {
      // Structuring band: 9,000 to 9,999
      amount = Math.round(this.prng.range(9100, 9950) * 100) / 100;
    } else if (roll > 0.70) {
      // Large whale amount
      amount = Math.round(this.prng.range(12000, 85000) * 100) / 100;
    }

    const input: IngestTransactionInput = {
      sender_account_id: customOverrides?.sender_account_id || sender.id,
      receiver_account_id: customOverrides?.receiver_account_id || `ACC-EXT-${Math.floor(1000 + this.prng.next() * 9000)}`,
      amount: customOverrides?.amount !== undefined ? customOverrides.amount : amount,
      currency: customOverrides?.currency || sender.currency,
      channel: customOverrides?.channel || channel,
      type: customOverrides?.type || type,
      origin_country: customOverrides?.origin_country || originCountry,
      dest_country: customOverrides?.dest_country || destCountry,
      counterparty_id: customOverrides?.counterparty_id !== undefined ? customOverrides.counterparty_id : counterparty.id,
    };

    const result = await processTransactionPipeline(input);
    this.generatedCount++;
    this.broadcastStatus();
    return result;
  }

  public async generateBatch(count: number) {
    const results = [];
    for (let i = 0; i < count; i++) {
      const res = await this.generateSingleTransaction();
      results.push(res);
    }
    return results;
  }

  private broadcastStatus() {
    const io = getSocketIO();
    if (io) {
      io.emit('simulator:status', this.getStatus());
    }
  }
}

export const simulator = new TransactionSimulator();
