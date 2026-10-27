import { query, queryOne } from '../db/connection';
import { Customer, Account, Counterparty, RiskRule, TriggeredRuleDetail } from '../types';
import { config } from '../config';

export interface RuleEvaluationInput {
  senderAccountId: string;
  senderCustomerId: string;
  receiverAccountId: string;
  counterpartyId?: string | null;
  amount: number;
  currency: string;
  channel: string;
  type: string;
  originCountry: string;
  destCountry: string;
  timestamp?: string;
}

export interface RuleEvaluationResult {
  ruleScore: number;
  triggeredRules: TriggeredRuleDetail[];
  hasCriticalViolation: boolean;
}

export function evaluateDeterministicRules(input: RuleEvaluationInput): RuleEvaluationResult {
  const activeRules = query<RiskRule>(
    'SELECT * FROM risk_rules WHERE is_enabled = 1 ORDER BY weight DESC;'
  );
  const ruleMap = new Map<string, RiskRule>(activeRules.map((r) => [r.id, r]));

  const triggeredRules: TriggeredRuleDetail[] = [];
  const senderCustomer = queryOne<Customer>(
    'SELECT * FROM customers WHERE id = ?;',
    input.senderCustomerId
  );
  const counterparty = input.counterpartyId
    ? queryOne<Counterparty>('SELECT * FROM counterparties WHERE id = ?;', input.counterpartyId)
    : undefined;

  // 1. RULE-HIGH-VAL ($10,000 threshold)
  const rHighVal = ruleMap.get('RULE-HIGH-VAL');
  if (rHighVal) {
    const threshold = rHighVal.threshold_value ?? config.thresholds.highValueAmount;
    if (input.amount >= threshold) {
      triggeredRules.push({
        ruleId: rHighVal.id,
        ruleName: rHighVal.name,
        category: rHighVal.category,
        weight: rHighVal.weight,
        scoreContribution: rHighVal.weight,
        reason: `Transaction amount $${input.amount.toFixed(2)} exceeds threshold of $${threshold.toFixed(2)}.`,
      });
    }
  }

  // 2. RULE-STRUCTURING ($9,000 - $9,999)
  const rStructuring = ruleMap.get('RULE-STRUCTURING');
  if (rStructuring) {
    const lower = config.thresholds.structuringLower;
    const upper = config.thresholds.structuringUpper;
    if (input.amount >= lower && input.amount <= upper) {
      triggeredRules.push({
        ruleId: rStructuring.id,
        ruleName: rStructuring.name,
        category: rStructuring.category,
        weight: rStructuring.weight,
        scoreContribution: rStructuring.weight,
        reason: `Transaction amount $${input.amount.toFixed(2)} lies in structuring band ($${lower.toFixed(2)} - $${upper.toFixed(2)}).`,
      });
    }
  }

  // 3. RULE-VELOCITY (Rapid transaction burst in recent window)
  const rVelocity = ruleMap.get('RULE-VELOCITY');
  if (rVelocity) {
    const windowSecs = config.thresholds.rapidVelocitySeconds;
    const countThreshold = rVelocity.threshold_value ?? config.thresholds.rapidVelocityCount;
    const recentWindowStart = new Date(Date.now() - windowSecs * 1000).toISOString();
    const recentCountResult = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM transactions WHERE sender_account_id = ? AND created_at >= ?;',
      input.senderAccountId,
      recentWindowStart
    );
    const recentCount = recentCountResult ? recentCountResult.count : 0;
    if (recentCount >= countThreshold) {
      triggeredRules.push({
        ruleId: rVelocity.id,
        ruleName: rVelocity.name,
        category: rVelocity.category,
        weight: rVelocity.weight,
        scoreContribution: rVelocity.weight,
        reason: `Observed ${recentCount} outbound transactions from account ${input.senderAccountId} in the past ${windowSecs}s (threshold: ${countThreshold}).`,
      });
    }
  }

  // 4. RULE-HIGH-RISK-GEO (Sanctions jurisdiction IR, KP, SY, RU, MM, YE)
  const rHighRiskGeo = ruleMap.get('RULE-HIGH-RISK-GEO');
  if (rHighRiskGeo) {
    const highRiskCountries = config.thresholds.highRiskCountries;
    const isOriginHighRisk = highRiskCountries.includes(input.originCountry.toUpperCase());
    const isDestHighRisk = highRiskCountries.includes(input.destCountry.toUpperCase());
    if (isOriginHighRisk || isDestHighRisk) {
      const flagged = isDestHighRisk ? input.destCountry : input.originCountry;
      triggeredRules.push({
        ruleId: rHighRiskGeo.id,
        ruleName: rHighRiskGeo.name,
        category: rHighRiskGeo.category,
        weight: rHighRiskGeo.weight,
        scoreContribution: rHighRiskGeo.weight,
        reason: `Transaction routes to/from designated high-risk sanctions jurisdiction (${flagged.toUpperCase()}).`,
      });
    }
  }

  // 5. RULE-KYC-INCOMPLETE
  const rKyc = ruleMap.get('RULE-KYC-INCOMPLETE');
  if (rKyc && senderCustomer) {
    if (senderCustomer.kyc_status !== 'VERIFIED') {
      triggeredRules.push({
        ruleId: rKyc.id,
        ruleName: rKyc.name,
        category: rKyc.category,
        weight: rKyc.weight,
        scoreContribution: rKyc.weight,
        reason: `Originating customer ${senderCustomer.name} has non-verified KYC status: ${senderCustomer.kyc_status}.`,
      });
    }
  }

  // 6. RULE-WATCHLIST-MATCH (Exact match on customer or counterparty against synthetic watchlist)
  const rWatchlist = ruleMap.get('RULE-WATCHLIST-MATCH');
  if (rWatchlist) {
    const custNameNorm = senderCustomer?.name.toLowerCase().trim() || '';
    const cptyNameNorm = counterparty?.name.toLowerCase().trim() || '';
    const match = queryOne<{ name: string; regime: string; program: string }>(
      `SELECT name, regime, program FROM synthetic_watchlist 
       WHERE normalized_name = ? OR normalized_name = ?;`,
      custNameNorm,
      cptyNameNorm
    );
    if (match) {
      triggeredRules.push({
        ruleId: rWatchlist.id,
        ruleName: rWatchlist.name,
        category: rWatchlist.category,
        weight: rWatchlist.weight,
        scoreContribution: rWatchlist.weight,
        reason: `Matched synthetic sanctions watchlist entry: "${match.name}" (${match.regime} / ${match.program}).`,
      });
    }
  }

  // 7. RULE-TURNOVER-SPIKE (>300% expected monthly turnover)
  const rTurnover = ruleMap.get('RULE-TURNOVER-SPIKE');
  if (rTurnover && senderCustomer && senderCustomer.monthly_expected_turnover > 0) {
    const multiplier = rTurnover.threshold_value ?? 3.0;
    if (input.amount > senderCustomer.monthly_expected_turnover * multiplier) {
      const pct = Math.round((input.amount / senderCustomer.monthly_expected_turnover) * 100);
      triggeredRules.push({
        ruleId: rTurnover.id,
        ruleName: rTurnover.name,
        category: rTurnover.category,
        weight: rTurnover.weight,
        scoreContribution: rTurnover.weight,
        reason: `Transaction amount $${input.amount.toFixed(2)} represents ${pct}% of monthly turnover ($${senderCustomer.monthly_expected_turnover.toFixed(2)}).`,
      });
    }
  }

  // 8. RULE-CROSS-BORDER-OFFHOURS (Cross-border wire 23:00-05:00 UTC)
  const rOffHours = ruleMap.get('RULE-CROSS-BORDER-OFFHOURS');
  if (rOffHours && input.originCountry.toUpperCase() !== input.destCountry.toUpperCase()) {
    const currentHour = new Date().getUTCHours();
    if (currentHour >= 23 || currentHour <= 5) {
      triggeredRules.push({
        ruleId: rOffHours.id,
        ruleName: rOffHours.name,
        category: rOffHours.category,
        weight: rOffHours.weight,
        scoreContribution: rOffHours.weight,
        reason: `International cross-border transfer initiated during unusual overnight hours (${currentHour}:00 UTC).`,
      });
    }
  }

  // 9. RULE-HIGH-RISK-COUNTERPARTY
  const rCpty = ruleMap.get('RULE-HIGH-RISK-COUNTERPARTY');
  if (rCpty && counterparty) {
    if (counterparty.risk_level === 'CRITICAL' || counterparty.risk_level === 'HIGH' || counterparty.is_sanctioned_proxy === 1) {
      triggeredRules.push({
        ruleId: rCpty.id,
        ruleName: rCpty.name,
        category: rCpty.category,
        weight: rCpty.weight,
        scoreContribution: rCpty.weight,
        reason: `Counterparty ${counterparty.name} is classified as ${counterparty.risk_level} risk.`,
      });
    }
  }

  // 10. RULE-RAPID-FLOW-THROUGH (Recent deposit followed by immediate withdrawal)
  const rRapidFlow = ruleMap.get('RULE-RAPID-FLOW-THROUGH');
  if (rRapidFlow) {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const recentInflow = queryOne<{ total_inflow: number }>(
      `SELECT SUM(amount) as total_inflow FROM transactions 
       WHERE receiver_account_id = ? AND created_at >= ?;`,
      input.senderAccountId,
      fifteenMinsAgo
    );
    if (recentInflow && recentInflow.total_inflow > 0 && input.amount >= recentInflow.total_inflow * 0.8) {
      triggeredRules.push({
        ruleId: rRapidFlow.id,
        ruleName: rRapidFlow.name,
        category: rRapidFlow.category,
        weight: rRapidFlow.weight,
        scoreContribution: rRapidFlow.weight,
        reason: `Outbound transfer of $${input.amount.toFixed(2)} immediately follows recent incoming funds ($${recentInflow.total_inflow.toFixed(2)}) within 15 minutes.`,
      });
    }
  }

  // 11. RULE-CHANNEL-DEVIATION (Direct API or SWIFT for retail account)
  const rChannel = ruleMap.get('RULE-CHANNEL-DEVIATION');
  if (rChannel && senderCustomer?.type === 'INDIVIDUAL') {
    if (input.channel === 'API' || input.channel === 'SWIFT') {
      triggeredRules.push({
        ruleId: rChannel.id,
        ruleName: rChannel.name,
        category: rChannel.category,
        weight: rChannel.weight,
        scoreContribution: rChannel.weight,
        reason: `Individual consumer account initiated transaction via unexpected institutional channel (${input.channel}).`,
      });
    }
  }

  // Calculate normalized aggregate score bounded between 0 and 100
  // Diminishing returns formula so multiple rules smoothly sum without overflowing
  let rawSum = 0;
  for (const t of triggeredRules) {
    rawSum += t.scoreContribution;
  }
  // If rawSum >= 100, bounded to 100.
  const ruleScore = Math.min(100, Math.round(rawSum));

  const hasCriticalViolation = triggeredRules.some(
    (r) => r.ruleId === 'RULE-WATCHLIST-MATCH' || r.ruleId === 'RULE-HIGH-RISK-GEO'
  );

  return {
    ruleScore,
    triggeredRules,
    hasCriticalViolation,
  };
}
