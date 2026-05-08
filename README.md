# sincerely-scm-dashboard

Agentic OS dashboard for Sincerely SCM — single-pane-of-glass for TMS ops, AutoResearch trends, project task progress, and Claude Code agent activity.

## Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind + shadcn/ui + Recharts
- **Database**: Supabase (Postgres free tier)
- **Sync**: GitHub Actions cron (daily @ 00:00 KST), Python workers
- **Hosting**: Vercel (Hobby tier)
- **Cost**: $0/mo

## Repo layout
```
.
├── web/              # React + Vite frontend (deployed to Vercel)
├── sync/             # Python sync workers (run by GitHub Actions)
├── supabase/         # Schema SQL + migrations
└── .github/workflows # Daily sync cron
```

## Local dev
```sh
# Frontend
cd web
npm install
cp .env.example .env.local   # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:5173

# Sync (one-off)
cd sync
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env         # fill in secrets
python _sync_runner.py
```

## Deploy
- **Frontend**: pushes to `main` auto-deploy via Vercel
- **Sync**: GitHub Actions runs `sync.yml` daily @ 15:00 UTC (= 00:00 KST)

## Plan reference
See `C:\Users\yjisu\.claude\plans\claude-code-sincerely-scm-hashed-tulip.md` for full design.
