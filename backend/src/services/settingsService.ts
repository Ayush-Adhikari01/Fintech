import { execute, query, queryOne, transaction } from '../db/connection';
import { RiskRule, RiskSeverity } from '../types';
import { seedDatabase } from '../db/seed';

export function listRules(): RiskRule[] {
  return query<RiskRule>('SELECT * FROM risk_rules ORDER BY weight DESC;');
}

export function updateRuleConfig(
  ruleId: string,
  updates: {
    weight?: number;
    threshold_value?: number | null;
    is_enabled?: boolean;
    severity?: RiskSeverity;
  },
  actor: string = 'compliance.admin@sentinel.internal'
): RiskRule {
  const existing = queryOne<RiskRule>('SELECT * FROM risk_rules WHERE id = ?;', ruleId);
  if (!existing) {
    throw new Error(`Rule ${ruleId} not found.`);
  }

  // Range validation
  if (updates.weight !== undefined && (updates.weight < 0 || updates.weight > 100)) {
    throw new Error('Rule weight must be between 0 and 100.');
  }

  if (updates.threshold_value !== undefined && updates.threshold_value !== null && updates.threshold_value < 0) {
    throw new Error('Threshold value must be a non-negative number.');
  }

  const weight = updates.weight !== undefined ? updates.weight : existing.weight;
  const threshold = updates.threshold_value !== undefined ? updates.threshold_value : existing.threshold_value;
  const isEnabled = updates.is_enabled !== undefined ? (updates.is_enabled ? 1 : 0) : existing.is_enabled;
  const severity = updates.severity || existing.severity;
  const nowIso = new Date().toISOString();

  transaction(() => {
    execute(
      `UPDATE risk_rules 
       SET weight = ?, threshold_value = ?, is_enabled = ?, severity = ?, updated_at = ? 
       WHERE id = ?;`,
      weight,
      threshold,
      isEnabled,
      severity,
      nowIso,
      ruleId
    );

    const auditId = `AUD-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
    execute(
      `INSERT INTO audit_events (id, actor, event_type, entity_type, entity_id, action, previous_state_json, new_state_json, reason, correlation_id, created_at)
       VALUES (?, ?, 'RULE_CONFIG_CHANGE', 'RISK_RULE', ?, 'UPDATE_RULE', ?, ?, 'Admin compliance rule reconfiguration', ?, ?);`,
      auditId,
      actor,
      ruleId,
      JSON.stringify(existing),
      JSON.stringify({ weight, threshold_value: threshold, is_enabled: isEnabled, severity }),
      `CORR-RULE-${ruleId}`,
      nowIso
    );
  });

  return queryOne<RiskRule>('SELECT * FROM risk_rules WHERE id = ?;', ruleId)!;
}

export function resetDemoDataset(actor: string = 'demo.operator@sentinel.internal') {
  seedDatabase(true);

  const nowIso = new Date().toISOString();
  const auditId = `AUD-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
  execute(
    `INSERT INTO audit_events (id, actor, event_type, entity_type, entity_id, action, reason, correlation_id, created_at)
     VALUES (?, ?, 'DEMO_DATA_RESET', 'DATABASE', 'MAIN_DB', 'RESET_BASELINE_SEED', 'Restored known baseline demonstration state', ?, ?);`,
    auditId,
    actor,
    `CORR-RESET-${Date.now()}`,
    nowIso
  );

  return {
    success: true,
    message: 'Baseline synthetic demonstration data successfully restored.',
    timestamp: nowIso,
  };
}
