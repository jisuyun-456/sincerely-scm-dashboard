"""
sync_tms_multi_to — reads TMS Shipment records for the current week,
groups by PNA (project code), and upserts PNAs with 2+ TOs to
Supabase tms_multi_to_weekly.

Airtable base : app4x70a8mOrIKsMf (TMS)
Table         : tbllg1JoHclGYer7m (Shipment)
PAT env var   : AIRTABLE_PAT_TMS
"""

from __future__ import annotations

import json
import os
import sys
import time
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any

import requests

TMS_BASE = "app4x70a8mOrIKsMf"
TBL_SHIPMENT = "tbllg1JoHclGYer7m"
AIRTABLE_BASE_URL = "https://api.airtable.com/v0"

FLD_SC_ID = "fldBUwhBlhOMsJZdv"
FLD_PNA_CODE = "fldTs3FzaSdGYEiKX"
FLD_PNA_NAME = "fldZel4trYQwP7EV5"
FLD_STATUS = "fldOhibgxg6LIpRTi"
FLD_SHIPMENT_DATE = "fldQvmEwwzvQW95h9"
FLD_FINAL_ITEMS = "fldXXnGOXkm90snKn"  # 최종 출고 품목 및 수량 (formula)


def _week_start() -> date:
    today = date.today()
    return today - timedelta(days=today.weekday())  # Monday


def _airtable_headers(pat: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {pat}", "Content-Type": "application/json"}


def _supabase_upsert_headers(key: str) -> dict[str, str]:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates",
    }


def _get_records(pat: str, filter_formula: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    offset: str | None = None
    fields = [FLD_SC_ID, FLD_PNA_CODE, FLD_PNA_NAME, FLD_STATUS, FLD_SHIPMENT_DATE, FLD_FINAL_ITEMS]
    while True:
        params: dict[str, Any] = {
            "fields[]": fields,
            "pageSize": 100,
            "returnFieldsByFieldId": "true",
            "filterByFormula": filter_formula,
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
    r = requests.post(
        f"{supabase_url}/rest/v1/sync_runs",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        json=payload,
        timeout=15,
    )
    r.raise_for_status()


def run() -> int:
    airtable_pat = os.environ.get("AIRTABLE_PAT_TMS", "")
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "")

    if not airtable_pat:
        print("[tms_multi_to] AIRTABLE_PAT_TMS not set — skipping", file=sys.stderr)
        return 0

    started_at = datetime.now(timezone.utc)
    week_start = _week_start()
    week_end = week_start + timedelta(days=6)
    print(f"[tms_multi_to] start — week {week_start} to {week_end}")

    try:
        filter_formula = (
            f"AND("
            f"IS_AFTER({{출하확정일}},'{week_start - timedelta(days=1)}'),"
            f"IS_BEFORE({{출하확정일}},'{week_end + timedelta(days=1)}')"
            f")"
        )
        records = _get_records(airtable_pat, filter_formula)
        print(f"[tms_multi_to] fetched {len(records)} records")

        # Group by PNA code
        groups: dict[str, dict[str, Any]] = defaultdict(lambda: {"pna_name": None, "tos": []})
        for rec in records:
            f = rec["fields"]
            sc_id = f.get(FLD_SC_ID)
            if not sc_id:
                continue

            pna_code_raw = f.get(FLD_PNA_CODE)
            pna_code = None
            if isinstance(pna_code_raw, list) and pna_code_raw:
                pna_code = str(pna_code_raw[0])
            elif isinstance(pna_code_raw, str):
                pna_code = pna_code_raw
            if not pna_code:
                continue

            pna_name_raw = f.get(FLD_PNA_NAME)
            pna_name = None
            if isinstance(pna_name_raw, list) and pna_name_raw:
                pna_name = str(pna_name_raw[0])
            elif isinstance(pna_name_raw, str):
                pna_name = pna_name_raw

            status_raw = f.get(FLD_STATUS)
            status = status_raw.get("name") if isinstance(status_raw, dict) else status_raw

            groups[pna_code]["pna_name"] = groups[pna_code]["pna_name"] or pna_name
            groups[pna_code]["tos"].append({
                "sc_id": sc_id,
                "shipment_date": f.get(FLD_SHIPMENT_DATE),
                "status": status,
                "final_items": f.get(FLD_FINAL_ITEMS),
            })

        # Keep only PNAs with 2+ TOs
        multi_rows = []
        for pna_code, group in groups.items():
            tos = sorted(group["tos"], key=lambda x: x["shipment_date"] or "")
            if len(tos) < 2:
                continue
            multi_rows.append({
                "week_start": week_start.isoformat(),
                "pna_code": pna_code,
                "pna_name": group["pna_name"],
                "to_count": len(tos),
                "to_list": json.loads(json.dumps(tos)),
            })

        if not multi_rows:
            print("[tms_multi_to] no multi-TO PNAs this week")
            finished_at = datetime.now(timezone.utc)
            _insert_sync_run(
                supabase_url, supabase_key,
                job_name="tms_multi_to",
                started_at=started_at, finished_at=finished_at,
                status="ok", rows_written=0,
            )
            return 0

        resp = requests.post(
            f"{supabase_url}/rest/v1/tms_multi_to_weekly?on_conflict=week_start,pna_code",
            headers=_supabase_upsert_headers(supabase_key),
            json=multi_rows,
            timeout=30,
        )
        resp.raise_for_status()

        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(
            supabase_url, supabase_key,
            job_name="tms_multi_to",
            started_at=started_at, finished_at=finished_at,
            status="ok", rows_written=len(multi_rows),
        )
        print(f"[tms_multi_to] ok — {len(multi_rows)} multi-TO PNAs upserted")
        return 0

    except Exception as e:  # noqa: BLE001
        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(
            supabase_url, supabase_key,
            job_name="tms_multi_to",
            started_at=started_at, finished_at=finished_at,
            status="failed", rows_written=0, error_message=str(e),
        )
        print(f"[tms_multi_to] error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    sys.exit(run())
