"""
sync_tms_daily_volume — daily shipment volume snapshot (last 30 days).

Groups by 출하확정일: sent_count=total, delivered_count=배송완료|출하완료, pending_count=rest.

Airtable base: app4x70a8mOrIKsMf (TMS)
PAT env var  : AIRTABLE_PAT_TMS
"""
from __future__ import annotations

import os
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

import requests

TMS_BASE = "app4x70a8mOrIKsMf"
TBL_SHIPMENT = "tbllg1JoHclGYer7m"
AIRTABLE_BASE_URL = "https://api.airtable.com/v0"

FLD_STATUS = "fldOhibgxg6LIpRTi"
FLD_SHIPMENT_DATE = "fldQvmEwwzvQW95h9"

FILTER_30D = "IS_AFTER({출하확정일},DATEADD(TODAY(),-30,'days'))"


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
            "fields[]": [FLD_STATUS, FLD_SHIPMENT_DATE],
            "pageSize": 100, "returnFieldsByFieldId": "true",
            "filterByFormula": FILTER_30D,
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
        print("[tms_daily_volume] AIRTABLE_PAT_TMS not set — skipping", file=sys.stderr)
        return 0

    started_at = datetime.now(timezone.utc)
    print("[tms_daily_volume] start")
    try:
        records = _get_records(pat)
        print(f"[tms_daily_volume] fetched {len(records)} records")

        sent: dict[str, int] = defaultdict(int)
        dlv: dict[str, int] = defaultdict(int)
        for rec in records:
            f = rec["fields"]
            d = f.get(FLD_SHIPMENT_DATE)
            if not d:
                continue
            status_raw = f.get(FLD_STATUS)
            status = status_raw.get("name") if isinstance(status_raw, dict) else status_raw
            sent[d] += 1
            if status in ("배송완료", "출하 완료", "출하완료"):
                dlv[d] += 1

        rows = [{"date": d, "sent_count": total,
                 "delivered_count": dlv.get(d, 0), "pending_count": total - dlv.get(d, 0)}
                for d, total in sent.items()]

        if not rows:
            print("[tms_daily_volume] no rows")
            finished_at = datetime.now(timezone.utc)
            _insert_sync_run(supabase_url, supabase_key, job_name="tms_daily_volume",
                             started_at=started_at, finished_at=finished_at, status="ok", rows_written=0)
            return 0

        requests.post(f"{supabase_url}/rest/v1/tms_daily_volume?on_conflict=date",
                      headers=_supabase_headers(supabase_key), json=rows, timeout=30).raise_for_status()

        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(supabase_url, supabase_key, job_name="tms_daily_volume",
                         started_at=started_at, finished_at=finished_at, status="ok", rows_written=len(rows))
        print(f"[tms_daily_volume] ok — {len(rows)} date rows upserted")
        return 0

    except Exception as e:  # noqa: BLE001
        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(supabase_url, supabase_key, job_name="tms_daily_volume",
                         started_at=started_at, finished_at=finished_at, status="failed", error_message=str(e))
        print(f"[tms_daily_volume] error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    sys.exit(run())
