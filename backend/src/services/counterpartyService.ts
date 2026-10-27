import { query, queryOne } from '../db/connection';
import { Counterparty } from '../types';

export function getCounterpartyAnalytics() {
  const totalVolumeRow = queryOne<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM transactions;'
  );
  const platformTotalVolume = totalVolumeRow?.total || 1;

  // Counterparties with aggregate stats from persisted transactions
  const counterpartiesWithStats = query(`
    SELECT 
      c.*,
      COUNT(t.id) as transaction_count,
      ROUND(COALESCE(SUM(t.amount), 0), 2) as total_volume_exposure,
      ROUND(COALESCE(AVG(t.amount), 0), 2) as avg_transaction_size,
      MAX(t.created_at) as last_transaction_at,
      COUNT(CASE WHEN t.status IN ('HELD', 'BLOCKED', 'FLAGGED') THEN 1 END) as flagged_transactions_count,
      (SELECT COUNT(*) FROM alerts al 
       JOIN transactions atx ON al.transaction_id = atx.id 
       WHERE atx.counterparty_id = c.id AND al.status IN ('NEW', 'UNDER_REVIEW', 'ESCALATED')) as open_alerts_count
    FROM counterparties c
    LEFT JOIN transactions t ON t.counterparty_id = c.id
    GROUP BY c.id
    ORDER BY total_volume_exposure DESC;
  `);

  const counterpartiesWithConcentration = counterpartiesWithStats.map((c: any) => ({
    ...c,
    concentration_pct: Math.round((c.total_volume_exposure / platformTotalVolume) * 1000) / 10,
  }));

  // Geographic concentration
  const geographicConcentration = query(`
    SELECT 
      c.country,
      COUNT(DISTINCT c.id) as counterparty_count,
      COUNT(t.id) as transaction_count,
      ROUND(COALESCE(SUM(t.amount), 0), 2) as total_volume
    FROM counterparties c
    LEFT JOIN transactions t ON t.counterparty_id = c.id
    GROUP BY c.country
    ORDER BY total_volume DESC;
  `);

  // Risk Level Distribution
  const riskDistribution = query(`
    SELECT 
      risk_level, 
      COUNT(*) as count,
      ROUND(COALESCE(SUM(total_vol), 0), 2) as volume
    FROM (
      SELECT c.risk_level, COALESCE(SUM(t.amount), 0) as total_vol
      FROM counterparties c
      LEFT JOIN transactions t ON t.counterparty_id = c.id
      GROUP BY c.id
    )
    GROUP BY risk_level;
  `);

  return {
    platformTotalVolume: Math.round(platformTotalVolume * 100) / 100,
    counterparties: counterpartiesWithConcentration,
    geographicConcentration,
    riskDistribution,
    exposureNote: 'Exposure metrics reflect cumulative transactional turnover proxy. This prototype does not maintain a multi-currency credit line ledger.'
  };
}

export function getCounterpartyDetail(id: string) {
  const counterparty = queryOne<Counterparty>('SELECT * FROM counterparties WHERE id = ?;', id);
  if (!counterparty) return null;

  const transactions = query(
    `SELECT t.*, c.name as customer_name 
     FROM transactions t 
     LEFT JOIN customers c ON t.sender_customer_id = c.id 
     WHERE t.counterparty_id = ? 
     ORDER BY t.created_at DESC 
     LIMIT 50;`,
    id
  );

  const stats = queryOne(`
    SELECT 
      COUNT(t.id) as total_tx_count,
      ROUND(COALESCE(SUM(t.amount), 0), 2) as total_volume,
      ROUND(COALESCE(AVG(t.amount), 0), 2) as avg_amount,
      COUNT(CASE WHEN t.risk_band = 'CRITICAL' THEN 1 END) as critical_count,
      COUNT(CASE WHEN t.risk_band = 'HIGH' THEN 1 END) as high_count
    FROM transactions t
    WHERE t.counterparty_id = ?;
  `, id);

  return {
    counterparty,
    stats,
    transactions,
  };
}
