import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, roc_auc_score, precision_recall_fscore_support

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(MODEL_DIR, "model.joblib")
SCALER_FILE = os.path.join(MODEL_DIR, "scaler.joblib")
METADATA_FILE = os.path.join(MODEL_DIR, "metadata.json")

CHANNEL_MAP = {"WEB": 0, "MOBILE": 1, "API": 2, "SWIFT": 3, "ATM": 4}
FEATURE_NAMES = [
    "amount_log",
    "velocity_1h",
    "amount_dev_from_mean",
    "is_night_time",
    "is_cross_border",
    "is_high_risk_country",
    "channel_encoded",
]

def generate_synthetic_dataset(n_samples=5000, anomaly_ratio=0.08, random_state=42):
    """
    Generates a reproducible synthetic dataset of financial transaction features.
    Includes both normal commercial activity and injected anomaly patterns
    (e.g., structuring, sudden high velocity, abnormal deviations, high-risk routing).
    """
    np.random.seed(random_state)
    n_anomalies = int(n_samples * anomaly_ratio)
    n_normal = n_samples - n_anomalies

    # Normal distribution
    normal_amounts = np.random.lognormal(mean=5.5, sigma=1.2, size=n_normal) # median ~240, max a few thousands
    normal_velocity = np.random.poisson(lam=1.5, size=n_normal)
    normal_dev = np.random.normal(loc=0.0, scale=1.0, size=n_normal)
    normal_night = np.random.binomial(n=1, p=0.08, size=n_normal)
    normal_cross = np.random.binomial(n=1, p=0.15, size=n_normal)
    normal_high_risk = np.zeros(n_normal, dtype=int)
    normal_channels = np.random.choice([0, 1, 2, 3, 4], p=[0.4, 0.35, 0.15, 0.05, 0.05], size=n_normal)
    normal_labels = np.zeros(n_normal, dtype=int)

    # Injected anomalies (various typologies)
    # Typology 1: Structuring / sudden extreme amounts
    # Typology 2: Velocity burst
    # Typology 3: High risk country + cross-border off-hours
    # Typology 4: High deviation spike
    anomaly_amounts = np.concatenate([
        np.random.uniform(9000, 9999, size=n_anomalies // 4),  # Structuring just below 10k threshold
        np.random.lognormal(mean=9.5, sigma=1.0, size=n_anomalies // 4), # Whale transactions (>15k - 50k)
        np.random.lognormal(mean=6.0, sigma=1.0, size=n_anomalies - 2 * (n_anomalies // 4)),
    ])
    anomaly_velocity = np.concatenate([
        np.random.randint(8, 25, size=n_anomalies // 3), # rapid velocity burst
        np.random.randint(1, 4, size=n_anomalies - (n_anomalies // 3)),
    ])
    anomaly_dev = np.concatenate([
        np.random.uniform(4.0, 10.0, size=n_anomalies // 2), # extreme deviation from account baseline
        np.random.uniform(0.5, 3.0, size=n_anomalies - (n_anomalies // 2)),
    ])
    anomaly_night = np.random.binomial(n=1, p=0.45, size=n_anomalies)
    anomaly_cross = np.random.binomial(n=1, p=0.75, size=n_anomalies)
    anomaly_high_risk = np.random.binomial(n=1, p=0.40, size=n_anomalies)
    anomaly_channels = np.random.choice([0, 1, 2, 3, 4], p=[0.1, 0.1, 0.5, 0.25, 0.05], size=n_anomalies)
    anomaly_labels = np.ones(n_anomalies, dtype=int)

    amounts = np.concatenate([normal_amounts, anomaly_amounts])
    amounts = np.clip(amounts, 1.0, 1_000_000.0)
    velocities = np.concatenate([normal_velocity, anomaly_velocity])
    devs = np.concatenate([normal_dev, anomaly_dev])
    nights = np.concatenate([normal_night, anomaly_night])
    crosses = np.concatenate([normal_cross, anomaly_cross])
    high_risks = np.concatenate([normal_high_risk, anomaly_high_risk])
    channels = np.concatenate([normal_channels, anomaly_channels])
    labels = np.concatenate([normal_labels, anomaly_labels])

    # Shuffle
    indices = np.arange(n_samples)
    np.random.shuffle(indices)

    df = pd.DataFrame({
        "amount_log": np.log1p(amounts[indices]),
        "velocity_1h": velocities[indices],
        "amount_dev_from_mean": devs[indices],
        "is_night_time": nights[indices],
        "is_cross_border": crosses[indices],
        "is_high_risk_country": high_risks[indices],
        "channel_encoded": channels[indices],
        "label": labels[indices]
    })
    return df

def train_and_evaluate(random_state=42):
    print("=" * 60)
    print("RegTech Sentinel: Training ML Anomaly Detection Model")
    print("=" * 60)

    # Generate synthetic training and testing sets
    df_train = generate_synthetic_dataset(n_samples=6000, anomaly_ratio=0.08, random_state=random_state)
    df_test = generate_synthetic_dataset(n_samples=1500, anomaly_ratio=0.08, random_state=random_state + 100)

    X_train = df_train[FEATURE_NAMES]
    y_train = df_train["label"]

    X_test = df_test[FEATURE_NAMES]
    y_test = df_test["label"]

    # Preprocessing: StandardScaler fitted ONLY on training set
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train Isolation Forest
    # contamination is set to the estimated synthetic anomaly ratio (8%)
    contamination = 0.08
    model = IsolationForest(
        n_estimators=150,
        contamination=contamination,
        max_samples="auto",
        random_state=random_state,
        n_jobs=-1
    )
    model.fit(X_train_scaled)

    # IsolationForest outputs: -1 for anomaly, +1 for inlier
    # decision_function: lower means more anomalous (negative for anomalies)
    test_scores = model.decision_function(X_test_scaled)
    # Convert decision score to an anomaly score bounded roughly 0 to 1
    # where higher score means more anomalous
    test_preds = (model.predict(X_test_scaled) == -1).astype(int)

    # Calculate actual metrics on synthetic test anomalies
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, test_preds, average="binary", zero_division=0)
    
    # Invert decision score for ROC-AUC so higher score aligns with positive label (anomaly)
    inverted_scores = -test_scores
    roc_auc = float(roc_auc_score(y_test, inverted_scores))

    print(f"Model Training Complete.")
    print(f"Features: {FEATURE_NAMES}")
    print(f"Training samples: {len(X_train)} | Test samples: {len(X_test)}")
    print(f"Evaluated on Synthetic Test Set with Known Injected Typologies:")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall:    {recall:.4f}")
    print(f"  F1 Score:  {f1:.4f}")
    print(f"  ROC-AUC:   {roc_auc:.4f}")
    print("-" * 60)

    # Save artifacts
    joblib.dump(model, MODEL_FILE)
    joblib.dump(scaler, SCALER_FILE)

    metadata = {
        "model_name": "RegTech-Sentinel-IsolationForest",
        "model_version": "v1.0.0",
        "algorithm": "IsolationForest",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "random_state": random_state,
        "n_estimators": 150,
        "contamination": contamination,
        "features": FEATURE_NAMES,
        "channel_map": CHANNEL_MAP,
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "evaluation_metrics_on_synthetic_data": {
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1_score": round(float(f1), 4),
            "roc_auc": round(float(roc_auc), 4)
        },
        "disclaimer": "Evaluated strictly on synthetic financial benchmark data with injected typologies. Not certified for production regulatory or banking deployment."
    }

    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"Artifacts successfully saved to:")
    print(f"  {MODEL_FILE}")
    print(f"  {SCALER_FILE}")
    print(f"  {METADATA_FILE}")
    return metadata

if __name__ == "__main__":
    train_and_evaluate()
