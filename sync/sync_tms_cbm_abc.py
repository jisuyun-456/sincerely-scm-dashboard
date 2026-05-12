"""
sync_tms_cbm_abc — weekly CBM ABC pareto (top-30 by 30d CBM volume).

Groups last-30d Shipments by 최종 출하 품목 text, sums Total_CBM,
ranks descending, writes to tms_cbm_abc_weekly (upsert on week_start, rank).
Standalone — no dependency on SCM_WORK.

Airtable base : app4x70a8mOrIKsMf (TMS)
PAT env var   : AIRTABLE_PAT_TMS
"""
from __future__ import annotations

import os
import re
import sys
import time
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any

import requests

TMS_BASE = "app4x70a8mOrIKsMf"
TBL_SHIPMENT = "tbllg1JoHclGYer7m"
AIRTABLE_BASE_URL = "https://api.airtable.com/v0"

FLD_SHIPMENT_DATE  = "fldQvmEwwzvQW95h9"
FLD_TOTAL_CBM      = "fldJ9DHjwoRyeUEqE"
FLD_PRODUCT_FINAL  = "fldgSupj5XLjJXYQo"  # 최종 출하 품목 (formula)
FLD_ITEMS_MFG      = "fldCnwsVrpkKHt4Hl"  # 임가공 품목 및 수량 (fallback)

TOP_N = 30


def _headers(pat: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {pat}", "Content-Type": "application/json"}


def _supabase_headers(key: str) -> dict[str, str]:
    return {
        "apikey": key, "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates",
    }


def _str(raw: Any) -> str:
    if isinstance(raw, list):
        return str(raw[0] or "").strip() if raw else ""
    return str(raw or "").strip()


def _extract_product_name(text: str) -> str:
    """품목명 정규화: 수량(×N, xN) 제거, 앞 60자 트림."""
    text = re.sub(r"[×xX]\s*\d+", "", text).strip()
    text = re.sub(r"\s{2,}", " ", text)
    return text[:60].strip()


def _get_shipments(pat: str) -> list[dict[str, Any]]:
    cutoff = (date.today() - timedelta(days=30)).isoformat()
    formula = f"IS_AFTER({{출하확정일}},'{cutoff}')"
    records: list[dict[str, Any]] = []
    offset: str | None = None
    while True:
        params: dict[str, Any] = {
            "fields[]": [FLD_SHIPMENT_DATE, FLD_TOTAL_CBM, FLD_PRODUCT_FINAL, FLD_ITEMS_MFG],
            "pageSize": 100, "returnFieldsByFieldId": "true",
            "filterByFormula": formula,
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
        print("[tms_cbm_abc] AIRTABLE_PAT_TMS not set — skipping", file=sys.stderr)
        return 0

    started_at = datetime.now(timezone.utc)
    print("[tms_cbm_abc] start")
    try:
        shipments = _get_shipments(pat)
        print(f"[tms_cbm_abc] fetched {len(shipments)} shipments (30d)")

        product_cbm: dict[str, float] = defaultdict(float)
        for rec in shipments:
            f = rec["fields"]
            try:
                cbm = float(f.get(FLD_TOTAL_CBM) or 0)
            except (ValueError, TypeError):
                cbm = 0.0
            if cbm <= 0:
                continue

            raw = _str(f.get(FLD_PRODUCT_FINAL)) or _str(f.get(FLD_ITEMS_MFG))
            if not raw:
                continue

            # Split on common separators and aggregate each segment
            segments = [s.strip() for s in re.split(r"[/,\n;·]+", raw) if s.strip()]
            if not segments:
                continue
            # Distribute CBM evenly across segments (approximation for multi-product shipments)
            per_seg = cbm / len(segments)
            for seg in segments:
                key = _extract_product_name(seg)
                if key:
                    product_cbm[key] += per_seg

        if not product_cbm:
            print("[tms_cbm_abc] no product CBM data")
            finished_at = datetime.now(timezone.utc)
            _insert_sync_run(supabase_url, supabase_key, job_name="tms_cbm_abc",
                             started_at=started_at, finished_at=finished_at, status="ok", rows_written=0)
            return 0

        sorted_items = sorted(product_cbm.items(), key=lambda x: x[1], reverse=True)[:TOP_N]
        grand_total = sum(product_cbm.values())

        # Week start = Monday of current week
        today = date.today()
        week_start = (today - timedelta(days=today.weekday())).isoformat()

        rows = []
        cum = 0.0
        for rank, (name, cbm_val) in enumerate(sorted_items, start=1):
            cum += cbm_val
            rows.append({
                "week_start": week_start,
                "rank": rank,
                "product_code": name[:20].upper(),
                "product_name": name,
                "total_cbm": round(cbm_val, 3),
                "cumulative_pct": round(cum / grand_total * 100, 2) if grand_total > 0 else 0.0,
            })

        requests.post(
            f"{supabase_url}/rest/v1/tms_cbm_abc_weekly?on_conflict=week_start,rank",
            headers=_supabase_headers(supabase_key), json=rows, timeout=30).raise_for_status()

        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(supabase_url, supabase_key, job_name="tms_cbm_abc",
                         started_at=started_at, finished_at=finished_at, status="ok",
                         rows_written=len(rows))
        print(f"[tms_cbm_abc] ok — {len(rows)} rows, grand_total={round(grand_total, 2)}m³")
        return 0

    except Exception as e:  # noqa: BLE001
        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(supabase_url, supabase_key, job_name="tms_cbm_abc",
                         started_at=started_at, finished_at=finished_at, status="failed",
                         error_message=str(e))
        print(f"[tms_cbm_abc] error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    sys.exit(run())
