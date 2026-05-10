"""
sync_wms_dayoung — reads Barcode base 피킹리스트 for 다영기획 임가공
jobs not yet completed → upserts to Supabase wms_dayoung_schedule.

Airtable base : app4LvuNIDiqTmhnv (Barcode)
Table         : tbl1AH1EmMSbhik0H (피킹리스트)
PAT env var   : AIRTABLE_API_KEY  (different from TMS PAT)

Filter: 임가공 장소 = "다영기획"
Excludes: records where 진행현황 contains "5.임가공 완료" (Python-side)
"""

from __future__ import annotations

import os
import sys
import time
from datetime import datetime, timezone
from typing import Any

import requests

BARCODE_BASE = "app4LvuNIDiqTmhnv"
TBL_PICKING = "tbl1AH1EmMSbhik0H"
AIRTABLE_BASE_URL = "https://api.airtable.com/v0"

# 피킹리스트 field names (use field names, not IDs — simpler for this base)
# Note: use field names directly since AIRTABLE_API_KEY token supports it
FILTER = "{임가공 장소} = \"다영기획\""

FIELD_NAMES = [
    "Name",
    "project",
    "임가공 예정일",
    "이동 예정일",
    "자재투입현황",
    "진행현황",
    "출고물품",
    "출고수량",
]

COMPLETED_STATUS = "5.임가공 완료"


def _airtable_headers(pat: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {pat}", "Content-Type": "application/json"}


def _supabase_upsert_headers(key: str) -> dict[str, str]:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates",
    }


def _get_records(pat: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    offset: str | None = None
    while True:
        params: dict[str, Any] = {
            "fields[]": FIELD_NAMES,
            "pageSize": 100,
            "filterByFormula": FILTER,
        }
        if offset:
            params["offset"] = offset
        resp = requests.get(
            f"{AIRTABLE_BASE_URL}/{BARCODE_BASE}/{TBL_PICKING}",
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
    airtable_key = os.environ.get("AIRTABLE_API_KEY", "")
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "")

    if not airtable_key:
        print("[wms_dayoung] AIRTABLE_API_KEY not set — skipping", file=sys.stderr)
        return 0

    started_at = datetime.now(timezone.utc)
    print("[wms_dayoung] start")

    try:
        records = _get_records(airtable_key)
        print(f"[wms_dayoung] fetched {len(records)} 다영기획 records")

        rows = []
        for rec in records:
            f = rec["fields"]

            # Python-side filter: exclude completed
            progress_raw = f.get("진행현황")
            progress_list: list[str] = []
            if isinstance(progress_raw, list):
                progress_list = [str(x) for x in progress_raw]
            elif isinstance(progress_raw, str):
                progress_list = [progress_raw]

            if COMPLETED_STATUS in progress_list:
                continue

            pks_id = f.get("Name", "").strip()
            if not pks_id:
                continue

            # quantity: rollup may return list or int
            qty_raw = f.get("출고수량")
            quantity = None
            if isinstance(qty_raw, (int, float)):
                quantity = int(qty_raw)
            elif isinstance(qty_raw, list) and qty_raw:
                try:
                    quantity = int(sum(float(x) for x in qty_raw if x))
                except (TypeError, ValueError):
                    quantity = None

            items_raw = f.get("출고물품")
            items = None
            if isinstance(items_raw, list):
                items = ", ".join(str(x) for x in items_raw if x)
            elif isinstance(items_raw, str):
                items = items_raw

            rows.append({
                "pks_id": pks_id,
                "project": f.get("project"),
                "scheduled_date": f.get("임가공 예정일"),
                "movement_date": f.get("이동 예정일"),
                "material_status": f.get("자재투입현황"),
                "progress_status": progress_list if progress_list else None,
                "items": items,
                "quantity": quantity,
            })

        print(f"[wms_dayoung] {len(rows)} active (non-completed) records")

        if not rows:
            finished_at = datetime.now(timezone.utc)
            _insert_sync_run(
                supabase_url, supabase_key,
                job_name="wms_dayoung",
                started_at=started_at, finished_at=finished_at,
                status="ok", rows_written=0,
            )
            return 0

        resp = requests.post(
            f"{supabase_url}/rest/v1/wms_dayoung_schedule?on_conflict=pks_id",
            headers=_supabase_upsert_headers(supabase_key),
            json=rows,
            timeout=30,
        )
        resp.raise_for_status()

        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(
            supabase_url, supabase_key,
            job_name="wms_dayoung",
            started_at=started_at, finished_at=finished_at,
            status="ok", rows_written=len(rows),
        )
        print(f"[wms_dayoung] ok — {len(rows)} rows upserted")
        return 0

    except Exception as e:  # noqa: BLE001
        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(
            supabase_url, supabase_key,
            job_name="wms_dayoung",
            started_at=started_at, finished_at=finished_at,
            status="failed", rows_written=0, error_message=str(e),
        )
        print(f"[wms_dayoung] error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    sys.exit(run())
