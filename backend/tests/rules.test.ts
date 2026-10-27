import { describe, it, expect, beforeAll } from 'vitest';
import { runMigrations } from '../src/db/schema';
import { seedDatabase } from '../src/db/seed';
import { evaluateDeterministicRules } from '../src/engine/ruleEngine';
import { aggregateRisk } from '../src/engine/riskAggregator';

describe('Deterministic Risk Rule Engine & Aggregator', () => {
  beforeAll(() => {
    runMigrations();
    seedDatabase(false);
  });

  it('correctly flags standard retail transaction with low score', () => {
    const result = evaluateDeterministicRules({
      senderAccountId: 'ACC-8003', // Elena Rostova (Verified KYC)
      senderCustomerId: 'CUST-1002',
      receiverAccountId: 'ACC-EXT-1001',
      amount: 150.0,
      currency: 'EUR',
      channel: 'MOBILE',
      type: 'INSTANT',
      originCountry: 'DE',
      destCountry: 'FR',
    });

    expect(result.ruleScore).toBeLessThan(30);
    expect(result.hasCriticalViolation).toBe(false);
  });

  it('triggers RULE-HIGH-VAL when transaction exceeds $10,000 threshold', () => {
    const result = evaluateDeterministicRules({
      senderAccountId: 'ACC-8001',
      senderCustomerId: 'CUST-1001',
      receiverAccountId: 'ACC-EXT-1002',
      amount: 15500.0,
      currency: 'USD',
      channel: 'WEB',
      type: 'WIRE',
      originCountry: 'US',
      destCountry: 'GB',
    });

    const highValRule = result.triggeredRules.find((r) => r.ruleId === 'RULE-HIGH-VAL');
    expect(highValRule).toBeDefined();
    expect(highValRule?.reason).toContain('exceeds threshold');
    expect(result.ruleScore).toBeGreaterThanOrEqual(25);
  });

  it('triggers RULE-STRUCTURING when amount is between $9,000 and $9,999', () => {
    const result = evaluateDeterministicRules({
      senderAccountId: 'ACC-8001',
      senderCustomerId: 'CUST-1001',
      receiverAccountId: 'ACC-EXT-1003',
      amount: 9850.0,
      currency: 'USD',
      channel: 'WEB',
      type: 'WIRE',
      originCountry: 'US',
      destCountry: 'CA',
    });

    const structuringRule = result.triggeredRules.find((r) => r.ruleId === 'RULE-STRUCTURING');
    expect(structuringRule).toBeDefined();
    expect(structuringRule?.reason).toContain('structuring band');
    expect(result.ruleScore).toBeGreaterThanOrEqual(35);
  });

  it('triggers RULE-HIGH-RISK-GEO and marks critical violation for sanctioned countries', () => {
    const result = evaluateDeterministicRules({
      senderAccountId: 'ACC-8001',
      senderCustomerId: 'CUST-1001',
      receiverAccountId: 'ACC-EXT-1004',
      amount: 2500.0,
      currency: 'USD',
      channel: 'WIRE',
      type: 'WIRE',
      originCountry: 'US',
      destCountry: 'IR',
    });

    const geoRule = result.triggeredRules.find((r) => r.ruleId === 'RULE-HIGH-RISK-GEO');
    expect(geoRule).toBeDefined();
    expect(result.hasCriticalViolation).toBe(true);
    expect(result.ruleScore).toBeGreaterThanOrEqual(40);
  });

  it('triggers RULE-KYC-INCOMPLETE for unverified or expired customers', () => {
    const result = evaluateDeterministicRules({
      senderAccountId: 'ACC-8004', // Viktor Mikhailov (Expired KYC)
      senderCustomerId: 'CUST-1003',
      receiverAccountId: 'ACC-EXT-1005',
      amount: 500.0,
      currency: 'USD',
      channel: 'WEB',
      type: 'ACH',
      originCountry: 'RU',
      destCountry: 'DE',
    });

    const kycRule = result.triggeredRules.find((r) => r.ruleId === 'RULE-KYC-INCOMPLETE');
    expect(kycRule).toBeDefined();
    expect(kycRule?.reason).toContain('EXPIRED');
  });

  it('bounds final aggregated score strictly between 0 and 100', () => {
    // Extreme combination of violations
    const ruleResult = {
      ruleScore: 180, // hypothetical raw accumulation
      triggeredRules: [
        { ruleId: 'R1', ruleName: 'Rule 1', category: 'AML', weight: 40, scoreContribution: 40, reason: 'test' },
        { ruleId: 'R2', ruleName: 'Rule 2', category: 'SANCTIONS', weight: 50, scoreContribution: 50, reason: 'test' },
      ],
      hasCriticalViolation: true,
    };

    const mlResult = {
      available: true,
      status: 'HEALTHY' as const,
      anomalyScore: 0.95,
      isAnomaly: true,
      rawDecisionScore: -0.3,
      modelVersion: 'v1.0.0',
      confidenceNote: 'test',
    };

    const aggregated = aggregateRisk(ruleResult, mlResult);
    expect(aggregated.finalRiskScore).toBeLessThanOrEqual(100);
    expect(aggregated.finalRiskScore).toBeGreaterThanOrEqual(80);
    expect(aggregated.severity).toBe('CRITICAL');
    expect(aggregated.holdRequired).toBe(true);
  });
});
