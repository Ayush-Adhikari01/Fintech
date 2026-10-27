import { execute, query, queryOne, transaction } from '../db/connection';
import { Customer, Account, KYCStatus, RiskSeverity } from '../types';

export interface CustomerFilterParams {
  search?: string;
  kycStatus?: string;
  riskRating?: string;
  type?: string;
  country?: string;
  page?: number;
  limit?: number;
}

export function listCustomers(filters: CustomerFilterParams) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(100, filters.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.search) {
    conditions.push('(c.id LIKE ? OR c.name LIKE ? OR c.occupation_or_industry LIKE ?)');
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }

  if (filters.kycStatus && filters.kycStatus !== 'ALL') {
    conditions.push('c.kyc_status = ?');
    params.push(filters.kycStatus);
  }

  if (filters.riskRating && filters.riskRating !== 'ALL') {
    conditions.push('c.risk_rating = ?');
    params.push(filters.riskRating);
  }

  if (filters.type && filters.type !== 'ALL') {
    conditions.push('c.type = ?');
    params.push(filters.type);
  }

  if (filters.country) {
    conditions.push('c.country = ?');
    params.push(filters.country.toUpperCase());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = queryOne<{ total: number }>(`
    SELECT COUNT(*) as total FROM customers c ${whereClause};
  `, ...params);
  const total = countRow?.total || 0;

  const rows = query(`
    SELECT 
      c.*,
      COUNT(DISTINCT a.id) as accounts_count,
      COALESCE(SUM(a.balance), 0) as total_balance,
      (SELECT COUNT(*) FROM alerts al WHERE al.customer_id = c.id AND al.status IN ('NEW', 'UNDER_REVIEW', 'ESCALATED')) as open_alerts_count,
      (SELECT COUNT(*) FROM transactions t WHERE t.sender_customer_id = c.id) as total_transactions_count
    FROM customers c
    LEFT JOIN accounts a ON a.customer_id = c.id
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.created_at DESC
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

export function getCustomerDetail(id: string) {
  const customer = queryOne<Customer>('SELECT * FROM customers WHERE id = ?;', id);
  if (!customer) return null;

  const accounts = query<Account>('SELECT * FROM accounts WHERE customer_id = ?;', id);
  const recentTransactions = query(
    'SELECT * FROM transactions WHERE sender_customer_id = ? ORDER BY created_at DESC LIMIT 10;',
    id
  );
  const alerts = query(
    'SELECT * FROM alerts WHERE customer_id = ? ORDER BY created_at DESC;',
    id
  );

  return {
    customer,
    accounts,
    recentTransactions,
    alerts,
  };
}

export function updateCustomer(
  id: string,
  updates: { kyc_status?: KYCStatus; risk_rating?: RiskSeverity; monthly_expected_turnover?: number },
  actor: string = 'compliance.officer@sentinel.internal'
) {
  const existing = queryOne<Customer>('SELECT * FROM customers WHERE id = ?;', id);
  if (!existing) {
    throw new Error(`Customer ${id} not found.`);
  }

  const nowIso = new Date().toISOString();
  const kycStatus = updates.kyc_status || existing.kyc_status;
  const riskRating = updates.risk_rating || existing.risk_rating;
  const turnover = updates.monthly_expected_turnover !== undefined ? updates.monthly_expected_turnover : existing.monthly_expected_turnover;

  transaction(() => {
    execute(
      `UPDATE customers 
       SET kyc_status = ?, risk_rating = ?, monthly_expected_turnover = ?, updated_at = ? 
       WHERE id = ?;`,
      kycStatus,
      riskRating,
      turnover,
      nowIso,
      id
    );

    const auditId = `AUD-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
    execute(
      `INSERT INTO audit_events (id, actor, event_type, entity_type, entity_id, action, previous_state_json, new_state_json, reason, correlation_id, created_at)
       VALUES (?, ?, 'CUSTOMER_UPDATE', 'CUSTOMER', ?, 'UPDATE_KYC_RISK', ?, ?, 'Simulated customer KYC / risk update', ?, ?);`,
      auditId,
      actor,
      id,
      JSON.stringify({ kyc_status: existing.kyc_status, risk_rating: existing.risk_rating, turnover: existing.monthly_expected_turnover }),
      JSON.stringify({ kyc_status: kycStatus, risk_rating: riskRating, turnover }),
      `CORR-CUST-${id}`,
      nowIso
    );
  });

  return getCustomerDetail(id);
}

export function createCustomer(
  input: {
    name: string;
    type: 'INDIVIDUAL' | 'CORPORATE' | 'SME';
    country: string;
    kyc_status?: KYCStatus;
    risk_rating?: RiskSeverity;
    occupation_or_industry: string;
    monthly_expected_turnover?: number;
    initial_account_currency?: string;
    initial_account_balance?: number;
  },
  actor: string = 'compliance.officer@sentinel.internal'
) {
  const custId = `CUST-${Math.floor(2000 + Math.random() * 8000)}`;
  const accId = `ACC-${Math.floor(8100 + Math.random() * 900)}`;
  const nowIso = new Date().toISOString();

  const kyc = input.kyc_status || 'PENDING';
  const risk = input.risk_rating || 'LOW';
  const turnover = input.monthly_expected_turnover || 15000.0;
  const currency = input.initial_account_currency || 'USD';
  const balance = input.initial_account_balance || 10000.0;

  transaction(() => {
    execute(
      `INSERT INTO customers (id, name, type, country, kyc_status, risk_rating, occupation_or_industry, monthly_expected_turnover, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      custId,
      input.name,
      input.type,
      input.country.toUpperCase(),
      kyc,
      risk,
      input.occupation_or_industry,
      turnover,
      nowIso,
      nowIso
    );

    execute(
      `INSERT INTO accounts (id, customer_id, currency, balance, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?);`,
      accId,
      custId,
      currency,
      balance,
      nowIso,
      nowIso
    );

    const auditId = `AUD-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
    execute(
      `INSERT INTO audit_events (id, actor, event_type, entity_type, entity_id, action, reason, correlation_id, created_at)
       VALUES (?, ?, 'CUSTOMER_CREATE', 'CUSTOMER', ?, 'CREATE_CUSTOMER', 'Customer onboarded into prototype environment', ?, ?);`,
      auditId,
      actor,
      custId,
      `CORR-CUST-${custId}`,
      nowIso
    );
  });

  return getCustomerDetail(custId);
}
