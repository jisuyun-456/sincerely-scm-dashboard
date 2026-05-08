"""
sync_autoresearch_log — lists files in _AutoResearch/SCM/outputs/ from the
sincerely-scm-pipeline GitHub repo, parses the filename pattern
`{DOMAIN}-{YYYY}-W{NN}.md`, and upserts each as a row in
the Supabase autoresearch_log table.

Source:
  GET https://api.github.com/repos/{owner}/{repo}/contents/_AutoResearch/SCM/outputs

For public repos this works without auth (60 req/h shared limit per IP,
which is plenty for a daily sync).

Schema target (autoresearch_log):
  log_date, entry_type, title, status, output_link
"""

from __future__ import annotations

import os
import re
import sys
from datetime import date, datetime, timedelta, timezone
from typing import Any

import requests

DEFAULT_REPO = "jisuyun-456/sincerely-scm-pipeline"
DEFAULT_OUTPUTS_PATH = "_AutoResearch/SCM/outputs"
FILENAME_RE = re.compile(r"^(?P<domain>[A-Z]+)-(?P<year>\d{4})-W(?P<week>\d{2})\.md$")


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


def list_outputs(repo: str, outputs_path: str) -> list[dict[str, Any]]:
    url = f"https://api.github.com/repos/{repo}/contents/{outputs_path}"
    headers = {"Accept": "application/vnd.github+json"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.get(url, headers=headers, timeout=15)
    r.raise_for_status()
    data = r.json()
    if not isinstance(data, list):
        raise ValueError(f"Expected file list, got {type(data).__name__}")
    return [item for item in data if item.get("type") == "file"]


def iso_week_monday(year: int, week: int) -> date:
    """Return the Monday of an ISO week."""
    return date.fromisocalendar(year, week, 1)


def parse_entry(item: dict[str, Any]) -> dict[str, Any] | None:
    name = item.get("name", "")
    m = FILENAME_RE.match(name)
    if not m:
        return None
    domain = m.group("domain")
    year = int(m.group("year"))
    week = int(m.group("week"))
    try:
        log_date = iso_week_monday(year, week)
    except ValueError:
        return None
    title = f"{domain} 주간 분석 {year}-W{week:02d}"
    output_link = item.get("html_url") or item.get("download_url")
    return {
        "log_date": log_date.isoformat(),
        "entry_type": f"WEEKLY_{domain}",
        "title": title,
        "status": "published",
        "output_link": output_link,
        "raw_content": None,
    }


def upsert_rows(supabase_url: str, key: str, rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0
    r = requests.post(
        f"{supabase_url}/rest/v1/autoresearch_log?on_conflict=log_date,title",
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
    repo = os.environ.get("SCM_WORK_REPO", DEFAULT_REPO)
    outputs_path = os.environ.get("AUTORESEARCH_OUTPUTS_PATH", DEFAULT_OUTPUTS_PATH)

    if not supabase_url or not supabase_key:
        print(
            "[autoresearch_log] ERROR: SUPABASE_URL + SUPABASE_SERVICE_KEY required",
            file=sys.stderr,
        )
        return 1

    job = "autoresearch_log"
    started = datetime.now(timezone.utc)
    print(f"[{started.isoformat()}] {job} start · repo={repo} path={outputs_path}")

    try:
        files = list_outputs(repo, outputs_path)
        rows: list[dict[str, Any]] = []
        for f in files:
            row = parse_entry(f)
            if row:
                rows.append(row)
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
        print(f"[done] {job} · rows_written={rows_written} (from {len(files)} files)")
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
