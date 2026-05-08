"""
sync_autoresearch_trend — fetches history/index.json from sincerely-scm-pipeline,
downloads each weekly_review / monthly snapshot, extracts KPIs, and upserts to
the Supabase autoresearch_trend table (one row per (period_key, domain)).

Source pattern:
  {SCM_WORK_RAW_BASE}/history/index.json  → manifest of report files
  {SCM_WORK_RAW_BASE}/history/{key}.json   → individual snapshot

Schema target (autoresearch_trend):
  period_key, domain, report_mode, period_start, period_end,
  period_label, kpis (JSONB), generated_at

For now domain is hardcoded to "WMS" (the existing history JSONs are
WMS-side: completion_rate, defect_rate, picking_total). TMS rows will
arrive once the TMS Airtable sync (widget B) lands and writes its own
trend snapshots — likely under a separate domain tag.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from typing import Any

import requests

DEFAULT_RAW_BASE = "https://raw.githubusercontent.com/jisuyun-456/sincerely-scm-pipeline/main"
DEFAULT_DOMAIN = "WMS"


def _supabase_headers(key: str) -> dict[str, str]:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates",
    }


def _insert_sync_run(
    supabase_url: str,
    key: str,
    *,
    job_name: str,
    started_at: datetime,
    finished_at: datetime | None,
    status: str,
    rows_written: int = 0,
    error_message: str | None = None,
) -> None:
    payload = {
        "job_name": job_name,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat() if finished_at else None,
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


def fetch_index(raw_base: str) -> list[dict[str, Any]]:
    url = f"{raw_base.rstrip('/')}/history/index.json"
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    payload = r.json()
    # The pipeline writes { "periods": [...] }
    if isinstance(payload, dict):
        for key in ("periods", "entries", "items"):
            if isinstance(payload.get(key), list):
                return payload[key]
    if isinstance(payload, list):
        return payload
    raise ValueError(
        f"history/index.json shape unexpected: {type(payload).__name__} "
        f"keys={list(payload.keys()) if isinstance(payload, dict) else 'n/a'}"
    )


def fetch_snapshot(raw_base: str, file_path: str) -> dict[str, Any]:
    url = f"{raw_base.rstrip('/')}/history/{file_path}"
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    return r.json()


def to_row(snapshot: dict[str, Any], domain: str) -> dict[str, Any] | None:
    period_key = snapshot.get("period_key")
    if not period_key:
        return None
    period = snapshot.get("period") or {}
    kpi = snapshot.get("kpi") or {}
    inbound_summary = (snapshot.get("inbound") or {}).get("summary") or {}

    # Flatten relevant KPIs into kpis JSONB. Keep numeric only.
    flat: dict[str, Any] = {}
    for k, v in kpi.items():
        if isinstance(v, (int, float)):
            flat[k] = v
    for k in ("total_cnt", "total_in_qty", "total_stock_qty", "completed", "unconfirmed"):
        v = inbound_summary.get(k)
        if isinstance(v, (int, float)):
            flat[f"inbound_{k}"] = v

    return {
        "period_key": period_key,
        "domain": domain,
        "report_mode": snapshot.get("report_mode"),
        "period_start": period.get("start"),
        "period_end": period.get("end"),
        "period_label": period.get("label") or period.get("week_label"),
        "kpis": flat,
        "generated_at": snapshot.get("generated_at"),
    }


def upsert_rows(supabase_url: str, key: str, rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0
    r = requests.post(
        f"{supabase_url}/rest/v1/autoresearch_trend?on_conflict=period_key,domain",
        headers=_supabase_headers(key),
        json=rows,
        timeout=30,
    )
    r.raise_for_status()
    written = r.json() if r.content else []
    return len(written) if isinstance(written, list) else len(rows)


def run() -> int:
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    raw_base = os.environ.get("SCM_WORK_RAW_BASE", DEFAULT_RAW_BASE)

    if not supabase_url or not supabase_key:
        print(
            "[autoresearch_trend] ERROR: SUPABASE_URL + SUPABASE_SERVICE_KEY required",
            file=sys.stderr,
        )
        return 1

    job = "autoresearch_trend"
    started = datetime.now(timezone.utc)
    print(f"[{started.isoformat()}] {job} start · raw_base={raw_base}")

    try:
        index = fetch_index(raw_base)
        rows: list[dict[str, Any]] = []
        for entry in index:
            file_path = entry.get("file") or entry.get("path")
            if not file_path:
                continue
            try:
                snap = fetch_snapshot(raw_base, file_path)
                row = to_row(snap, DEFAULT_DOMAIN)
                if row:
                    rows.append(row)
            except Exception as inner:  # noqa: BLE001
                print(f"  ! skipped {file_path}: {inner}", file=sys.stderr)

        rows_written = upsert_rows(supabase_url, supabase_key, rows)
        finished = datetime.now(timezone.utc)
        _insert_sync_run(
            supabase_url,
            supabase_key,
            job_name=job,
            started_at=started,
            finished_at=finished,
            status="ok",
            rows_written=rows_written,
        )
        print(f"[done] {job} · rows_written={rows_written} (from {len(index)} index entries)")
        return 0
    except Exception as e:  # noqa: BLE001
        finished = datetime.now(timezone.utc)
        print(f"[error] {job}: {e}", file=sys.stderr)
        try:
            _insert_sync_run(
                supabase_url,
                supabase_key,
                job_name=job,
                started_at=started,
                finished_at=finished,
                status="failed",
                error_message=str(e),
            )
        except Exception as inner:  # noqa: BLE001
            print(f"[error] also failed to log failure: {inner}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(run())
