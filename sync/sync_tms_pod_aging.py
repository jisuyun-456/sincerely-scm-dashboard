"""
sync_tms_pod_aging — snapshot of in-transit shipments with aging days.

Fetches 배송중 shipments, computes aging_days from 출하확정일 to today.
React widget filters by max snapshot_date for current view.

Airtable base: app4x70a8mOrIKsMf (TMS)
PAT env var  : AIRTABLE_PAT_TMS
"""
from __future__ import annotations

import os
import sys
import time
from datetime import date, datetime, timezone
from typing import Any

import requests

TMS_BASE = "app4x70a8mOrIKsMf"
TBL_SHIPMENT = "tbllg1JoHclGYer7m"
AIRTABLE_BASE_URL = "https://api.airtable.com/v0"

FLD_SC_ID = "fldBUwhBlhOMsJZdv"
FLD_STATUS = "fldOhibgxg6LIpRTi"
FLD_SHIPMENT_DATE = "fldQvmEwwzvQW95h9"

FILTER_IN_TRANSIT = '{발송상태_TMS}="배송중"'


def _headers(pat: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {pat}", "Content-Type": "application/json"}


def _supabase_headers(key: str) -> dict[str, str]:
    return {"apikey": key, "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation,resolution=merge-duplicates"}


def _get_records(pat: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    offset: str | None = None
    while True:
        params: dict[str, Any] = {
            "fields[]": [FLD_SC_ID, FLD_STATUS, FLD_SHIPMENT_DATE],
            "pageSize": 100, "returnFieldsByFieldId": "true",
            "filterByFormula": FILTER_IN_TRANSIT,
        }
        if offset:
            params["offset"] = offset
        resp = requests.get(f"{AIRTABLE_BASE_URL}/{TMS_BASE}/{TBL_SHIPMENT}",
                            headers=_headers(pat), params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
        time.sleep(0.2)
    return records


def _insert_sync_run(supabase_url: str, key: str, *, job_name: str, started_at: datetime,
                      finished_at: datetime, status: str, rows_written: int = 0, error_message: str | None = None) -> None:
    payload = {
        "job_name": job_name, "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(), "status": status,
        "rows_written": rows_written,
        "error_message": error_message[:500] if error_message else None,
        "github_run_id": os.environ.get("GITHUB_RUN_ID"),
    }
    requests.post(f"{supabase_url}/rest/v1/sync_runs",
                  headers={"apikey": key, "Authorization": f"Bearer {key}",
                           "Content-Type": "application/json", "Prefer": "return=representation"},
                  json=payload, timeout=15).raise_for_status()


def run() -> int:
    pat = os.environ.get("AIRTABLE_PAT_TMS", "")
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not pat:
        print("[tms_pod_aging] AIRTABLE_PAT_TMS not set — skipping", file=sys.stderr)
        return 0

    started_at = datetime.now(timezone.utc)
    today = date.today()
    print("[tms_pod_aging] start")
    try:
        records = _get_records(pat)
        print(f"[tms_pod_aging] fetched {len(records)} in-transit shipments")

        rows = []
        for rec in records:
            f = rec["fields"]
            sc_id = f.get(FLD_SC_ID)
            shipment_date_str = f.get(FLD_SHIPMENT_DATE)
            aging_days = None
            if shipment_date_str:
                try:
                    aging_days = (today - date.fromisoformat(shipment_date_str)).days
                except ValueError:
                    pass
            status_raw = f.get(FLD_STATUS)
            status = status_raw.get("name") if isinstance(status_raw, dict) else status_raw
            rows.append({
                "snapshot_date": today.isoformat(),
                "shipment_id": rec["id"],
                "sc_id": sc_id,
                "shipment_date": shipment_date_str,
                "aging_days": aging_days,
                "status": status,
            })

        if not rows:
            print("[tms_pod_aging] no in-transit shipments")
            finished_at = datetime.now(timezone.utc)
            _insert_sync_run(supabase_url, supabase_key, job_name="tms_pod_aging",
                             started_at=started_at, finished_at=finished_at, status="ok", rows_written=0)
            return 0

        requests.post(
            f"{supabase_url}/rest/v1/tms_pod_aging?on_conflict=snapshot_date,shipment_id",
            headers=_supabase_headers(supabase_key), json=rows, timeout=30).raise_for_status()

        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(supabase_url, supabase_key, job_name="tms_pod_aging",
                         started_at=started_at, finished_at=finished_at, status="ok", rows_written=len(rows))
        print(f"[tms_pod_aging] ok — {len(rows)} rows upserted")
        return 0

    except Exception as e:  # noqa: BLE001
        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(supabase_url, supabase_key, job_name="tms_pod_aging",
                         started_at=started_at, finished_at=finished_at, status="failed", error_message=str(e))
        print(f"[tms_pod_aging] error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    sys.exit(run())
