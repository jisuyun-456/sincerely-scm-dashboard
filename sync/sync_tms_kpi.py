"""
sync_tms_kpi — reads Airtable TMS base → computes today's KPI snapshot
→ upserts to Supabase tms_kpi table.

Metrics:
  active_shipments : count where 발송상태_TMS != "배송완료"
  otif_pct         : on-time rate from OTIF table (on_time_count / total * 100)
  pending_pods     : count where 발송상태_TMS = "배송중" (in-transit, not yet confirmed)
  carrier_breakdown: {partner_name: count} for active shipments

Airtable base: app4x70a8mOrIKsMf (TMS)
Tables:
  TBL_SHIPMENT  tbllg1JoHclGYer7m
  TBL_OTIF      tbl4WfEuGLDlqCTQH
  TBL_PARTNER   tblI4ZXrte7WyhXyd
"""

from __future__ import annotations

import os
import sys
import time
from datetime import datetime, timezone
from typing import Any

import requests

TMS_BASE = "app4x70a8mOrIKsMf"
TBL_SHIPMENT = "tbllg1JoHclGYer7m"
TBL_OTIF = "tbl4WfEuGLDlqCTQH"
TBL_PARTNER = "tblI4ZXrte7WyhXyd"

AIRTABLE_BASE_URL = "https://api.airtable.com/v0"

# Shipment field IDs (returnFieldsByFieldId=true)
FLD_PARTNER_LINKED = "fldM2u6RwLRrO7ymW"  # 배송파트너 (linked record IDs)

# OTIF field IDs
FLD_ON_TIME = "fldoUQOue0umGJ2xk"   # On_Time (bool / "true"/"false")
FLD_OTIF_SCORE = "fldRrWN15iV9BoToc"  # OTIF_Score (numeric)

# Partner field IDs
FLD_PARTNER_NAME = "fldUCl2kD890FqRkt"  # 배송파트너 이름


def _airtable_headers(pat: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {pat}", "Content-Type": "application/json"}


def _supabase_headers(key: str) -> dict[str, str]:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates",
    }


def _get_records(
    pat: str,
    table_id: str,
    fields: list[str],
    formula: str | None = None,
) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    offset: str | None = None
    while True:
        params: dict[str, Any] = {
            "fields[]": fields,
            "pageSize": 100,
            "returnFieldsByFieldId": "true",
        }
        if offset:
            params["offset"] = offset
        if formula:
            params["filterByFormula"] = formula
        resp = requests.get(
            f"{AIRTABLE_BASE_URL}/{TMS_BASE}/{table_id}",
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
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    r = requests.post(
        f"{supabase_url}/rest/v1/sync_runs",
        headers=headers,
        json=payload,
        timeout=15,
    )
    r.raise_for_status()


def run() -> int:
    airtable_pat = os.environ.get("AIRTABLE_PAT_TMS", "")
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "")

    if not airtable_pat:
        print("[tms_kpi] AIRTABLE_PAT_TMS not set — skipping", file=sys.stderr)
        return 0  # not a fatal failure; other jobs still run

    started_at = datetime.now(timezone.utc)
    print("[tms_kpi] start")

    try:
        # 1. Active shipments (not delivered)
        active_recs = _get_records(
            airtable_pat,
            TBL_SHIPMENT,
            fields=[FLD_PARTNER_LINKED],
            formula='NOT({발송상태_TMS}="배송완료")',
        )
        active_shipments = len(active_recs)

        # 2. Pending PODs: in-transit (배송중)
        pending_recs = _get_records(
            airtable_pat,
            TBL_SHIPMENT,
            fields=[FLD_PARTNER_LINKED],
            formula='{발송상태_TMS}="배송중"',
        )
        pending_pods = len(pending_recs)

        # 3. Carrier breakdown from active shipments
        # Collect all linked partner IDs first
        all_partner_recs = _get_records(
            airtable_pat,
            TBL_PARTNER,
            fields=[FLD_PARTNER_NAME],
        )
        partner_name_map = {
            r["id"]: r["fields"].get(FLD_PARTNER_NAME, "기타")
            for r in all_partner_recs
        }

        carrier_count: dict[str, int] = {}
        for rec in active_recs:
            for pid in rec["fields"].get(FLD_PARTNER_LINKED) or []:
                name = partner_name_map.get(pid, "기타")
                carrier_count[name] = carrier_count.get(name, 0) + 1

        # 4. OTIF on-time rate from OTIF table (all-time)
        otif_recs = _get_records(
            airtable_pat,
            TBL_OTIF,
            fields=[FLD_ON_TIME, FLD_OTIF_SCORE],
        )
        on_time_count = 0
        total_otif = len(otif_recs) or 1
        for r in otif_recs:
            f = r["fields"]
            on_time = f.get(FLD_ON_TIME)
            if str(on_time).lower() in ("true", "1"):
                on_time_count += 1
        otif_pct = round(on_time_count / total_otif * 100, 2)

        # 5. Upsert to Supabase
        from datetime import date as _date

        snapshot_date = _date.today().isoformat()
        row = {
            "snapshot_date": snapshot_date,
            "active_shipments": active_shipments,
            "otif_pct": otif_pct,
            "pending_pods": pending_pods,
            "carrier_breakdown": carrier_count,
        }
        resp = requests.post(
            f"{supabase_url}/rest/v1/tms_kpi?on_conflict=snapshot_date",
            headers=_supabase_headers(supabase_key),
            json=row,
            timeout=30,
        )
        resp.raise_for_status()

        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(
            supabase_url,
            supabase_key,
            job_name="tms_kpi",
            started_at=started_at,
            finished_at=finished_at,
            status="ok",
            rows_written=1,
        )
        print(
            f"[tms_kpi] ok — active={active_shipments}, "
            f"otif={otif_pct}%, pending_pods={pending_pods}, "
            f"carriers={len(carrier_count)}"
        )
        return 0

    except Exception as e:  # noqa: BLE001
        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(
            supabase_url,
            supabase_key,
            job_name="tms_kpi",
            started_at=started_at,
            finished_at=finished_at,
            status="failed",
            rows_written=0,
            error_message=str(e),
        )
        print(f"[tms_kpi] error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    from dotenv import load_dotenv

    load_dotenv()
    sys.exit(run())
