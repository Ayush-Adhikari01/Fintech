import { execute, query, queryOne, transaction } from '../db/connection';
import { Alert, AlertStatus, InvestigationNote, RiskSeverity } from '../types';

export interface AlertFilterParams {
  status?: string;
  severity?: string;
  category?: string;
  assignedTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function listAlerts(filters: AlertFilterParams) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(100, filters.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.search) {
    conditions.push('(a.id LIKE ? OR a.transaction_id LIKE ? OR c.name LIKE ?)');
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }

  if (filters.status && filters.status !== 'ALL') {
    conditions.push('a.status = ?');
    params.push(filters.status);
  }

  if (filters.severity && filters.severity !== 'ALL') {
    conditions.push('a.severity = ?');
    params.push(filters.severity);
  }

  if (filters.category && filters.category !== 'ALL') {
    conditions.push('a.category = ?');
    params.push(filters.category);
  }

  if (filters.assignedTo) {
    conditions.push('a.assigned_to = ?');
    params.push(filters.assignedTo);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = queryOne<{ total: number }>(`
    SELECT COUNT(*) as total 
    FROM alerts a 
    LEFT JOIN customers c ON a.customer_id = c.id 
    ${whereClause};
  `, ...params);
  const total = countRow?.total || 0;

  const rows = query(`
    SELECT 
      a.*, 
      c.name as customer_name,
      c.country as customer_country,
      t.amount as transaction_amount,
      t.currency as transaction_currency,
      t.channel as transaction_channel
    FROM alerts a 
    LEFT JOIN customers c ON a.customer_id = c.id 
    LEFT JOIN transactions t ON a.transaction_id = t.id 
    ${whereClause} 
    ORDER BY a.created_at DESC 
    LIMIT ? OFFSET ?;
  `, ...params, limit, offset);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function getAlertDetail(id: string) {
  const alert = queryOne<Alert>(`
    SELECT a.*, 
           c.name as customer_name, c.kyc_status as customer_kyc, c.country as customer_country,
           t.amount, t.currency, t.channel, t.origin_country, t.dest_country, t.status as tx_status,
           t.sender_account_id, t.receiver_account_id
    FROM alerts a
    LEFT JOIN customers c ON a.customer_id = c.id
    LEFT JOIN transactions t ON a.transaction_id = t.id
    WHERE a.id = ?;
  `, id);

  if (!alert) return null;

  const notes = query<InvestigationNote>(
    'SELECT * FROM investigation_notes WHERE alert_id = ? ORDER BY created_at ASC;',
    id
  );

  let triggeredRules = [];
  if (alert.triggered_rules_json) {
    try {
      triggeredRules = JSON.parse(alert.triggered_rules_json);
    } catch {
      triggeredRules = [];
    }
  }

  let mlAnomalyData = null;
  if (alert.ml_anomaly_data_json) {
    try {
      mlAnomalyData = JSON.parse(alert.ml_anomaly_data_json);
    } catch {
      mlAnomalyData = null;
    }
  }

  return {
    alert: {
      ...alert,
      triggered_rules: triggeredRules,
      ml_anomaly_data: mlAnomalyData,
    },
    notes,
  };
}

export function updateAlertStatus(
  alertId: string,
  newStatus: AlertStatus,
  reason: string,
  actor: string = 'analyst.reviewer@sentinel.internal',
  note?: string | null
) {
  const existingAlert = queryOne<Alert>('SELECT * FROM alerts WHERE id = ?;', alertId);
  if (!existingAlert) {
    throw new Error(`Alert ${alertId} not found.`);
  }

  const nowIso = new Date().toISOString();

  transaction(() => {
    // 1. Update Alert status
    execute(
      `UPDATE alerts 
       SET status = ?, resolution_reason = ?, updated_at = ? 
       WHERE id = ?;`,
      newStatus,
      reason,
      nowIso,
      alertId
    );

    // 2. Add Investigation Note
    const noteId = `NOTE-${alertId}-${Date.now().toString(36)}`;
    const fullNote = note ? `${note} (Reason: ${reason})` : `Status updated to ${newStatus}. Reason: ${reason}`;
    execute(
      `INSERT INTO investigation_notes (id, alert_id, author, note, action_taken, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      noteId,
      alertId,
      actor,
      fullNote,
      newStatus,
      nowIso
    );

    // 3. Record Audit Event
    const auditId = `AUD-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
    execute(
      `INSERT INTO audit_events (id, actor, event_type, entity_type, entity_id, action, previous_state_json, new_state_json, reason, correlation_id, created_at)
       VALUES (?, ?, 'ALERT_STATUS_CHANGE', 'ALERT', ?, ?, ?, ?, ?, ?, ?);`,
      auditId,
      actor,
      alertId,
      `TRANSITION_TO_${newStatus}`,
      JSON.stringify({ status: existingAlert.status }),
      JSON.stringify({ status: newStatus }),
      reason,
      `CORR-${alertId}`,
      nowIso
    );
  });

  return getAlertDetail(alertId);
}

export function assignAlert(
  alertId: string,
  assignee: string,
  actor: string = 'compliance.lead@sentinel.internal'
) {
  const existingAlert = queryOne<Alert>('SELECT * FROM alerts WHERE id = ?;', alertId);
  if (!existingAlert) {
    throw new Error(`Alert ${alertId} not found.`);
  }

  const nowIso = new Date().toISOString();

  transaction(() => {
    execute(
      `UPDATE alerts SET assigned_to = ?, updated_at = ? WHERE id = ?;`,
      assignee,
      nowIso,
      alertId
    );

    const noteId = `NOTE-${alertId}-${Date.now().toString(36)}`;
    execute(
      `INSERT INTO investigation_notes (id, alert_id, author, note, action_taken, created_at)
       VALUES (?, ?, ?, ?, 'ASSIGNMENT', ?);`,
      noteId,
      alertId,
      actor,
      `Case assigned to reviewer: ${assignee}`,
      nowIso
    );

    const auditId = `AUD-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
    execute(
      `INSERT INTO audit_events (id, actor, event_type, entity_type, entity_id, action, previous_state_json, new_state_json, reason, correlation_id, created_at)
       VALUES (?, ?, 'ALERT_ASSIGN', 'ALERT', ?, 'ASSIGN_REVIEWER', ?, ?, 'Reviewer assignment', ?, ?);`,
      auditId,
      actor,
      alertId,
      JSON.stringify({ assigned_to: existingAlert.assigned_to }),
      JSON.stringify({ assigned_to: assignee }),
      `CORR-${alertId}`,
      nowIso
    );
  });

  return getAlertDetail(alertId);
}

export function addAlertNote(
  alertId: string,
  noteText: string,
  author: string = 'analyst.reviewer@sentinel.internal'
) {
  const existingAlert = queryOne<Alert>('SELECT * FROM alerts WHERE id = ?;', alertId);
  if (!existingAlert) {
    throw new Error(`Alert ${alertId} not found.`);
  }

  const nowIso = new Date().toISOString();
  const noteId = `NOTE-${alertId}-${Date.now().toString(36)}`;

  execute(
    `INSERT INTO investigation_notes (id, alert_id, author, note, action_taken, created_at)
     VALUES (?, ?, ?, ?, 'INVESTIGATION_NOTE', ?);`,
    noteId,
    alertId,
    author,
    noteText,
    nowIso
  );

  return getAlertDetail(alertId);
}
