# KPI-3 처리건수/FTE — Manual Sync Guide

## Overview
`sync/sync_kpi3_productivity.py` pulls confirmed TMS shipments from Airtable,
groups them by ISO-week, and upserts to the Supabase `kpi3_productivity` table.

---

## 1. Apply the Migration

Run once in Supabase Dashboard → SQL Editor:

```
supabase/migrations/2026-05-15-kpi3-productivity.sql
```

This creates `kpi3_productivity` with `count_per_fte` as a generated column.
Safe to re-run (idempotent).

---

## 2. Environment Variables

| Variable | Where set | Purpose |
|---|---|---|
| `SUPABASE_URL` | `.env` / GitHub Secret | Supabase REST endpoint |
| `SUPABASE_SERVICE_KEY` | `.env` / GitHub Secret | Supabase service role key |
| `AIRTABLE_PAT_TMS` | `.env` / GitHub Secret | Airtable PAT for TMS base |

Copy `.env.example` to `.env` and fill values for local runs.

---

## 3. Run Sync Manually

```bash
cd sync
cp .env.example .env   # fill values
python sync_kpi3_productivity.py
```

Expected output:
```
[kpi3_productivity] start
[kpi3_productivity] fetched NNN records with 출하확정일
[kpi3_productivity] ok — NN week rows upserted, fte=7
```

---

## 4. Run via Full Runner

```bash
cd sync
python _sync_runner.py
```

`kpi3_productivity` is registered as the last job in the runner.

---

## 5. GitHub Actions

The existing `sync` workflow calls `_sync_runner.py` on a daily schedule.
`kpi3_productivity` is included automatically via the runner registration.

---

## 6. FTE Configuration

FTE is hardcoded to 7 (V1). To update per-team FTE, edit:

```
sync/config/team_parts.py
```

And update the `FTE` constant in `sync_kpi3_productivity.py`.

---

## 7. Dashboard

Access at: `/kpi3` route on the dashboard.
Shows: 26-week trend chart, per-week table, and OTIF composite view.
