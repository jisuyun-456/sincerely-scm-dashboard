-- 2026-05-11 — calendar_events
-- User-editable schedule/event storage for the Home calendar widget.
-- Anon role can SELECT / INSERT / DELETE (no UPDATE — delete+re-add instead).

CREATE TABLE IF NOT EXISTS calendar_events (
  id          BIGSERIAL PRIMARY KEY,
  event_date  DATE        NOT NULL,
  title       TEXT        NOT NULL,
  event_type  TEXT        NOT NULL DEFAULT 'general',  -- 'general' | 'important' | 'tms' | 'wms'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events (event_date ASC);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_select_calendar_events ON calendar_events;
CREATE POLICY anon_select_calendar_events
  ON calendar_events FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS anon_insert_calendar_events ON calendar_events;
CREATE POLICY anon_insert_calendar_events
  ON calendar_events FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS anon_delete_calendar_events ON calendar_events;
CREATE POLICY anon_delete_calendar_events
  ON calendar_events FOR DELETE TO anon USING (true);
