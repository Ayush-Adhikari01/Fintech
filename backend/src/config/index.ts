import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  get port(): number {
    return parseInt(process.env.PORT || '5000', 10);
  },
  get nodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  },
  get dbPath(): string {
    if (process.env.DATABASE_PATH) {
      return path.isAbsolute(process.env.DATABASE_PATH)
        ? process.env.DATABASE_PATH
        : path.resolve(process.cwd(), process.env.DATABASE_PATH);
    }
    if (process.env.VERCEL) {
      return path.resolve('/tmp', 'regtech.db');
    }
    return path.resolve(process.cwd(), '../data/regtech.db');
  },
  get mlServiceUrl(): string {
    return process.env.ML_SERVICE_URL || 'http://127.0.0.1:5050';
  },
  get corsOrigins(): string[] {
    return (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000')
      .split(',')
      .map((s) => s.trim());
  },
  simulator: {
    get defaultIntervalMs(): number {
      return parseInt(process.env.SIMULATOR_INTERVAL_MS || '3000', 10);
    },
    get defaultSeed(): number {
      return parseInt(process.env.SIMULATOR_DEFAULT_SEED || '42', 10);
    },
  },
  thresholds: {
    get highValueAmount(): number {
      return parseFloat(process.env.HIGH_VALUE_THRESHOLD || '10000');
    },
    get structuringLower(): number {
      return parseFloat(process.env.STRUCTURING_LOWER_THRESHOLD || '9000');
    },
    get structuringUpper(): number {
      return parseFloat(process.env.STRUCTURING_UPPER_THRESHOLD || '9999');
    },
    get rapidVelocitySeconds(): number {
      return parseInt(process.env.RAPID_VELOCITY_WINDOW_SECONDS || '60', 10);
    },
    get rapidVelocityCount(): number {
      return parseInt(process.env.RAPID_VELOCITY_COUNT_THRESHOLD || '3', 10);
    },
    get highRiskCountries(): string[] {
      return (process.env.HIGH_RISK_COUNTRIES || 'IR,KP,SY,RU,MM,YE').split(',');
    },
  },
};
