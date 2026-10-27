import { config } from '../config';
import { queryOne } from '../db/connection';

export interface MLPredictionInput {
  amount: number;
  senderAccountId: string;
  senderCustomerId: string;
  channel: string;
  originCountry: string;
  destCountry: string;
}

export interface MLPredictionResult {
  available: boolean;
  status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  anomalyScore: number | null;
  isAnomaly: boolean;
  rawDecisionScore: number | null;
  modelVersion: string;
  confidenceNote: string;
}

export async function queryMLInference(input: MLPredictionInput): Promise<MLPredictionResult> {
  const highRiskCountries = config.thresholds.highRiskCountries;
  const isHighRiskCountry =
    highRiskCountries.includes(input.originCountry.toUpperCase()) ||
    highRiskCountries.includes(input.destCountry.toUpperCase())
      ? 1
      : 0;
  const isCrossBorder = input.originCountry.toUpperCase() !== input.destCountry.toUpperCase() ? 1 : 0;
  const currentHour = new Date().getUTCHours();
  const isNightTime = currentHour >= 23 || currentHour <= 5 ? 1 : 0;

  // Compute 1-hour velocity from transactions table
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const velocityResult = queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE sender_account_id = ? AND created_at >= ?;',
    input.senderAccountId,
    oneHourAgo
  );
  const velocity1h = (velocityResult?.count || 0) + 1;

  // Compute amount deviation from customer mean
  const avgResult = queryOne<{ avg_amount: number; std_dev: number }>(
    'SELECT AVG(amount) as avg_amount FROM transactions WHERE sender_customer_id = ?;',
    input.senderCustomerId
  );
  const avgAmount = avgResult?.avg_amount || input.amount;
  const devRatio = avgAmount > 0 ? (input.amount - avgAmount) / Math.max(avgAmount * 0.5, 100) : 0;

  const payload = {
    amount: input.amount,
    velocity_1h: velocity1h,
    amount_dev_from_mean: Math.round(devRatio * 100) / 100,
    is_night_time: isNightTime,
    is_cross_border: isCrossBorder,
    is_high_risk_country: isHighRiskCountry,
    channel: input.channel.toUpperCase(),
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const baseUrl = config.mlServiceUrl.endsWith('/') ? config.mlServiceUrl : `${config.mlServiceUrl}/`;
    const targetUrl = new URL('predict', baseUrl);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        available: false,
        status: 'DEGRADED',
        anomalyScore: null,
        isAnomaly: false,
        rawDecisionScore: null,
        modelVersion: 'unknown',
        confidenceNote: `ML service returned HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as any;
    return {
      available: true,
      status: 'HEALTHY',
      anomalyScore: data.anomaly_score,
      isAnomaly: Boolean(data.is_anomaly),
      rawDecisionScore: data.raw_decision_score ?? null,
      modelVersion: data.model_version || 'v1.0.0',
      confidenceNote:
        data.interpretation_note ||
        'Isolation Forest anomaly indicator. Measures multidimensional deviation from baseline.',
    };
  } catch (error: any) {
    return {
      available: false,
      status: 'UNAVAILABLE',
      anomalyScore: null,
      isAnomaly: false,
      rawDecisionScore: null,
      modelVersion: 'none',
      confidenceNote: `ML service unreachable (${error.message || 'connection failed'}). Falling back to deterministic rules.`,
    };
  }
}
