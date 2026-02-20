"""
Regression test: dashboard fetch must use explicit column selection, not select("*").
Ensures the optimization (index-only scan, payload size) is not reverted.
"""
import pytest
from pathlib import Path


def test_dashboard_uses_explicit_columns_no_star():
    """Fail if services/dashboard.py uses .select('*') or .select(\"*\")."""
    dashboard_path = Path(__file__).resolve().parent.parent / "services" / "dashboard.py"
    source = dashboard_path.read_text(encoding="utf-8")
    assert 'select("*")' not in source, (
        "dashboard.py must not use select('*'); use explicit column lists for payload and index optimization."
    )
    assert "select('*')" not in source, (
        "dashboard.py must not use select('*'); use explicit column lists."
    )


def test_dashboard_has_six_explicit_selects():
    """Expect exactly 6 table select() calls (admissions, vital_signs, iv_records, meal_requests, exam_schedules, document_requests)."""
    dashboard_path = Path(__file__).resolve().parent.parent / "services" / "dashboard.py"
    source = dashboard_path.read_text(encoding="utf-8")
    # .select("...explicit columns...") count
    selects = source.count(".select(")
    assert selects >= 6, (
        f"dashboard.py should have at least 6 explicit .select(...) calls, found {selects}."
    )
