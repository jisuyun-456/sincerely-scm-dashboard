"""
sync_wms_cbm — WMS inbound CBM daily aggregate + warehouse running balance.

Queries WMS Airtable movement records (이동목적=생산산출) and TMS Shipment
CBM totals, computes daily inbound CBM and YTD running balance, writes to:
  - wms_cbm_daily    (upsert, date PK)
  - wms_cbm_balance  (upsert, snapshot_date PK)

Standalone — no dependency on SCM_WORK.

Airtable:
  WMS base : appLui4ZR5HWcQRri  (PAT env var: AIRTABLE_WMS_PAT)
  TMS base : app4x70a8mOrIKsMf  (PAT env var: AIRTABLE_PAT_TMS)
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

# ── Warehouse constants (must match wms_cbm_ledger.py) ─────────────────────
WAREHOUSE_INBOUND_CBM  = 50.0
WAREHOUSE_OUTBOUND_CBM = 44.0
MIN_THICKNESS_MM       = 3.0

# ── WMS Airtable ─────────────────────────────────────────────────────────────
WMS_BASE = "appLui4ZR5HWcQRri"
TBL_MOV  = "tblwq7Kj5Y9nVjlOw"
TBL_SP   = "tblzJh0V4hdo4Xbvx"

FLD_MOV_PURPOSE  = "fldFRNxG1pNooEOC7"
FLD_MOV_EXP_DATE = "fldlpGxylH72YPs7V"
FLD_MOV_IN_QTY   = "fldV8kVokQqMIsif0"
FLD_MOV_SPEC     = "fldiYU7b6Ogf0zm2D"
FLD_MOV_ITEM     = "fldwZKCYZ4IFOigRp"
FLD_SP_CODE      = "fld8gjySjm4XkCpMc"
FLD_SP_SPEC      = "fldRseOMNseg15D6R"

# ── TMS Airtable ─────────────────────────────────────────────────────────────
TMS_BASE     = "app4x70a8mOrIKsMf"
TBL_SHIPMENT = "tbllg1JoHclGYer7m"
TF_DATE      = "fldQvmEwwzvQW95h9"
TF_TOTAL_CBM = "fldJ9DHjwoRyeUEqE"

AIRTABLE_BASE_URL = "https://api.airtable.com/v0"


def _headers(pat: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {pat}", "Content-Type": "application/json"}


def _supabase_headers(key: str) -> dict[str, str]:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates",
    }


def _get_all(base: str, table: str, fields: list[str], formula: str, pat: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    offset: str | None = None
    while True:
        params: dict[str, Any] = {
            "fields[]": fields,
            "pageSize": 100,
            "returnFieldsByFieldId": "true",
            "filterByFormula": formula,
        }
        if offset:
            params["offset"] = offset
        resp = requests.get(
            f"{AIRTABLE_BASE_URL}/{base}/{table}",
            headers=_headers(pat),
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


# ── CBM calculation (inline — no cross-repo import) ──────────────────────────
def parse_dims_mm(raw: str) -> tuple[float, float, float] | None:
    cleaned = re.split(r"펼침", raw)[0]
    cleaned = re.sub(r"mm", "", cleaned, flags=re.IGNORECASE)
    nums = [float(n) for n in re.findall(r"[\d.]+", cleaned) if float(n) > 0]
    if len(nums) >= 3:
        return (nums[0], nums[1], nums[2])
    if len(nums) == 2:
        return (nums[0], nums[1], MIN_THICKNESS_MM)
    return None


def calc_cbm(spec: str, qty: float) -> tuple[float, bool]:
    dims = parse_dims_mm(spec)
    if dims is None or qty <= 0:
        return 0.0, False
    w, h, d = dims
    unit_cbm = (w / 1000) * (h / 1000) * (d / 1000)
    return round(unit_cbm * qty, 6), True


def _extract_pt_code(raw: str | None) -> str:
    if not raw:
        return ""
    first_part = raw.split(" || ")[0].strip()
    dash_idx = first_part.find("-")
    return first_part[:dash_idx] if dash_idx != -1 else first_part


# ── Data helpers ──────────────────────────────────────────────────────────────
def _load_sp_lookup(wms_pat: str) -> dict[str, str]:
    records = _get_all(WMS_BASE, TBL_SP, [FLD_SP_CODE, FLD_SP_SPEC], "TRUE", wms_pat)
    lookup: dict[str, str] = {}
    for rec in records:
        f = rec.get("fields", {})
        code = str(f.get(FLD_SP_CODE) or "").strip()
        spec = str(f.get(FLD_SP_SPEC) or "").strip()
        if code:
            lookup[code] = spec
    return lookup


def _get_movements(wms_pat: str, since: date) -> list[dict[str, Any]]:
    formula = (
        f"AND({{이동목적}}=\"생산산출\", "
        f"IS_AFTER({{입하예상일}}, DATEADD('{since.isoformat()}', -1, 'days')))"
    )
    return _get_all(
        WMS_BASE, TBL_MOV,
        [FLD_MOV_PURPOSE, FLD_MOV_EXP_DATE, FLD_MOV_IN_QTY, FLD_MOV_SPEC, FLD_MOV_ITEM],
        formula, wms_pat,
    )


def _get_tms_outbound_ytd(tms_pat: str, since: date) -> float:
    formula = f"IS_AFTER({{출하일}}, DATEADD('{since.isoformat()}', -1, 'days'))"
    records = _get_all(TMS_BASE, TBL_SHIPMENT, [TF_DATE, TF_TOTAL_CBM], formula, tms_pat)
    total = 0.0
    for rec in records:
        f = rec.get("fields", {})
        try:
            total += float(f.get(TF_TOTAL_CBM) or 0)
        except (ValueError, TypeError):
            pass
    return round(total, 4)


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
        headers={"apikey": key, "Authorization": f"Bearer {key}",
                 "Content-Type": "application/json", "Prefer": "return=representation"},
        json=payload,
        timeout=15,
    ).raise_for_status()


def run() -> int:
    wms_pat      = os.environ.get("AIRTABLE_WMS_PAT", os.environ.get("AIRTABLE_PAT", ""))
    tms_pat      = os.environ.get("AIRTABLE_PAT_TMS", os.environ.get("AIRTABLE_PAT", ""))
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "")

    if not wms_pat:
        print("[wms_cbm] AIRTABLE_WMS_PAT not set — skipping", file=sys.stderr)
        return 0

    started_at = datetime.now(timezone.utc)
    print("[wms_cbm] start")

    try:
        today     = date.today()
        ytd_start = date(today.year, 1, 1)

        # 1. sync_parts lookup
        sp_lookup = _load_sp_lookup(wms_pat)
        print(f"[wms_cbm] sync_parts: {len(sp_lookup)} entries")

        # 2. WMS movement records YTD
        records = _get_movements(wms_pat, ytd_start)
        print(f"[wms_cbm] movements: {len(records)} records (YTD)")

        # 3. Aggregate by date + compute YTD total
        by_date: dict[str, dict] = defaultdict(lambda: {"cbm": 0.0, "cnt": 0})
        ytd_inbound = 0.0

        for rec in records:
            f = rec.get("fields", {})
            try:
                qty = float(f.get(FLD_MOV_IN_QTY) or 0)
            except (ValueError, TypeError):
                qty = 0.0

            mov_spec = str(f.get(FLD_MOV_SPEC) or "").strip()
            pt_code  = _extract_pt_code(f.get(FLD_MOV_ITEM))
            exp_date = (f.get(FLD_MOV_EXP_DATE) or "")[:10]

            cbm, ok = 0.0, False
            if mov_spec:
                cbm, ok = calc_cbm(mov_spec, qty)
            if not ok and pt_code:
                sp_spec = sp_lookup.get(pt_code, "")
                if sp_spec:
                    cbm, ok = calc_cbm(sp_spec, qty)

            if exp_date:
                by_date[exp_date]["cbm"] += cbm
                by_date[exp_date]["cnt"] += 1
            ytd_inbound += cbm

        ytd_inbound = round(ytd_inbound, 4)

        # 4. Upsert wms_cbm_daily
        daily_rows = [
            {
                "date": d,
                "inbound_cbm": round(v["cbm"], 4),
                "inbound_count": v["cnt"],
            }
            for d, v in sorted(by_date.items())
        ]
        if daily_rows:
            requests.post(
                f"{supabase_url}/rest/v1/wms_cbm_daily?on_conflict=date",
                headers=_supabase_headers(supabase_key),
                json=daily_rows,
                timeout=30,
            ).raise_for_status()
        print(f"[wms_cbm] daily: {len(daily_rows)} rows, ytd_inbound={ytd_inbound}m³")

        # 5. TMS outbound CBM YTD
        if tms_pat:
            ytd_outbound = _get_tms_outbound_ytd(tms_pat, ytd_start)
        else:
            print("[wms_cbm] AIRTABLE_PAT_TMS not set — outbound_cbm=0", file=sys.stderr)
            ytd_outbound = 0.0
        print(f"[wms_cbm] ytd_outbound={ytd_outbound}m³")

        # 6. Running balance → upsert wms_cbm_balance
        net_stock = max(0.0, round(ytd_inbound - ytd_outbound, 4))
        util_pct  = round(net_stock / WAREHOUSE_OUTBOUND_CBM * 100, 1)
        available = round(max(0.0, WAREHOUSE_OUTBOUND_CBM - net_stock), 4)
        headroom  = round(max(0.0, WAREHOUSE_INBOUND_CBM - net_stock), 4)

        balance_row = {
            "snapshot_date":    today.isoformat(),
            "ytd_inbound_cbm":  ytd_inbound,
            "ytd_outbound_cbm": ytd_outbound,
            "net_stock_cbm":    net_stock,
            "utilization_pct":  util_pct,
            "available_cbm":    available,
            "inbound_headroom": headroom,
            "capacity_inbound":  WAREHOUSE_INBOUND_CBM,
            "capacity_outbound": WAREHOUSE_OUTBOUND_CBM,
        }
        requests.post(
            f"{supabase_url}/rest/v1/wms_cbm_balance?on_conflict=snapshot_date",
            headers=_supabase_headers(supabase_key),
            json=[balance_row],
            timeout=15,
        ).raise_for_status()
        print(f"[wms_cbm] balance: net={net_stock}m³ util={util_pct}%")

        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(supabase_url, supabase_key, job_name="wms_cbm",
                         started_at=started_at, finished_at=finished_at, status="ok",
                         rows_written=len(daily_rows) + 1)
        return 0

    except Exception as e:  # noqa: BLE001
        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(supabase_url, supabase_key, job_name="wms_cbm",
                         started_at=started_at, finished_at=finished_at, status="failed",
                         error_message=str(e))
        print(f"[wms_cbm] error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    sys.exit(run())
