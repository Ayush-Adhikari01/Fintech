import unittest
import json
import os
import sys

# Ensure ml_service directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app, load_artifacts, model, scaler, metadata

class TestMLService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        load_artifacts()
        cls.client = app.test_client()

    def test_artifacts_loaded(self):
        self.assertIsNotNone(model, "Model should be loaded")
        self.assertIsNotNone(scaler, "Scaler should be loaded")
        self.assertIn("model_version", metadata)

    def test_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "healthy")
        self.assertTrue(data["ready"])
        self.assertEqual(data["algorithm"], "IsolationForest")

    def test_metadata_endpoint(self):
        response = self.client.get("/metadata")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("evaluation_metrics_on_synthetic_data", data)
        self.assertIn("features", data)
        self.assertGreater(data["evaluation_metrics_on_synthetic_data"]["roc_auc"], 0.8)

    def test_normal_transaction_prediction(self):
        payload = {
            "amount": 120.50,
            "velocity_1h": 1,
            "amount_dev_from_mean": 0.2,
            "is_night_time": 0,
            "is_cross_border": 0,
            "is_high_risk_country": 0,
            "channel": "MOBILE"
        }
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("anomaly_score", data)
        self.assertIn("is_anomaly", data)
        self.assertGreaterEqual(data["anomaly_score"], 0.0)
        self.assertLessEqual(data["anomaly_score"], 1.0)
        # Normal transaction should have low anomaly score
        self.assertLess(data["anomaly_score"], 0.70)

    def test_extreme_anomalous_transaction_prediction(self):
        payload = {
            "amount": 95000.0,
            "velocity_1h": 18,
            "amount_dev_from_mean": 8.5,
            "is_night_time": 1,
            "is_cross_border": 1,
            "is_high_risk_country": 1,
            "channel": "API"
        }
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("anomaly_score", data)
        self.assertTrue(data["is_anomaly"])
        self.assertGreaterEqual(data["anomaly_score"], 0.60)

    def test_invalid_payload_handling(self):
        response = self.client.post("/predict", data="invalid json", content_type="application/json")
        self.assertEqual(response.status_code, 400)

if __name__ == "__main__":
    unittest.main()
