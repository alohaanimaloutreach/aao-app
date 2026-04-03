-- Phase 3: Add reviewed tracking to sighting_entries
-- Applied to both prod and dev on 2026-04-02

ALTER TABLE sighting_entries
ADD COLUMN IF NOT EXISTS reviewed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES users(id);
