import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DATABASE_PATH
    ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
    : path.resolve(process.cwd(), '../data/regtech.db'),
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://127.0.0.1:5050',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((s) => s.trim()),
  simulator: {
    defaultIntervalMs: parseInt(process.env.SIMULATOR_INTERVAL_MS || '3000', 10),
    defaultSeed: parseInt(process.env.SIMULATOR_DEFAULT_SEED || '42', 10),
  },
  thresholds: {
    highValueAmount: parseFloat(process.env.HIGH_VALUE_THRESHOLD || '10000'),
    structuringLower: parseFloat(process.env.STRUCTURING_LOWER_THRESHOLD || '9000'),
    structuringUpper: parseFloat(process.env.STRUCTURING_UPPER_THRESHOLD || '9999'),
    rapidVelocitySeconds: parseInt(process.env.RAPID_VELOCITY_WINDOW_SECONDS || '60', 10),
    rapidVelocityCount: parseInt(process.env.RAPID_VELOCITY_COUNT_THRESHOLD || '3', 10),
    highRiskCountries: (process.env.HIGH_RISK_COUNTRIES || 'IR,KP,SY,RU,MM,YE').split(','),
  },
};
