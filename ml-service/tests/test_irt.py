from fastapi.testclient import TestClient
from main import app, p_correct

client = TestClient(app)


def test_p_correct_midpoint():
    assert abs(p_correct(0, 1, 0) - 0.5) < 1e-9


def test_theta_all_correct_positive():
    payload = {
        "responses": [
            {"a": 1, "b": 0, "correct": True},
            {"a": 1, "b": 0.5, "correct": True},
            {"a": 1.2, "b": 1, "correct": True},
        ]
    }
    r = client.post("/estimate-theta", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["theta"] > 0
    assert "prototype" in body["limitations"].lower() or "Prototype" in body["limitations"]


def test_readiness_has_band():
    r = client.post(
        "/readiness",
        json={
            "mastery_avg": 0.6,
            "recent_accuracy": 0.7,
            "theta_norm": 0.65,
            "consistency": 0.5,
            "activity": 0.4,
            "interview": 0.4,
        },
    )
    assert r.status_code == 200
    assert r.json()["band"] in {"NOT_READY", "DEVELOPING", "ON_TRACK", "READY", "HIGHLY_READY"}
