-- Add to_id column to tms_delivery_notes — 2026-05-13
-- sync_tms_delivery_notes.py and TmsDeliveryNotes.tsx both reference to_id
-- (TO number resolved from 배송요청 links).
-- Safe to re-run (ADD COLUMN IF NOT EXISTS).

ALTER TABLE tms_delivery_notes ADD COLUMN IF NOT EXISTS to_id TEXT;
