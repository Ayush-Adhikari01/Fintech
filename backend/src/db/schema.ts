import { exec, queryOne, execute } from './connection';

export function runMigrations(): void {
  // Table for schema migrations tracking
  exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const migration1 = queryOne<{ version: number }>(
    'SELECT version FROM schema_migrations WHERE version = 1;'
  );

  if (!migration1) {
    exec(`
      -- 1. Customers
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('INDIVIDUAL', 'CORPORATE', 'SME')),
        country TEXT NOT NULL,
        kyc_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(kyc_status IN ('VERIFIED', 'PENDING', 'EXPIRED', 'REJECTED')),
        risk_rating TEXT NOT NULL DEFAULT 'LOW' CHECK(risk_rating IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        occupation_or_industry TEXT,
        monthly_expected_turnover REAL NOT NULL DEFAULT 10000.0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- 2. Accounts
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        currency TEXT NOT NULL DEFAULT 'USD',
        balance REAL NOT NULL DEFAULT 0.0,
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'FROZEN', 'SUSPENDED', 'CLOSED')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- 3. Counterparties
      CREATE TABLE IF NOT EXISTS counterparties (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        country TEXT NOT NULL,
        risk_level TEXT NOT NULL DEFAULT 'LOW' CHECK(risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        institution_type TEXT NOT NULL CHECK(institution_type IN ('BANK', 'FINTECH', 'CORP', 'EXCHANGE')),
        is_sanctioned_proxy INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      -- 4. Transactions
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        sender_account_id TEXT NOT NULL REFERENCES accounts(id),
        sender_customer_id TEXT NOT NULL REFERENCES customers(id),
        receiver_account_id TEXT NOT NULL,
        receiver_customer_id TEXT,
        counterparty_id TEXT REFERENCES counterparties(id),
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        channel TEXT NOT NULL CHECK(channel IN ('WEB', 'MOBILE', 'API', 'SWIFT', 'ATM')),
        type TEXT NOT NULL CHECK(type IN ('WIRE', 'ACH', 'INSTANT', 'INTERNAL', 'CROSS_BORDER')),
        origin_country TEXT NOT NULL,
        dest_country TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED', 'HELD', 'BLOCKED', 'FLAGGED', 'PENDING')),
        risk_score REAL NOT NULL DEFAULT 0.0,
        risk_band TEXT NOT NULL DEFAULT 'LOW' CHECK(risk_band IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        created_at TEXT NOT NULL
      );

      -- 5. Risk Rules
      CREATE TABLE IF NOT EXISTS risk_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        weight REAL NOT NULL,
        threshold_value REAL,
        is_enabled INTEGER NOT NULL DEFAULT 1,
        severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        description TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- 6. Risk Assessments
      CREATE TABLE IF NOT EXISTS risk_assessments (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
        rule_score REAL NOT NULL,
        ml_anomaly_score REAL,
        ml_is_anomaly INTEGER NOT NULL DEFAULT 0,
        ml_service_status TEXT NOT NULL DEFAULT 'HEALTHY',
        final_risk_score REAL NOT NULL,
        severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        triggered_rules_json TEXT NOT NULL,
        explanation TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      -- 7. Alerts
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        transaction_id TEXT REFERENCES transactions(id),
        customer_id TEXT REFERENCES customers(id),
        account_id TEXT REFERENCES accounts(id),
        category TEXT NOT NULL,
        severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        risk_score REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'FALSE_POSITIVE')),
        assigned_to TEXT,
        trigger_reason TEXT NOT NULL,
        triggered_rules_json TEXT,
        ml_anomaly_data_json TEXT,
        resolution_reason TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- 8. Investigation Notes
      CREATE TABLE IF NOT EXISTS investigation_notes (
        id TEXT PRIMARY KEY,
        alert_id TEXT NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
        author TEXT NOT NULL,
        note TEXT NOT NULL,
        action_taken TEXT,
        created_at TEXT NOT NULL
      );

      -- 9. Synthetic Watchlist
      CREATE TABLE IF NOT EXISTS synthetic_watchlist (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL CHECK(entity_type IN ('INDIVIDUAL', 'ENTITY', 'VESSEL')),
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        country TEXT NOT NULL,
        regime TEXT NOT NULL,
        program TEXT NOT NULL,
        remarks TEXT,
        created_at TEXT NOT NULL
      );

      -- 10. Screening Results
      CREATE TABLE IF NOT EXISTS screening_results (
        id TEXT PRIMARY KEY,
        target_type TEXT NOT NULL CHECK(target_type IN ('CUSTOMER', 'COUNTERPARTY', 'AD_HOC')),
        target_id TEXT,
        query_name TEXT NOT NULL,
        matched_entity_id TEXT REFERENCES synthetic_watchlist(id),
        match_score REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'POTENTIAL_MATCH' CHECK(status IN ('POTENTIAL_MATCH', 'CLEARED', 'ESCALATED')),
        notes TEXT,
        screened_by TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      -- 11. Stress Test Scenarios
      CREATE TABLE IF NOT EXISTS stress_test_scenarios (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        parameters_json TEXT NOT NULL,
        baseline_metrics_json TEXT NOT NULL,
        projected_metrics_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      -- 12. Audit Events (Append-only)
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        actor TEXT NOT NULL,
        event_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        previous_state_json TEXT,
        new_state_json TEXT,
        reason TEXT,
        correlation_id TEXT,
        created_at TEXT NOT NULL
      );

      -- Indexes for performance & quick filtering
      CREATE INDEX IF NOT EXISTS idx_tx_sender_acc ON transactions(sender_account_id);
      CREATE INDEX IF NOT EXISTS idx_tx_customer ON transactions(sender_customer_id);
      CREATE INDEX IF NOT EXISTS idx_tx_counterparty ON transactions(counterparty_id);
      CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);
      CREATE INDEX IF NOT EXISTS idx_tx_risk_band ON transactions(risk_band);
      CREATE INDEX IF NOT EXISTS idx_tx_created_at ON transactions(created_at);
      CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
      CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
      CREATE INDEX IF NOT EXISTS idx_alerts_tx ON alerts(transaction_id);
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_watchlist_norm ON synthetic_watchlist(normalized_name);
    `);

    execute(
      'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
      1,
      'initial_schema',
      new Date().toISOString()
    );
  }
}
