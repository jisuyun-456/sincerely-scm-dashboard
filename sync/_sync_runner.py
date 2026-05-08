"""
sincerely-scm-dashboard sync runner.

Skeleton: writes a single sync_runs heartbeat row to verify the
GitHub Actions → Supabase pipeline works end-to-end.

Real sync workers (TMS KPI, AutoResearch trend, project tasks, log) get
added after this skeleton confirms the pipeline.

Local: cp .env.example .env && fill values && python _sync_runner.py
CI:    set SUPABASE_URL + SUPABASE_SERVICE_KEY in GitHub Actions secrets.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set", file=sys.stderr)
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


def insert_sync_run(
    job_name: str,
    status: str,
    started_at: datetime,
    finished_at: datetime | None,
    rows_written: int = 0,
    error_message: str | None = None,
) -> None:
    payload = {
        "job_name": job_name,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat() if finished_at else None,
        "status": status,
        "rows_written": rows_written,
        "error_message": error_message,
        "github_run_id": os.environ.get("GITHUB_RUN_ID"),
    }
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/sync_runs",
        headers=HEADERS,
        json=payload,
        timeout=15,
    )
    r.raise_for_status()
    print(f"  → sync_runs row inserted: id={r.json()[0]['id']}")


def main() -> int:
    started = datetime.now(timezone.utc)
    job = "heartbeat"
    print(f"[{started.isoformat()}] sync_runner start · job={job}")
    try:
        insert_sync_run(
            job_name=job,
            status="ok",
            started_at=started,
            finished_at=datetime.now(timezone.utc),
            rows_written=0,
        )
        print("[done] heartbeat ok")
        return 0
    except Exception as e:
        finished = datetime.now(timezone.utc)
        print(f"[error] {e}", file=sys.stderr)
        try:
            insert_sync_run(
                job_name=job,
                status="failed",
                started_at=started,
                finished_at=finished,
                error_message=str(e)[:500],
            )
        except Exception as inner:
            print(f"[error] also failed to log failure: {inner}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
