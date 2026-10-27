# RegTech Sentinel — API Specification & Integration Contract

## 1. Overview

- **Base URL:** `http://127.0.0.1:5000/api`
- **ML Service URL:** `http://127.0.0.1:5050`
- **Real-Time Transport:** Socket.IO over HTTP (`/socket.io`)
- **Default Content-Type:** `application/json`
- **Security Headers:** Returns `X-Correlation-ID`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`

---

## 2. Health & Readiness

### `GET /api/health`
Checks database connection and local ML microservice health.

**Response `200 OK`:**
```json
{
  "status": "healthy",
  "product": "RegTech Sentinel",
  "version": "1.0.0",
  "mode": "PROTOTYPE_DEMONSTRATION",
  "components": {
    "database": {
      "status": "HEALTHY",
      "engine": "SQLite3 (node:sqlite native)"
    },
    "mlService": {
      "status": "HEALTHY",
      "url": "http://127.0.0.1:5050",
      "modelVersion": "v1.0.0"
    }
  },
  "uptimeSeconds": 412,
  "timestamp": "2026-10-16T08:30:00.000Z"
}
```

---

## 3. Executive Dashboard

### `GET /api/dashboard`
Returns aggregated compliance metrics computed directly from SQLite records.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "kpis": {
      "totalTransactions": 155,
      "totalVolumeValue": 348291.50,
      "transactionsRequiringReview": 24,
      "criticalRiskTransactions": 18,
      "openAlerts": 32,
      "simulatedHeldBlocked": 18,
      "incompleteKycCustomers": 9,
      "totalCounterparties": 20,
      "mlAnomaliesDetected": 28,
      "avgProcessingLatencyMs": 14.8
    },
    "charts": {
      "volumeOverTime": [{ "date": "2026-10-03", "count": 10, "volume": 24150.00 }],
      "riskDistribution": [
        { "band": "LOW", "count": 82, "percentage": 53 },
        { "band": "MEDIUM", "count": 31, "percentage": 20 },
        { "band": "HIGH", "count": 24, "percentage": 15 },
        { "band": "CRITICAL", "count": 18, "percentage": 12 }
      ],
      "alertCategories": [{ "category": "AML", "count": 22 }],
      "severityTrends": [{ "date": "2026-10-03", "low": 5, "medium": 3, "high": 1, "critical": 1 }],
      "topCounterpartiesByVolume": [{ "name": "Apex Global Clearing Bank", "volume": 84200.00, "tx_count": 28 }]
    },
    "recentTransactions": [...],
    "recentAlerts": [...]
  }
}
```

---

## 4. Transactions & Pipeline

### `GET /api/transactions`
Lists transactions with pagination and multi-attribute filtering.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `search` (string)
- `riskBand` (`LOW` | `MEDIUM` | `HIGH` | `CRITICAL`)
- `status` (`COMPLETED` | `HELD` | `BLOCKED` | `FLAGGED`)
- `channel` (`WEB` | `MOBILE` | `API` | `SWIFT` | `ATM`)
- `minAmount`, `maxAmount` (number)
- `startDate`, `endDate` (ISO date string)

### `GET /api/transactions/:id`
Retrieves single transaction details joined with its full `risk_assessments` evaluation, customer details, and linked alerts.

### `POST /api/transactions`
Ingests a transaction through the complete dual-engine risk intelligence pipeline.

**Request Payload:**
```json
{
  "sender_account_id": "ACC-8001",
  "receiver_account_id": "ACC-EXT-9901",
  "amount": 9750.00,
  "currency": "USD",
  "channel": "API",
  "type": "WIRE",
  "origin_country": "US",
  "dest_country": "IR",
  "counterparty_id": "CPTY-103"
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "TX-M3K9P1-4192",
      "sender_account_id": "ACC-8001",
      "amount": 9750.00,
      "status": "HELD",
      "risk_score": 88,
      "risk_band": "CRITICAL",
      "created_at": "2026-10-16T08:31:00.000Z"
    },
    "assessment": {
      "rule_score": 85,
      "ml_anomaly_score": 0.824,
      "ml_is_anomaly": 1,
      "final_risk_score": 88,
      "severity": "CRITICAL",
      "explanation": "Flagged by deterministic rules (Structuring Pattern, High-Risk Sanctions Jurisdiction). Additionally identified as behavioral anomaly by Isolation Forest model (score: 0.82).",
      "recommended_action": "ESCALATE_TO_COMPLIANCE"
    },
    "alert": {
      "id": "ALT-M3K9P1-312",
      "category": "AML",
      "severity": "CRITICAL",
      "status": "NEW"
    }
  }
}
```

---

## 5. Simulator Controls

- `GET /api/simulator/status` &rarr; Returns `{ isRunning, isPaused, intervalMs, generatedCount }`
- `POST /api/simulator/start` &rarr; Starts automated stream
- `POST /api/simulator/pause` &rarr; Pauses automated stream
- `POST /api/simulator/resume` &rarr; Resumes automated stream
- `POST /api/simulator/stop` &rarr; Stops automated stream
- `POST /api/simulator/rate` &rarr; `{ "intervalMs": 2000 }`
- `POST /api/simulator/generate-batch` &rarr; `{ "count": 5 }`
- `POST /api/simulator/generate-suspicious` &rarr; Injects multi-typology demonstration transaction for evaluator

---

## 6. Alerts & Case Management

### `GET /api/alerts`
Lists compliance review cases. Filter by `status`, `severity`, `category`, `search`.

### `GET /api/alerts/:id`
Retrieves alert details with full case timeline of investigation notes.

### `PATCH /api/alerts/:id/status`
Transitions alert status. **Reason is mandatory.**

**Request Payload:**
```json
{
  "status": "ESCALATED",
  "reason": "Beneficial ownership linked to designated maritime entity in synthetic watchlist",
  "note": "Prepared internal SAR draft for compliance officer approval"
}
```

### `POST /api/alerts/:id/assign`
Assigns reviewer to alert. `{ "assignee": "sarah.jenkins@sentinel.internal" }`.

### `POST /api/alerts/:id/notes`
Appends analyst investigation note to case timeline. `{ "note": "Verified customer identity." }`.

---

## 7. Sanctions & Watchlist Screening

### `GET /api/screening/watchlist`
Lists synthetic watchlist entities. Filter by `search` or `regime`.

### `POST /api/screening/screen`
Performs normalized exact and fuzzy Levenshtein similarity screening.

**Request Payload:**
```json
{
  "name": "Viktor Mikhailov",
  "threshold": 0.75,
  "target_type": "AD_HOC"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "queryName": "Viktor Mikhailov",
    "threshold": 0.75,
    "totalHits": 1,
    "matches": [
      {
        "watchlistEntry": {
          "id": "WL-001",
          "name": "Viktor Mikhailov",
          "regime": "OFAC_SYNTHETIC",
          "country": "RU"
        },
        "matchScore": 1.0,
        "matchType": "EXACT"
      }
    ]
  }
}
```

### `PATCH /api/screening/:id/status`
Records human compliance clearance or escalation rationale.

---

## 8. Counterparties & Exposure

- `GET /api/counterparties` &rarr; Aggregate turnover exposure, platform concentration %, and geographic distribution.
- `GET /api/counterparties/:id` &rarr; Entity details and drill-down transaction list.

---

## 9. Stress Testing

- `GET /api/stress-testing/scenarios` &rarr; List historical scenario runs.
- `POST /api/stress-testing/run` &rarr; Executes deterministic what-if scenario.

**Request Payload:**
```json
{
  "name": "Q4 Sanctions Shock",
  "volume_increase_pct": 50,
  "high_value_freq_multiplier": 2,
  "high_risk_geo_pct": 15,
  "suspicious_pattern_multiplier: 3,
  "counterparty_default_id": "CPTY-103"
}
```

---

## 10. Reports & Regulatory Export

### `GET /api/reports/generate?type=TRANSACTIONS&format=csv`
Streams RFC 4180 compliant CSV export containing transaction risk scores, rule breakdowns, and ML anomaly flags with formal regulatory disclaimers.

Supported types: `TRANSACTIONS`, `ALERTS`, `KYC`, `COUNTERPARTIES`, `AUDIT`.

---

## 11. Settings & Rules

- `GET /api/rules` &rarr; Returns all 11 active deterministic risk rules.
- `PATCH /api/rules/:id` &rarr; Reconfigures rule weights, thresholds, enablement, and severity bands.
- `POST /api/settings/reset-demo` &rarr; Wipes test state and restores known baseline synthetic dataset.

---

## 12. Python ML Microservice Endpoints (`:5050`)

- `GET /health` &rarr; Model readiness and version (`v1.0.0`).
- `GET /metadata` &rarr; Model hyperparameters and synthetic evaluation metrics (ROC-AUC 0.9558, F1 0.7530).
- `POST /predict` &rarr; Ingests 7-feature payload, returns `{ anomaly_score: 0.82, is_anomaly: true, raw_decision_score: -0.15 }`.
- `POST /retrain` &rarr; Triggers model retraining with reproducible random seed.

---

## 13. WebSocket Gateway Events (`Socket.IO`)

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `simulator:status` | Server &rarr; Client | `{ isRunning, isPaused, intervalMs, generatedCount }` | Published on simulator state transitions. |
| `transaction:new` | Server &rarr; Client | `{ transaction, assessment }` | Emitted when a new transaction is processed. |
| `alert:new` | Server &rarr; Client | `Alert` object | Emitted when a high or critical alert is generated. |
| `kpi:update` | Server &rarr; Client | `{ timestamp }` | Signals dashboard telemetry update. |
