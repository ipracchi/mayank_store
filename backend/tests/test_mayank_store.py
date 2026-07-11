"""Backend integration tests for Mayank Store Khata."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://easy-accounts-27.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
PIN = "1234"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def party_id(s):
    """Create a test party used across tests, clean up after."""
    r = s.post(f"{API}/parties", json={
        "name": "TEST_PytestParty",
        "phone": "+919999999999",
        "firm_name": "TEST Firm",
        "contact_person": "TEST Person",
        "gst_number": "22TESTS0000A1Z5",
        "opening_balance": 5000.0,
    })
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    yield pid
    s.delete(f"{API}/parties/{pid}")


# ----- Auth -----
class TestAuth:
    def test_status_pin_set(self, s):
        r = s.get(f"{API}/auth/status")
        assert r.status_code == 200
        assert r.json().get("pin_set") is True

    def test_verify_pin_success(self, s):
        r = s.post(f"{API}/auth/verify-pin", json={"pin": PIN})
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_verify_pin_wrong(self, s):
        r = s.post(f"{API}/auth/verify-pin", json={"pin": "0000"})
        assert r.status_code == 401

    def test_verify_pin_bad_format(self, s):
        r = s.post(f"{API}/auth/verify-pin", json={"pin": "abc"})
        assert r.status_code == 422

    def test_change_pin_wrong_current(self, s):
        r = s.post(f"{API}/auth/change-pin", json={"current_pin": "0000", "new_pin": "9999"})
        assert r.status_code == 401

    def test_change_pin_roundtrip(self, s):
        r = s.post(f"{API}/auth/change-pin", json={"current_pin": PIN, "new_pin": "5678"})
        assert r.status_code == 200
        r2 = s.post(f"{API}/auth/verify-pin", json={"pin": "5678"})
        assert r2.status_code == 200
        # reset back
        r3 = s.post(f"{API}/auth/change-pin", json={"current_pin": "5678", "new_pin": PIN})
        assert r3.status_code == 200


# ----- Parties & opening balance semantics -----
class TestParty:
    def test_party_created_with_positive_opening(self, s, party_id):
        r = s.get(f"{API}/parties/{party_id}")
        assert r.status_code == 200
        d = r.json()
        assert d["name"] == "TEST_PytestParty"
        assert d["firm_name"] == "TEST Firm"
        assert d["gst_number"] == "22TESTS0000A1Z5"
        assert d["balance"] == 5000.0  # positive = to receive

    def test_party_negative_opening(self, s):
        r = s.post(f"{API}/parties", json={"name": "TEST_Neg", "opening_balance": -1200})
        assert r.status_code == 200
        d = r.json()
        assert d["balance"] == -1200.0
        s.delete(f"{API}/parties/{d['id']}")

    def test_party_missing_name(self, s):
        r = s.post(f"{API}/parties", json={"name": ""})
        assert r.status_code == 422

    def test_search_filter(self, s, party_id):
        r = s.get(f"{API}/parties", params={"search": "TEST_Pytest"})
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert party_id in ids

    def test_delete_missing(self, s):
        r = s.delete(f"{API}/parties/nonexistent-id-xyz")
        assert r.status_code == 404


# ----- Transactions & balance math -----
class TestTransactions:
    def test_balance_math_opening_gave_got(self, s, party_id):
        # opening 5000 + gave 1500 - got 2000 = 4500
        r1 = s.post(f"{API}/transactions", json={"party_id": party_id, "type": "gave", "amount": 1500})
        assert r1.status_code == 200
        r2 = s.post(f"{API}/transactions", json={"party_id": party_id, "type": "got", "amount": 2000})
        assert r2.status_code == 200
        r = s.get(f"{API}/parties/{party_id}")
        assert r.status_code == 200
        assert r.json()["balance"] == 4500.0

    def test_tx_negative_rejected(self, s, party_id):
        r = s.post(f"{API}/transactions", json={"party_id": party_id, "type": "gave", "amount": -1})
        assert r.status_code == 422

    def test_tx_unknown_party(self, s):
        r = s.post(f"{API}/transactions", json={"party_id": "no-such", "type": "gave", "amount": 10})
        assert r.status_code == 404

    def test_list_transactions(self, s, party_id):
        r = s.get(f"{API}/parties/{party_id}/transactions")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 3  # opening + gave + got


# ----- Summary / Reminders / Report -----
class TestSummary:
    def test_summary(self, s, party_id):
        r = s.get(f"{API}/summary")
        assert r.status_code == 200
        d = r.json()
        for k in ("total_receivable", "total_payable", "net", "party_count", "transaction_count"):
            assert k in d
        assert d["party_count"] >= 1

    def test_reminders_contains_receivable(self, s, party_id):
        r = s.get(f"{API}/reminders")
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert party_id in ids  # positive balance party

    def test_monthly_report(self, s, party_id):
        from datetime import datetime
        now = datetime.utcnow()
        r = s.get(f"{API}/report/monthly", params={"year": now.year, "month": now.month})
        assert r.status_code == 200
        d = r.json()
        assert "rows" in d and "total_gave" in d and "total_got" in d
        assert isinstance(d["rows"], list)

    def test_monthly_report_july_2026(self, s):
        r = s.get(f"{API}/report/monthly", params={"year": 2026, "month": 7})
        assert r.status_code == 200
        d = r.json()
        assert "rows" in d and "total_gave" in d and "total_got" in d


# ----- Delete cascades transactions -----
class TestCleanup:
    def test_delete_party_cascades(self, s):
        r = s.post(f"{API}/parties", json={"name": "TEST_ToDelete", "opening_balance": 100})
        pid = r.json()["id"]
        s.post(f"{API}/transactions", json={"party_id": pid, "type": "gave", "amount": 10})
        r2 = s.delete(f"{API}/parties/{pid}")
        assert r2.status_code == 200
        r3 = s.get(f"{API}/parties/{pid}")
        assert r3.status_code == 404
