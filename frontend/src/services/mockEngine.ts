// RegTech Sentinel — Client-side Cloud Demo Engine
// Provides full in-memory simulation, rule evaluations, ML scoring telemetry,
// and state persistence for standalone cloud deployments (e.g. Vercel).

export interface MockCustomer {
  id: string;
  name: string;
  type: string;
  country: string;
  kyc_status: string;
  risk_rating: string;
  occupation_or_industry: string;
  monthly_expected_turnover: number;
  created_at: string;
  updated_at: string;
}

export interface MockAccount {
  id: string;
  customer_id: string;
  currency: string;
  balance: number;
  status: string;
}

export interface MockCounterparty {
  id: string;
  name: string;
  country: string;
  risk_level: string;
  institution_type: string;
  is_sanctioned_proxy: number;
}

export interface MockRiskRule {
  id: string;
  name: string;
  category: string;
  weight: number;
  threshold_value: number;
  is_enabled: boolean;
  severity: string;
  description: string;
}

export interface MockTransaction {
  id: string;
  sender_account_id: string;
  sender_customer_id: string;
  receiver_account_id: string;
  receiver_customer_id: string | null;
  counterparty_id: string;
  amount: number;
  currency: string;
  channel: string;
  type: string;
  origin_country: string;
  dest_country: string;
  status: string;
  risk_score: number;
  risk_band: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  created_at: string;
  customer_name?: string;
  counterparty_name?: string;
}

export interface MockRiskAssessment {
  id: string;
  transaction_id: string;
  rule_score: number;
  ml_anomaly_score: number;
  ml_is_anomaly: number;
  ml_service_status: string;
  final_risk_score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  triggered_rules_json: string;
  explanation: string;
  recommended_action: string;
  created_at: string;
}

export interface MockAlert {
  id: string;
  transaction_id: string;
  customer_id: string;
  account_id: string;
  category: string;
  severity: string;
  risk_score: number;
  status: 'NEW' | 'UNDER_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'FALSE_POSITIVE';
  assigned_to: string | null;
  trigger_reason: string;
  triggered_rules_json: string;
  ml_anomaly_data_json: string;
  resolution_reason: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  amount?: number;
  currency?: string;
  transaction_type?: string;
  channel?: string;
}

export interface MockInvestigationNote {
  id: string;
  alert_id: string;
  author: string;
  note: string;
  action_taken: string;
  created_at: string;
}

export interface MockWatchlistEntry {
  id: string;
  entity_type: string;
  name: string;
  normalized_name: string;
  country: string;
  regime: string;
  program: string;
  remarks: string;
}

export interface MockScreeningResult {
  id: string;
  target_type: string;
  target_id: string | null;
  query_name: string;
  matched_entity_id: string | null;
  matched_entity_name?: string;
  match_score: number;
  status: 'FLAGGED' | 'CLEARED' | 'CONFIRMED_MATCH';
  notes: string;
  screened_by: string;
  created_at: string;
}

export interface MockAuditEvent {
  id: string;
  actor: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  action: string;
  reason: string;
  correlation_id: string;
  created_at: string;
}

// Pseudo-random number generator for reproducible ticks
class PseudoRandom {
  private seed: number;
  constructor(seed: number = 42) {
    this.seed = seed;
  }
  setSeed(seed: number): void {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  choice<T>(arr: T[] | readonly T[]): T {
    const idx = Math.floor(this.next() * arr.length);
    return arr[idx];
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

// Levenshtein similarity metric
function computeSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  const distance = dp[m][n];
  const maxLen = Math.max(m, n);
  return Math.round((1.0 - distance / maxLen) * 100) / 100;
}

class MockEngine {
  public customers: MockCustomer[] = [];
  public accounts: MockAccount[] = [];
  public counterparties: MockCounterparty[] = [];
  public rules: MockRiskRule[] = [];
  public watchlist: MockWatchlistEntry[] = [];
  public screeningResults: MockScreeningResult[] = [];
  public transactions: MockTransaction[] = [];
  public riskAssessments: Map<string, MockRiskAssessment> = new Map();
  public alerts: MockAlert[] = [];
  public investigationNotes: MockInvestigationNote[] = [];
  public auditEvents: MockAuditEvent[] = [];

  // Simulator
  private isRunning: boolean = true;
  private isPaused: boolean = false;
  private intervalMs: number = 3000;
  private timer: any = null;
  private prng: PseudoRandom;
  private generatedCount: number = 0;
  private txCounter: number = 10500;
  private alertCounter: number = 3500;
  private auditCounter: number = 500;

  // Event listeners for WebSocket emulation
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.prng = new PseudoRandom(Date.now() % 10000);
    this.seedBaseline();
    this.startSimulator();
  }

  public on(event: string, fn: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn);
  }

  public off(event: string, fn: (data: any) => void) {
    this.listeners.get(event)?.delete(fn);
  }

  public emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((fn) => {
      try {
        fn(data);
      } catch (err) {
        console.error(`[MockEngine] Error in listener for ${event}:`, err);
      }
    });
  }

  public seedBaseline() {
    const now = new Date();
    const isoNow = now.toISOString();

    // 1. Rules
    this.rules = [
      { id: 'RULE-HIGH-VAL', name: 'Unusually Large Amount', category: 'AML', weight: 25, threshold_value: 10000.0, is_enabled: true, severity: 'HIGH', description: 'Single transaction amount strictly exceeds standard AML reporting threshold ($10,000).' },
      { id: 'RULE-STRUCTURING', name: 'Structuring Pattern (<$10K)', category: 'AML', weight: 35, threshold_value: 9000.0, is_enabled: true, severity: 'HIGH', description: 'Transaction amount lies just beneath regulatory currency reporting threshold ($9,000 - $9,999).' },
      { id: 'RULE-VELOCITY', name: 'Rapid Transaction Burst', category: 'VELOCITY', weight: 25, threshold_value: 3.0, is_enabled: true, severity: 'MEDIUM', description: 'Three or more outbound transactions recorded within an active 60-second operational window.' },
      { id: 'RULE-HIGH-RISK-GEO', name: 'High-Risk Sanctions Jurisdiction', category: 'SANCTIONS', weight: 40, threshold_value: 1.0, is_enabled: true, severity: 'CRITICAL', description: 'Originating or destination country is on high-risk sanctions monitoring list (e.g. IR, KP, SY, RU, MM, YE).' },
      { id: 'RULE-KYC-INCOMPLETE', name: 'Incomplete or Expired KYC Profile', category: 'AML', weight: 30, threshold_value: 1.0, is_enabled: true, severity: 'HIGH', description: 'Sending customer KYC document status is unverified, expired, or rejected.' },
      { id: 'RULE-WATCHLIST-MATCH', name: 'Synthetic Sanctions Watchlist Match', category: 'SANCTIONS', weight: 45, threshold_value: 0.85, is_enabled: true, severity: 'CRITICAL', description: 'Customer or counterparty name matches synthetic designated entity or blocked person list.' },
      { id: 'RULE-TURNOVER-SPIKE', name: 'Sudden Monthly Turnover Spike', category: 'BEHAVIOR', weight: 20, threshold_value: 3.0, is_enabled: true, severity: 'MEDIUM', description: 'Single transaction amount represents more than 300% of customer expected monthly turnover.' },
      { id: 'RULE-CROSS-BORDER-OFFHOURS', name: 'Cross-Border Off-Hours Transfer', category: 'BEHAVIOR', weight: 15, threshold_value: 1.0, is_enabled: true, severity: 'LOW', description: 'International cross-border transfer initiated during unusual overnight hours (23:00 - 05:00 UTC).' },
      { id: 'RULE-HIGH-RISK-COUNTERPARTY', name: 'High-Risk Counterparty Exposure', category: 'FRAUD', weight: 25, threshold_value: 1.0, is_enabled: true, severity: 'HIGH', description: 'Counterparty entity is marked as High Risk or flagged for regulatory compliance reviews.' },
      { id: 'RULE-RAPID-FLOW-THROUGH', name: 'Rapid Flow-Through of Funds', category: 'AML', weight: 30, threshold_value: 1.0, is_enabled: true, severity: 'HIGH', description: 'Inflow immediately followed by matching outflow to unrelated external beneficiary within 15 minutes.' },
      { id: 'RULE-CHANNEL-DEVIATION', name: 'Unusual Transaction Channel', category: 'BEHAVIOR', weight: 15, threshold_value: 1.0, is_enabled: true, severity: 'LOW', description: 'Transaction initiated through unexpected channel (e.g. direct API or SWIFT for retail account).' },
    ];

    // 2. Synthetic Watchlist
    this.watchlist = [
      { id: 'WL-001', entity_type: 'INDIVIDUAL', name: 'Viktor Mikhailov', normalized_name: 'viktor mikhailov', country: 'RU', regime: 'OFAC_SYNTHETIC', program: 'UKRAINE-EO14024', remarks: 'Fictional synthetic entry for AML testing' },
      { id: 'WL-002', entity_type: 'ENTITY', name: 'Caspian Petrochem Logistics', normalized_name: 'caspian petrochem logistics', country: 'IR', regime: 'OFAC_SYNTHETIC', program: 'IRAN-EO13846', remarks: 'Simulated maritime sanctions target' },
      { id: 'WL-003', entity_type: 'INDIVIDUAL', name: 'Alireza Soleimani', normalized_name: 'alireza soleimani', country: 'IR', regime: 'UN_SYNTHETIC', program: 'UN-RES-2231', remarks: 'Simulated non-proliferation target' },
      { id: 'WL-004', entity_type: 'ENTITY', name: 'Red Star Heavy Industries Ltd', normalized_name: 'red star heavy industries ltd', country: 'KP', regime: 'OFAC_SYNTHETIC', program: 'DPRK-EO13722', remarks: 'Synthetic arms procurement dummy' },
      { id: 'WL-005', entity_type: 'INDIVIDUAL', name: 'Sergei Belov', normalized_name: 'sergei belov', country: 'RU', regime: 'EU_SYNTHETIC', program: 'EU-REG-269/2014', remarks: 'Synthetic high-risk oligarch proxy' },
      { id: 'WL-006', entity_type: 'ENTITY', name: 'Damascus Trading Consortium', normalized_name: 'damascus trading consortium', country: 'SY', regime: 'OFAC_SYNTHETIC', program: 'SYRIA-EO13582', remarks: 'Simulated front company' },
      { id: 'WL-007', entity_type: 'INDIVIDUAL', name: 'Min Aung Zaw', normalized_name: 'min aung zaw', country: 'MM', regime: 'EU_SYNTHETIC', program: 'MYANMAR-DEC-2021', remarks: 'Simulated military junta affiliate' },
      { id: 'WL-008', entity_type: 'ENTITY', name: 'Houthi Maritime Transit Corp', normalized_name: 'houthi maritime transit corp', country: 'YE', regime: 'UN_SYNTHETIC', program: 'YEMEN-RES-2140', remarks: 'Simulated naval disruption network' },
      { id: 'WL-009', entity_type: 'INDIVIDUAL', name: 'Dmitry Volkov', normalized_name: 'dmitry volkov', country: 'RU', regime: 'OFAC_SYNTHETIC', program: 'CYBER2-EO13694', remarks: 'Simulated ransomware money launderer' },
      { id: 'WL-010', entity_type: 'ENTITY', name: 'Horizon Crypto Exchange FZE', normalized_name: 'horizon crypto exchange fze', country: 'AE', regime: 'OFAC_SYNTHETIC', program: 'GLOMAG-EO13818', remarks: 'Simulated non-compliant VASP' },
      { id: 'WL-011', entity_type: 'INDIVIDUAL', name: 'Khamis Al-Husseini', normalized_name: 'khamis al-husseini', country: 'SY', regime: 'OFAC_SYNTHETIC', program: 'SDGT-EO13224', remarks: 'Simulated illicit financier' },
      { id: 'WL-012', entity_type: 'ENTITY', name: 'Severnaya Mining & Metals', normalized_name: 'severnaya mining & metals', country: 'RU', regime: 'EU_SYNTHETIC', program: 'RUSSIA-SANCTIONS', remarks: 'Synthetic defense metallurgy supply' },
      { id: 'WL-013', entity_type: 'INDIVIDUAL', name: 'Elena Romanova', normalized_name: 'elena romanova', country: 'RU', regime: 'OFAC_SYNTHETIC', program: 'UKRAINE-EO14024', remarks: 'Simulated banking intermediary' },
      { id: 'WL-014', entity_type: 'ENTITY', name: 'Pyongyang Tech Transfer Co', normalized_name: 'pyongyang tech transfer co', country: 'KP', regime: 'UN_SYNTHETIC', program: 'DPRK-UN-1718', remarks: 'Simulated illicit electronics shipper' },
      { id: 'WL-015', entity_type: 'INDIVIDUAL', name: 'Tareq Mansoor', normalized_name: 'tareq mansoor', country: 'YE', regime: 'OFAC_SYNTHETIC', program: 'SDGT-EO13224', remarks: 'Synthetic arms courier' },
      { id: 'WL-016', entity_type: 'ENTITY', name: 'Golden Shield Trust S.A.', normalized_name: 'golden shield trust s.a.', country: 'PA', regime: 'OFAC_SYNTHETIC', program: 'CORRUPTION-EO13818', remarks: 'Simulated offshore shell corporation' },
      { id: 'WL-017', entity_type: 'INDIVIDUAL', name: 'Alexei Voronov', normalized_name: 'alexei voronov', country: 'RU', regime: 'OFAC_SYNTHETIC', program: 'CYBER-EO13694', remarks: 'Simulated cyber syndicate administrator' },
      { id: 'WL-018', entity_type: 'ENTITY', name: 'Taedonggang Commercial Bank', normalized_name: 'taedonggang commercial bank', country: 'KP', regime: 'OFAC_SYNTHETIC', program: 'DPRK-EO13382', remarks: 'Simulated state bank proxy' },
      { id: 'WL-019', entity_type: 'INDIVIDUAL', name: 'Mahmoud Rezaee', normalized_name: 'mahmoud rezaee', country: 'IR', regime: 'EU_SYNTHETIC', program: 'IRAN-WMD', remarks: 'Simulated dual-use materials agent' },
      { id: 'WL-020', entity_type: 'ENTITY', name: 'Volga-Ural Freight Lines', normalized_name: 'volga-ural freight lines', country: 'RU', regime: 'OFAC_SYNTHETIC', program: 'UKRAINE-EO14024', remarks: 'Simulated sanctioned rail carrier' }
    ];

    // 3. Counterparties
    this.counterparties = [
      { id: 'CPTY-101', name: 'Apex Global Clearing Bank', country: 'US', risk_level: 'LOW', institution_type: 'BANK', is_sanctioned_proxy: 0 },
      { id: 'CPTY-102', name: 'Vanguard European Settlements', country: 'DE', risk_level: 'LOW', institution_type: 'BANK', is_sanctioned_proxy: 0 },
      { id: 'CPTY-103', name: 'Caspian Petrochem Logistics', country: 'IR', risk_level: 'CRITICAL', institution_type: 'CORP', is_sanctioned_proxy: 1 },
      { id: 'CPTY-104', name: 'Pacific Rim Trade Financial', country: 'SG', risk_level: 'LOW', institution_type: 'FINTECH', is_sanctioned_proxy: 0 },
      { id: 'CPTY-105', name: 'Horizon Crypto Exchange FZE', country: 'AE', risk_level: 'HIGH', institution_type: 'EXCHANGE', is_sanctioned_proxy: 0 },
      { id: 'CPTY-106', name: 'Severnaya Mining & Metals', country: 'RU', risk_level: 'CRITICAL', institution_type: 'CORP', is_sanctioned_proxy: 1 },
      { id: 'CPTY-107', name: 'Zurich Private Wealth Custody', country: 'CH', risk_level: 'LOW', institution_type: 'BANK', is_sanctioned_proxy: 0 },
      { id: 'CPTY-108', name: 'Thames Merchant Gateway Ltd', country: 'GB', risk_level: 'LOW', institution_type: 'FINTECH', is_sanctioned_proxy: 0 },
      { id: 'CPTY-109', name: 'Red Star Heavy Industries Ltd', country: 'KP', risk_level: 'CRITICAL', institution_type: 'CORP', is_sanctioned_proxy: 1 },
      { id: 'CPTY-110', name: 'Tokyo Interbank Settlement', country: 'JP', risk_level: 'LOW', institution_type: 'BANK', is_sanctioned_proxy: 0 },
      { id: 'CPTY-111', name: 'Golden Shield Trust S.A.', country: 'PA', risk_level: 'HIGH', institution_type: 'CORP', is_sanctioned_proxy: 0 },
      { id: 'CPTY-112', name: 'Damascus Trading Consortium', country: 'SY', risk_level: 'CRITICAL', institution_type: 'CORP', is_sanctioned_proxy: 1 },
      { id: 'CPTY-113', name: 'Nordic Sovereign Clearnet', country: 'SE', risk_level: 'LOW', institution_type: 'BANK', is_sanctioned_proxy: 0 },
      { id: 'CPTY-114', name: 'Atlas Commodities Trading DMCC', country: 'AE', risk_level: 'MEDIUM', institution_type: 'CORP', is_sanctioned_proxy: 0 },
      { id: 'CPTY-115', name: 'Latin America Express Remit', country: 'MX', risk_level: 'MEDIUM', institution_type: 'FINTECH', is_sanctioned_proxy: 0 },
      { id: 'CPTY-116', name: 'Hong Kong Commercial Transact', country: 'HK', risk_level: 'LOW', institution_type: 'BANK', is_sanctioned_proxy: 0 },
      { id: 'CPTY-117', name: 'Sydney Wholesale Liquidity Corp', country: 'AU', risk_level: 'LOW', institution_type: 'BANK', is_sanctioned_proxy: 0 },
      { id: 'CPTY-118', name: 'Bosphorus Inter-Trade A.S.', country: 'TR', risk_level: 'MEDIUM', institution_type: 'CORP', is_sanctioned_proxy: 0 },
      { id: 'CPTY-119', name: 'Pyongyang Tech Transfer Co', country: 'KP', risk_level: 'CRITICAL', institution_type: 'CORP', is_sanctioned_proxy: 1 },
      { id: 'CPTY-120', name: 'Toronto Dominion Settlements', country: 'CA', risk_level: 'LOW', institution_type: 'BANK', is_sanctioned_proxy: 0 }
    ];

    // 4. Customers
    this.customers = [
      { id: 'CUST-1001', name: 'Nexus Financial Technologies Inc', type: 'CORPORATE', country: 'US', kyc_status: 'VERIFIED', risk_rating: 'LOW', occupation_or_industry: 'FinTech Platform', monthly_expected_turnover: 750000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1002', name: 'Elena Rostova', type: 'INDIVIDUAL', country: 'DE', kyc_status: 'VERIFIED', risk_rating: 'LOW', occupation_or_industry: 'Software Architect', monthly_expected_turnover: 12000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1003', name: 'Viktor Mikhailov', type: 'INDIVIDUAL', country: 'RU', kyc_status: 'EXPIRED', risk_rating: 'CRITICAL', occupation_or_industry: 'Import-Export Trader', monthly_expected_turnover: 450000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1004', name: 'Orion Global Logistics Ltd', type: 'CORPORATE', country: 'GB', kyc_status: 'VERIFIED', risk_rating: 'MEDIUM', occupation_or_industry: 'Freight & Supply Chain', monthly_expected_turnover: 1200000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1005', name: 'Tariq Al-Mansoor', type: 'INDIVIDUAL', country: 'AE', kyc_status: 'PENDING', risk_rating: 'MEDIUM', occupation_or_industry: 'Consultant', monthly_expected_turnover: 35000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1006', name: 'Sophia Chen', type: 'INDIVIDUAL', country: 'SG', kyc_status: 'VERIFIED', risk_rating: 'LOW', occupation_or_industry: 'Investment Analyst', monthly_expected_turnover: 18000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1007', name: 'Blue Ridge Ventures LLC', type: 'SME', country: 'US', kyc_status: 'VERIFIED', risk_rating: 'LOW', occupation_or_industry: 'Early Stage Venture', monthly_expected_turnover: 150000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1008', name: 'Alireza Soleimani', type: 'INDIVIDUAL', country: 'IR', kyc_status: 'REJECTED', risk_rating: 'CRITICAL', occupation_or_industry: 'Unknown', monthly_expected_turnover: 60000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1009', name: 'Nordic Clean Energy AB', type: 'CORPORATE', country: 'SE', kyc_status: 'VERIFIED', risk_rating: 'LOW', occupation_or_industry: 'Renewable Utilities', monthly_expected_turnover: 890000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1010', name: 'Liam O’Connor', type: 'INDIVIDUAL', country: 'IE', kyc_status: 'VERIFIED', risk_rating: 'LOW', occupation_or_industry: 'Medical Practitioner', monthly_expected_turnover: 15000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1011', name: 'Caspian Horizon Maritime Ltd', type: 'CORPORATE', country: 'CY', kyc_status: 'EXPIRED', risk_rating: 'HIGH', occupation_or_industry: 'Ship Chartering', monthly_expected_turnover: 550000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1012', name: 'Amina Diallo', type: 'INDIVIDUAL', country: 'FR', kyc_status: 'VERIFIED', risk_rating: 'LOW', occupation_or_industry: 'Graphic Designer', monthly_expected_turnover: 8500.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1013', name: 'Kyoto Precision Tooling KK', type: 'CORPORATE', country: 'JP', kyc_status: 'VERIFIED', risk_rating: 'LOW', occupation_or_industry: 'Precision Robotics', monthly_expected_turnover: 950000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1014', name: 'Sergei Belov', type: 'INDIVIDUAL', country: 'RU', kyc_status: 'REJECTED', risk_rating: 'CRITICAL', occupation_or_industry: 'Asset Management', monthly_expected_turnover: 850000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1015', name: 'Maya Patel', type: 'INDIVIDUAL', country: 'GB', kyc_status: 'VERIFIED', risk_rating: 'LOW', occupation_or_industry: 'Civil Engineer', monthly_expected_turnover: 14000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1016', name: 'Apex Digital Arbitrage Fund', type: 'CORPORATE', country: 'KY', kyc_status: 'PENDING', risk_rating: 'HIGH', occupation_or_industry: 'Digital Asset Hedge Fund', monthly_expected_turnover: 2500000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1017', name: 'Carlos Morales', type: 'INDIVIDUAL', country: 'ES', kyc_status: 'VERIFIED', risk_rating: 'LOW', occupation_or_industry: 'Hospitality Director', monthly_expected_turnover: 11000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1018', name: 'Red Star Procurement FZE', type: 'SME', country: 'AE', kyc_status: 'EXPIRED', risk_rating: 'CRITICAL', occupation_or_industry: 'General Merchandise', monthly_expected_turnover: 320000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1019', name: 'Hannah Becker', type: 'INDIVIDUAL', country: 'DE', kyc_status: 'VERIFIED', risk_rating: 'LOW', occupation_or_industry: 'University Professor', monthly_expected_turnover: 9500.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1020', name: 'Golden Shield Investments', type: 'CORPORATE', country: 'PA', kyc_status: 'REJECTED', risk_rating: 'HIGH', occupation_or_industry: 'Wealth Holding Corp', monthly_expected_turnover: 1800000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1021', name: 'James Wilson', type: 'INDIVIDUAL', country: 'AU', kyc_status: 'VERIFIED', risk_rating: 'LOW', occupation_or_industry: 'Aviation Pilot', monthly_expected_turnover: 22000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1022', name: 'Zurich High Tech GmbH', type: 'SME', country: 'CH', kyc_status: 'VERIFIED', risk_rating: 'LOW', occupation_or_industry: 'Industrial Sensors', monthly_expected_turnover: 280000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1023', name: 'Min Aung Zaw', type: 'INDIVIDUAL', country: 'MM', kyc_status: 'REJECTED', risk_rating: 'CRITICAL', occupation_or_industry: 'Trading Agent', monthly_expected_turnover: 190000.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1024', name: 'Fatima Al-Zahra', type: 'INDIVIDUAL', country: 'AE', kyc_status: 'VERIFIED', risk_rating: 'LOW', occupation_or_industry: 'Biotech Scientist', monthly_expected_turnover: 17500.0, created_at: isoNow, updated_at: isoNow },
      { id: 'CUST-1025', name: 'Global Frontier Minerals S.A.', type: 'CORPORATE', country: 'ZA', kyc_status: 'VERIFIED', risk_rating: 'MEDIUM', occupation_or_industry: 'Commodity Extraction', monthly_expected_turnover: 1400000.0, created_at: isoNow, updated_at: isoNow }
    ];

    // 5. Accounts
    this.accounts = [
      { id: 'ACC-8001', customer_id: 'CUST-1001', currency: 'USD', balance: 345000.0, status: 'ACTIVE' },
      { id: 'ACC-8002', customer_id: 'CUST-1001', currency: 'EUR', balance: 180000.0, status: 'ACTIVE' },
      { id: 'ACC-8003', customer_id: 'CUST-1002', currency: 'EUR', balance: 14500.0, status: 'ACTIVE' },
      { id: 'ACC-8004', customer_id: 'CUST-1003', currency: 'USD', balance: 420000.0, status: 'SUSPENDED' },
      { id: 'ACC-8005', customer_id: 'CUST-1004', currency: 'GBP', balance: 650000.0, status: 'ACTIVE' },
      { id: 'ACC-8006', customer_id: 'CUST-1004', currency: 'USD', balance: 890000.0, status: 'ACTIVE' },
      { id: 'ACC-8007', customer_id: 'CUST-1005', currency: 'AED', balance: 85000.0, status: 'ACTIVE' },
      { id: 'ACC-8008', customer_id: 'CUST-1006', currency: 'SGD', balance: 42000.0, status: 'ACTIVE' },
      { id: 'ACC-8009', customer_id: 'CUST-1006', currency: 'USD', balance: 25000.0, status: 'ACTIVE' },
      { id: 'ACC-8010', customer_id: 'CUST-1007', currency: 'USD', balance: 175000.0, status: 'ACTIVE' },
      { id: 'ACC-8011', customer_id: 'CUST-1008', currency: 'EUR', balance: 92000.0, status: 'FROZEN' },
      { id: 'ACC-8012', customer_id: 'CUST-1009', currency: 'EUR', balance: 450000.0, status: 'ACTIVE' },
      { id: 'ACC-8013', customer_id: 'CUST-1010', currency: 'EUR', balance: 18500.0, status: 'ACTIVE' },
      { id: 'ACC-8014', customer_id: 'CUST-1011', currency: 'USD', balance: 210000.0, status: 'ACTIVE' },
      { id: 'ACC-8015', customer_id: 'CUST-1012', currency: 'EUR', balance: 7800.0, status: 'ACTIVE' },
      { id: 'ACC-8016', customer_id: 'CUST-1013', currency: 'JPY', balance: 85000000.0, status: 'ACTIVE' },
      { id: 'ACC-8017', customer_id: 'CUST-1013', currency: 'USD', balance: 520000.0, status: 'ACTIVE' },
      { id: 'ACC-8018', customer_id: 'CUST-1014', currency: 'USD', balance: 680000.0, status: 'FROZEN' },
      { id: 'ACC-8019', customer_id: 'CUST-1015', currency: 'GBP', balance: 24000.0, status: 'ACTIVE' },
      { id: 'ACC-8020', customer_id: 'CUST-1016', currency: 'USD', balance: 1450000.0, status: 'ACTIVE' },
      { id: 'ACC-8021', customer_id: 'CUST-1017', currency: 'EUR', balance: 15400.0, status: 'ACTIVE' },
      { id: 'ACC-8022', customer_id: 'CUST-1018', currency: 'USD', balance: 240000.0, status: 'SUSPENDED' },
      { id: 'ACC-8023', customer_id: 'CUST-1019', currency: 'EUR', balance: 12800.0, status: 'ACTIVE' },
      { id: 'ACC-8024', customer_id: 'CUST-1020', currency: 'USD', balance: 890000.0, status: 'FROZEN' },
      { id: 'ACC-8025', customer_id: 'CUST-1021', currency: 'AUD', balance: 32000.0, status: 'ACTIVE' },
      { id: 'ACC-8026', customer_id: 'CUST-1022', currency: 'CHF', balance: 210000.0, status: 'ACTIVE' },
      { id: 'ACC-8027', customer_id: 'CUST-1023', currency: 'USD', balance: 135000.0, status: 'FROZEN' },
      { id: 'ACC-8028', customer_id: 'CUST-1024', currency: 'AED', balance: 65000.0, status: 'ACTIVE' },
      { id: 'ACC-8029', customer_id: 'CUST-1025', currency: 'USD', balance: 920000.0, status: 'ACTIVE' }
    ];

    // 6. Screening Results
    this.screeningResults = [
      { id: 'SCR-101', target_type: 'CUSTOMER', target_id: 'CUST-1003', query_name: 'Viktor Mikhailov', matched_entity_id: 'WL-001', matched_entity_name: 'Viktor Mikhailov', match_score: 1.0, status: 'FLAGGED', notes: 'Exact match against synthetic OFAC list.', screened_by: 'sarah.jenkins@sentinel.internal', created_at: isoNow },
      { id: 'SCR-102', target_type: 'COUNTERPARTY', target_id: 'CPTY-103', query_name: 'Caspian Petrochem Logistics', matched_entity_id: 'WL-002', matched_entity_name: 'Caspian Petrochem Logistics', match_score: 1.0, status: 'FLAGGED', notes: 'Simulated maritime sanctions target.', screened_by: 'compliance.screener@sentinel.internal', created_at: isoNow },
      { id: 'SCR-103', target_type: 'AD_HOC', target_id: null, query_name: 'Elena Rostova', matched_entity_id: null, match_score: 0.15, status: 'CLEARED', notes: 'No watchlist matches exceeding threshold.', screened_by: 'compliance.screener@sentinel.internal', created_at: isoNow },
    ];

    // 7. Historical Transactions (160 records across past 14 days)
    this.transactions = [];
    this.riskAssessments = new Map();
    this.alerts = [];
    this.investigationNotes = [];

    const channels = ['WEB', 'MOBILE', 'API', 'SWIFT', 'ATM'] as const;
    const types = ['WIRE', 'ACH', 'INSTANT', 'INTERNAL', 'CROSS_BORDER'] as const;

    for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
      const txsThisDay = dayOffset === 0 ? 30 : 10;
      for (let i = 0; i < txsThisDay; i++) {
        const txId = `TX-${this.txCounter++}`;
        const txTime = new Date(now.getTime() - (dayOffset * 86400000) + (i * 3600000) - (dayOffset * 600000));
        const txIso = txTime.toISOString();

        const senderAcc = this.accounts[(i + dayOffset) % this.accounts.length];
        const cust = this.customers.find((c) => c.id === senderAcc.customer_id) || this.customers[0];
        const cpty = this.counterparties[(i * 3 + dayOffset) % this.counterparties.length];
        let amount = Math.round((50 + ((i * 177 + dayOffset * 83) % 4500)) * 100) / 100;
        let channel = channels[(i + dayOffset) % channels.length];
        let type = types[(i * 2 + dayOffset) % types.length];
        const originCountry = cust.country;
        let destCountry = cpty.country;
        let status = 'COMPLETED';

        const triggeredRules: any[] = [];
        let ruleScore = 0;
        let mlAnomalyScore = 0.15;
        let mlIsAnomaly = 0;
        let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
        let explanation = 'Transaction parameters within normal baseline behavioral profile.';
        let recommendedAction = 'AUTOMATIC_CLEARANCE';

        // Typology 1: Structuring ($9,000 - $9,999)
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

        // Typology 2: Sanctioned Counterparty or High-Risk Country
        if (cpty.is_sanctioned_proxy === 1 || ['IR', 'KP', 'SY', 'RU'].includes(destCountry)) {
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

          if (cpty.is_sanctioned_proxy === 1) {
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

        // Typology 3: High Value
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

        // Typology 4: Incomplete KYC
        if (cust.kyc_status !== 'VERIFIED') {
          triggeredRules.push({
            ruleId: 'RULE-KYC-INCOMPLETE',
            ruleName: 'Incomplete or Expired KYC Profile',
            category: 'AML',
            weight: 30,
            scoreContribution: 30,
            reason: `Originating customer KYC profile status is ${cust.kyc_status}.`
          });
          ruleScore += 30;
          mlAnomalyScore = Math.max(mlAnomalyScore, 0.68);
          mlIsAnomaly = 1;
        }

        const combinedScore = Math.min(100, Math.round(ruleScore * 0.75 + (mlAnomalyScore * 100) * 0.25));
        const finalScore = ruleScore === 0 ? Math.min(25, Math.round(mlAnomalyScore * 30)) : combinedScore;

        if (finalScore >= 80) {
          severity = 'CRITICAL';
          status = 'HELD';
          explanation = `Critical risk detected (${triggeredRules.map((r) => r.ruleName).join(', ')}). Immediate compliance escalation required.`;
          recommendedAction = 'ESCALATE_TO_COMPLIANCE';
        } else if (finalScore >= 60) {
          severity = 'HIGH';
          status = 'FLAGGED';
          explanation = `High risk detected (${triggeredRules.map((r) => r.ruleName).join(', ')}). Requires manual review.`;
          recommendedAction = 'MANUAL_REVIEW';
        } else if (finalScore >= 30) {
          severity = 'MEDIUM';
          explanation = 'Elevated transaction metrics detected. Logged for standard compliance audit.';
          recommendedAction = 'ENHANCED_MONITORING';
        }

        const txObj: MockTransaction = {
          id: txId,
          sender_account_id: senderAcc.id,
          sender_customer_id: cust.id,
          receiver_account_id: `ACC-EXT-${2000 + i}`,
          receiver_customer_id: null,
          counterparty_id: cpty.id,
          amount,
          currency: senderAcc.currency,
          channel,
          type,
          origin_country: originCountry,
          dest_country: destCountry,
          status,
          risk_score: finalScore,
          risk_band: severity,
          created_at: txIso,
          customer_name: cust.name,
          counterparty_name: cpty.name,
        };

        const raObj: MockRiskAssessment = {
          id: `RA-${txId}`,
          transaction_id: txId,
          rule_score: ruleScore,
          ml_anomaly_score: mlAnomalyScore,
          ml_is_anomaly: mlIsAnomaly,
          ml_service_status: 'HEALTHY',
          final_risk_score: finalScore,
          severity,
          triggered_rules_json: JSON.stringify(triggeredRules),
          explanation,
          recommended_action: recommendedAction,
          created_at: txIso,
        };

        this.transactions.unshift(txObj);
        this.riskAssessments.set(txId, raObj);

        // Alert generation
        if (severity === 'CRITICAL' || severity === 'HIGH' || (severity === 'MEDIUM' && i % 2 === 0)) {
          const alertId = `ALT-${this.alertCounter++}`;
          const alertStatuses: Array<'NEW' | 'UNDER_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'FALSE_POSITIVE'> =
            ['NEW', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'FALSE_POSITIVE'];
          const alertStatus = dayOffset === 0 ? (i % 2 === 0 ? 'NEW' : 'UNDER_REVIEW') : alertStatuses[(i + dayOffset) % alertStatuses.length];
          const category = triggeredRules.length > 0 ? triggeredRules[0].category : 'BEHAVIOR';
          const triggerReason = triggeredRules.length > 0 ? triggeredRules.map((r) => r.reason).join(' | ') : `Elevated statistical anomaly score (${mlAnomalyScore.toFixed(2)})`;
          const assignedTo = alertStatus !== 'NEW' ? 'sarah.jenkins@sentinel.internal' : null;
          const resolutionReason = alertStatus === 'RESOLVED'
            ? 'Customer source of wealth verified via secondary documentation. Cleared.'
            : alertStatus === 'FALSE_POSITIVE'
            ? 'Known seasonal commercial inventory purchase pattern confirmed.'
            : null;

          const alertObj: MockAlert = {
            id: alertId,
            transaction_id: txId,
            customer_id: cust.id,
            account_id: senderAcc.id,
            category,
            severity,
            risk_score: finalScore,
            status: alertStatus,
            assigned_to: assignedTo,
            trigger_reason: triggerReason,
            triggered_rules_json: JSON.stringify(triggeredRules),
            ml_anomaly_data_json: JSON.stringify({ anomaly_score: mlAnomalyScore, is_anomaly: mlIsAnomaly === 1 }),
            resolution_reason: resolutionReason,
            created_at: txIso,
            updated_at: txIso,
            customer_name: cust.name,
            amount,
            currency: senderAcc.currency,
            transaction_type: type,
            channel,
          };

          this.alerts.unshift(alertObj);

          if (alertStatus === 'UNDER_REVIEW' || alertStatus === 'ESCALATED') {
            this.investigationNotes.push({
              id: `NOTE-${alertId}-1`,
              alert_id: alertId,
              author: 'sarah.jenkins@sentinel.internal',
              note: 'Initiated identity profile cross-reference against international sanctions indices.',
              action_taken: 'IN_PROGRESS',
              created_at: txIso,
            });
          }
          if (alertStatus === 'RESOLVED' || alertStatus === 'FALSE_POSITIVE') {
            this.investigationNotes.push({
              id: `NOTE-${alertId}-2`,
              alert_id: alertId,
              author: 'marcus.vance@sentinel.internal',
              note: resolutionReason || 'Case closed after compliance analyst review.',
              action_taken: 'CLOSED',
              created_at: txIso,
            });
          }
        }
      }
    }

    // 8. Audit Events
    this.auditEvents = [
      { id: 'AUD-001', actor: 'system.init', event_type: 'SYSTEM_BOOT', entity_type: 'SYSTEM', entity_id: 'ENV-CLOUD', action: 'INITIALIZE_SIMULATION', reason: 'RegTech Sentinel interactive cloud demo environment initialized', correlation_id: 'CORR-SYS-INIT', created_at: isoNow },
      { id: 'AUD-002', actor: 'admin.officer@sentinel.internal', event_type: 'RULE_CONFIGURE', entity_type: 'RISK_RULE', entity_id: 'RULE-HIGH-VAL', action: 'SET_THRESHOLD', reason: 'Configured standard $10,000 regulatory reporting threshold', correlation_id: 'CORR-SYS-INIT', created_at: isoNow },
      { id: 'AUD-003', actor: 'ml.supervisor', event_type: 'ML_SYNC', entity_type: 'MODEL', entity_id: 'RegTech-Sentinel-IsolationForest', action: 'LOAD_MODEL', reason: 'Loaded trained Isolation Forest anomaly detection artifact v1.0.0', correlation_id: 'CORR-SYS-INIT', created_at: isoNow },
      { id: 'AUD-004', actor: 'sarah.jenkins@sentinel.internal', event_type: 'ALERT_ASSIGN', entity_type: 'ALERT', entity_id: 'ALT-3004', action: 'ASSIGN_CASE', reason: 'Assigned high risk structuring alert for compliance review', correlation_id: 'CORR-SYS-INIT', created_at: isoNow }
    ];
  }

  // Simulator controls
  public getSimulatorStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      intervalMs: this.intervalMs,
      generatedCount: this.generatedCount,
    };
  }

  public startSimulator() {
    this.isRunning = true;
    this.isPaused = false;
    this.scheduleNextTick();
    this.emit('simulator:status', this.getSimulatorStatus());
  }

  public pauseSimulator() {
    this.isPaused = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.emit('simulator:status', this.getSimulatorStatus());
  }

  public resumeSimulator() {
    this.isPaused = false;
    this.scheduleNextTick();
    this.emit('simulator:status', this.getSimulatorStatus());
  }

  public stopSimulator() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.emit('simulator:status', this.getSimulatorStatus());
  }

  public setSimulatorRate(intervalMs: number) {
    this.intervalMs = Math.max(500, Math.min(10000, intervalMs));
    if (this.isRunning && !this.isPaused) {
      if (this.timer) clearTimeout(this.timer);
      this.scheduleNextTick();
    }
    this.emit('simulator:status', this.getSimulatorStatus());
  }

  private scheduleNextTick() {
    if (!this.isRunning || this.isPaused) return;
    this.timer = setTimeout(() => {
      try {
        this.generateSingleTransaction();
      } catch (err) {
        console.error('[MockEngine] Error in simulation tick:', err);
      }
      this.scheduleNextTick();
    }, this.intervalMs);
  }

  public generateSingleTransaction(overrides?: Partial<MockTransaction>) {
    const sender = this.prng.choice(this.accounts);
    const cust = this.customers.find((c) => c.id === sender.customer_id) || this.customers[0];
    const cpty = this.prng.choice(this.counterparties);
    const channels = ['WEB', 'MOBILE', 'API', 'SWIFT', 'ATM'] as const;
    const types = ['WIRE', 'ACH', 'INSTANT', 'CROSS_BORDER'] as const;

    const channel = overrides?.channel || this.prng.choice(channels);
    const type = overrides?.type || this.prng.choice(types);

    const roll = this.prng.next();
    let amount = overrides?.amount !== undefined ? overrides.amount : Math.round(this.prng.range(30, 4500) * 100) / 100;
    const originCountry = overrides?.origin_country || 'US';
    let destCountry = overrides?.dest_country || cpty.country;

    if (!overrides) {
      if (roll > 0.88) {
        destCountry = this.prng.choice(['IR', 'KP', 'SY', 'RU', 'MM']);
        amount = Math.round(this.prng.range(8000, 35000) * 100) / 100;
      } else if (roll > 0.78) {
        amount = Math.round(this.prng.range(9100, 9950) * 100) / 100;
      } else if (roll > 0.68) {
        amount = Math.round(this.prng.range(12000, 75000) * 100) / 100;
      }
    }

    const txId = `TX-${this.txCounter++}`;
    const txIso = new Date().toISOString();

    const triggeredRules: any[] = [];
    let ruleScore = 0;
    let mlAnomalyScore = 0.12 + Math.round(this.prng.next() * 15) / 100;
    let mlIsAnomaly = 0;
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let explanation = 'Normal transaction profile within expected limits.';
    let recommendedAction = 'AUTOMATIC_CLEARANCE';

    if (amount >= 9000 && amount <= 9999) {
      triggeredRules.push({
        ruleId: 'RULE-STRUCTURING',
        ruleName: 'Structuring Pattern (<$10K)',
        category: 'AML',
        weight: 35,
        scoreContribution: 35,
        reason: `Transaction amount $${amount.toFixed(2)} is close to regulatory reporting boundary ($9,000 - $9,999).`
      });
      ruleScore += 35;
      mlAnomalyScore = 0.76;
      mlIsAnomaly = 1;
    }

    if (amount > 10000) {
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

    if (['IR', 'KP', 'SY', 'RU'].includes(destCountry) || cpty.is_sanctioned_proxy === 1) {
      triggeredRules.push({
        ruleId: 'RULE-HIGH-RISK-GEO',
        ruleName: 'High-Risk Sanctions Jurisdiction',
        category: 'SANCTIONS',
        weight: 40,
        scoreContribution: 40,
        reason: `Destination country ${destCountry} flagged on sanctions list.`
      });
      ruleScore += 40;
      mlAnomalyScore = Math.max(mlAnomalyScore, 0.88);
      mlIsAnomaly = 1;
    }

    const combinedScore = Math.min(100, Math.round(ruleScore * 0.75 + (mlAnomalyScore * 100) * 0.25));
    const finalScore = ruleScore === 0 ? Math.min(25, Math.round(mlAnomalyScore * 30)) : combinedScore;

    let status = 'COMPLETED';
    if (finalScore >= 80) {
      severity = 'CRITICAL';
      status = 'HELD';
      explanation = `Critical multi-typology risk detected (${triggeredRules.map((r) => r.ruleName).join(', ')}). Immediate compliance escalation required.`;
      recommendedAction = 'ESCALATE_TO_COMPLIANCE';
    } else if (finalScore >= 60) {
      severity = 'HIGH';
      status = 'FLAGGED';
      explanation = `High risk detected (${triggeredRules.map((r) => r.ruleName).join(', ')}). Requires manual compliance review.`;
      recommendedAction = 'MANUAL_REVIEW';
    } else if (finalScore >= 30) {
      severity = 'MEDIUM';
      explanation = 'Elevated behavioral risk characteristics observed. Logged for standard compliance tracking.';
      recommendedAction = 'ENHANCED_MONITORING';
    }

    const tx: MockTransaction = {
      id: txId,
      sender_account_id: sender.id,
      sender_customer_id: cust.id,
      receiver_account_id: `ACC-EXT-${Math.floor(1000 + this.prng.next() * 9000)}`,
      receiver_customer_id: null,
      counterparty_id: cpty.id,
      amount,
      currency: sender.currency,
      channel,
      type,
      origin_country: originCountry,
      dest_country: destCountry,
      status,
      risk_score: finalScore,
      risk_band: severity,
      created_at: txIso,
      customer_name: cust.name,
      counterparty_name: cpty.name,
    };

    const ra: MockRiskAssessment = {
      id: `RA-${txId}`,
      transaction_id: txId,
      rule_score: ruleScore,
      ml_anomaly_score: mlAnomalyScore,
      ml_is_anomaly: mlIsAnomaly,
      ml_service_status: 'HEALTHY',
      final_risk_score: finalScore,
      severity,
      triggered_rules_json: JSON.stringify(triggeredRules),
      explanation,
      recommended_action: recommendedAction,
      created_at: txIso,
    };

    this.transactions.unshift(tx);
    this.riskAssessments.set(txId, ra);
    this.generatedCount++;

    let createdAlert: MockAlert | null = null;
    if (severity === 'CRITICAL' || severity === 'HIGH' || (severity === 'MEDIUM' && this.prng.next() > 0.5)) {
      const alertId = `ALT-${this.alertCounter++}`;
      createdAlert = {
        id: alertId,
        transaction_id: txId,
        customer_id: cust.id,
        account_id: sender.id,
        category: triggeredRules[0]?.category || 'BEHAVIOR',
        severity,
        risk_score: finalScore,
        status: 'NEW',
        assigned_to: null,
        trigger_reason: triggeredRules.map((r) => r.reason).join(' | ') || `Statistical anomaly score ${mlAnomalyScore.toFixed(2)}`,
        triggered_rules_json: JSON.stringify(triggeredRules),
        ml_anomaly_data_json: JSON.stringify({ anomaly_score: mlAnomalyScore, is_anomaly: mlIsAnomaly === 1 }),
        resolution_reason: null,
        created_at: txIso,
        updated_at: txIso,
        customer_name: cust.name,
        amount,
        currency: sender.currency,
        transaction_type: type,
        channel,
      };
      this.alerts.unshift(createdAlert);
    }

    // Broadcast WebSocket updates
    this.emit('transaction:new', tx);
    if (createdAlert) {
      this.emit('alert:new', createdAlert);
    }
    this.emit('simulator:status', this.getSimulatorStatus());

    return { transaction: tx, riskAssessment: ra, alert: createdAlert };
  }

  public generateSuspiciousTx() {
    return this.generateSingleTransaction({
      amount: 9850.00,
      channel: 'API',
      type: 'WIRE',
      origin_country: 'US',
      dest_country: 'IR',
    });
  }

  public generateBatch(count: number = 5) {
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(this.generateSingleTransaction());
    }
    return results;
  }

  // Dashboard Telemetry
  public getDashboard() {
    const totalTx = this.transactions.length;
    const totalVolume = this.transactions.reduce((acc, t) => acc + t.amount, 0);
    const activeAlerts = this.alerts.filter((a) => a.status === 'NEW' || a.status === 'UNDER_REVIEW').length;
    const criticalAlerts = this.alerts.filter((a) => a.severity === 'CRITICAL').length;
    const avgRiskScore = Math.round(this.transactions.slice(0, 100).reduce((acc, t) => acc + t.risk_score, 0) / Math.max(1, Math.min(100, totalTx)));

    // Risk distribution
    const riskCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    this.transactions.forEach((t) => {
      if (riskCounts[t.risk_band] !== undefined) riskCounts[t.risk_band]++;
    });

    const riskDistribution = [
      { name: 'Low Risk (0-29)', count: riskCounts.LOW, color: '#10B981' },
      { name: 'Medium Risk (30-59)', count: riskCounts.MEDIUM, color: '#F59E0B' },
      { name: 'High Risk (60-79)', count: riskCounts.HIGH, color: '#F97316' },
      { name: 'Critical Risk (80-100)', count: riskCounts.CRITICAL, color: '#EF4444' },
    ];

    // Volume over time (last 7 days grouped)
    const volumeMap = new Map<string, { volume: number; count: number }>();
    this.transactions.slice(0, 100).forEach((t) => {
      const day = t.created_at.slice(5, 10);
      const curr = volumeMap.get(day) || { volume: 0, count: 0 };
      curr.volume += t.amount;
      curr.count++;
      volumeMap.set(day, curr);
    });
    const volumeOverTime = Array.from(volumeMap.entries())
      .slice(-7)
      .map(([date, val]) => ({
        date,
        volume: Math.round(val.volume),
        count: val.count,
      }));

    // Alert categories
    const catMap = new Map<string, number>();
    this.alerts.forEach((a) => catMap.set(a.category, (catMap.get(a.category) || 0) + 1));
    const alertCategories = Array.from(catMap.entries()).map(([name, count]) => ({ name, count }));

    // Top counterparties
    const cptyVol = new Map<string, number>();
    this.transactions.forEach((t) => {
      const c = this.counterparties.find((cp) => cp.id === t.counterparty_id)?.name || 'Other';
      cptyVol.set(c, (cptyVol.get(c) || 0) + t.amount);
    });
    const topCounterpartiesByVolume = Array.from(cptyVol.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, volume]) => ({ name, volume: Math.round(volume) }));

    return {
      success: true,
      data: {
        kpis: {
          totalTransactions: totalTx,
          totalVolumeUSD: Math.round(totalVolume),
          activeAlertsCount: activeAlerts,
          criticalAlertsCount: criticalAlerts,
          avgRiskScore,
          mlInferenceCount: totalTx,
          mlAnomalyCount: this.transactions.filter((t) => (this.riskAssessments.get(t.id)?.ml_is_anomaly || 0) === 1).length,
        },
        charts: {
          volumeOverTime,
          riskDistribution,
          alertCategories,
          topCounterpartiesByVolume,
        },
        recentTransactions: this.transactions.slice(0, 10),
        recentAlerts: this.alerts.slice(0, 10),
        recentAudits: this.auditEvents.slice(0, 5),
        systemStatus: {
          database: 'HEALTHY',
          mlService: 'HEALTHY',
          ruleEngine: 'HEALTHY',
          simulator: this.isRunning && !this.isPaused ? 'RUNNING' : 'PAUSED',
        },
      },
    };
  }

  // Transactions API
  public getTransactions(params: Record<string, any> = {}) {
    let list = [...this.transactions];
    if (params.search) {
      const q = String(params.search).toLowerCase();
      list = list.filter((t) =>
        t.id.toLowerCase().includes(q) ||
        t.sender_account_id.toLowerCase().includes(q) ||
        (t.customer_name && t.customer_name.toLowerCase().includes(q)) ||
        (t.counterparty_name && t.counterparty_name.toLowerCase().includes(q))
      );
    }
    if (params.risk_band && params.risk_band !== 'ALL') {
      list = list.filter((t) => t.risk_band === params.risk_band);
    }
    if (params.status && params.status !== 'ALL') {
      list = list.filter((t) => t.status === params.status);
    }
    if (params.channel && params.channel !== 'ALL') {
      list = list.filter((t) => t.channel === params.channel);
    }

    const total = list.length;
    const page = parseInt(params.page || '1', 10);
    const limit = parseInt(params.limit || '15', 10);
    const start = (page - 1) * limit;
    const paginated = list.slice(start, start + limit);

    return {
      success: true,
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public getTransactionDetail(id: string) {
    const tx = this.transactions.find((t) => t.id === id);
    if (!tx) throw new Error(`Transaction ${id} not found`);
    const ra = this.riskAssessments.get(id);
    const cust = this.customers.find((c) => c.id === tx.sender_customer_id);
    const cpty = this.counterparties.find((c) => c.id === tx.counterparty_id);
    const alert = this.alerts.find((a) => a.transaction_id === id);

    return {
      success: true,
      data: {
        transaction: tx,
        riskAssessment: ra ? {
          ...ra,
          triggeredRules: JSON.parse(ra.triggered_rules_json || '[]'),
        } : null,
        customer: cust,
        counterparty: cpty,
        associatedAlert: alert,
      },
    };
  }

  // Alerts API
  public getAlerts(params: Record<string, any> = {}) {
    let list = [...this.alerts];
    if (params.search) {
      const q = String(params.search).toLowerCase();
      list = list.filter((a) =>
        a.id.toLowerCase().includes(q) ||
        a.transaction_id.toLowerCase().includes(q) ||
        (a.customer_name && a.customer_name.toLowerCase().includes(q)) ||
        a.trigger_reason.toLowerCase().includes(q)
      );
    }
    if (params.status && params.status !== 'ALL') {
      list = list.filter((a) => a.status === params.status);
    }
    if (params.severity && params.severity !== 'ALL') {
      list = list.filter((a) => a.severity === params.severity);
    }
    if (params.category && params.category !== 'ALL') {
      list = list.filter((a) => a.category === params.category);
    }

    const total = list.length;
    const page = parseInt(params.page || '1', 10);
    const limit = parseInt(params.limit || '15', 10);
    const start = (page - 1) * limit;
    const paginated = list.slice(start, start + limit);

    return {
      success: true,
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public getAlertDetail(id: string) {
    const alert = this.alerts.find((a) => a.id === id);
    if (!alert) throw new Error(`Alert ${id} not found`);
    const notes = this.investigationNotes.filter((n) => n.alert_id === id);
    const tx = this.transactions.find((t) => t.id === alert.transaction_id);
    const cust = this.customers.find((c) => c.id === alert.customer_id);

    return {
      success: true,
      data: {
        alert: {
          ...alert,
          triggeredRules: JSON.parse(alert.triggered_rules_json || '[]'),
          mlData: JSON.parse(alert.ml_anomaly_data_json || '{}'),
        },
        notes,
        transaction: tx,
        customer: cust,
      },
    };
  }

  public updateAlertStatus(id: string, status: any, reason: string, note?: string) {
    const alert = this.alerts.find((a) => a.id === id);
    if (!alert) throw new Error(`Alert ${id} not found`);

    alert.status = status;
    alert.resolution_reason = reason;
    alert.updated_at = new Date().toISOString();

    if (note) {
      this.investigationNotes.push({
        id: `NOTE-${id}-${Date.now().toString(36)}`,
        alert_id: id,
        author: 'sarah.jenkins@sentinel.internal',
        note,
        action_taken: status,
        created_at: new Date().toISOString(),
      });
    }

    this.auditEvents.unshift({
      id: `AUD-${this.auditCounter++}`,
      actor: 'sarah.jenkins@sentinel.internal',
      event_type: 'ALERT_STATUS_UPDATE',
      entity_type: 'ALERT',
      entity_id: id,
      action: `TRANSITION_TO_${status}`,
      reason,
      correlation_id: `CORR-${id}`,
      created_at: new Date().toISOString(),
    });

    return { success: true, data: alert };
  }

  public assignAlert(id: string, assignee: string) {
    const alert = this.alerts.find((a) => a.id === id);
    if (!alert) throw new Error(`Alert ${id} not found`);
    alert.assigned_to = assignee;
    alert.updated_at = new Date().toISOString();
    return { success: true, data: alert };
  }

  public addAlertNote(id: string, note: string) {
    const newNote: MockInvestigationNote = {
      id: `NOTE-${id}-${Date.now().toString(36)}`,
      alert_id: id,
      author: 'sarah.jenkins@sentinel.internal',
      note,
      action_taken: 'NOTE_ADDED',
      created_at: new Date().toISOString(),
    };
    this.investigationNotes.push(newNote);
    return { success: true, data: newNote };
  }

  // Customers API
  public getCustomers(params: Record<string, any> = {}) {
    let list = [...this.customers];
    if (params.search) {
      const q = String(params.search).toLowerCase();
      list = list.filter((c) =>
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.occupation_or_industry.toLowerCase().includes(q)
      );
    }
    if (params.risk_rating && params.risk_rating !== 'ALL') {
      list = list.filter((c) => c.risk_rating === params.risk_rating);
    }
    if (params.kyc_status && params.kyc_status !== 'ALL') {
      list = list.filter((c) => c.kyc_status === params.kyc_status);
    }

    return {
      success: true,
      data: list,
      pagination: { total: list.length, page: 1, limit: list.length, totalPages: 1 },
    };
  }

  public getCustomerDetail(id: string) {
    const cust = this.customers.find((c) => c.id === id);
    if (!cust) throw new Error(`Customer ${id} not found`);
    const accs = this.accounts.filter((a) => a.customer_id === id);
    const txs = this.transactions.filter((t) => t.sender_customer_id === id);
    const alrts = this.alerts.filter((a) => a.customer_id === id);

    return {
      success: true,
      data: {
        customer: cust,
        accounts: accs,
        recentTransactions: txs.slice(0, 15),
        alerts: alrts,
      },
    };
  }

  // Screening API
  public getWatchlist(search?: string, regime?: string) {
    let list = [...this.watchlist];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((w) =>
        w.name.toLowerCase().includes(q) ||
        w.country.toLowerCase().includes(q) ||
        w.program.toLowerCase().includes(q)
      );
    }
    if (regime && regime !== 'ALL') {
      list = list.filter((w) => w.regime === regime);
    }
    return { success: true, count: list.length, data: list };
  }

  public screenEntity(input: { name: string; threshold?: number; target_type?: string }) {
    const threshold = input.threshold !== undefined ? input.threshold : 0.70;
    const queryName = input.name.trim();

    const matches: any[] = [];
    for (const w of this.watchlist) {
      const sim = computeSimilarity(queryName, w.name);
      if (sim >= threshold) {
        matches.push({
          watchlistEntry: w,
          matchScore: sim,
          matchType: sim === 1.0 ? 'EXACT' : 'FUZZY',
        });
      }
    }

    matches.sort((a, b) => b.matchScore - a.matchScore);

    const resultId = `SCR-${Date.now().toString(36)}`;
    const resultObj: MockScreeningResult = {
      id: resultId,
      target_type: input.target_type || 'AD_HOC',
      target_id: null,
      query_name: queryName,
      matched_entity_id: matches[0]?.watchlistEntry.id || null,
      matched_entity_name: matches[0]?.watchlistEntry.name,
      match_score: matches[0]?.matchScore || 0,
      status: matches.length > 0 ? 'FLAGGED' : 'CLEARED',
      notes: matches.length > 0 ? `Matched synthetic sanctions entity with ${(matches[0].matchScore * 100).toFixed(0)}% score.` : 'No matches found.',
      screened_by: 'compliance.screener@sentinel.internal',
      created_at: new Date().toISOString(),
    };

    this.screeningResults.unshift(resultObj);

    return {
      success: true,
      data: {
        screeningResult: resultObj,
        matches,
      },
    };
  }

  public getScreeningHistory(limit: number = 50) {
    return { success: true, count: this.screeningResults.length, data: this.screeningResults.slice(0, limit) };
  }

  public updateScreeningStatus(id: string, status: any, reason: string) {
    const item = this.screeningResults.find((s) => s.id === id);
    if (!item) throw new Error(`Screening record ${id} not found`);
    item.status = status;
    item.notes = `${item.notes} | Review: ${reason}`;
    return { success: true, data: item };
  }

  // Counterparties API
  public getCounterparties() {
    const totalVolume = this.transactions.reduce((acc, t) => acc + t.amount, 0);
    const enriched = this.counterparties.map((cp) => {
      const txs = this.transactions.filter((t) => t.counterparty_id === cp.id);
      const volume = txs.reduce((acc, t) => acc + t.amount, 0);
      const concentrationPct = totalVolume > 0 ? Math.round((volume / totalVolume) * 1000) / 10 : 0;
      return {
        ...cp,
        transaction_count: txs.length,
        total_volume: Math.round(volume),
        concentration_pct: concentrationPct,
      };
    });

    return { success: true, data: enriched };
  }

  public getCounterpartyDetail(id: string) {
    const cp = this.counterparties.find((c) => c.id === id);
    if (!cp) throw new Error(`Counterparty ${id} not found`);
    const txs = this.transactions.filter((t) => t.counterparty_id === id);
    const volume = txs.reduce((acc, t) => acc + t.amount, 0);

    return {
      success: true,
      data: {
        counterparty: {
          ...cp,
          total_volume: Math.round(volume),
          transaction_count: txs.length,
        },
        transactions: txs.slice(0, 25),
      },
    };
  }

  // Stress Testing API
  public getStressScenarios() {
    return {
      success: true,
      data: [
        {
          id: 'SCEN-001',
          name: 'Liquidity & Structuring Surge (2x Volume)',
          description: 'Simulates a 100% surge in payment volume with elevated structuring typologies beneath $10k.',
          volume_increase_pct: 100,
          high_value_freq_multiplier: 2.5,
          high_risk_geo_pct: 15,
          suspicious_pattern_multiplier: 3.0,
        },
        {
          id: 'SCEN-002',
          name: 'High-Risk Sanctions Corridor Influx',
          description: 'Concentrated cross-border capital flight routing through designated high-risk sanctions jurisdictions.',
          volume_increase_pct: 35,
          high_value_freq_multiplier: 1.5,
          high_risk_geo_pct: 45,
          suspicious_pattern_multiplier: 4.5,
        },
        {
          id: 'SCEN-003',
          name: 'Major Clearing Counterparty Default',
          description: 'Sudden liquidity impairment shock simulated on primary clearing counterparties.',
          volume_increase_pct: -20,
          high_value_freq_multiplier: 1.0,
          high_risk_geo_pct: 5,
          suspicious_pattern_multiplier: 1.2,
          counterparty_default_id: 'CPTY-103',
        },
      ],
    };
  }

  public runStressTest(input: any) {
    const baseTx = this.transactions.length;
    const baseVal = this.transactions.reduce((acc, t) => acc + t.amount, 0);
    const baseAlerts = this.alerts.length;
    const baseCrit = this.transactions.filter((t) => t.risk_band === 'CRITICAL').length;
    const baseHigh = this.transactions.filter((t) => t.risk_band === 'HIGH').length;
    const baseMed = this.transactions.filter((t) => t.risk_band === 'MEDIUM').length;
    const baseLow = this.transactions.filter((t) => t.risk_band === 'LOW').length;

    const volMult = 1 + (input.volume_increase_pct || 0) / 100;
    const projTx = Math.round(baseTx * volMult);
    const projVal = Math.round(baseVal * volMult * ((input.high_value_freq_multiplier || 1) * 0.4 + 0.6));
    const patternMult = input.suspicious_pattern_multiplier || 1;
    const projCrit = Math.round(baseCrit * volMult * Math.max(1, patternMult * 0.8));
    const projHigh = Math.round(baseHigh * volMult * Math.max(1, patternMult * 0.6));
    const projMed = Math.round(baseMed * volMult * (1 + (input.high_risk_geo_pct || 10) * 0.05));
    const projLow = Math.max(0, projTx - (projCrit + projHigh + projMed));
    const projAlerts = Math.round(baseAlerts * volMult * (patternMult * 0.7 + 0.3));

    let defaultShock = null;
    if (input.counterparty_default_id) {
      const cp = this.counterparties.find((c) => c.id === input.counterparty_default_id);
      const cpTxs = this.transactions.filter((t) => t.counterparty_id === input.counterparty_default_id);
      const cpVol = cpTxs.reduce((acc, t) => acc + t.amount, 0);
      if (cp) {
        defaultShock = {
          counterpartyId: cp.id,
          name: cp.name,
          country: cp.country,
          riskLevel: cp.risk_level,
          simulatedTrappedTurnover: Math.round(cpVol),
          affectedTransactionsCount: cpTxs.length,
          capitalImpactScore: Math.min(100, Math.round((cpVol / Math.max(baseVal, 1)) * 400)),
        };
      }
    }

    return {
      success: true,
      data: {
        scenarioName: input.name || 'Custom Simulation',
        baseline: {
          totalTransactions: baseTx,
          totalVolumeValue: Math.round(baseVal),
          totalAlerts: baseAlerts,
          riskDistribution: { low: baseLow, medium: baseMed, high: baseHigh, critical: baseCrit },
        },
        projected: {
          totalTransactions: projTx,
          totalVolumeValue: Math.round(projVal),
          totalAlerts: projAlerts,
          riskDistribution: { low: projLow, medium: projMed, high: projHigh, critical: projCrit },
          defaultShock,
          delta: {
            txChangePct: Math.round(((projTx - baseTx) / Math.max(baseTx, 1)) * 100),
            valueChangePct: Math.round(((projVal - baseVal) / Math.max(baseVal, 1)) * 100),
            alertsChangePct: Math.round(((projAlerts - baseAlerts) / Math.max(baseAlerts, 1)) * 100),
            criticalRiskChangePct: Math.round(((projCrit - baseCrit) / Math.max(baseCrit, 1)) * 100),
          },
        },
      },
    };
  }

  // Reports API
  public generateReport(type: string, _params: Record<string, any> = {}) {
    const timestamp = new Date().toISOString();
    const meta = [
      `# REGTECH SENTINEL - COMPLIANCE & RISK INTELLIGENCE REPORT`,
      `# Report Type: ${type.toUpperCase()}`,
      `# Generated At: ${timestamp}`,
      `# Environment: Prototype Demonstration Mode (Simulated Synthetic Data)`,
      ``,
    ];

    if (type.toUpperCase() === 'TRANSACTIONS') {
      const headers = ['Transaction ID', 'Timestamp', 'Sender Account', 'Customer Name', 'Amount', 'Currency', 'Channel', 'Type', 'Status', 'Risk Score', 'Risk Band'];
      const rows = this.transactions.slice(0, 50).map((t) => [
        t.id, t.created_at, t.sender_account_id, `"${t.customer_name || ''}"`, t.amount, t.currency, t.channel, t.type, t.status, t.risk_score, t.risk_band
      ]);
      const csv = [...meta, headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      return { success: true, data: { type: 'TRANSACTIONS', title: 'Transaction Monitoring Audit Report', totalRecords: rows.length, csv } };
    }

    if (type.toUpperCase() === 'ALERTS') {
      const headers = ['Alert ID', 'Created At', 'Transaction ID', 'Customer Name', 'Category', 'Severity', 'Risk Score', 'Status', 'Assigned To', 'Trigger Reason'];
      const rows = this.alerts.slice(0, 50).map((a) => [
        a.id, a.created_at, a.transaction_id, `"${a.customer_name || ''}"`, a.category, a.severity, a.risk_score, a.status, a.assigned_to || 'UNASSIGNED', `"${a.trigger_reason}"`
      ]);
      const csv = [...meta, headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      return { success: true, data: { type: 'ALERTS', title: 'Case Investigation Summary', totalRecords: rows.length, csv } };
    }

    const headers = ['Customer ID', 'Name', 'Type', 'Country', 'KYC Status', 'Risk Rating', 'Expected Turnover'];
    const rows = this.customers.map((c) => [c.id, `"${c.name}"`, c.type, c.country, c.kyc_status, c.risk_rating, c.monthly_expected_turnover]);
    const csv = [...meta, headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    return { success: true, data: { type: 'CUSTOMERS', title: 'Customer Risk Intelligence Portfolio', totalRecords: rows.length, csv } };
  }

  // Audit Events API
  public getAuditEvents(params: Record<string, any> = {}) {
    let list = [...this.auditEvents];
    if (params.search) {
      const q = String(params.search).toLowerCase();
      list = list.filter((a) =>
        a.id.toLowerCase().includes(q) ||
        a.actor.toLowerCase().includes(q) ||
        a.action.toLowerCase().includes(q) ||
        a.reason.toLowerCase().includes(q)
      );
    }
    const total = list.length;
    const page = parseInt(params.page || '1', 10);
    const limit = parseInt(params.limit || '20', 10);
    const start = (page - 1) * limit;
    const paginated = list.slice(start, start + limit);

    return {
      success: true,
      data: paginated,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Rules API
  public getRules() {
    return { success: true, data: this.rules };
  }

  public updateRule(id: string, updates: Partial<MockRiskRule>) {
    const r = this.rules.find((rule) => rule.id === id);
    if (!r) throw new Error(`Rule ${id} not found`);
    Object.assign(r, updates);

    this.auditEvents.unshift({
      id: `AUD-${this.auditCounter++}`,
      actor: 'admin.officer@sentinel.internal',
      event_type: 'RULE_CONFIGURE',
      entity_type: 'RISK_RULE',
      entity_id: id,
      action: 'UPDATE_RULE',
      reason: `Updated rule configuration: ${JSON.stringify(updates)}`,
      correlation_id: `CORR-${id}`,
      created_at: new Date().toISOString(),
    });

    return { success: true, data: r };
  }

  // Reset demo dataset
  public resetDemo() {
    this.seedBaseline();
    return {
      success: true,
      message: 'RegTech Sentinel demonstration baseline successfully restored.',
      data: { resetAt: new Date().toISOString() },
    };
  }
}

export const mockEngine = new MockEngine();
