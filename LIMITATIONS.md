# RegTech Sentinel — System Limitations & Production Roadmap

## 1. Prototype Scope & Regulatory Clarification

RegTech Sentinel is an engineering prototype developed for university hackathon demonstration purposes. To maintain ethical, technical, and regulatory transparency, this document articulates the specific architectural and functional boundaries distinguishing this prototype from a production banking system.

---

## 2. Technical & Architectural Limitations

### 2.1 Synthetic Data vs. Real Financial Data
- **Limitation:** All customer profiles, account balances, transaction volumes, counterparties, and watchlist entities are generated synthetically.
- **Why this matters:** Synthetic data typologies (e.g., structuring, rapid flow-through) are injected with defined mathematical parameters. In real-world payment networks, money laundering typologies evolve adversarially, involve multi-layered smurfing networks, and operate across hundreds of intermediary financial institutions.
- **Production Requirement:** Training and validating models against sanitized, anonymized historical consortium datasets with real-world label distributions and concept drift tracking.

### 2.2 Unsupervised Anomaly Detection vs. Calibrated Fraud Probability
- **Limitation:** The scikit-learn Isolation Forest model produces a statistical outlier score based on path lengths in randomized trees. This output is scaled between 0.0 and 1.0.
- **Why this matters:** The anomaly score reflects multidimensional deviation from synthetic training patterns; it is **not** a calibrated posterior probability of fraud (i.e. $P(\text{Fraud} \mid X)$).
- **Production Requirement:** Implementation of supervised or semi-supervised ensemble models (e.g. LightGBM, Graph Neural Networks) calibrated using Platt scaling or isotonic regression on confirmed SAR outcomes.

### 2.3 Single-Node SQLite vs. Distributed High-Availability Storage
- **Limitation:** The application persists records to a local SQLite database (`data/regtech.db`) operating in WAL mode.
- **Why this matters:** While SQLite in WAL mode handles hundreds of concurrent read operations with sub-millisecond latency on a local machine, it is confined to a single filesystem and does not support horizontal write scaling, multi-region replication, or automated failover.
- **Production Requirement:** Migration to a distributed multi-region relational database (e.g., Amazon Aurora PostgreSQL or Google Cloud Spanner) paired with an Apache Kafka or Redpanda event log for streaming ingestion.

### 2.4 Application-Level Audit Log vs. Tamper-Proof WORM Storage
- **Limitation:** The audit trail (`audit_events`) is an append-only SQLite table protected by application-level constraints.
- **Why this matters:** Anyone with direct operating-system write access to the `.db` file could hypothetically alter historical rows.
- **Production Requirement:** In production financial institutions, regulatory compliance logs must be mirrored to hardware-enforced Write-Once-Read-Many (WORM) storage (e.g., AWS S3 Object Lock in Compliance Mode) or cryptographic transparency ledgers with verifiable Merkle tree proofs.

### 2.5 Simulated Authentication & Identity
- **Limitation:** The application uses a demonstration identity model (Sarah Jenkins, Senior AML Compliance Officer) without requiring password logins or multi-factor authentication.
- **Why this matters:** Suitable for local hackathon evaluations, but unsuitable for multi-tenant enterprise deployments.
- **Production Requirement:** Enterprise Single Sign-On (SSO) via OpenID Connect (OIDC) / SAML 2.0 with Hardware Security Key (FIDO2) MFA, Role-Based Access Control (RBAC), and mutual TLS (mTLS) for microservice communication.

### 2.6 Simulated Sanctions Screening & KYC
- **Limitation:** Sanctions screening is performed against a synthetic list of 20 fictional designated entities, and KYC status changes are simulated without connecting to official government identity registers or credit bureaus.
- **Why this matters:** The system does not claim coverage of official OFAC SDN lists, UN Security Council lists, EU Consolidated sanctions, or PEP registers.
- **Production Requirement:** Integration with accredited commercial watchlist providers (e.g., Dow Jones Risk & Compliance, Refinitiv World-Check) via authenticated, nightly-updated automated ingestion pipelines.

---

## 3. Production Deployment Roadmap

To elevate RegTech Sentinel from a hackathon prototype to an enterprise-grade production platform:

1. **Streaming Data Ingestion:**
   - Replace local HTTP ingestion with Apache Kafka / AWS Kinesis for ingestion at > 50,000 transactions per second.
2. **Graph Analytics for Network AML:**
   - Incorporate graph database engines (e.g., Neo4j or Amazon Neptune) to detect cyclical fund routing, shared beneficiary device fingerprints, and hidden entity clusters.
3. **Automated Regulatory SAR Filing:**
   - Integrate automated FinCEN SAR XML generation and secure batch transmission protocols (e.g., BSA E-Filing System).
4. **Model Governance & MLOps:**
   - Implement continuous model drift monitoring, automated shadow model evaluation, and compliance with the Federal Reserve SR 11-7 Model Risk Management guidelines.
5. **Zero-Trust Security:**
   - Enforce end-to-end data encryption at rest (AES-256) and in transit (TLS 1.3), automated secret rotation via HashiCorp Vault, and strict network isolation.
