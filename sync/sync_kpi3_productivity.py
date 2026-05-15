"""
sync_kpi3_productivity — TMS 처리건수/FTE 주간 생산성 KPI.

Groups confirmed shipments by ISO-week and upserts to Supabase kpi3_productivity.

Airtable base: app4x70a8mOrIKsMf (TMS)
Table        : tbllg1JoHclGYer7m (TBL_SHIPMENT)
Fields       : fldQvmEwwzvQW95h9 (출하확정일), fldp6haTDFzzF5C74 (구간유형)

FTE          : 7 (TMS Ops, hardcoded V1 — refine via config/team_parts.py later)
"""

from __future__ import annotations

import os
import sys
import time
from collections import defaultdict
from datetime import date, datetime, timezone
from typing import Any

import requests

TMS_BASE = "app4x70a8mOrIKsMf"
TBL_SHIPMENT = "tbllg1JoHclGYer7m"
AIRTABLE_BASE_URL = "https://api.airtable.com/v0"

FLD_SHIPMENT_DATE = "fldQvmEwwzvQW95h9"  # 출하확정일
FLD_INTERVAL_TYPE = "fldp6haTDFzzF5C74"  # 구간유형

FTE = 7  # V1 hardcoded; see config/team_parts.py


def _airtable_headers(pat: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {pat}", "Content-Type": "application/json"}


def _supabase_headers(key: str) -> dict[str, str]:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates",
    }


def _get_all_records(pat: str) -> list[dict[str, Any]]:
    """Fetch all TMS Shipment records that have 출하확정일 set."""
    records: list[dict[str, Any]] = []
    offset: str | None = None
    while True:
        params: dict[str, Any] = {
            "fields[]": [FLD_SHIPMENT_DATE, FLD_INTERVAL_TYPE],
            "pageSize": 100,
            "returnFieldsByFieldId": "true",
            "filterByFormula": f'NOT({{{FLD_SHIPMENT_DATE}}}="")',
        }
        if offset:
            params["offset"] = offset
        resp = requests.get(
            f"{AIRTABLE_BASE_URL}/{TMS_BASE}/{TBL_SHIPMENT}",
            headers=_airtable_headers(pat),
            params=params,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
        time.sleep(0.2)
    return records


def _to_week_id(date_str: str) -> str | None:
    """Convert ISO date string to week_id like '2026-W20'."""
    try:
        d = date.fromisoformat(date_str)
        iso = d.isocalendar()
        return f"{iso[0]}-W{iso[1]:02d}"
    except (ValueError, TypeError):
        return None


def _insert_sync_run(
    supabase_url: str,
    key: str,
    *,
    job_name: str,
    started_at: datetime,
    finished_at: datetime,
    status: str,
    rows_written: int = 0,
    error_message: str | None = None,
) -> None:
    payload = {
        "job_name": job_name,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "status": status,
        "rows_written": rows_written,
        "error_message": error_message[:500] if error_message else None,
        "github_run_id": os.environ.get("GITHUB_RUN_ID"),
    }
    requests.post(
        f"{supabase_url}/rest/v1/sync_runs",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        json=payload,
        timeout=15,
    ).raise_for_status()


def run() -> int:
    pat = os.environ.get("AIRTABLE_PAT_TMS", "")
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "")

    if not pat:
        print("[kpi3_productivity] AIRTABLE_PAT_TMS not set — skipping", file=sys.stderr)
        return 0

    started_at = datetime.now(timezone.utc)
    print("[kpi3_productivity] start")

    try:
        records = _get_all_records(pat)
        print(f"[kpi3_productivity] fetched {len(records)} records with 출하확정일")

        # Group by ISO-week
        by_week: dict[str, int] = defaultdict(int)
        for rec in records:
            d_str = rec["fields"].get(FLD_SHIPMENT_DATE)
            if not d_str:
                continue
            week_id = _to_week_id(d_str)
            if week_id:
                by_week[week_id] += 1

        rows = [
            {
                "week_id": wid,
                "shipment_count": cnt,
                "fte": FTE,
                "updated_at": started_at.isoformat(),
            }
            for wid, cnt in by_week.items()
        ]

        if not rows:
            print("[kpi3_productivity] no rows to upsert")
            finished_at = datetime.now(timezone.utc)
            _insert_sync_run(
                supabase_url, supabase_key,
                job_name="kpi3_productivity",
                started_at=started_at, finished_at=finished_at,
                status="ok", rows_written=0,
            )
            return 0

        # Batch upsert (10 per request to stay within limits)
        total_written = 0
        for i in range(0, len(rows), 10):
            batch = rows[i : i + 10]
            requests.post(
                f"{supabase_url}/rest/v1/kpi3_productivity?on_conflict=week_id",
                headers=_supabase_headers(supabase_key),
                json=batch,
                timeout=30,
            ).raise_for_status()
            total_written += len(batch)

        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(
            supabase_url, supabase_key,
            job_name="kpi3_productivity",
            started_at=started_at, finished_at=finished_at,
            status="ok", rows_written=total_written,
        )
        print(f"[kpi3_productivity] ok — {total_written} week rows upserted, fte={FTE}")
        return 0

    except Exception as e:  # noqa: BLE001
        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(
            supabase_url, supabase_key,
            job_name="kpi3_productivity",
            started_at=started_at, finished_at=finished_at,
            status="failed", rows_written=0, error_message=str(e),
        )
        print(f"[kpi3_productivity] error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    sys.exit(run())
