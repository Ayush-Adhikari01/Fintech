# RegTech Sentinel — System Architecture Specification

## 1. System Architecture Overview

RegTech Sentinel is designed around a decoupled, event-driven, multi-tier architecture composed of:
1. **Presentation Layer:** React 18 single-page application built with Vite, Tailwind CSS, Lucide SVG icons, and Recharts.
2. **Gateway & Orchestration Layer:** Node.js Express server with Socket.IO real-time event broadcasting and Zod schema validation.
3. **Dual Risk Intelligence Engine:**
   - **Deterministic Rule Engine:** High-throughput, explainable business rules with configurable weights, thresholds, and condition evaluations.
   - **Machine Learning Inference Service:** Independent Python Flask microservice hosting a trained scikit-learn Isolation Forest model.
   - **Risk Aggregator:** Normalizes and harmonizes deterministic compliance rules with statistical anomaly scores into a unified 0–100 score.
4. **Data Persistence Layer:** Embedded SQLite database running in Write-Ahead Logging (WAL) mode with strict foreign key constraints and transactional integrity.

```
+-----------------------------------------------------------------------------------+
|                                  USER BROWSER                                     |
|           React 18 SPA (Vite + Tailwind + Recharts + Lucide Icons)                |
+----------------------------------------+------------------------------------------+
                                         | HTTP / WebSocket
                                         v
+-----------------------------------------------------------------------------------+
|                         NODE.JS / EXPRESS CORE GATEWAY                            |
|                                                                                   |
|  [Security Headers]  [Rate Limiter]  [Zod Validator]  [Correlation ID Middleware] |
|                                                                                   |
|   +-------------------+  +-------------------+  +-----------------------------+   |
|   | Dashboard Service |  | Alert Service     |  | Stress Testing Engine       |   |
|   +-------------------+  +-------------------+  +-----------------------------+   |
|   | Screening Service |  | Customer Service  |  | Append-Only Audit Logger    |   |
|   +-------------------+  +-------------------+  +-----------------------------+   |
|                                                                                   |
|                   +---------------------------------------+                       |
|                   |  TRANSACTION INGESTION PIPELINE       |                       |
|                   |                                       |                       |
|                   | 1. Parameter Validation               |                       |
|                   | 2. Deterministic Rule Evaluation      |                       |
|                   | 3. ML Anomaly Scoring Query           |                       |
|                   | 4. Score Aggregation & Explainability |                       |
|                   | 5. Atomic SQLite Write Transaction    |                       |
|                   | 6. Socket.IO Real-time Broadcast      |                       |
|                   +-------------------+-------------------+                       |
+---------------------------------------+-------------------------------------------+
                     |                  | Local HTTP (Port 5050)
                     |                  v
                     |       +------------------------------------+
                     |       |    PYTHON FLASK ML MICROSERVICE    |
                     |       |                                    |
                     |       | - IsolationForest (150 Estimators) |
                     |       | - StandardScaler Preprocessor      |
                     |       | - 7-Feature Vector Transformation  |
                     |       | - Degraded Fallback Handling       |
                     |       +------------------------------------+
                     v
+-----------------------------------------------------------------------------------+
|                            EMBEDDED SQLITE DATABASE                               |
|                               (data/regtech.db)                                   |
|                                                                                   |
|  - customers              - accounts            - counterparties                  |
|  - transactions           - risk_rules          - risk_assessments                |
|  - alerts                 - investigation_notes - synthetic_watchlist             |
|  - screening_results      - stress_scenarios    - audit_events                    |
|                                                                                   |
|  [WAL Mode]  [Foreign Keys ON]  [Indexes on tx_status, risk_band, created_at]     |
+-----------------------------------------------------------------------------------+
```

---

## 2. Ingestion Pipeline & Execution Ordering

When a transaction is initiated or generated by the simulator:

1. **Validation:** Input payload is validated against `IngestTransactionSchema` using Zod.
2. **Account Lookup:** The sender account and linked customer profile are retrieved from SQLite.
3. **Deterministic Rule Engine:** Evaluates active compliance rules against current and historical account state.
4. **Machine Learning Query:** Features are computed (amount log, 1-hour velocity, amount deviation from mean, night transfer, cross-border, high-risk jurisdiction, channel encoding) and sent via HTTP to `http://127.0.0.1:5050/predict`.
   - *Fault Tolerance:* If the ML service is unreachable or errors out, the pipeline records `ml_service_status = 'UNAVAILABLE'`, does not fail the transaction, and uses rule-based scoring with a documented degraded state note.
5. **Score Aggregation & Explainability Policy:**
   - Score calculated bounded between 0 and 100.
   - Severity categorized: `LOW` (0–29), `MEDIUM` (30–59), `HIGH` (60–79), `CRITICAL` (80–100).
   - Recommended next action determined (`AUTOMATIC_CLEARANCE`, `ENHANCED_MONITORING`, `MANUAL_REVIEW`, `ESCALATE_TO_COMPLIANCE`).
   - Human-readable explanation string generated citing every triggered rule.
6. **Atomic Persistence:** In a single SQLite transaction (`BEGIN IMMEDIATE`):
   - Ingests `transactions` record.
   - Ingests `risk_assessments` record.
   - If score >= 60 (or critical violation): creates `alerts` record.
   - Ingests `audit_events` record with correlation ID.
7. **Real-time Event Emission:** Socket.IO publishes `transaction:new`, `alert:new`, and `kpi:update` to connected browser clients.

---

## 3. Deterministic Risk Rules Catalog

The platform incorporates 11 deterministic rules:

| Rule ID | Rule Name | Category | Default Weight | Logic Description |
| :--- | :--- | :--- | :--- | :--- |
| `RULE-HIGH-VAL` | Unusually Large Amount | AML | 25 | Amount strictly exceeds standard threshold ($10,000). |
| `RULE-STRUCTURING` | Structuring Pattern (<$10K) | AML | 35 | Amount lies in structuring threshold band ($9,000 to $9,999). |
| `RULE-VELOCITY` | Rapid Transaction Burst | VELOCITY | 25 | >= 3 outbound transactions within an active 60-second window. |
| `RULE-HIGH-RISK-GEO` | High-Risk Jurisdiction | SANCTIONS | 40 | Routing involves designated high-risk sanctions jurisdictions (IR, KP, SY, RU, MM, YE). |
| `RULE-KYC-INCOMPLETE` | Incomplete/Expired KYC | AML | 30 | Sending customer KYC document status is `PENDING`, `EXPIRED`, or `REJECTED`. |
| `RULE-WATCHLIST-MATCH` | Sanctions Watchlist Match | SANCTIONS | 45 | Originating customer or counterparty matches synthetic sanctions list. |
| `RULE-TURNOVER-SPIKE` | Sudden Turnover Spike | BEHAVIOR | 20 | Transfer value exceeds 300% of customer expected monthly turnover. |
| `RULE-CROSS-BORDER-OFFHOURS` | Cross-Border Off-Hours | BEHAVIOR | 15 | International wire initiated during overnight off-hours (23:00 - 05:00 UTC). |
| `RULE-HIGH-RISK-COUNTERPARTY` | High-Risk Counterparty | FRAUD | 25 | Counterparty is classified as `HIGH` or `CRITICAL` risk or flagged. |
| `RULE-RAPID-FLOW-THROUGH` | Rapid Fund Flow-Through | AML | 30 | Inflow immediately followed by matching outflow to external account within 15 mins. |
| `RULE-CHANNEL-DEVIATION` | Unusual Channel | BEHAVIOR | 15 | Individual retail account initiates transfer via institutional API or SWIFT channel. |

---

## 4. Machine Learning Anomaly Detection Model

### Model Selection: Isolation Forest
Isolation Forest was selected for this prototype because financial transaction risk analysis in real-time environments faces severe class imbalance (anomalies represent < 5% of total volume) and diverse unknown fraud typologies. Isolation Forest isolates anomalies by randomly partitioning feature space without assuming Gaussian distribution.

### Feature Pipeline
The feature vector comprises 7 engineered dimensions:
1. `amount_log`: $\ln(1 + \text{amount})$ to mitigate extreme positive skew.
2. `velocity_1h`: Number of transactions originated by the account in the prior 60 minutes.
3. `amount_dev_from_mean`: Ratio representing deviation of amount against the customer's historical average.
4. `is_night_time`: Binary flag (1 if UTC hour $\in [23, 5]$, 0 otherwise).
5. `is_cross_border`: Binary flag (1 if origin country $\neq$ destination country, 0 otherwise).
6. `is_high_risk_country`: Binary flag (1 if origin or destination country $\in$ sanctions list).
7. `channel_encoded`: Integer categorical encoding (`WEB`: 0, `MOBILE`: 1, `API`: 2, `SWIFT`: 3, `ATM`: 4).

### Preprocessing & Normalization
- `StandardScaler` is fitted exclusively on synthetic training data and serialized to `scaler.joblib`.
- Anomaly scores are transformed through a logistic sigmoid scaling function to bound values smoothly in $[0.0, 1.0]$.
- **Important Compliance Distinction:** Anomaly scores are explicitly labeled as statistical outlier indicators rather than calibrated probabilities of fraud.

---

## 5. Dual-Engine Risk Aggregation Policy

Let $R$ be the sum of triggered deterministic rule contributions:
$$R = \min\left(100, \sum_{i \in \text{Triggered}} w_i\right)$$

Let $M$ be the ML anomaly score ($M \in [0, 1]$).
When the ML service is operational (`HEALTHY`):
$$\text{FinalScore} = \min\left(100, \text{round}(0.75 \cdot R + 0.25 \cdot (M \times 100))\right)$$

If any Critical violation is present (`RULE-WATCHLIST-MATCH` or `RULE-HIGH-RISK-GEO`):
$$\text{FinalScore} = \max(\text{FinalScore}, 85)$$

When the ML service is `UNAVAILABLE` or `DEGRADED`:
$$\text{FinalScore} = R$$
A degraded state notice is appended to the assessment explanation to prevent silent failure.

---

## 6. Database Schema & Data Integrity

The SQLite database (`data/regtech.db`) enforces strict constraints:
- `PRAGMA foreign_keys = ON;` enforces referential integrity on cascades and deletes.
- `PRAGMA journal_mode = WAL;` enables concurrent reads alongside active writes without table locking.
- Secondary indexes:
  - `idx_tx_sender_acc` on `transactions(sender_account_id)`
  - `idx_tx_status` on `transactions(status)`
  - `idx_tx_risk_band` on `transactions(risk_band)`
  - `idx_tx_created_at` on `transactions(created_at)`
  - `idx_alerts_status` on `alerts(status)`
  - `idx_audit_entity` on `audit_events(entity_type, entity_id)`

---

## 7. Append-Only Regulatory Audit Architecture

All consequential operations write an immutable record to `audit_events`:
- Risk rule parameter updates (records before and after JSON states).
- Transaction ingestion and simulated account holds.
- Alert status transitions (requires documented reason).
- Case reviewer assignments.
- Customer KYC status changes.
- Sanctions screening clearances and escalations.
- Stress testing scenario executions.
- Demonstration dataset resets.

Every audit event is stamped with an actor identity, event type, timestamp in UTC, and unique correlation ID (`CORR-XXXX`).
