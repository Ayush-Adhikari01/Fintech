import { query, queryOne } from '../db/connection';
import { Transaction, RiskAssessment } from '../types';

export interface TransactionFilterParams {
  search?: string;
  status?: string;
  riskBand?: string;
  channel?: string;
  type?: string;
  originCountry?: string;
  destCountry?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export function listTransactions(filters: TransactionFilterParams) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(100, filters.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.search) {
    conditions.push('(t.id LIKE ? OR t.sender_account_id LIKE ? OR c.name LIKE ?)');
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }

  if (filters.status) {
    conditions.push('t.status = ?');
    params.push(filters.status);
  }

  if (filters.riskBand) {
    conditions.push('t.risk_band = ?');
    params.push(filters.riskBand);
  }

  if (filters.channel) {
    conditions.push('t.channel = ?');
    params.push(filters.channel);
  }

  if (filters.type) {
    conditions.push('t.type = ?');
    params.push(filters.type);
  }

  if (filters.originCountry) {
    conditions.push('t.origin_country = ?');
    params.push(filters.originCountry.toUpperCase());
  }

  if (filters.destCountry) {
    conditions.push('t.dest_country = ?');
    params.push(filters.destCountry.toUpperCase());
  }

  if (filters.minAmount !== undefined) {
    conditions.push('t.amount >= ?');
    params.push(filters.minAmount);
  }

  if (filters.maxAmount !== undefined) {
    conditions.push('t.amount <= ?');
    params.push(filters.maxAmount);
  }

  if (filters.startDate) {
    conditions.push('t.created_at >= ?');
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    conditions.push('t.created_at <= ?');
    params.push(filters.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `
    SELECT COUNT(*) as total 
    FROM transactions t 
    LEFT JOIN customers c ON t.sender_customer_id = c.id 
    ${whereClause};
  `;
  const countRow = queryOne<{ total: number }>(countQuery, ...params);
  const total = countRow?.total || 0;

  const dataQuery = `
    SELECT 
      t.*, 
      c.name as customer_name, 
      c.kyc_status as customer_kyc_status,
      cp.name as counterparty_name,
      cp.risk_level as counterparty_risk_level,
      ra.rule_score,
      ra.ml_anomaly_score,
      ra.ml_is_anomaly,
      ra.ml_service_status,
      ra.explanation,
      ra.recommended_action
    FROM transactions t 
    LEFT JOIN customers c ON t.sender_customer_id = c.id 
    LEFT JOIN counterparties cp ON t.counterparty_id = cp.id 
    LEFT JOIN risk_assessments ra ON t.id = ra.transaction_id
    ${whereClause} 
    ORDER BY t.created_at DESC 
    LIMIT ? OFFSET ?;
  `;
  const rows = query(dataQuery, ...params, limit, offset);

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

export function getTransactionDetail(id: string) {
  const transaction = queryOne<Transaction>(
    `SELECT t.*, 
            c.name as customer_name, c.kyc_status, c.country as customer_country, c.type as customer_type,
            cp.name as counterparty_name, cp.country as counterparty_country, cp.risk_level as counterparty_risk_level
     FROM transactions t
     LEFT JOIN customers c ON t.sender_customer_id = c.id
     LEFT JOIN counterparties cp ON t.counterparty_id = cp.id
     WHERE t.id = ?;`,
    id
  );

  if (!transaction) return null;

  const assessment = queryOne<RiskAssessment>(
    'SELECT * FROM risk_assessments WHERE transaction_id = ?;',
    id
  );

  let triggeredRules = [];
  if (assessment?.triggered_rules_json) {
    try {
      triggeredRules = JSON.parse(assessment.triggered_rules_json);
    } catch {
      triggeredRules = [];
    }
  }

  const linkedAlerts = query(
    'SELECT * FROM alerts WHERE transaction_id = ? ORDER BY created_at DESC;',
    id
  );

  const relatedAccountTransactions = query(
    'SELECT * FROM transactions WHERE sender_account_id = ? AND id != ? ORDER BY created_at DESC LIMIT 5;',
    transaction.sender_account_id,
    id
  );

  return {
    transaction,
    assessment: assessment ? { ...assessment, triggered_rules: triggeredRules } : null,
    alerts: linkedAlerts,
    relatedTransactions: relatedAccountTransactions,
  };
}
