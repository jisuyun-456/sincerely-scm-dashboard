"""
sync_tms_delivery_notes — reads TMS Shipment records with non-empty
배송 요청사항 from the last 14 days → upserts to Supabase tms_delivery_notes.

Airtable base : app4x70a8mOrIKsMf (TMS)
Table         : tbllg1JoHclGYer7m (Shipment)
PAT env var   : AIRTABLE_PAT_TMS
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
TBL_DELIVERY_REQUEST = "tblfIEiPJaEF0DVoM"
AIRTABLE_BASE_URL = "https://api.airtable.com/v0"

FLD_SC_ID = "fldBUwhBlhOMsJZdv"              # SC id (formula)
FLD_PNA_CODE = "fldTs3FzaSdGYEiKX"           # project code (rollup)
FLD_PNA_NAME = "fldZel4trYQwP7EV5"           # project (lookup)
FLD_NOTES = "fldHQdGWe8jNrNYEM"              # 배송 요청사항 (rollup)
FLD_STATUS = "fldOhibgxg6LIpRTi"             # 발송상태_TMS (singleSelect)
FLD_SHIPMENT_DATE = "fldQvmEwwzvQW95h9"      # 출하확정일 (date)
FLD_MOVEMENT_PURPOSE = "fldB4tQYOyiYitu6c"   # 이동목적 rollup (from 배송요청)
FLD_DELIVERY_REQ_LINKS = "fldvQQkrDNflD41nv" # 배송요청 links (multipleRecordLinks)
FLD_LOGISTICS_PK = "fldkA2tfiPumAtaES"       # logistics_PK in 배송요청 (TO number)

FILTER = (
    "AND("
    "IS_AFTER({출하확정일},DATEADD(TODAY(),-14,'days')),"
    "NOT({배송 요청사항}=''),"
    "NOT({배송 요청사항}=';')"
    ")"
)


def _airtable_headers(pat: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {pat}", "Content-Type": "application/json"}


def _supabase_upsert_headers(key: str) -> dict[str, str]:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates",
    }


def _get_to_numbers(pat: str, record_ids: list[str]) -> dict[str, str]:
    """Fetch TO numbers (logistics_PK) for 배송요청 record IDs via individual GETs."""
    if not record_ids:
        return {}
    session = requests.Session()
    session.headers.update(_airtable_headers(pat))
    result: dict[str, str] = {}
    for rid in record_ids:
        try:
            resp = session.get(
                f"{AIRTABLE_BASE_URL}/{TMS_BASE}/{TBL_DELIVERY_REQUEST}/{rid}",
                params={"fields[]": [FLD_LOGISTICS_PK], "returnFieldsByFieldId": "true"},
                timeout=10,
            )
            if resp.ok:
                pk = resp.json().get("fields", {}).get(FLD_LOGISTICS_PK)
                if pk:
                    result[rid] = pk
        except Exception:  # noqa: BLE001
            pass
        time.sleep(0.05)
    return result


def _get_records(pat: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    offset: str | None = None
    fields = [FLD_SC_ID, FLD_PNA_CODE, FLD_PNA_NAME, FLD_NOTES, FLD_STATUS, FLD_SHIPMENT_DATE, FLD_MOVEMENT_PURPOSE, FLD_DELIVERY_REQ_LINKS]
    while True:
        params: dict[str, Any] = {
            "fields[]": fields,
            "pageSize": 100,
            "returnFieldsByFieldId": "true",
            "filterByFormula": FILTER,
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
        print("[tms_delivery_notes] AIRTABLE_PAT_TMS not set — skipping", file=sys.stderr)
        return 0

    started_at = datetime.now(timezone.utc)
    print("[tms_delivery_notes] start")

    try:
        records = _get_records(airtable_pat)
        print(f"[tms_delivery_notes] fetched {len(records)} records")

        all_dr_ids: set[str] = set()
        for rec in records:
            for rid in rec["fields"].get(FLD_DELIVERY_REQ_LINKS) or []:
                all_dr_ids.add(rid)
        dr_to_map = _get_to_numbers(airtable_pat, list(all_dr_ids))
        print(f"[tms_delivery_notes] resolved {len(dr_to_map)} TO numbers")

        rows = []
        for rec in records:
            f = rec["fields"]
            sc_id = f.get(FLD_SC_ID)
            notes_raw = f.get(FLD_NOTES)
            if not sc_id or not notes_raw:
                continue
            # rollup may return list or string
            notes = notes_raw if isinstance(notes_raw, str) else "\n".join(str(x) for x in notes_raw)
            notes = notes.strip().strip(";").strip()
            if not notes:
                continue

            purpose_raw = f.get(FLD_MOVEMENT_PURPOSE)
            if isinstance(purpose_raw, list):
                purposes = [str(x) for x in purpose_raw]
            elif isinstance(purpose_raw, str):
                purposes = [purpose_raw]
            else:
                purposes = []
            if not any("고객납품" in p for p in purposes):
                continue

            pna_name_raw = f.get(FLD_PNA_NAME)
            pna_name = None
            if isinstance(pna_name_raw, list) and pna_name_raw:
                pna_name = str(pna_name_raw[0])
            elif isinstance(pna_name_raw, str):
                pna_name = pna_name_raw

            pna_code_raw = f.get(FLD_PNA_CODE)
            pna_code = None
            if isinstance(pna_code_raw, list) and pna_code_raw:
                pna_code = str(pna_code_raw[0])
            elif isinstance(pna_code_raw, str):
                pna_code = pna_code_raw

            status_raw = f.get(FLD_STATUS)
            status = status_raw.get("name") if isinstance(status_raw, dict) else status_raw

            dr_ids = f.get(FLD_DELIVERY_REQ_LINKS) or []
            to_numbers = [dr_to_map[rid] for rid in dr_ids if rid in dr_to_map]
            to_id = ", ".join(to_numbers) if to_numbers else None

            rows.append({
                "sc_id": sc_id,
                "to_id": to_id,
                "pna_code": pna_code or "",
                "pna_name": pna_name,
                "shipment_date": f.get(FLD_SHIPMENT_DATE),
                "delivery_notes": notes,
                "status": status,
            })

        if not rows:
            print("[tms_delivery_notes] no valid rows to upsert")
            finished_at = datetime.now(timezone.utc)
            _insert_sync_run(
                supabase_url, supabase_key,
                job_name="tms_delivery_notes",
                started_at=started_at, finished_at=finished_at,
                status="ok", rows_written=0,
            )
            return 0

        # Remove past-date records so stale non-고객납품 entries don't linger
        today_str = datetime.now(timezone.utc).date().isoformat()
        requests.delete(
            f"{supabase_url}/rest/v1/tms_delivery_notes?shipment_date=lt.{today_str}",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"},
            timeout=15,
        ).raise_for_status()

        # Upsert in batches of 50
        batch_size = 50
        total_written = 0
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            resp = requests.post(
                f"{supabase_url}/rest/v1/tms_delivery_notes?on_conflict=sc_id",
                headers=_supabase_upsert_headers(supabase_key),
                json=batch,
                timeout=30,
            )
            resp.raise_for_status()
            total_written += len(batch)
            time.sleep(0.1)

        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(
            supabase_url, supabase_key,
            job_name="tms_delivery_notes",
            started_at=started_at, finished_at=finished_at,
            status="ok", rows_written=total_written,
        )
        print(f"[tms_delivery_notes] ok — upserted {total_written} rows")
        return 0

    except Exception as e:  # noqa: BLE001
        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(
            supabase_url, supabase_key,
            job_name="tms_delivery_notes",
            started_at=started_at, finished_at=finished_at,
            status="failed", rows_written=0, error_message=str(e),
        )
        print(f"[tms_delivery_notes] error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    sys.exit(run())
