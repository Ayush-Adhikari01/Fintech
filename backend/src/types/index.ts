import { z } from 'zod';

export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TransactionStatus = 'COMPLETED' | 'HELD' | 'BLOCKED' | 'FLAGGED' | 'PENDING';
export type ChannelType = 'WEB' | 'MOBILE' | 'API' | 'SWIFT' | 'ATM';
export type TransactionType = 'WIRE' | 'ACH' | 'INSTANT' | 'INTERNAL' | 'CROSS_BORDER';
export type KYCStatus = 'VERIFIED' | 'PENDING' | 'EXPIRED' | 'REJECTED';
export type AlertStatus = 'NEW' | 'UNDER_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'FALSE_POSITIVE';
export type ScreeningStatus = 'POTENTIAL_MATCH' | 'CLEARED' | 'ESCALATED';

export interface Customer {
  id: string;
  name: string;
  type: 'INDIVIDUAL' | 'CORPORATE' | 'SME';
  country: string;
  kyc_status: KYCStatus;
  risk_rating: RiskSeverity;
  occupation_or_industry: string;
  monthly_expected_turnover: number;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  customer_id: string;
  currency: string;
  balance: number;
  status: 'ACTIVE' | 'FROZEN' | 'SUSPENDED' | 'CLOSED';
  created_at: string;
  updated_at: string;
}

export interface Counterparty {
  id: string;
  name: string;
  country: string;
  risk_level: RiskSeverity;
  institution_type: 'BANK' | 'FINTECH' | 'CORP' | 'EXCHANGE';
  is_sanctioned_proxy: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  sender_account_id: string;
  sender_customer_id: string;
  receiver_account_id: string;
  receiver_customer_id?: string | null;
  counterparty_id?: string | null;
  amount: number;
  currency: string;
  channel: ChannelType;
  type: TransactionType;
  origin_country: string;
  dest_country: string;
  status: TransactionStatus;
  risk_score: number;
  risk_band: RiskSeverity;
  created_at: string;
}

export interface TriggeredRuleDetail {
  ruleId: string;
  ruleName: string;
  category: string;
  weight: number;
  scoreContribution: number;
  reason: string;
}

export interface RiskAssessment {
  id: string;
  transaction_id: string;
  rule_score: number;
  ml_anomaly_score: number | null;
  ml_is_anomaly: number;
  ml_service_status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  final_risk_score: number;
  severity: RiskSeverity;
  triggered_rules_json: string;
  explanation: string;
  recommended_action: string;
  created_at: string;
}

export interface RiskRule {
  id: string;
  name: string;
  category: string;
  weight: number;
  threshold_value: number | null;
  is_enabled: number;
  severity: RiskSeverity;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  transaction_id?: string | null;
  customer_id?: string | null;
  account_id?: string | null;
  category: string;
  severity: RiskSeverity;
  risk_score: number;
  status: AlertStatus;
  assigned_to?: string | null;
  trigger_reason: string;
  triggered_rules_json?: string | null;
  ml_anomaly_data_json?: string | null;
  resolution_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestigationNote {
  id: string;
  alert_id: string;
  author: string;
  note: string;
  action_taken?: string | null;
  created_at: string;
}

export interface SyntheticWatchlistEntry {
  id: string;
  entity_type: 'INDIVIDUAL' | 'ENTITY' | 'VESSEL';
  name: string;
  normalized_name: string;
  country: string;
  regime: string;
  program: string;
  remarks?: string | null;
  created_at: string;
}

export interface ScreeningResult {
  id: string;
  target_type: 'CUSTOMER' | 'COUNTERPARTY' | 'AD_HOC';
  target_id?: string | null;
  query_name: string;
  matched_entity_id?: string | null;
  match_score: number;
  status: ScreeningStatus;
  notes?: string | null;
  screened_by: string;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  action: string;
  previous_state_json?: string | null;
  new_state_json?: string | null;
  reason?: string | null;
  correlation_id?: string | null;
  created_at: string;
}

// Zod Validation Schemas
export const IngestTransactionSchema = z.object({
  sender_account_id: z.string().min(1, 'Sender account ID required'),
  receiver_account_id: z.string().min(1, 'Receiver account ID required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  channel: z.enum(['WEB', 'MOBILE', 'API', 'SWIFT', 'ATM']).default('WEB'),
  type: z.enum(['WIRE', 'ACH', 'INSTANT', 'INTERNAL', 'CROSS_BORDER']).default('WIRE'),
  origin_country: z.string().length(2, 'Origin country must be 2-letter ISO code'),
  dest_country: z.string().length(2, 'Dest country must be 2-letter ISO code'),
  counterparty_id: z.string().optional().nullable(),
});

export const AlertStatusUpdateSchema = z.object({
  status: z.enum(['NEW', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'FALSE_POSITIVE']),
  reason: z.string().min(3, 'A reason is required for status transition'),
  assigned_to: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const CustomerUpdateSchema = z.object({
  kyc_status: z.enum(['VERIFIED', 'PENDING', 'EXPIRED', 'REJECTED']).optional(),
  risk_rating: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  monthly_expected_turnover: z.number().positive().optional(),
});

export const ScreeningQuerySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  threshold: z.number().min(0.5).max(1.0).default(0.75),
  target_type: z.enum(['CUSTOMER', 'COUNTERPARTY', 'AD_HOC']).default('AD_HOC'),
  target_id: z.string().optional().nullable(),
});

export const StressTestScenarioSchema = z.object({
  name: z.string().min(2),
  volume_increase_pct: z.number().min(0).max(500).default(50),
  high_value_freq_multiplier: z.number().min(1).max(10).default(2),
  high_risk_geo_pct: z.number().min(0).max(100).default(15),
  suspicious_pattern_multiplier: z.number().min(1).max(10).default(3),
  counterparty_default_id: z.string().optional().nullable(),
});

export const UpdateRuleSchema = z.object({
  weight: z.number().min(0).max(100).optional(),
  threshold_value: z.number().positive().optional().nullable(),
  is_enabled: z.boolean().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});
