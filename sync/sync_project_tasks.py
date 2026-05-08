"""
sync_project_tasks — fetches SCM_WORK/.claude/feature_list.json, aggregates
priority counts, upserts a daily snapshot to Supabase project_tasks table.

Reads:
  - {SCM_WORK_RAW_BASE}/.claude/feature_list.json (raw GitHub URL)

Writes:
  - project_tasks (one row per snapshot_date = today UTC date)
  - sync_runs (one row per invocation, status=ok|failed)

Env:
  - SUPABASE_URL, SUPABASE_SERVICE_KEY
  - SCM_WORK_RAW_BASE (e.g. https://raw.githubusercontent.com/jisuyun-456/SCM_WORK/main)
  - GITHUB_RUN_ID (optional, set by Actions)
"""

from __future__ import annotations

import os
import sys
from collections import Counter
from datetime import date, datetime, timezone
from typing import Any

import requests

PRIORITY_KEYS = ("critical", "high", "medium", "low", "done")
DEFAULT_RAW_BASE = "https://raw.githubusercontent.com/jisuyun-456/sincerely-scm-pipeline/main"


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
        "error_message": (error_message[:500] if error_message else None),
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


def fetch_feature_list(raw_base: str) -> list[dict[str, Any]]:
    url = f"{raw_base.rstrip('/')}/.claude/feature_list.json"
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    payload = r.json()
    tasks = payload.get("tasks") if isinstance(payload, dict) else payload
    if not isinstance(tasks, list):
        raise ValueError(f"feature_list.json shape unexpected: {type(payload).__name__}")
    return tasks


def aggregate_counts(tasks: list[dict[str, Any]]) -> dict[str, int]:
    counter: Counter[str] = Counter()
    for t in tasks:
        prio = (t.get("priority") or "").lower().strip()
        if prio in PRIORITY_KEYS:
            counter[prio] += 1
    return {k: int(counter.get(k, 0)) for k in PRIORITY_KEYS}


def upsert_project_tasks(
    supabase_url: str,
    key: str,
    *,
    snapshot_date: date,
    counts: dict[str, int],
) -> int:
    payload = {
        "snapshot_date": snapshot_date.isoformat(),
        **counts,
    }
    r = requests.post(
        f"{supabase_url}/rest/v1/project_tasks?on_conflict=snapshot_date",
        headers=_supabase_headers(key),
        json=payload,
        timeout=15,
    )
    r.raise_for_status()
    rows = r.json() if r.content else []
    return len(rows) if isinstance(rows, list) else 1


def run() -> int:
    """Run the sync. Returns 0 on success, 1 on failure."""
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    raw_base = os.environ.get("SCM_WORK_RAW_BASE", DEFAULT_RAW_BASE)

    if not supabase_url or not supabase_key:
        print(
            "[project_tasks] ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY required",
            file=sys.stderr,
        )
        return 1

    job = "project_tasks"
    started = datetime.now(timezone.utc)
    print(f"[{started.isoformat()}] {job} start · raw_base={raw_base}")

    try:
        tasks = fetch_feature_list(raw_base)
        counts = aggregate_counts(tasks)
        snapshot = datetime.now(timezone.utc).date()
        rows_written = upsert_project_tasks(
            supabase_url, supabase_key, snapshot_date=snapshot, counts=counts
        )
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
        total = sum(counts.values())
        print(
            f"[done] {job} · counts={counts} · total={total} · "
            f"rows_written={rows_written}"
        )
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
