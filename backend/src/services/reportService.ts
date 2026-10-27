import { query, queryOne } from '../db/connection';

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(headers: string[], rows: any[][], metadataTitle: string): string {
  const timestamp = new Date().toISOString();
  const metaLines = [
    `# REGTECH SENTINEL - COMPLIANCE & RISK INTELLIGENCE REPORT`,
    `# Report Title: ${metadataTitle}`,
    `# Generated At: ${timestamp}`,
    `# Environment: Prototype Demonstration Mode (Simulated Synthetic Data)`,
    `# Disclaimer: Fictional benchmark records for hackathon demonstration. Not valid for actual regulatory submission.`,
    ``,
  ];

  const headerLine = headers.map(escapeCsvField).join(',');
  const rowLines = rows.map((r) => r.map(escapeCsvField).join(','));

  return [...metaLines, headerLine, ...rowLines].join('\r\n');
}

export function generateReport(type: string, options: { startDate?: string; endDate?: string; filter?: string }) {
  const startDate = options.startDate || '1970-01-01';
  const endDate = options.endDate || '2099-12-31';

  switch (type.toUpperCase()) {
    case 'TRANSACTIONS': {
      const data = query(`
        SELECT 
          t.id, t.created_at, t.sender_account_id, c.name as customer_name,
          t.amount, t.currency, t.channel, t.type, t.origin_country, t.dest_country,
          t.status, t.risk_score, t.risk_band,
          ra.rule_score, ra.ml_anomaly_score, ra.ml_is_anomaly, ra.explanation
        FROM transactions t
        LEFT JOIN customers c ON t.sender_customer_id = c.id
        LEFT JOIN risk_assessments ra ON t.id = ra.transaction_id
        WHERE t.created_at >= ? AND t.created_at <= ?
        ORDER BY t.created_at DESC;
      `, startDate, endDate);

      const headers = [
        'Transaction ID', 'Timestamp', 'Sender Account', 'Customer Name',
        'Amount', 'Currency', 'Channel', 'Type', 'Origin Country', 'Dest Country',
        'Status', 'Risk Score', 'Risk Band', 'Rule Score', 'ML Anomaly Score', 'ML Anomaly Flag', 'Risk Explanation'
      ];

      const rows = data.map((d: any) => [
        d.id, d.created_at, d.sender_account_id, d.customer_name,
        d.amount, d.currency, d.channel, d.type, d.origin_country, d.dest_country,
        d.status, d.risk_score, d.risk_band, d.rule_score, d.ml_anomaly_score, d.ml_is_anomaly, d.explanation
      ]);

      return {
        type: 'TRANSACTIONS',
        title: 'Transaction Monitoring & Risk Assessment Audit Report',
        totalRecords: rows.length,
        csv: buildCsv(headers, rows, 'Transaction Monitoring & Risk Assessment Audit Report'),
      };
    }

    case 'ALERTS': {
      const data = query(`
        SELECT 
          a.id, a.created_at, a.transaction_id, a.category, a.severity,
          a.risk_score, a.status, a.assigned_to, a.trigger_reason, a.resolution_reason,
          c.name as customer_name
        FROM alerts a
        LEFT JOIN customers c ON a.customer_id = c.id
        WHERE a.created_at >= ? AND a.created_at <= ?
        ORDER BY a.created_at DESC;
      `, startDate, endDate);

      const headers = [
        'Alert ID', 'Created At', 'Transaction ID', 'Customer Name',
        'Category', 'Severity', 'Risk Score', 'Status', 'Assigned To', 'Trigger Reason', 'Resolution Reason'
      ];

      const rows = data.map((d: any) => [
        d.id, d.created_at, d.transaction_id, d.customer_name,
        d.category, d.severity, d.risk_score, d.status, d.assigned_to, d.trigger_reason, d.resolution_reason
      ]);

      return {
        type: 'ALERTS',
        title: 'Case Investigation & Alert Resolution Summary',
        totalRecords: rows.length,
        csv: buildCsv(headers, rows, 'Case Investigation & Alert Resolution Summary'),
      };
    }

    case 'KYC': {
      const data = query(`
        SELECT 
          c.id, c.name, c.type, c.country, c.kyc_status, c.risk_rating,
          c.occupation_or_industry, c.monthly_expected_turnover, c.created_at,
          COUNT(DISTINCT a.id) as accounts_count,
          COALESCE(SUM(a.balance), 0) as total_balance
        FROM customers c
        LEFT JOIN accounts a ON a.customer_id = c.id
        GROUP BY c.id
        ORDER BY c.created_at DESC;
      `);

      const headers = [
        'Customer ID', 'Full Name', 'Customer Type', 'Country', 'KYC Status', 'Risk Rating',
        'Industry/Occupation', 'Expected Monthly Turnover', 'Created At', 'Active Accounts', 'Total Balance'
      ];

      const rows = data.map((d: any) => [
        d.id, d.name, d.type, d.country, d.kyc_status, d.risk_rating,
        d.occupation_or_industry, d.monthly_expected_turnover, d.created_at, d.accounts_count, d.total_balance
      ]);

      return {
        type: 'KYC',
        title: 'Customer Directory & KYC Due Diligence Register',
        totalRecords: rows.length,
        csv: buildCsv(headers, rows, 'Customer Directory & KYC Due Diligence Register'),
      };
    }

    case 'COUNTERPARTIES': {
      const data = query(`
        SELECT 
          c.id, c.name, c.country, c.risk_level, c.institution_type, c.is_sanctioned_proxy,
          COUNT(t.id) as tx_count,
          ROUND(COALESCE(SUM(t.amount), 0), 2) as volume_exposure
        FROM counterparties c
        LEFT JOIN transactions t ON t.counterparty_id = c.id
        GROUP BY c.id
        ORDER BY volume_exposure DESC;
      `);

      const headers = [
        'Counterparty ID', 'Entity Name', 'Country', 'Risk Level', 'Institution Type',
        'Synthetic Sanctions Flag', 'Transaction Count', 'Total Transaction Volume'
      ];

      const rows = data.map((d: any) => [
        d.id, d.name, d.country, d.risk_level, d.institution_type,
        d.is_sanctioned_proxy, d.tx_count, d.volume_exposure
      ]);

      return {
        type: 'COUNTERPARTIES',
        title: 'Counterparty Risk & Transactional Exposure Report',
        totalRecords: rows.length,
        csv: buildCsv(headers, rows, 'Counterparty Risk & Transactional Exposure Report'),
      };
    }

    case 'AUDIT':
    default: {
      const data = query(`
        SELECT * FROM audit_events 
        WHERE created_at >= ? AND created_at <= ?
        ORDER BY created_at DESC;
      `, startDate, endDate);

      const headers = [
        'Audit ID', 'Timestamp', 'Actor', 'Event Type', 'Entity Type',
        'Entity ID', 'Action', 'Reason', 'Correlation ID'
      ];

      const rows = data.map((d: any) => [
        d.id, d.created_at, d.actor, d.event_type, d.entity_type,
        d.entity_id, d.action, d.reason, d.correlation_id
      ]);

      return {
        type: 'AUDIT',
        title: 'Immutable Append-Only Regulatory Audit Log',
        totalRecords: rows.length,
        csv: buildCsv(headers, rows, 'Immutable Append-Only Regulatory Audit Log'),
      };
    }
  }
}
