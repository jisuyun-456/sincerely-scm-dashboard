"""
sincerely-scm-dashboard sync runner.

Coordinates per-job sync workers and writes a heartbeat row.
Each worker is responsible for its own sync_runs row; the runner only
writes the heartbeat to confirm the GH Actions pipeline ran.

Local: cp .env.example .env && fill values && python _sync_runner.py
CI:    set SUPABASE_URL + SUPABASE_SERVICE_KEY in GitHub Actions secrets.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

import sync_autoresearch_log
import sync_autoresearch_trend
import sync_project_tasks
import sync_tms_carrier_otif
import sync_tms_cbm_abc
import sync_tms_daily_volume
import sync_tms_delivery_notes
import sync_tms_kpi
import sync_tms_multi_to
import sync_tms_pod_aging
import sync_tms_box_mix
import sync_wms_dayoung

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


def insert_heartbeat(
    started_at: datetime, finished_at: datetime, status: str
) -> None:
    payload = {
        "job_name": "heartbeat",
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "status": status,
        "rows_written": 0,
        "github_run_id": os.environ.get("GITHUB_RUN_ID"),
    }
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/sync_runs",
        headers=HEADERS,
        json=payload,
        timeout=15,
    )
    r.raise_for_status()
    print(f"  → heartbeat row inserted: id={r.json()[0]['id']}")


def main() -> int:
    started = datetime.now(timezone.utc)
    print(f"[{started.isoformat()}] sync_runner start")

    failures: list[str] = []

    jobs = [
        ("tms_kpi", sync_tms_kpi.run),
        ("tms_delivery_notes", sync_tms_delivery_notes.run),
        ("tms_multi_to", sync_tms_multi_to.run),
        ("tms_carrier_otif", sync_tms_carrier_otif.run),
        ("tms_daily_volume", sync_tms_daily_volume.run),
        ("tms_cbm_abc", sync_tms_cbm_abc.run),
        ("tms_pod_aging", sync_tms_pod_aging.run),
        ("wms_dayoung", sync_wms_dayoung.run),
        ("tms_box_mix", sync_tms_box_mix.run),
        ("project_tasks", sync_project_tasks.run),
        ("autoresearch_trend", sync_autoresearch_trend.run),
        ("autoresearch_log", sync_autoresearch_log.run),
    ]
    for name, fn in jobs:
        try:
            rc = fn()
            if rc != 0:
                failures.append(name)
        except Exception as e:  # noqa: BLE001
            print(f"[error] {name} crashed: {e}", file=sys.stderr)
            failures.append(name)

    # Heartbeat (always last)
    finished = datetime.now(timezone.utc)
    status = "failed" if failures else "ok"
    try:
        insert_heartbeat(started, finished, status)
    except Exception as e:  # noqa: BLE001
        print(f"[error] heartbeat insert failed: {e}", file=sys.stderr)
        failures.append("heartbeat")

    if failures:
        print(f"[done] sync_runner finished with failures: {failures}")
        return 1
    print("[done] sync_runner ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
