# RegTech Sentinel — Real-Time Risk Intelligence

> **Detect Risk. Explain Decisions. Act with Confidence.**

RegTech Sentinel is an enterprise-grade real-time financial risk intelligence platform designed for modern compliance teams. It solves the critical challenge of continuous transaction monitoring, counterparty exposure management, explainable AML/sanctions compliance, and multidimensional anomaly detection on streaming financial transaction data.

Built for the university FinTech Hackathon final submission build, the platform provides a complete end-to-end prototype using reproducible synthetic financial data.

---

## Key Features

1. **Dual-Analytical Risk Intelligence Engine:**
   - **Deterministic Explainable Rules:** 11 configurable compliance rules (Structuring patterns, large amounts, rapid velocity bursts, high-risk sanctions jurisdictions, incomplete KYC, synthetic watchlist matching, turnover spikes, cross-border off-hours, high-risk counterparty exposure, rapid flow-through, and channel deviation).
   - **Machine Learning Telemetry:** Locally trained scikit-learn **Isolation Forest** model detecting multidimensional statistical outliers (ROC-AUC 0.9558 on synthetic typologies).
   - **Explainable Aggregation:** Every risk score between 0 and 100 features a human-readable explanation and recommended compliance action.
2. **Live Transaction Monitor & Simulation Control:**
   - Real-time WebSocket streaming (Socket.IO).
   - Controls to start, pause, resume, stop, and adjust simulation tick rate.
   - Batch transaction generation.
   - **One-click Evaluator Demo Trigger:** Injects a reproducible multi-typology suspicious transaction for live demonstration.
3. **Alerts & Case Investigation Hub:**
   - Case lifecycle management: `NEW` &rarr; `UNDER_REVIEW` &rarr; `ESCALATED` &rarr; `RESOLVED` / `FALSE_POSITIVE`.
   - Mandatory documented compliance rationales for status transitions.
   - Case assignment and immutable investigation notes timeline.
4. **Sanctions & Watchlist Screening:**
   - Synthetic sanctions register (OFAC, UN, EU synthetic regimes).
   - Normalized exact-name matching and configurable fuzzy Levenshtein similarity screening (50% - 100% threshold).
   - Review and clearance workflows with audit logging.
5. **Counterparty Risk & Turnover Exposure:**
   - Real-time aggregation of turnover exposure proxy, transaction volume, and platform concentration percentages.
   - Geographic concentration and counterparty drill-down.
6. **Stress Testing & Scenario Analysis:**
   - Interactive what-if sliders (volume shock %, suspicious pattern multiplier, high-risk geo shift, counterparty default shock).
   - Baseline vs projected metrics and risk migration charts.
7. **Reporting & Regulatory Audit Log:**
   - RFC 4180 standard CSV download and professional printable dossier layout.
   - Append-only regulatory audit log recording all consequential operations.

---

## Architecture Overview

```
                      ┌───────────────────────────────────────────┐
                      │    React 18 + Vite + Tailwind Frontend    │
                      │             http://127.0.0.1:5173          │
                      └─────────────────────┬─────────────────────┘
                                            │ HTTP / WebSocket
                                            ▼
                      ┌───────────────────────────────────────────┐
                      │    Node.js + Express + Socket.IO Backend  │
                      │             http://127.0.0.1:5000          │
                      └─────────────┬─────────────────┬───────────┘
                                    │                 │ Local HTTP
                                    ▼                 ▼
             ┌─────────────────────────────┐   ┌─────────────────────────────┐
             │ SQLite Database (node:sqlite)│   │ Python Flask ML Service     │
             │       data/regtech.db       │   │    http://127.0.0.1:5050    │
             │   (WAL Mode, Foreign Keys)  │   │  (Isolation Forest v1.0.0)  │
             └─────────────────────────────┘   └─────────────────────────────┘
```

---

## Local Ports & Service Architecture

| Service | Port | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | `5173` | `http://127.0.0.1:5173` | React 18 single-page application |
| **Backend API** | `5000` | `http://127.0.0.1:5000/api` | Express REST API & Socket.IO gateway |
| **Health API** | `5000` | `http://127.0.0.1:5000/api/health` | Service mesh health check |
| **Python ML** | `5050` | `http://127.0.0.1:5050/health` | Flask Isolation Forest inference service |
| **SQLite DB** | Local | `data/regtech.db` | Synchronous WAL-mode SQLite database |

---

## Prerequisites

- **Windows 11** (or compatible Windows OS with PowerShell)
- **Node.js**: v20+ or v24+
- **Python**: 3.10+ (tested on Python 3.13)
- No internet connection, external API keys, cloud databases, or Docker required during normal execution after dependencies are present.

---

## Windows 11 Startup Commands

### One-Command Full Launch
Open PowerShell in `C:\Fintech` and run:

```powershell
.\start-demo.ps1
```

This automated script will:
1. Verify Node.js and Python runtimes.
2. Initialize `data/regtech.db` and seed baseline data (if clean).
3. Verify or train the Isolation Forest model artifact.
4. Launch the Python ML service on port 5050.
5. Launch the Node.js backend on port 5000.
6. Launch the React Vite frontend on port 5173.
7. Verify health readiness and automatically open your default browser to `http://127.0.0.1:5173`.

### Stop Services Cleanly
```powershell
.\stop-demo.ps1
```
Terminates only the project's background services and releases ports 5000, 5050, and 5173.

### Reset Demonstration Data Baseline
To restore the clean 14-day known baseline dataset at any time:
```powershell
.\reset-demo.ps1
```

### Run All Automated Tests
```powershell
.\test-all.ps1
```
Executes Python ML unit tests, Vitest backend API & rule engine tests, and Vite production build validation.

---

## Evaluator Demonstration Script

Please refer to [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) for the timed, 5-8 minute evaluator walkthrough with exact clicks, sample values, and talking points.

## System Documentation Links

- [System Architecture Specification](./ARCHITECTURE.md)
- [REST API & WebSocket Contract](./API_DOCUMENTATION.md)
- [Evaluator Demo Script](./DEMO_SCRIPT.md)
- [Technical Limitations & Production Roadmap](./LIMITATIONS.md)

---

## Disclaimer

*RegTech Sentinel is a prototype built for educational and demonstration purposes using synthetic financial records. It does not claim regulatory certification, official sanctions coverage, live banking connectivity, or calibrated fraud-detection accuracy on real-world bank data.*
