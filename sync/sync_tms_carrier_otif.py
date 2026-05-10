"""
sync_tms_carrier_otif — per-carrier delivery rate snapshot (last 30 days).

Queries TMS Shipment table for last 30 days, resolves partner names,
groups by partner, computes delivered/total ratio as otif_pct.

Airtable base: app4x70a8mOrIKsMf (TMS)
PAT env var  : AIRTABLE_PAT_TMS
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
TBL_PARTNER = "tblI4ZXrte7WyhXyd"
AIRTABLE_BASE_URL = "https://api.airtable.com/v0"

FLD_PARTNER_LINKED = "fldM2u6RwLRrO7ymW"
FLD_STATUS = "fldOhibgxg6LIpRTi"
FLD_PARTNER_NAME = "fldUCl2kD890FqRkt"

FILTER_30D = "IS_AFTER({출하확정일},DATEADD(TODAY(),-30,'days'))"


def _headers(pat: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {pat}", "Content-Type": "application/json"}


def _supabase_headers(key: str) -> dict[str, str]:
    return {
        "apikey": key, "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates",
    }


def _get_records(pat: str, table_id: str, fields: list[str], formula: str | None = None) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    offset: str | None = None
    while True:
        params: dict[str, Any] = {"fields[]": fields, "pageSize": 100, "returnFieldsByFieldId": "true"}
        if offset:
            params["offset"] = offset
        if formula:
            params["filterByFormula"] = formula
        resp = requests.get(f"{AIRTABLE_BASE_URL}/{TMS_BASE}/{table_id}", headers=_headers(pat), params=params, timeout=30)
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
        print("[tms_carrier_otif] AIRTABLE_PAT_TMS not set — skipping", file=sys.stderr)
        return 0

    started_at = datetime.now(timezone.utc)
    print("[tms_carrier_otif] start")
    try:
        partner_recs = _get_records(pat, TBL_PARTNER, [FLD_PARTNER_NAME])
        partner_map = {r["id"]: r["fields"].get(FLD_PARTNER_NAME, "기타") for r in partner_recs}

        shipments = _get_records(pat, TBL_SHIPMENT, [FLD_PARTNER_LINKED, FLD_STATUS], FILTER_30D)
        print(f"[tms_carrier_otif] fetched {len(shipments)} shipments")

        totals: dict[str, int] = defaultdict(int)
        delivered: dict[str, int] = defaultdict(int)
        for rec in shipments:
            f = rec["fields"]
            status_raw = f.get(FLD_STATUS)
            status = status_raw.get("name") if isinstance(status_raw, dict) else status_raw
            for pid in f.get(FLD_PARTNER_LINKED) or []:
                name = partner_map.get(pid, "기타")
                totals[name] += 1
                if status == "배송완료":
                    delivered[name] += 1

        if not totals:
            print("[tms_carrier_otif] no data")
            finished_at = datetime.now(timezone.utc)
            _insert_sync_run(supabase_url, supabase_key, job_name="tms_carrier_otif",
                             started_at=started_at, finished_at=finished_at, status="ok", rows_written=0)
            return 0

        snapshot = date.today().isoformat()
        rows = []
        for name, total in totals.items():
            dlv = delivered.get(name, 0)
            pct = round(dlv / total * 100, 2) if total > 0 else None
            rows.append({"snapshot_date": snapshot, "partner_name": name,
                         "total_shipments": total, "delivered_count": dlv, "otif_pct": pct})

        requests.post(
            f"{supabase_url}/rest/v1/tms_carrier_otif?on_conflict=snapshot_date,partner_name",
            headers=_supabase_headers(supabase_key), json=rows, timeout=30).raise_for_status()

        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(supabase_url, supabase_key, job_name="tms_carrier_otif",
                         started_at=started_at, finished_at=finished_at, status="ok", rows_written=len(rows))
        print(f"[tms_carrier_otif] ok — {len(rows)} carrier rows upserted")
        return 0

    except Exception as e:  # noqa: BLE001
        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(supabase_url, supabase_key, job_name="tms_carrier_otif",
                         started_at=started_at, finished_at=finished_at, status="failed", error_message=str(e))
        print(f"[tms_carrier_otif] error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    sys.exit(run())
