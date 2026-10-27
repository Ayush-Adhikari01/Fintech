import { execute, queryOne, transaction } from '../db/connection';
import { Transaction, RiskAssessment, Alert, Account, Customer, Counterparty } from '../types';
import { evaluateDeterministicRules, RuleEvaluationInput } from './ruleEngine';
import { queryMLInference } from './mlClient';
import { aggregateRisk } from './riskAggregator';
import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

export function setSocketIO(io: SocketIOServer): void {
  ioInstance = io;
}

export function getSocketIO(): SocketIOServer | null {
  return ioInstance;
}

export interface IngestTransactionInput {
  sender_account_id: string;
  receiver_account_id: string;
  amount: number;
  currency?: string;
  channel?: 'WEB' | 'MOBILE' | 'API' | 'SWIFT' | 'ATM';
  type?: 'WIRE' | 'ACH' | 'INSTANT' | 'INTERNAL' | 'CROSS_BORDER';
  origin_country: string;
  dest_country: string;
  counterparty_id?: string | null;
}

export async function processTransactionPipeline(
  input: IngestTransactionInput
): Promise<{
  transaction: Transaction;
  assessment: RiskAssessment;
  alert: Alert | null;
}> {
  const now = new Date();
  const isoNow = now.toISOString();

  // Validate sender account
  const senderAccount = queryOne<Account>(
    'SELECT * FROM accounts WHERE id = ?;',
    input.sender_account_id
  );
  if (!senderAccount) {
    throw new Error(`Sender account not found: ${input.sender_account_id}`);
  }

  const senderCustomer = queryOne<Customer>(
    'SELECT * FROM customers WHERE id = ?;',
    senderAccount.customer_id
  );
  if (!senderCustomer) {
    throw new Error(`Customer associated with account ${input.sender_account_id} not found.`);
  }

  const currency = input.currency || senderAccount.currency || 'USD';
  const channel = input.channel || 'WEB';
  const type = input.type || 'WIRE';
  const counterpartyId = input.counterparty_id || null;

  // Generate unique transaction ID
  const txId = `TX-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Step 1: Run Deterministic Rules
  const ruleInput: RuleEvaluationInput = {
    senderAccountId: senderAccount.id,
    senderCustomerId: senderCustomer.id,
    receiverAccountId: input.receiver_account_id,
    counterpartyId,
    amount: input.amount,
    currency,
    channel,
    type,
    originCountry: input.origin_country,
    destCountry: input.dest_country,
  };
  const ruleResult = evaluateDeterministicRules(ruleInput);

  // Step 2: Query ML Model
  const mlResult = await queryMLInference({
    amount: input.amount,
    senderAccountId: senderAccount.id,
    senderCustomerId: senderCustomer.id,
    channel,
    originCountry: input.origin_country,
    destCountry: input.dest_country,
  });

  // Step 3: Aggregate Risk Score and Formulate Explainability
  const aggregated = aggregateRisk(ruleResult, mlResult);

  // Step 4: Status determination
  let status: 'COMPLETED' | 'HELD' | 'BLOCKED' | 'FLAGGED' = 'COMPLETED';
  if (aggregated.severity === 'CRITICAL') {
    status = 'HELD';
  } else if (aggregated.severity === 'HIGH') {
    status = 'FLAGGED';
  }

  const txRecord: Transaction = {
    id: txId,
    sender_account_id: senderAccount.id,
    sender_customer_id: senderCustomer.id,
    receiver_account_id: input.receiver_account_id,
    receiver_customer_id: null,
    counterparty_id: counterpartyId,
    amount: input.amount,
    currency,
    channel,
    type,
    origin_country: input.origin_country,
    dest_country: input.dest_country,
    status,
    risk_score: aggregated.finalRiskScore,
    risk_band: aggregated.severity,
    created_at: isoNow,
  };

  const assessmentRecord: RiskAssessment = {
    id: `RA-${txId}`,
    transaction_id: txId,
    rule_score: aggregated.ruleScore,
    ml_anomaly_score: aggregated.mlAnomalyScore,
    ml_is_anomaly: aggregated.mlIsAnomaly ? 1 : 0,
    ml_service_status: aggregated.mlStatus,
    final_risk_score: aggregated.finalRiskScore,
    severity: aggregated.severity,
    triggered_rules_json: JSON.stringify(ruleResult.triggeredRules),
    explanation: aggregated.explanation,
    recommended_action: aggregated.recommendedAction,
    created_at: isoNow,
  };

  let createdAlert: Alert | null = null;

  // Persist all related entities atomically in a database transaction
  transaction(() => {
    // Insert transaction
    execute(
      `INSERT INTO transactions (id, sender_account_id, sender_customer_id, receiver_account_id, receiver_customer_id, counterparty_id, amount, currency, channel, type, origin_country, dest_country, status, risk_score, risk_band, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      txRecord.id,
      txRecord.sender_account_id,
      txRecord.sender_customer_id,
      txRecord.receiver_account_id,
      txRecord.receiver_customer_id,
      txRecord.counterparty_id,
      txRecord.amount,
      txRecord.currency,
      txRecord.channel,
      txRecord.type,
      txRecord.origin_country,
      txRecord.dest_country,
      txRecord.status,
      txRecord.risk_score,
      txRecord.risk_band,
      txRecord.created_at
    );

    // Insert risk assessment
    execute(
      `INSERT INTO risk_assessments (id, transaction_id, rule_score, ml_anomaly_score, ml_is_anomaly, ml_service_status, final_risk_score, severity, triggered_rules_json, explanation, recommended_action, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      assessmentRecord.id,
      assessmentRecord.transaction_id,
      assessmentRecord.rule_score,
      assessmentRecord.ml_anomaly_score,
      assessmentRecord.ml_is_anomaly,
      assessmentRecord.ml_service_status,
      assessmentRecord.final_risk_score,
      assessmentRecord.severity,
      assessmentRecord.triggered_rules_json,
      assessmentRecord.explanation,
      assessmentRecord.recommended_action,
      assessmentRecord.created_at
    );

    // Check if Alert is required (CRITICAL, HIGH, or triggered specific rules)
    if (aggregated.severity === 'CRITICAL' || aggregated.severity === 'HIGH') {
      const alertId = `ALT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      const primaryCategory =
        ruleResult.triggeredRules.length > 0 ? ruleResult.triggeredRules[0].category : 'BEHAVIOR';
      const triggerReason =
        ruleResult.triggeredRules.length > 0
          ? ruleResult.triggeredRules.map((r) => r.reason).join(' | ')
          : `Elevated anomaly score: ${aggregated.mlAnomalyScore?.toFixed(2) || 'N/A'}`;

      execute(
        `INSERT INTO alerts (id, transaction_id, customer_id, account_id, category, severity, risk_score, status, assigned_to, trigger_reason, triggered_rules_json, ml_anomaly_data_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW', NULL, ?, ?, ?, ?, ?);`,
        alertId,
        txId,
        senderCustomer.id,
        senderAccount.id,
        primaryCategory,
        aggregated.severity,
        aggregated.finalRiskScore,
        triggerReason,
        JSON.stringify(ruleResult.triggeredRules),
        JSON.stringify({
          anomaly_score: aggregated.mlAnomalyScore,
          is_anomaly: aggregated.mlIsAnomaly,
          status: aggregated.mlStatus,
        }),
        isoNow,
        isoNow
      );

      createdAlert = {
        id: alertId,
        transaction_id: txId,
        customer_id: senderCustomer.id,
        account_id: senderAccount.id,
        category: primaryCategory,
        severity: aggregated.severity,
        risk_score: aggregated.finalRiskScore,
        status: 'NEW',
        assigned_to: null,
        trigger_reason: triggerReason,
        triggered_rules_json: JSON.stringify(ruleResult.triggeredRules),
        ml_anomaly_data_json: JSON.stringify({
          anomaly_score: aggregated.mlAnomalyScore,
          is_anomaly: aggregated.mlIsAnomaly,
        }),
        created_at: isoNow,
        updated_at: isoNow,
      };
    }

    // Insert Audit Event
    const auditId = `AUD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    execute(
      `INSERT INTO audit_events (id, actor, event_type, entity_type, entity_id, action, reason, correlation_id, created_at)
       VALUES (?, 'pipeline.engine', 'TRANSACTION_INGEST', 'TRANSACTION', ?, ?, ?, ?, ?);`,
      auditId,
      txId,
      status === 'HELD' ? 'TRANSACTION_HOLD' : 'TRANSACTION_PROCESSED',
      aggregated.explanation,
      `CORR-${txId}`,
      isoNow
    );
  });

  // Step 5: Broadcast Real-time events to frontend
  if (ioInstance) {
    ioInstance.emit('transaction:new', {
      transaction: txRecord,
      assessment: assessmentRecord,
    });
    if (createdAlert) {
      ioInstance.emit('alert:new', createdAlert);
    }
    ioInstance.emit('kpi:update', {
      timestamp: isoNow,
    });
  }

  return {
    transaction: txRecord,
    assessment: assessmentRecord,
    alert: createdAlert,
  };
}
