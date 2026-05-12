"""
sync_tms_truck_load — hourly carrier load snapshot for today.

Reads today's TMS shipments, resolves partner names, joins with
tms_carrier_capacity master (Supabase), and writes a per-carrier
utilisation row to tms_truck_load_today.

Airtable base : app4x70a8mOrIKsMf (TMS)
PAT env var   : AIRTABLE_PAT_TMS
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
TBL_PARTNER  = "tblI4ZXrte7WyhXyd"
AIRTABLE_BASE_URL = "https://api.airtable.com/v0"

FLD_PARTNER_LINKED = "fldM2u6RwLRrO7ymW"
FLD_PARTNER_NAME   = "fldUCl2kD890FqRkt"
FLD_SHIPMENT_DATE  = "fldQvmEwwzvQW95h9"
FLD_TOTAL_CBM      = "fldJ9DHjwoRyeUEqE"


def _headers(pat: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {pat}", "Content-Type": "application/json"}


def _supabase_headers(key: str) -> dict[str, str]:
    return {
        "apikey": key, "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates",
    }


def _get_records(pat: str, table_id: str, fields: list[str],
                 formula: str | None = None) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    offset: str | None = None
    while True:
        params: dict[str, Any] = {
            "fields[]": fields, "pageSize": 100, "returnFieldsByFieldId": "true"
        }
        if offset:
            params["offset"] = offset
        if formula:
            params["filterByFormula"] = formula
        resp = requests.get(f"{AIRTABLE_BASE_URL}/{TMS_BASE}/{table_id}",
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
                      finished_at: datetime, status: str, rows_written: int = 0,
                      error_message: str | None = None) -> None:
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
        print("[tms_truck_load] AIRTABLE_PAT_TMS not set — skipping", file=sys.stderr)
        return 0

    started_at = datetime.now(timezone.utc)
    print("[tms_truck_load] start")
    try:
        # 1. Load carrier capacity master from Supabase
        cap_resp = requests.get(
            f"{supabase_url}/rest/v1/tms_carrier_capacity?select=partner_name,vehicle_type,capacity_m3",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"},
            timeout=15,
        )
        cap_resp.raise_for_status()
        capacity_map: dict[str, float] = {
            r["partner_name"]: float(r["capacity_m3"]) for r in cap_resp.json()
        }
        if not capacity_map:
            print("[tms_truck_load] tms_carrier_capacity empty — skip", file=sys.stderr)
            return 0

        # 2. Load partner name lookup from Airtable
        partner_recs = _get_records(pat, TBL_PARTNER, [FLD_PARTNER_NAME])
        partner_map = {r["id"]: r["fields"].get(FLD_PARTNER_NAME, "기타") for r in partner_recs}

        # 3. Fetch today's shipments
        today = date.today().isoformat()
        formula = f"{{출하확정일}}='{today}'"
        shipments = _get_records(
            pat, TBL_SHIPMENT,
            [FLD_PARTNER_LINKED, FLD_SHIPMENT_DATE, FLD_TOTAL_CBM],
            formula,
        )
        print(f"[tms_truck_load] today={today}, shipments={len(shipments)}")

        # 4. Aggregate by partner
        loaded: dict[str, float] = defaultdict(float)
        counts: dict[str, int] = defaultdict(int)
        for rec in shipments:
            f = rec["fields"]
            try:
                cbm = float(f.get(FLD_TOTAL_CBM) or 0)
            except (ValueError, TypeError):
                cbm = 0.0
            for pid in f.get(FLD_PARTNER_LINKED) or []:
                name = partner_map.get(pid, "기타")
                if name in capacity_map:
                    loaded[name] += cbm
                    counts[name] += 1

        # 5. Build rows for known carriers (include even if 0 shipments today)
        snapshot_at = datetime.now(timezone.utc).isoformat()
        rows = []
        for name, cap in capacity_map.items():
            load_m3 = round(loaded.get(name, 0.0), 3)
            util = round(load_m3 / cap * 100, 2) if cap > 0 else 0.0
            if util >= 100:
                status = "red"
            elif util >= 80:
                status = "yellow"
            else:
                status = "green"
            rows.append({
                "snapshot_at": snapshot_at,
                "partner_name": name,
                "loaded_m3": load_m3,
                "capacity_m3": cap,
                "utilization_pct": util,
                "status": status,
                "shipment_count": counts.get(name, 0),
            })

        requests.post(
            f"{supabase_url}/rest/v1/tms_truck_load_today?on_conflict=snapshot_at,partner_name",
            headers=_supabase_headers(supabase_key), json=rows, timeout=15).raise_for_status()

        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(supabase_url, supabase_key, job_name="tms_truck_load",
                         started_at=started_at, finished_at=finished_at, status="ok",
                         rows_written=len(rows))
        print(f"[tms_truck_load] ok — {len(rows)} carrier rows")
        return 0

    except Exception as e:  # noqa: BLE001
        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(supabase_url, supabase_key, job_name="tms_truck_load",
                         started_at=started_at, finished_at=finished_at, status="failed",
                         error_message=str(e))
        print(f"[tms_truck_load] error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    sys.exit(run())
