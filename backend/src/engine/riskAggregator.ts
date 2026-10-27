import { RiskSeverity } from '../types';
import { RuleEvaluationResult } from './ruleEngine';
import { MLPredictionResult } from './mlClient';

export interface AggregationResult {
  ruleScore: number;
  mlAnomalyScore: number | null;
  mlIsAnomaly: boolean;
  mlStatus: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  finalRiskScore: number;
  severity: RiskSeverity;
  explanation: string;
  recommendedAction: string;
  holdRequired: boolean;
}

export function aggregateRisk(
  ruleResult: RuleEvaluationResult,
  mlResult: MLPredictionResult
): AggregationResult {
  const { ruleScore, triggeredRules, hasCriticalViolation } = ruleResult;

  let mlContribution = 0;
  if (mlResult.available && mlResult.anomalyScore !== null) {
    // ML anomaly score is 0.0 - 1.0. Scale to 0 - 100 with 25% weighting
    mlContribution = mlResult.anomalyScore * 100 * 0.25;
  }

  // Baseline rule score weighted at 75% if ML available, 100% if unavailable
  let combinedScore: number;
  if (mlResult.available && mlResult.anomalyScore !== null) {
    combinedScore = Math.round(ruleScore * 0.75 + mlContribution);
  } else {
    combinedScore = ruleScore;
  }

  // If a critical rule fired (sanctions or high-risk jurisdiction) or multiple high rules,
  // enforce floor of 80 (CRITICAL)
  if (hasCriticalViolation) {
    combinedScore = Math.max(combinedScore, 85);
  }

  // Ensure score stays bounded [0, 100]
  const finalRiskScore = Math.max(0, Math.min(100, combinedScore));

  // Determine Severity Band
  let severity: RiskSeverity = 'LOW';
  let recommendedAction = 'AUTOMATIC_CLEARANCE';
  let holdRequired = false;

  if (finalRiskScore >= 80) {
    severity = 'CRITICAL';
    recommendedAction = 'ESCALATE_TO_COMPLIANCE';
    holdRequired = true;
  } else if (finalRiskScore >= 60) {
    severity = 'HIGH';
    recommendedAction = 'MANUAL_REVIEW';
  } else if (finalRiskScore >= 30) {
    severity = 'MEDIUM';
    recommendedAction = 'ENHANCED_MONITORING';
  } else {
    severity = 'LOW';
    recommendedAction = 'AUTOMATIC_CLEARANCE';
  }

  // Generate clear human-readable explanation
  let explanation = '';
  if (triggeredRules.length > 0) {
    const ruleNames = triggeredRules.map((r) => r.ruleName).join(', ');
    explanation = `Flagged by deterministic rules (${ruleNames}).`;
    if (mlResult.available && mlResult.isAnomaly) {
      explanation += ` Additionally identified as behavioral anomaly by Isolation Forest model (score: ${mlResult.anomalyScore?.toFixed(2)}).`;
    }
  } else if (mlResult.available && mlResult.isAnomaly) {
    explanation = `Statistical outlier identified by Isolation Forest anomaly detector (score: ${mlResult.anomalyScore?.toFixed(2)}), exceeding typical baseline variance.`;
  } else {
    explanation = 'Transaction parameters conform with baseline operational profile.';
  }

  if (mlResult.status !== 'HEALTHY') {
    explanation += ` [Note: ML Service status is ${mlResult.status}; deterministic rule fallback engaged.]`;
  }

  return {
    ruleScore,
    mlAnomalyScore: mlResult.anomalyScore,
    mlIsAnomaly: mlResult.isAnomaly,
    mlStatus: mlResult.status,
    finalRiskScore,
    severity,
    explanation,
    recommendedAction,
    holdRequired,
  };
}
