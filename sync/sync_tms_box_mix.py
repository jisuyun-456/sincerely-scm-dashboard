"""
sync_tms_box_mix — 내일 필요 박스명칭별 예상 수량 (W3 TMS Box-Mix Forecast)

TMS Shipment(고객납품 PNA 출하건) 기준 박스 수요 예측.
최근 14일 Shipment의 '최종 외박스 수량 값'을 파싱해 특대/중대/대/중/소
카테고리별 weekday-aware 이동평균을 계산하고, 내일자 예상 수량을
tms_box_mix_forecast 테이블에 upsert.

스코프: TMS Shipment 테이블에 기록된 고객납품(PNA) 출하건만 포함.
        다영기획 임가공 / 박스 텍스트 비표준 포맷 건은 제외됨.

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

FLD_SHIPMENT_DATE = "fldQvmEwwzvQW95h9"  # 출하확정일
FLD_BOX_TEXT      = "fldTjLDmw5sNGszeD"  # 최종 외박스 수량 값

LOOKBACK_DAYS = 14
CATEGORIES = ("특대", "중대", "대", "중", "소")
# Match each category followed by a number, with negative lookbehinds
# so '대' doesn't capture '중대' / '특대' and '중' doesn't capture '중대'.
CATEGORY_PATTERNS: dict[str, re.Pattern[str]] = {
    "특대": re.compile(r"특대(\d+)"),
    "중대": re.compile(r"중대(\d+)"),
    "대":   re.compile(r"(?<!중)(?<!특)대(\d+)"),
    "중":   re.compile(r"(?<!특)중(?!대)(\d+)"),
    "소":   re.compile(r"소(\d+)"),
}


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


def _parse_box_counts(box_text: str) -> dict[str, int]:
    """Extract box category counts from 최종 외박스 수량 값 text."""
    counts: dict[str, int] = {c: 0 for c in CATEGORIES}
    if not box_text:
        return counts
    for cat, pattern in CATEGORY_PATTERNS.items():
        for m in pattern.finditer(box_text):
            try:
                counts[cat] += int(m.group(1))
            except (ValueError, IndexError):
                pass
    return counts


def _get_shipments(pat: str, since: str) -> list[dict[str, Any]]:
    """Fetch shipments since given ISO date."""
    formula = f"IS_AFTER({{출하확정일}},'{since}')"
    records: list[dict[str, Any]] = []
    offset: str | None = None
    while True:
        params: dict[str, Any] = {
            "fields[]": [FLD_SHIPMENT_DATE, FLD_BOX_TEXT],
            "pageSize": 100, "returnFieldsByFieldId": "true",
            "filterByFormula": formula,
        }
        if offset:
            params["offset"] = offset
        resp = requests.get(
            f"{AIRTABLE_BASE_URL}/{TMS_BASE}/{TBL_SHIPMENT}",
            headers=_headers(pat), params=params, timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
        time.sleep(0.2)
    return records


def _insert_sync_run(supabase_url: str, key: str, *, job_name: str,
                     started_at: datetime, finished_at: datetime,
                     status: str, rows_written: int = 0,
                     error_message: str | None = None) -> None:
    payload = {
        "job_name": job_name, "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(), "status": status,
        "rows_written": rows_written,
        "error_message": error_message[:500] if error_message else None,
        "github_run_id": os.environ.get("GITHUB_RUN_ID"),
    }
    requests.post(
        f"{supabase_url}/rest/v1/sync_runs",
        headers={"apikey": key, "Authorization": f"Bearer {key}",
                 "Content-Type": "application/json",
                 "Prefer": "return=representation"},
        json=payload, timeout=15,
    ).raise_for_status()


def _forecast_for_weekday(
    history: dict[tuple[str, int], int],  # (category, weekday) -> total over lookback
    weekday_count: dict[int, int],        # weekday -> # of days observed
    target_weekday: int,
) -> dict[str, float]:
    """Per-category average for the target weekday across observed days."""
    out: dict[str, float] = {}
    days_obs = weekday_count.get(target_weekday, 0)
    for cat in CATEGORIES:
        if days_obs > 0:
            out[cat] = history.get((cat, target_weekday), 0) / days_obs
        else:
            # fall back to overall average across all weekdays
            total = sum(history.get((cat, w), 0) for w in range(7))
            total_days = sum(weekday_count.values())
            out[cat] = total / total_days if total_days > 0 else 0.0
    return out


def run() -> int:
    pat = os.environ.get("AIRTABLE_PAT_TMS", "")
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not pat:
        print("[tms_box_mix] AIRTABLE_PAT_TMS not set — skipping", file=sys.stderr)
        return 0

    started_at = datetime.now(timezone.utc)
    print("[tms_box_mix] start")
    try:
        cutoff = (date.today() - timedelta(days=LOOKBACK_DAYS)).isoformat()
        shipments = _get_shipments(pat, since=cutoff)
        print(f"[tms_box_mix] fetched {len(shipments)} shipments since {cutoff}")

        # Aggregate: (category, weekday) -> total qty, weekday -> distinct dates
        cat_weekday_total: dict[tuple[str, int], int] = defaultdict(int)
        weekday_dates: dict[int, set[str]] = defaultdict(set)

        for rec in shipments:
            f = rec["fields"]
            ship_date_raw = _str(f.get(FLD_SHIPMENT_DATE))[:10]
            if not ship_date_raw:
                continue
            try:
                ship_dt = date.fromisoformat(ship_date_raw)
            except ValueError:
                continue
            wd = ship_dt.weekday()
            weekday_dates[wd].add(ship_date_raw)

            box_text = _str(f.get(FLD_BOX_TEXT))
            counts = _parse_box_counts(box_text)
            for cat, qty in counts.items():
                if qty > 0:
                    cat_weekday_total[(cat, wd)] += qty

        weekday_count = {wd: len(dates) for wd, dates in weekday_dates.items()}

        tomorrow = date.today() + timedelta(days=1)
        target_wd = tomorrow.weekday()
        forecast = _forecast_for_weekday(cat_weekday_total, weekday_count, target_wd)
        generated_at = datetime.now(timezone.utc).isoformat()

        rows = []
        for cat in CATEGORIES:
            avg_qty = forecast.get(cat, 0.0)
            # Overall 14d daily average (across all weekdays) for context
            total_qty = sum(cat_weekday_total.get((cat, w), 0) for w in range(7))
            total_days = sum(weekday_count.values()) or 1
            avg_14d = total_qty / total_days
            rows.append({
                "forecast_date": tomorrow.isoformat(),
                "box_category": cat,
                "predicted_qty": int(round(avg_qty)),
                "avg_qty_14d": round(avg_14d, 2),
                "source_days": sum(weekday_count.values()),
                "generated_at": generated_at,
            })

        if not rows or all(r["predicted_qty"] == 0 for r in rows):
            print("[tms_box_mix] no box data extracted (predicted_qty all 0)")

        resp = requests.post(
            f"{supabase_url}/rest/v1/tms_box_mix_forecast?on_conflict=forecast_date,box_category",
            headers=_supabase_headers(supabase_key), json=rows, timeout=30,
        )
        resp.raise_for_status()

        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(
            supabase_url, supabase_key, job_name="tms_box_mix",
            started_at=started_at, finished_at=finished_at,
            status="ok", rows_written=len(rows),
        )
        total_predicted = sum(r["predicted_qty"] for r in rows)
        print(f"[tms_box_mix] ok — {len(rows)} categories, "
              f"tomorrow {tomorrow} total predicted={total_predicted}")
        return 0

    except Exception as e:  # noqa: BLE001
        finished_at = datetime.now(timezone.utc)
        _insert_sync_run(
            supabase_url, supabase_key, job_name="tms_box_mix",
            started_at=started_at, finished_at=finished_at,
            status="failed", error_message=str(e),
        )
        print(f"[tms_box_mix] error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    sys.exit(run())
