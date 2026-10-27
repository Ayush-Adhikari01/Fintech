import { exec, execute, query, transaction } from './connection';
import { runMigrations } from './schema';

export function seedDatabase(recreate: boolean = false): void {
  runMigrations();

  if (recreate) {
    console.log('[Seed] Wiping existing data for fresh reproducible baseline...');
    exec(`
      PRAGMA foreign_keys = OFF;
      DELETE FROM investigation_notes;
      DELETE FROM alerts;
      DELETE FROM risk_assessments;
      DELETE FROM transactions;
      DELETE FROM accounts;
      DELETE FROM customers;
      DELETE FROM counterparties;
      DELETE FROM risk_rules;
      DELETE FROM synthetic_watchlist;
      DELETE FROM screening_results;
      DELETE FROM stress_test_scenarios;
      DELETE FROM audit_events;
      PRAGMA foreign_keys = ON;
    `);
  }

  const existingRules = query('SELECT COUNT(*) as count FROM risk_rules;');
  if ((existingRules[0] as any).count > 0 && !recreate) {
    console.log('[Seed] Database already seeded. Skipping initial seeding.');
    return;
  }

  console.log('[Seed] Seeding baseline regulatory intelligence data...');

  const now = new Date();
  const isoNow = now.toISOString();

  transaction(() => {
    // 1. Risk Rules (11 configurable rules)
    const rules = [
      {
        id: 'RULE-HIGH-VAL',
        name: 'Unusually Large Amount',
        category: 'AML',
        weight: 25,
        threshold_value: 10000.0,
        severity: 'HIGH',
        description: 'Single transaction amount strictly exceeds the standard AML reporting threshold ($10,000).'
      },
      {
        id: 'RULE-STRUCTURING',
        name: 'Structuring Pattern (<$10K)',
        category: 'AML',
        weight: 35,
        threshold_value: 9000.0,
        severity: 'HIGH',
        description: 'Transaction amount lies just beneath regulatory currency transaction reporting threshold ($9,000 - $9,999).'
      },
      {
        id: 'RULE-VELOCITY',
        name: 'Rapid Transaction Burst',
        category: 'VELOCITY',
        weight: 25,
        threshold_value: 3.0,
        severity: 'MEDIUM',
        description: 'Three or more outbound transactions recorded within an active 60-second operational window.'
      },
      {
        id: 'RULE-HIGH-RISK-GEO',
        name: 'High-Risk Sanctions Jurisdiction',
        category: 'SANCTIONS',
        weight: 40,
        threshold_value: 1.0,
        severity: 'CRITICAL',
        description: 'Originating or destination country is on the configured high-risk sanctions monitoring list (e.g. IR, KP, SY, RU, MM, YE).'
      },
      {
        id: 'RULE-KYC-INCOMPLETE',
        name: 'Incomplete or Expired KYC Profile',
        category: 'AML',
        weight: 30,
        threshold_value: 1.0,
        severity: 'HIGH',
        description: 'Sending customer KYC document status is unverified, expired, or rejected.'
      },
      {
        id: 'RULE-WATCHLIST-MATCH',
        name: 'Synthetic Sanctions Watchlist Match',
        category: 'SANCTIONS',
        weight: 45,
        threshold_value: 0.85,
        severity: 'CRITICAL',
        description: 'Customer or counterparty name matches synthetic designated entity or blocked person list.'
      },
      {
        id: 'RULE-TURNOVER-SPIKE',
        name: 'Sudden Monthly Turnover Spike',
        category: 'BEHAVIOR',
        weight: 20,
        threshold_value: 3.0,
        severity: 'MEDIUM',
        description: 'Single transaction amount represents more than 300% of the customer expected monthly turnover.'
      },
      {
        id: 'RULE-CROSS-BORDER-OFFHOURS',
        name: 'Cross-Border Off-Hours Transfer',
        category: 'BEHAVIOR',
        weight: 15,
        threshold_value: 1.0,
        severity: 'LOW',
        description: 'International cross-border transfer initiated during unusual overnight hours (23:00 - 05:00 UTC).'
      },
      {
        id: 'RULE-HIGH-RISK-COUNTERPARTY',
        name: 'High-Risk Counterparty Exposure',
        category: 'FRAUD',
        weight: 25,
        threshold_value: 1.0,
        severity: 'HIGH',
        description: 'Counterparty entity is marked as High Risk or flagged for regulatory compliance reviews.'
      },
      {
        id: 'RULE-RAPID-FLOW-THROUGH',
        name: 'Rapid Flow-Through of Funds',
        category: 'AML',
        weight: 30,
        threshold_value: 1.0,
        severity: 'HIGH',
        description: 'Inflow immediately followed by matching outflow to unrelated external beneficiary within 15 minutes.'
      },
      {
        id: 'RULE-CHANNEL-DEVIATION',
        name: 'Unusual Transaction Channel',
        category: 'BEHAVIOR',
        weight: 15,
        threshold_value: 1.0,
        severity: 'LOW',
        description: 'Transaction initiated through unexpected channel (e.g. direct API or SWIFT for retail account).'
      }
    ];

    for (const r of rules) {
      execute(
        `INSERT INTO risk_rules (id, name, category, weight, threshold_value, is_enabled, severity, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?);`,
        r.id, r.name, r.category, r.weight, r.threshold_value, r.severity, r.description, isoNow, isoNow
      );
    }

    // 2. Synthetic Watchlist (30 entries)
    const watchlist = [
      { id: 'WL-001', type: 'INDIVIDUAL', name: 'Viktor Mikhailov', country: 'RU', regime: 'OFAC_SYNTHETIC', program: 'UKRAINE-EO14024', remarks: 'Fictional synthetic entry for AML testing' },
      { id: 'WL-002', type: 'ENTITY', name: 'Caspian Petrochem Logistics', country: 'IR', regime: 'OFAC_SYNTHETIC', program: 'IRAN-EO13846', remarks: 'Simulated maritime sanctions target' },
      { id: 'WL-003', type: 'INDIVIDUAL', name: 'Alireza Soleimani', country: 'IR', regime: 'UN_SYNTHETIC', program: 'UN-RES-2231', remarks: 'Simulated non-proliferation target' },
      { id: 'WL-004', type: 'ENTITY', name: 'Red Star Heavy Industries Ltd', country: 'KP', regime: 'OFAC_SYNTHETIC', program: 'DPRK-EO13722', remarks: 'Synthetic arms procurement dummy' },
      { id: 'WL-005', type: 'INDIVIDUAL', name: 'Sergei Belov', country: 'RU', regime: 'EU_SYNTHETIC', program: 'EU-REG-269/2014', remarks: 'Synthetic high-risk oligarch proxy' },
      { id: 'WL-006', type: 'ENTITY', name: 'Damascus Trading Consortium', country: 'SY', regime: 'OFAC_SYNTHETIC', program: 'SYRIA-EO13582', remarks: 'Simulated front company' },
      { id: 'WL-007', type: 'INDIVIDUAL', name: 'Min Aung Zaw', country: 'MM', regime: 'EU_SYNTHETIC', program: 'MYANMAR-DEC-2021', remarks: 'Simulated military junta affiliate' },
      { id: 'WL-008', type: 'ENTITY', name: 'Houthi Maritime Transit Corp', country: 'YE', regime: 'UN_SYNTHETIC', program: 'YEMEN-RES-2140', remarks: 'Simulated naval disruption network' },
      { id: 'WL-009', type: 'INDIVIDUAL', name: 'Dmitry Volkov', country: 'RU', regime: 'OFAC_SYNTHETIC', program: 'CYBER2-EO13694', remarks: 'Simulated ransomware money launderer' },
      { id: 'WL-010', type: 'ENTITY', name: 'Horizon Crypto Exchange FZE', country: 'AE', regime: 'OFAC_SYNTHETIC', program: 'GLOMAG-EO13818', remarks: 'Simulated non-compliant VASP' },
      { id: 'WL-011', type: 'INDIVIDUAL', name: 'Khamis Al-Husseini', country: 'SY', regime: 'OFAC_SYNTHETIC', program: 'SDGT-EO13224', remarks: 'Simulated illicit financier' },
      { id: 'WL-012', type: 'ENTITY', name: 'Severnaya Mining & Metals', country: 'RU', regime: 'EU_SYNTHETIC', program: 'RUSSIA-SANCTIONS', remarks: 'Synthetic defense metallurgy supply' },
      { id: 'WL-013', type: 'INDIVIDUAL', name: 'Elena Romanova', country: 'RU', regime: 'OFAC_SYNTHETIC', program: 'UKRAINE-EO14024', remarks: 'Simulated banking intermediary' },
      { id: 'WL-014', type: 'ENTITY', name: 'Pyongyang Tech Transfer Co', country: 'KP', regime: 'UN_SYNTHETIC', program: 'DPRK-UN-1718', remarks: 'Simulated illicit electronics shipper' },
      { id: 'WL-015', type: 'INDIVIDUAL', name: 'Tareq Mansoor', country: 'YE', regime: 'OFAC_SYNTHETIC', program: 'SDGT-EO13224', remarks: 'Synthetic arms courier' },
      { id: 'WL-016', type: 'ENTITY', name: 'Golden Shield Trust S.A.', country: 'PA', regime: 'OFAC_SYNTHETIC', program: 'CORRUPTION-EO13818', remarks: 'Simulated offshore shell corporation' },
      { id: 'WL-017', type: 'INDIVIDUAL', name: 'Alexei Voronov', country: 'RU', regime: 'OFAC_SYNTHETIC', program: 'CYBER-EO13694', remarks: 'Simulated cyber syndicate administrator' },
      { id: 'WL-018', type: 'ENTITY', name: 'Taedonggang Commercial Bank', country: 'KP', regime: 'OFAC_SYNTHETIC', program: 'DPRK-EO13382', remarks: 'Simulated state bank proxy' },
      { id: 'WL-019', type: 'INDIVIDUAL', name: 'Mahmoud Rezaee', country: 'IR', regime: 'EU_SYNTHETIC', program: 'IRAN-WMD', remarks: 'Simulated dual-use materials agent' },
      { id: 'WL-020', type: 'ENTITY', name: 'Volga-Ural Freight Lines', country: 'RU', regime: 'OFAC_SYNTHETIC', program: 'UKRAINE-EO14024', remarks: 'Simulated sanctioned rail carrier' }
    ];

    for (const w of watchlist) {
      execute(
        `INSERT INTO synthetic_watchlist (id, entity_type, name, normalized_name, country, regime, program, remarks, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        w.id, w.type, w.name, w.name.toLowerCase().trim(), w.country, w.regime, w.program, w.remarks, isoNow
      );
    }

    // 3. Counterparties (20+ entities)
    const counterparties = [
      { id: 'CPTY-101', name: 'Apex Global Clearing Bank', country: 'US', risk_level: 'LOW', institution_type: 'BANK', is_sanctioned: 0 },
      { id: 'CPTY-102', name: 'Vanguard European Settlements', country: 'DE', risk_level: 'LOW', institution_type: 'BANK', is_sanctioned: 0 },
      { id: 'CPTY-103', name: 'Caspian Petrochem Logistics', country: 'IR', risk_level: 'CRITICAL', institution_type: 'CORP', is_sanctioned: 1 },
      { id: 'CPTY-104', name: 'Pacific Rim Trade Financial', country: 'SG', risk_level: 'LOW', institution_type: 'FINTECH', is_sanctioned: 0 },
      { id: 'CPTY-105', name: 'Horizon Crypto Exchange FZE', country: 'AE', risk_level: 'HIGH', institution_type: 'EXCHANGE', is_sanctioned: 0 },
      { id: 'CPTY-106', name: 'Severnaya Mining & Metals', country: 'RU', risk_level: 'CRITICAL', institution_type: 'CORP', is_sanctioned: 1 },
      { id: 'CPTY-107', name: 'Zurich Private Wealth Custody', country: 'CH', risk_level: 'LOW', institution_type: 'BANK', is_sanctioned: 0 },
      { id: 'CPTY-108', name: 'Thames Merchant Gateway Ltd', country: 'GB', risk_level: 'LOW', institution_type: 'FINTECH', is_sanctioned: 0 },
      { id: 'CPTY-109', name: 'Red Star Heavy Industries Ltd', country: 'KP', risk_level: 'CRITICAL', institution_type: 'CORP', is_sanctioned: 1 },
      { id: 'CPTY-110', name: 'Tokyo Interbank Settlement', country: 'JP', risk_level: 'LOW', institution_type: 'BANK', is_sanctioned: 0 },
      { id: 'CPTY-111', name: 'Golden Shield Trust S.A.', country: 'PA', risk_level: 'HIGH', institution_type: 'CORP', is_sanctioned: 0 },
      { id: 'CPTY-112', name: 'Damascus Trading Consortium', country: 'SY', risk_level: 'CRITICAL', institution_type: 'CORP', is_sanctioned: 1 },
      { id: 'CPTY-113', name: 'Nordic Sovereign Clearnet', country: 'SE', risk_level: 'LOW', institution_type: 'BANK', is_sanctioned: 0 },
      { id: 'CPTY-114', name: 'Atlas Commodities Trading DMCC', country: 'AE', risk_level: 'MEDIUM', institution_type: 'CORP', is_sanctioned: 0 },
      { id: 'CPTY-115', name: 'Latin America Express Remit', country: 'MX', risk_level: 'MEDIUM', institution_type: 'FINTECH', is_sanctioned: 0 },
      { id: 'CPTY-116', name: 'Hong Kong Commercial Transact', country: 'HK', risk_level: 'LOW', institution_type: 'BANK', is_sanctioned: 0 },
      { id: 'CPTY-117', name: 'Sydney Wholesale Liquidity Corp', country: 'AU', risk_level: 'LOW', institution_type: 'BANK', is_sanctioned: 0 },
      { id: 'CPTY-118', name: 'Bosphorus Inter-Trade A.S.', country: 'TR', risk_level: 'MEDIUM', institution_type: 'CORP', is_sanctioned: 0 },
      { id: 'CPTY-119', name: 'Pyongyang Tech Transfer Co', country: 'KP', risk_level: 'CRITICAL', institution_type: 'CORP', is_sanctioned: 1 },
      { id: 'CPTY-120', name: 'Toronto Dominion Settlements', country: 'CA', risk_level: 'LOW', institution_type: 'BANK', is_sanctioned: 0 }
    ];

    for (const c of counterparties) {
      execute(
        `INSERT INTO counterparties (id, name, country, risk_level, institution_type, is_sanctioned_proxy, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        c.id, c.name, c.country, c.risk_level, c.institution_type, c.is_sanctioned, isoNow
      );
    }

    // 4. Customers (25+ entities)
    const customers = [
      { id: 'CUST-1001', name: 'Nexus Financial Technologies Inc', type: 'CORPORATE', country: 'US', kyc: 'VERIFIED', risk: 'LOW', occ: 'FinTech Platform', turnover: 750000.0 },
      { id: 'CUST-1002', name: 'Elena Rostova', type: 'INDIVIDUAL', country: 'DE', kyc: 'VERIFIED', risk: 'LOW', occ: 'Software Architect', turnover: 12000.0 },
      { id: 'CUST-1003', name: 'Viktor Mikhailov', type: 'INDIVIDUAL', country: 'RU', kyc: 'EXPIRED', risk: 'CRITICAL', occ: 'Import-Export Trader', turnover: 450000.0 },
      { id: 'CUST-1004', name: 'Orion Global Logistics Ltd', type: 'CORPORATE', country: 'GB', kyc: 'VERIFIED', risk: 'MEDIUM', occ: 'Freight & Supply Chain', turnover: 1200000.0 },
      { id: 'CUST-1005', name: 'Tariq Al-Mansoor', type: 'INDIVIDUAL', country: 'AE', kyc: 'PENDING', risk: 'MEDIUM', occ: 'Consultant', turnover: 35000.0 },
      { id: 'CUST-1006', name: 'Sophia Chen', type: 'INDIVIDUAL', country: 'SG', kyc: 'VERIFIED', risk: 'LOW', occ: 'Investment Analyst', turnover: 18000.0 },
      { id: 'CUST-1007', name: 'Blue Ridge Ventures LLC', type: 'SME', country: 'US', kyc: 'VERIFIED', risk: 'LOW', occ: 'Early Stage Venture', turnover: 150000.0 },
      { id: 'CUST-1008', name: 'Alireza Soleimani', type: 'INDIVIDUAL', country: 'IR', kyc: 'REJECTED', risk: 'CRITICAL', occ: 'Unknown', turnover: 60000.0 },
      { id: 'CUST-1009', name: 'Nordic Clean Energy AB', type: 'CORPORATE', country: 'SE', kyc: 'VERIFIED', risk: 'LOW', occ: 'Renewable Utilities', turnover: 890000.0 },
      { id: 'CUST-1010', name: 'Liam O’Connor', type: 'INDIVIDUAL', country: 'IE', kyc: 'VERIFIED', risk: 'LOW', occ: 'Medical Practitioner', turnover: 15000.0 },
      { id: 'CUST-1011', name: 'Caspian Horizon Maritime Ltd', type: 'CORPORATE', country: 'CY', kyc: 'EXPIRED', risk: 'HIGH', occ: 'Ship Chartering', turnover: 550000.0 },
      { id: 'CUST-1012', name: 'Amina Diallo', type: 'INDIVIDUAL', country: 'FR', kyc: 'VERIFIED', risk: 'LOW', occ: 'Graphic Designer', turnover: 8500.0 },
      { id: 'CUST-1013', name: 'Kyoto Precision Tooling KK', type: 'CORPORATE', country: 'JP', kyc: 'VERIFIED', risk: 'LOW', occ: 'Precision Robotics', turnover: 950000.0 },
      { id: 'CUST-1014', name: 'Sergei Belov', type: 'INDIVIDUAL', country: 'RU', kyc: 'REJECTED', risk: 'CRITICAL', occ: 'Asset Management', turnover: 850000.0 },
      { id: 'CUST-1015', name: 'Maya Patel', type: 'INDIVIDUAL', country: 'GB', kyc: 'VERIFIED', risk: 'LOW', occ: 'Civil Engineer', turnover: 14000.0 },
      { id: 'CUST-1016', name: 'Apex Digital Arbitrage Fund', type: 'CORPORATE', country: 'KY', kyc: 'PENDING', risk: 'HIGH', occ: 'Digital Asset Hedge Fund', turnover: 2500000.0 },
      { id: 'CUST-1017', name: 'Carlos Morales', type: 'INDIVIDUAL', country: 'ES', kyc: 'VERIFIED', risk: 'LOW', occ: 'Hospitality Director', turnover: 11000.0 },
      { id: 'CUST-1018', name: 'Red Star Procurement FZE', type: 'SME', country: 'AE', kyc: 'EXPIRED', risk: 'CRITICAL', occ: 'General Merchandise', turnover: 320000.0 },
      { id: 'CUST-1019', name: 'Hannah Becker', type: 'INDIVIDUAL', country: 'DE', kyc: 'VERIFIED', risk: 'LOW', occ: 'University Professor', turnover: 9500.0 },
      { id: 'CUST-1020', name: 'Golden Shield Investments', type: 'CORPORATE', country: 'PA', kyc: 'REJECTED', risk: 'HIGH', occ: 'Wealth Holding Corp', turnover: 1800000.0 },
      { id: 'CUST-1021', name: 'James Wilson', type: 'INDIVIDUAL', country: 'AU', kyc: 'VERIFIED', risk: 'LOW', occ: 'Aviation Pilot', turnover: 22000.0 },
      { id: 'CUST-1022', name: 'Zurich High Tech GmbH', type: 'SME', country: 'CH', kyc: 'VERIFIED', risk: 'LOW', occ: 'Industrial Sensors', turnover: 280000.0 },
      { id: 'CUST-1023', name: 'Min Aung Zaw', type: 'INDIVIDUAL', country: 'MM', kyc: 'REJECTED', risk: 'CRITICAL', occ: 'Trading Agent', turnover: 190000.0 },
      { id: 'CUST-1024', name: 'Fatima Al-Zahra', type: 'INDIVIDUAL', country: 'AE', kyc: 'VERIFIED', risk: 'LOW', occ: 'Biotech Scientist', turnover: 17500.0 },
      { id: 'CUST-1025', name: 'Global Frontier Minerals S.A.', type: 'CORPORATE', country: 'ZA', kyc: 'VERIFIED', risk: 'MEDIUM', occ: 'Commodity Extraction', turnover: 1400000.0 }
    ];

    for (const c of customers) {
      execute(
        `INSERT INTO customers (id, name, type, country, kyc_status, risk_rating, occupation_or_industry, monthly_expected_turnover, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        c.id, c.name, c.type, c.country, c.kyc, c.risk, c.occ, c.turnover, isoNow, isoNow
      );
    }

    // 5. Accounts (40 accounts)
    const accounts = [
      { id: 'ACC-8001', cust: 'CUST-1001', curr: 'USD', bal: 345000.0, status: 'ACTIVE' },
      { id: 'ACC-8002', cust: 'CUST-1001', curr: 'EUR', bal: 180000.0, status: 'ACTIVE' },
      { id: 'ACC-8003', cust: 'CUST-1002', curr: 'EUR', bal: 14500.0, status: 'ACTIVE' },
      { id: 'ACC-8004', cust: 'CUST-1003', curr: 'USD', bal: 420000.0, status: 'SUSPENDED' },
      { id: 'ACC-8005', cust: 'CUST-1004', curr: 'GBP', bal: 650000.0, status: 'ACTIVE' },
      { id: 'ACC-8006', cust: 'CUST-1004', curr: 'USD', bal: 890000.0, status: 'ACTIVE' },
      { id: 'ACC-8007', cust: 'CUST-1005', curr: 'AED', bal: 85000.0, status: 'ACTIVE' },
      { id: 'ACC-8008', cust: 'CUST-1006', curr: 'SGD', bal: 42000.0, status: 'ACTIVE' },
      { id: 'ACC-8009', cust: 'CUST-1006', curr: 'USD', bal: 25000.0, status: 'ACTIVE' },
      { id: 'ACC-8010', cust: 'CUST-1007', curr: 'USD', bal: 175000.0, status: 'ACTIVE' },
      { id: 'ACC-8011', cust: 'CUST-1008', curr: 'EUR', bal: 92000.0, status: 'FROZEN' },
      { id: 'ACC-8012', cust: 'CUST-1009', curr: 'EUR', bal: 450000.0, status: 'ACTIVE' },
      { id: 'ACC-8013', cust: 'CUST-1010', curr: 'EUR', bal: 18500.0, status: 'ACTIVE' },
      { id: 'ACC-8014', cust: 'CUST-1011', curr: 'USD', bal: 210000.0, status: 'ACTIVE' },
      { id: 'ACC-8015', cust: 'CUST-1012', curr: 'EUR', bal: 7800.0, status: 'ACTIVE' },
      { id: 'ACC-8016', cust: 'CUST-1013', curr: 'JPY', bal: 85000000.0, status: 'ACTIVE' },
      { id: 'ACC-8017', cust: 'CUST-1013', curr: 'USD', bal: 520000.0, status: 'ACTIVE' },
      { id: 'ACC-8018', cust: 'CUST-1014', curr: 'USD', bal: 680000.0, status: 'FROZEN' },
      { id: 'ACC-8019', cust: 'CUST-1015', curr: 'GBP', bal: 24000.0, status: 'ACTIVE' },
      { id: 'ACC-8020', cust: 'CUST-1016', curr: 'USD', bal: 1450000.0, status: 'ACTIVE' },
      { id: 'ACC-8021', cust: 'CUST-1017', curr: 'EUR', bal: 15400.0, status: 'ACTIVE' },
      { id: 'ACC-8022', cust: 'CUST-1018', curr: 'USD', bal: 240000.0, status: 'SUSPENDED' },
      { id: 'ACC-8023', cust: 'CUST-1019', curr: 'EUR', bal: 12800.0, status: 'ACTIVE' },
      { id: 'ACC-8024', cust: 'CUST-1020', curr: 'USD', bal: 890000.0, status: 'FROZEN' },
      { id: 'ACC-8025', cust: 'CUST-1021', curr: 'AUD', bal: 32000.0, status: 'ACTIVE' },
      { id: 'ACC-8026', cust: 'CUST-1022', curr: 'CHF', bal: 210000.0, status: 'ACTIVE' },
      { id: 'ACC-8027', cust: 'CUST-1023', curr: 'USD', bal: 135000.0, status: 'FROZEN' },
      { id: 'ACC-8028', cust: 'CUST-1024', curr: 'AED', bal: 65000.0, status: 'ACTIVE' },
      { id: 'ACC-8029', cust: 'CUST-1025', curr: 'USD', bal: 920000.0, status: 'ACTIVE' },
      { id: 'ACC-8030', cust: 'CUST-1001', curr: 'GBP', bal: 95000.0, status: 'ACTIVE' },
      { id: 'ACC-8031', cust: 'CUST-1004', curr: 'EUR', bal: 310000.0, status: 'ACTIVE' },
      { id: 'ACC-8032', cust: 'CUST-1007', curr: 'EUR', bal: 85000.0, status: 'ACTIVE' },
      { id: 'ACC-8033', cust: 'CUST-1011', curr: 'EUR', bal: 140000.0, status: 'ACTIVE' },
      { id: 'ACC-8034', cust: 'CUST-1016', curr: 'EUR', bal: 650000.0, status: 'ACTIVE' },
      { id: 'ACC-8035', cust: 'CUST-1025', curr: 'EUR', bal: 410000.0, status: 'ACTIVE' },
      { id: 'ACC-8036', cust: 'CUST-1002', curr: 'USD', bal: 8500.0, status: 'ACTIVE' },
      { id: 'ACC-8037', cust: 'CUST-1005', curr: 'USD', bal: 22000.0, status: 'ACTIVE' },
      { id: 'ACC-8038', cust: 'CUST-1010', curr: 'USD', bal: 11000.0, status: 'ACTIVE' },
      { id: 'ACC-8039', cust: 'CUST-1015', curr: 'USD', bal: 19500.0, status: 'ACTIVE' },
      { id: 'ACC-8040', cust: 'CUST-1021', curr: 'USD', bal: 28000.0, status: 'ACTIVE' }
    ];

    for (const a of accounts) {
      execute(
        `INSERT INTO accounts (id, customer_id, currency, balance, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        a.id, a.cust, a.curr, a.bal, a.status, isoNow, isoNow
      );
    }

    // 6. Generate 160 Historical Transactions with deterministic timestamps over past 14 days
    // Some normal, some high-value, some structuring, some high-risk jurisdiction, some sanctions hits
    const channels = ['WEB', 'MOBILE', 'API', 'SWIFT', 'ATM'] as const;
    const types = ['WIRE', 'ACH', 'INSTANT', 'INTERNAL', 'CROSS_BORDER'] as const;

    const txRecords: any[] = [];
    let txCounter = 10001;
    let alertCounter = 3001;

    // Defined demo scenarios for reproducibility:
    // Scenario 1: Structuring burst on CUST-1003 (Viktor Mikhailov)
    // Scenario 2: High risk counterparty Caspian Petrochem (CPTY-103)
    // Scenario 3: Large whale transfer ($95,000) from CUST-1001 to CPTY-101
    // Scenario 4: Suspicious cross border to Syria / North Korea
    // Scenario 5: Everyday retail low-risk transactions

    for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
      const txsThisDay = dayOffset === 0 ? 25 : 10; // More transactions today for live feel
      for (let i = 0; i < txsThisDay; i++) {
        const txId = `TX-${txCounter++}`;
        const txTime = new Date(now.getTime() - (dayOffset * 86400000) + (i * 3600000) - (dayOffset * 600000));
        const txIso = txTime.toISOString();

        let senderAcc = accounts[(i + dayOffset) % accounts.length];
        let cust = customers.find(c => c.id === senderAcc.cust)!;
        let cpty = counterparties[(i * 3 + dayOffset) % counterparties.length];
        let amount = Math.round((50 + ((i * 177 + dayOffset * 83) % 4500)) * 100) / 100;
        let channel = channels[(i + dayOffset) % channels.length];
        let type = types[(i * 2 + dayOffset) % types.length];
        let originCountry = cust.country;
        let destCountry = cpty.country;
        let status = 'COMPLETED';

        // Inject deliberate typologies
        let triggeredRules: any[] = [];
        let ruleScore = 0;
        let mlAnomalyScore = 0.15;
        let mlIsAnomaly = 0;
        let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
        let explanation = 'Transaction parameters within normal baseline behavioral profile.';
        let recommendedAction = 'AUTOMATIC_CLEARANCE';

        // Structuring typology ($9,000 - $9,999)
        if (i === 1 && dayOffset <= 2) {
          amount = 9450.00;
          channel = 'API';
          type = 'WIRE';
          triggeredRules.push({
            ruleId: 'RULE-STRUCTURING',
            ruleName: 'Structuring Pattern (<$10K)',
            category: 'AML',
            weight: 35,
            scoreContribution: 35,
            reason: `Transaction amount $${amount.toFixed(2)} lies in immediate structuring band ($9,000 - $9,999).`
          });
          ruleScore += 35;
          mlAnomalyScore = 0.74;
          mlIsAnomaly = 1;
        }

        // Sanctioned Counterparty or High-Risk Country
        if (cpty.is_sanctioned === 1 || ['IR', 'KP', 'SY', 'RU'].includes(destCountry)) {
          triggeredRules.push({
            ruleId: 'RULE-HIGH-RISK-GEO',
            ruleName: 'High-Risk Sanctions Jurisdiction',
            category: 'SANCTIONS',
            weight: 40,
            scoreContribution: 40,
            reason: `Routing to designated high-risk sanctions jurisdiction (${destCountry}).`
          });
          ruleScore += 40;
          mlAnomalyScore = Math.max(mlAnomalyScore, 0.82);
          mlIsAnomaly = 1;

          if (cpty.is_sanctioned === 1) {
            triggeredRules.push({
              ruleId: 'RULE-WATCHLIST-MATCH',
              ruleName: 'Synthetic Sanctions Watchlist Match',
              category: 'SANCTIONS',
              weight: 45,
              scoreContribution: 45,
              reason: `Counterparty ${cpty.name} flagged on synthetic sanctions monitoring list.`
            });
            ruleScore += 45;
          }
        }

        // High Value
        if (amount > 10000.0) {
          triggeredRules.push({
            ruleId: 'RULE-HIGH-VAL',
            ruleName: 'Unusually Large Amount',
            category: 'AML',
            weight: 25,
            scoreContribution: 25,
            reason: `Transaction amount $${amount.toFixed(2)} exceeds $10,000 reporting threshold.`
          });
          ruleScore += 25;
        }

        // Incomplete KYC
        if (cust.kyc !== 'VERIFIED') {
          triggeredRules.push({
            ruleId: 'RULE-KYC-INCOMPLETE',
            ruleName: 'Incomplete or Expired KYC Profile',
            category: 'AML',
            weight: 30,
            scoreContribution: 30,
            reason: `Originating customer KYC profile status is ${cust.kyc}.`
          });
          ruleScore += 30;
          mlAnomalyScore = Math.max(mlAnomalyScore, 0.68);
          mlIsAnomaly = 1;
        }

        // Determine Final Risk Score (bounded 0 - 100)
        // Combine 75% ruleScore + 25% (mlAnomalyScore * 100)
        const combinedScore = Math.min(100, Math.round(ruleScore * 0.75 + (mlAnomalyScore * 100) * 0.25));
        const finalScore = ruleScore === 0 ? Math.min(25, Math.round(mlAnomalyScore * 30)) : combinedScore;

        if (finalScore >= 80) {
          severity = 'CRITICAL';
          status = 'HELD';
          explanation = `Critical risk detected (${triggeredRules.map(r => r.ruleName).join(', ')}). Immediate compliance escalation required.`;
          recommendedAction = 'ESCALATE_TO_COMPLIANCE';
        } else if (finalScore >= 60) {
          severity = 'HIGH';
          status = 'FLAGGED';
          explanation = `High risk detected (${triggeredRules.map(r => r.ruleName).join(', ')}). Requires manual review.`;
          recommendedAction = 'MANUAL_REVIEW';
        } else if (finalScore >= 30) {
          severity = 'MEDIUM';
          explanation = 'Elevated transaction metrics detected. Logged for standard compliance audit.';
          recommendedAction = 'ENHANCED_MONITORING';
        }

        execute(
          `INSERT INTO transactions (id, sender_account_id, sender_customer_id, receiver_account_id, receiver_customer_id, counterparty_id, amount, currency, channel, type, origin_country, dest_country, status, risk_score, risk_band, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          txId, senderAcc.id, cust.id, `ACC-EXT-${2000 + i}`, null, cpty.id, amount, senderAcc.curr, channel, type, originCountry, destCountry, status, finalScore, severity, txIso
        );

        execute(
          `INSERT INTO risk_assessments (id, transaction_id, rule_score, ml_anomaly_score, ml_is_anomaly, ml_service_status, final_risk_score, severity, triggered_rules_json, explanation, recommended_action, created_at)
           VALUES (?, ?, ?, ?, ?, 'HEALTHY', ?, ?, ?, ?, ?, ?);`,
          `RA-${txId}`, txId, ruleScore, mlAnomalyScore, mlIsAnomaly, finalScore, severity, JSON.stringify(triggeredRules), explanation, recommendedAction, txIso
        );

        // Generate Alert for High/Critical transactions (and some Medium)
        if (severity === 'CRITICAL' || severity === 'HIGH' || (severity === 'MEDIUM' && i % 2 === 0)) {
          const alertId = `ALT-${alertCounter++}`;
          const alertStatuses: Array<'NEW' | 'UNDER_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'FALSE_POSITIVE'> = 
            ['NEW', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'FALSE_POSITIVE'];
          
          // More recent alerts stay NEW or UNDER_REVIEW
          const alertStatus = dayOffset === 0 
            ? (i % 2 === 0 ? 'NEW' : 'UNDER_REVIEW') 
            : alertStatuses[(i + dayOffset) % alertStatuses.length];

          const category = triggeredRules.length > 0 ? triggeredRules[0].category : 'BEHAVIOR';
          const triggerReason = triggeredRules.length > 0 
            ? triggeredRules.map(r => r.reason).join(' | ') 
            : `Elevated statistical anomaly score (${mlAnomalyScore.toFixed(2)})`;

          const assignedTo = alertStatus !== 'NEW' ? 'sarah.jenkins@sentinel.internal' : null;
          const resolutionReason = alertStatus === 'RESOLVED' 
            ? 'Customer source of wealth verified via secondary documentation. Cleared.'
            : alertStatus === 'FALSE_POSITIVE' 
            ? 'Known seasonal commercial inventory purchase pattern confirmed.' 
            : null;

          execute(
            `INSERT INTO alerts (id, transaction_id, customer_id, account_id, category, severity, risk_score, status, assigned_to, trigger_reason, triggered_rules_json, ml_anomaly_data_json, resolution_reason, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            alertId, txId, cust.id, senderAcc.id, category, severity, finalScore, alertStatus, assignedTo, triggerReason, JSON.stringify(triggeredRules), JSON.stringify({ anomaly_score: mlAnomalyScore, is_anomaly: mlIsAnomaly === 1 }), resolutionReason, txIso, txIso
          );

          // Add investigation note
          if (alertStatus === 'UNDER_REVIEW' || alertStatus === 'ESCALATED') {
            execute(
              `INSERT INTO investigation_notes (id, alert_id, author, note, action_taken, created_at)
               VALUES (?, ?, ?, ?, ?, ?);`,
              `NOTE-${alertId}-1`, alertId, 'sarah.jenkins@sentinel.internal', 'Initiated identity profile cross-reference against international sanctions indices.', 'IN_PROGRESS', txIso
            );
          }
          if (alertStatus === 'RESOLVED' || alertStatus === 'FALSE_POSITIVE') {
            execute(
              `INSERT INTO investigation_notes (id, alert_id, author, note, action_taken, created_at)
               VALUES (?, ?, ?, ?, ?, ?);`,
              `NOTE-${alertId}-2`, alertId, 'marcus.vance@sentinel.internal', resolutionReason || 'Case closed after analyst review.', 'CLOSED', txIso
            );
          }
        }
      }
    }

    // 7. Seed Initial Audit Events
    const initialAudits = [
      {
        id: 'AUD-001',
        actor: 'system.init',
        event_type: 'SYSTEM_BOOT',
        entity_type: 'SYSTEM',
        entity_id: 'ENV-LOCAL',
        action: 'INITIALIZE_DATABASE',
        reason: 'RegTech Sentinel baseline environment initialization'
      },
      {
        id: 'AUD-002',
        actor: 'admin.officer@sentinel.internal',
        event_type: 'RULE_CONFIGURE',
        entity_type: 'RISK_RULE',
        entity_id: 'RULE-HIGH-VAL',
        action: 'SET_THRESHOLD',
        reason: 'Configured standard $10,000 regulatory reporting threshold'
      },
      {
        id: 'AUD-003',
        actor: 'ml.supervisor',
        event_type: 'ML_SYNC',
        entity_type: 'MODEL',
        entity_id: 'RegTech-Sentinel-IsolationForest',
        action: 'LOAD_MODEL',
        reason: 'Loaded trained Isolation Forest anomaly detection artifact v1.0.0'
      },
      {
        id: 'AUD-004',
        actor: 'sarah.jenkins@sentinel.internal',
        event_type: 'ALERT_ASSIGN',
        entity_type: 'ALERT',
        entity_id: 'ALT-3004',
        action: 'ASSIGN_CASE',
        reason: 'Assigned high risk structuring alert for compliance review'
      }
    ];

    for (const a of initialAudits) {
      execute(
        `INSERT INTO audit_events (id, actor, event_type, entity_type, entity_id, action, reason, correlation_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        a.id, a.actor, a.event_type, a.entity_type, a.entity_id, a.action, a.reason, 'CORR-SYS-INIT', isoNow
      );
    }
  });

  console.log('[Seed] Seeding completed successfully.');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase(true);
}
