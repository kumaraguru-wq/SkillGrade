import os
import sqlite3
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


_TEST_DIRECTORY = tempfile.TemporaryDirectory(prefix="skillgrade-tests-")
_TEST_DATABASE = Path(_TEST_DIRECTORY.name) / "skillgrade-test.db"
os.environ["SKILLGRADE_DB_PATH"] = str(_TEST_DATABASE)

from backend import main  # noqa: E402  (database path must be configured before import)


client = TestClient(main.app)


@pytest.fixture(autouse=True)
def reset_test_state():
    with sqlite3.connect(_TEST_DATABASE) as connection:
        connection.execute("DELETE FROM applications")
    with main.TOKEN_REQUESTS_LOCK:
        main.TOKEN_REQUESTS.clear()
    yield


def valid_application(**overrides):
    payload = {
        "accountId": "backend-test-user",
        "age": 28,
        "district": "Chennai",
        "state": "Tamil Nadu",
        "education": "class10",
        "currentOccupation": "Electrician helper",
        "yearsExperience": 3,
        "skills": "Basic wiring",
        "skillProficiencyBand": "independent",
        "existingQualification": "none",
        "interests": "Electrical work",
        "employmentPreference": "job",
        "willingToRelocate": "no",
        "selectedCourse": "Q-ELE-001",
        "language": "en",
    }
    return {**payload, **overrides}


@pytest.mark.parametrize(
    ("overrides", "field"),
    [
        ({"age": "not-a-number"}, "age"),
        ({"yearsExperience": -1}, "yearsExperience"),
        ({"selectedCourse": "Q-NOT-REAL"}, "selectedCourse"),
    ],
)
def test_application_rejects_invalid_fields(overrides, field):
    response = client.post("/api/applications", json=valid_application(**overrides))

    assert response.status_code == 422
    assert any(error["loc"][-1] == field for error in response.json()["detail"])


def test_application_accepts_valid_payload():
    response = client.post("/api/applications", json=valid_application())

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "received"
    assert body["reference"].startswith("TNS-")


def test_application_stats_shape_with_fresh_database():
    response = client.get("/api/applications/stats")

    assert response.status_code == 200
    assert response.json() == {
        "total": 0,
        "byDistrict": {},
        "byPathway": {},
        "dataPolicy": "Non-identifying prototype funnel records",
    }


def test_gemini_token_requires_server_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    response = client.post("/api/gemini/token")

    assert response.status_code == 503
    assert response.json()["detail"] == "GEMINI_API_KEY is not configured"
