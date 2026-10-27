# RegTech Sentinel — Evaluator Demonstration Script

**Platform Name:** RegTech Sentinel — Real-Time Risk Intelligence  
**Tagline:** *Detect Risk. Explain Decisions. Act with Confidence.*  
**Target Duration:** 6–8 minutes  
**Target Audience:** Hackathon Evaluator / University FinTech Professor

---

## Pre-Flight Checklist (1 Minute Before Demo)

1. Open PowerShell in `C:\Fintech`.
2. Run startup script:
   ```powershell
   .\start-demo.ps1
   ```
3. Confirm browser automatically opens `http://127.0.0.1:5173`.
4. Verify the top right status badge reads **LIVE ENGINE** (green).
5. If you ever need to reset to a clean slate before or after the demonstration, simply run:
   ```powershell
   .\reset-demo.ps1
   ```

---

## 8-Step Evaluator Walkthrough

### Step 1: Problem Statement & Executive Dashboard (1 Min)
- **Action:** Point evaluator to the Executive Risk Dashboard at `http://127.0.0.1:5173`.
- **What to say:**
  > *"Financial institutions process millions of transactions daily across complex counterparty networks. Compliance officers face two major hurdles: rigid rules that trigger unmanageable false positives, and black-box AI models that cannot be explained to regulatory auditors. RegTech Sentinel is a dual-engine risk intelligence platform combining explainable deterministic compliance rules with statistical machine learning telemetry."*
- **What to show:**
  - Database KPIs (Transactions Processed, Total Turnover, Open Alerts, ML Anomalies Detected, and 14.8ms average latency).
  - Note: Emphasize that every metric on the screen is calculated live from SQLite persisted records (`data/regtech.db`).
  - Show the 14-day transaction volume trend and the Risk Band Distribution donut chart.

---

### Step 2: The Live Transaction Pipeline & Simulation Control (1 Min)
- **Action:** Click **"Live Transactions"** in the sidebar.
- **What to say:**
  > *"Here we monitor real-time transaction ingestion. Transactions flow through a 6-stage pipeline: schema validation, deterministic rule evaluation, Python ML feature extraction, score aggregation, atomic SQLite persistence, and WebSocket broadcasting."*
- **Demonstration:**
  - Click **"Start Stream"** on the top toolbar. Show transactions streaming in live every 3 seconds via Socket.IO.
  - Click **"Pause"** or **"Batch +5"** to demonstrate controlled ingestion rate.

---

### Step 3: Trigger Guaranteed Suspicious Demonstration Scenario (1.5 Mins)
- **Action:** On the top toolbar, click the red button: **"Generate Demo Scenario"**.
- **What to say:**
  > *"Rather than relying on random transactions, I am now injecting a specific, reproducible multi-typology scenario to test our dual engine."*
- **What happens:**
  - A transaction for **$9,750.00** from customer **Viktor Mikhailov** to **Caspian Petrochem Logistics** in **Iran (IR)** via direct **API** is processed.
  - The Slide-Over Drawer automatically opens on the right.
- **Show the Evaluator:**
  1. **Final Risk Score:** High/Critical score (88/100) with status **HELD**.
  2. **Recommended Action:** `ESCALATE_TO_COMPLIANCE`.
  3. **Explainable Decision Overview:** Reads: *"Flagged by deterministic rules (Structuring Pattern, High-Risk Sanctions Jurisdiction). Additionally identified as behavioral anomaly by Isolation Forest model."*
  4. **Triggered Rules List:**
     - `RULE-STRUCTURING`: +35 pts (Amount $9,750 is in the $9,000–$9,999 reporting threshold band).
     - `RULE-HIGH-RISK-GEO`: +40 pts (Routing to sanctioned jurisdiction IR).
     - `RULE-KYC-INCOMPLETE`: +30 pts (Originating customer has expired KYC).
     - `RULE-CHANNEL-DEVIATION`: +15 pts (Consumer account routing via API).
  5. **ML Anomaly Telemetry (Isolation Forest):**
     - Outlier Flag: **OUTLIER DETECTED**.
     - Anomaly Score: **0.82**.
     - Explain to evaluator: *"Note that our system documents that Isolation Forest scores measure multidimensional deviation from baseline training patterns, not a calibrated probability of fraud."*

---

### Step 4: Alerts & Human Case Investigation (1.5 Mins)
- **Action:** Click **"Alerts & Cases"** in the sidebar.
- **What to say:**
  > *"Every transaction exceeding compliance thresholds automatically generates a review case. Critical transactions are held pending review to prevent illicit settlement."*
- **Demonstration:**
  1. Find the newly generated Alert at the top with status `NEW`. Click the row.
  2. In the drawer, click **"Assign Case"**, type `sarah.jenkins@sentinel.internal`, and confirm. Show status update.
  3. Click **"Escalate Case"**. Enter rationale:
     - *Reason:* `"High confidence match against sanctioned jurisdiction and structuring pattern."`
     - Click **"Confirm Action"**. Status transitions to `ESCALATED`.
  4. Show the **Investigation Notes & Case History** timeline update immediately with the reviewer's signature.

---

### Step 5: Append-Only Regulatory Audit Log (1 Min)
- **Action:** Click **"Audit Trail"** in the sidebar.
- **What to say:**
  > *"RegTech systems require full auditability. Every status change, assignment, rule tweak, and simulated hold is written to an append-only log with a correlation ID."*
- **What to show:**
  - Show the top event: `ALERT_STATUS_CHANGE` for our case.
  - Point out the actor signature, documented reason, and `CORR-ALT-XXXX` correlation ID.

---

### Step 6: Counterparty Risk & Exposure Concentration (1 Min)
- **Action:** Click **"Counterparty Risk"** in the sidebar.
- **What to say:**
  > *"Compliance teams must understand systemic counterparty exposure and concentration."*
- **What to show:**
  - Platform Turnover Exposure ($340k+).
  - Largest Counterparties chart and Geographic Concentration.
  - Point out Caspian Petrochem Logistics (Iran) and Severnaya Mining (Russia) flagged as high-risk counterparties.
  - Click any counterparty to view the drill-down transfer drawer.

---

### Step 7: Stress Testing & What-If Scenario Analysis (1 Min)
- **Action:** Click **"Stress Testing"** in the sidebar.
- **What to say:**
  > *"Our stress engine allows risk managers to run deterministic what-if simulations before operational shocks occur."*
- **Demonstration:**
  - Adjust sliders: Volume Surge to **+100%**, Suspicious Burst to **4x**, and select **Caspian Petrochem** under Counterparty Default Shock.
  - Click **"Simulate Stress Impact"**.
  - Show Before vs After Comparison cards (+100% volume, +220% projected alerts).
  - Show the Bar Chart comparing Baseline vs Projected risk migration.

---

### Step 8: Reports Export & Closing Presentation (1 Min)
- **Action:** Click **"Reports & Export"** in the sidebar.
- **Demonstration:**
  - Select **"Transaction Monitoring & Risk Scoring Register"**.
  - Show the formatted report preview and the clear simulated data disclaimer.
  - Click **"Download CSV"** to demonstrate instant RFC 4180 CSV generation.
  - Click **"Printable Dossier"** to show the professional print layout.
- **Closing Remarks:**
  > *"RegTech Sentinel bridges the gap between opaque machine learning and rigid rule systems. By pairing explainable deterministic rules with an Isolation Forest statistical outlier detector and an immutable audit trail, compliance officers can detect risk, explain decisions, and act with confidence."*

---

## Technical Defense & Q&A Cheat Sheet

| Question | Answer |
| :--- | :--- |
| **Why Isolation Forest instead of a neural network or XGBoost?** | Isolation Forest is unsupervised and does not require labeled real-world bank fraud datasets (which are proprietary and subject to privacy laws). It detects arbitrary unknown deviations by randomly partitioning feature trees. |
| **Why not treat ML output as a fraud probability?** | Unsupervised anomaly detectors produce outlier scores based on tree depth, not calibrated Bayesian probabilities. Calling it a 'probability of fraud' would mislead compliance officers and regulators. |
| **How does the system handle ML service failure?** | The backend includes graceful degradation. If the Python service fails or times out (2000ms), the transaction pipeline proceeds using 100% deterministic rules and logs a visible degraded status notice. |
| **How are false positives reduced?** | Rules require multiple orthogonal indicators before escalating to CRITICAL. Analysts can mark cases as `FALSE_POSITIVE` with documented rationale, updating customer turnover expectations to adjust future baselines. |
| **What is the database design?** | Embedded SQLite running in WAL mode with foreign keys enabled, parameterized queries, and composite indexes on `sender_account_id`, `created_at`, `status`, and `risk_band`. |
