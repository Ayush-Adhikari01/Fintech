import { execute, query, queryOne, transaction } from '../db/connection';
import { Counterparty } from '../types';

export interface StressTestInput {
  name: string;
  description?: string;
  volume_increase_pct: number; // e.g. 50%
  high_value_freq_multiplier: number; // e.g. 2x
  high_risk_geo_pct: number; // e.g. 15%
  suspicious_pattern_multiplier: number; // e.g. 3x
  counterparty_default_id?: string | null;
}

export function executeStressTestScenario(input: StressTestInput) {
  // 1. Gather baseline metrics strictly from current persisted database
  const baselineStats = queryOne<{ total_tx: number; total_value: number }>(`
    SELECT COUNT(*) as total_tx, COALESCE(SUM(amount), 0) as total_value FROM transactions;
  `) || { total_tx: 0, total_value: 0 };

  const baselineRiskBands = query<{ risk_band: string; count: number }>(`
    SELECT risk_band, COUNT(*) as count FROM transactions GROUP BY risk_band;
  `);

  const baselineAlerts = queryOne<{ total: number }>(`
    SELECT COUNT(*) as total FROM alerts;
  `)?.total || 0;

  const baselineLow = baselineRiskBands.find((r) => r.risk_band === 'LOW')?.count || 0;
  const baselineMedium = baselineRiskBands.find((r) => r.risk_band === 'MEDIUM')?.count || 0;
  const baselineHigh = baselineRiskBands.find((r) => r.risk_band === 'HIGH')?.count || 0;
  const baselineCritical = baselineRiskBands.find((r) => r.risk_band === 'CRITICAL')?.count || 0;

  // 2. Deterministic Scenario Projection
  const volumeMultiplier = 1 + input.volume_increase_pct / 100;
  const projectedTx = Math.round(baselineStats.total_tx * volumeMultiplier);
  const projectedValue = Math.round(baselineStats.total_value * volumeMultiplier * (input.high_value_freq_multiplier * 0.4 + 0.6));

  // Shift in risk bands:
  // Suspicious pattern and high risk geo increase high and critical counts
  const riskShiftFactor = (input.suspicious_pattern_multiplier * 0.3 + (input.high_risk_geo_pct / 100) * 0.7);
  const projectedCritical = Math.round(baselineCritical * volumeMultiplier * Math.max(1, input.suspicious_pattern_multiplier * 0.8));
  const projectedHigh = Math.round(baselineHigh * volumeMultiplier * Math.max(1, input.suspicious_pattern_multiplier * 0.6));
  const projectedMedium = Math.round(baselineMedium * volumeMultiplier * (1 + riskShiftFactor * 0.5));
  const projectedLow = Math.max(0, projectedTx - (projectedCritical + projectedHigh + projectedMedium));

  const projectedAlerts = Math.round(baselineAlerts * volumeMultiplier * (input.suspicious_pattern_multiplier * 0.7 + 0.3));

  // Counterparty default shock analysis
  let defaultShockAnalysis = null;
  if (input.counterparty_default_id) {
    const defaultCpty = queryOne<Counterparty>(
      'SELECT * FROM counterparties WHERE id = ?;',
      input.counterparty_default_id
    );
    const cptyExposureRow = queryOne<{ volume: number; tx_count: number }>(
      'SELECT COALESCE(SUM(amount), 0) as volume, COUNT(*) as tx_count FROM transactions WHERE counterparty_id = ?;',
      input.counterparty_default_id
    );
    if (defaultCpty && cptyExposureRow) {
      defaultShockAnalysis = {
        counterpartyId: defaultCpty.id,
        name: defaultCpty.name,
        country: defaultCpty.country,
        riskLevel: defaultCpty.risk_level,
        simulatedTrappedTurnover: Math.round(cptyExposureRow.volume * 100) / 100,
        affectedTransactionsCount: cptyExposureRow.tx_count,
        capitalImpactScore: Math.min(100, Math.round((cptyExposureRow.volume / Math.max(baselineStats.total_value, 1)) * 400)),
      };
    }
  }

  const baselineMetrics = {
    totalTransactions: baselineStats.total_tx,
    totalVolumeValue: Math.round(baselineStats.total_value * 100) / 100,
    totalAlerts: baselineAlerts,
    riskDistribution: {
      low: baselineLow,
      medium: baselineMedium,
      high: baselineHigh,
      critical: baselineCritical,
    },
  };

  const projectedMetrics = {
    totalTransactions: projectedTx,
    totalVolumeValue: Math.round(projectedValue * 100) / 100,
    totalAlerts: projectedAlerts,
    riskDistribution: {
      low: projectedLow,
      medium: projectedMedium,
      high: projectedHigh,
      critical: projectedCritical,
    },
    defaultShock: defaultShockAnalysis,
    delta: {
      txChangePct: Math.round(((projectedTx - baselineStats.total_tx) / Math.max(baselineStats.total_tx, 1)) * 100),
      valueChangePct: Math.round(((projectedValue - baselineStats.total_value) / Math.max(baselineStats.total_value, 1)) * 100),
      alertsChangePct: Math.round(((projectedAlerts - baselineAlerts) / Math.max(baselineAlerts, 1)) * 100),
      criticalRiskChangePct: Math.round(((projectedCritical - baselineCritical) / Math.max(baselineCritical, 1)) * 100),
    },
  };

  const scenarioId = `SCEN-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
  const nowIso = new Date().toISOString();

  transaction(() => {
    execute(
      `INSERT INTO stress_test_scenarios (id, name, description, parameters_json, baseline_metrics_json, projected_metrics_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      scenarioId,
      input.name,
      input.description || `Stress test: ${input.volume_increase_pct}% volume, ${input.suspicious_pattern_multiplier}x suspicious multiplier`,
      JSON.stringify(input),
      JSON.stringify(baselineMetrics),
      JSON.stringify(projectedMetrics),
      nowIso
    );

    const auditId = `AUD-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
    execute(
      `INSERT INTO audit_events (id, actor, event_type, entity_type, entity_id, action, reason, correlation_id, created_at)
       VALUES (?, 'risk.analyst@sentinel.internal', 'STRESS_TEST_EXECUTE', 'STRESS_SCENARIO', ?, 'RUN_SIMULATION', ?, ?, ?);`,
      auditId,
      scenarioId,
      `Executed scenario "${input.name}" with ${input.volume_increase_pct}% volume shock`,
      `CORR-SCEN-${scenarioId}`,
      nowIso
    );
  });

  return {
    id: scenarioId,
    name: input.name,
    parameters: input,
    baseline: baselineMetrics,
    projected: projectedMetrics,
    created_at: nowIso,
  };
}

export function listStressScenarios() {
  const rows = query('SELECT * FROM stress_test_scenarios ORDER BY created_at DESC LIMIT 20;');
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    parameters: JSON.parse(r.parameters_json),
    baseline: JSON.parse(r.baseline_metrics_json),
    projected: JSON.parse(r.projected_metrics_json),
    created_at: r.created_at,
  }));
}
