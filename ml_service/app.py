import os
import json
import logging
import joblib
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("regtech-ml")

app = Flask(__name__)

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

model = None
scaler = None
metadata = {}

def load_artifacts():
    global model, scaler, metadata
    try:
        if os.path.exists(MODEL_FILE) and os.path.exists(SCALER_FILE):
            model = joblib.load(MODEL_FILE)
            scaler = joblib.load(SCALER_FILE)
            logger.info("Successfully loaded ML model and scaler artifacts.")
        else:
            logger.warning("ML artifacts not found. Model will require training.")

        if os.path.exists(METADATA_FILE):
            with open(METADATA_FILE, "r", encoding="utf-8") as f:
                metadata = json.load(f)
            logger.info(f"Loaded metadata for model version: {metadata.get('model_version')}")
    except Exception as e:
        logger.error(f"Error loading artifacts: {e}")

load_artifacts()

@app.route("/health", methods=["GET"])
def health():
    is_ready = model is not None and scaler is not None
    return jsonify({
        "status": "healthy" if is_ready else "degraded",
        "service": "regtech-ml-service",
        "model_version": metadata.get("model_version", "unknown"),
        "ready": is_ready,
        "algorithm": "IsolationForest",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), (200 if is_ready else 503)

@app.route("/metadata", methods=["GET"])
def get_metadata():
    if not metadata:
        return jsonify({"error": "Metadata not loaded"}), 404
    return jsonify(metadata), 200

@app.route("/predict", methods=["POST"])
def predict():
    if model is None or scaler is None:
        return jsonify({
            "error": "ML model not initialized. Service running in degraded state.",
            "is_anomaly": False,
            "anomaly_score": 0.0
        }), 503

    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Invalid or missing JSON payload"}), 400

    try:
        amount = float(payload.get("amount", 0.0))
        velocity_1h = int(payload.get("velocity_1h", 1))
        amount_dev_from_mean = float(payload.get("amount_dev_from_mean", 0.0))
        is_night_time = 1 if payload.get("is_night_time") in [1, True, "1"] else 0
        is_cross_border = 1 if payload.get("is_cross_border") in [1, True, "1"] else 0
        is_high_risk_country = 1 if payload.get("is_high_risk_country") in [1, True, "1"] else 0
        channel_str = str(payload.get("channel", "WEB")).upper()
        channel_encoded = CHANNEL_MAP.get(channel_str, 0)

        # Feature vector
        amount_log = float(np.log1p(max(amount, 0.01)))
        raw_df = pd.DataFrame([{
            "amount_log": amount_log,
            "velocity_1h": velocity_1h,
            "amount_dev_from_mean": amount_dev_from_mean,
            "is_night_time": is_night_time,
            "is_cross_border": is_cross_border,
            "is_high_risk_country": is_high_risk_country,
            "channel_encoded": channel_encoded
        }])[FEATURE_NAMES]

        scaled_features = scaler.transform(raw_df)
        raw_decision_score = float(model.decision_function(scaled_features)[0])
        pred_label = int(model.predict(scaled_features)[0]) # -1 = anomaly, 1 = normal

        # Convert decision function to normalized 0 to 1 anomaly score
        # In scikit-learn IsolationForest, negative decision_function indicates anomaly
        # Typically values span [-0.4, 0.3]. We apply logistic sigmoid transformation
        anomaly_score = float(1.0 / (1.0 + np.exp(raw_decision_score * 6.0)))
        anomaly_score = round(float(np.clip(anomaly_score, 0.0, 1.0)), 4)
        is_anomaly = bool(pred_label == -1 or anomaly_score >= 0.60)

        return jsonify({
            "anomaly_score": anomaly_score,
            "is_anomaly": is_anomaly,
            "raw_decision_score": round(raw_decision_score, 4),
            "model_version": metadata.get("model_version", "v1.0.0"),
            "features_analyzed": {
                "amount": amount,
                "amount_log": round(amount_log, 3),
                "velocity_1h": velocity_1h,
                "amount_dev_from_mean": round(amount_dev_from_mean, 2),
                "is_night_time": is_night_time,
                "is_cross_border": is_cross_border,
                "is_high_risk_country": is_high_risk_country,
                "channel": channel_str
            },
            "interpretation_note": "Isolation Forest anomaly indicator. Measures multidimensional deviation from synthetic baseline behavior; not a calibrated fraud probability.",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        return jsonify({"error": f"Inference processing failed: {str(e)}"}), 500

@app.route("/retrain", methods=["POST"])
def retrain():
    try:
        from train import train_and_evaluate
        meta = train_and_evaluate()
        load_artifacts()
        return jsonify({
            "status": "success",
            "message": "Model retrained and reloaded successfully.",
            "metadata": meta
        }), 200
    except Exception as e:
        logger.error(f"Retraining failed: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", os.environ.get("ML_PORT", 5050)))
    logger.info(f"Starting RegTech ML Inference Service on port {port}...")
    app.run(host="127.0.0.1", port=port, debug=False)
