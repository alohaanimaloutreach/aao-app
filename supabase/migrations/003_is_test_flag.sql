-- 003: Add is_test boolean flag to key tables
-- When test mode is active, records are flagged so they can be hidden or bulk-deleted

ALTER TABLE animals ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE owners ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE care_events ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE outreach_events ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE checkin_queue ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE field_notes ADD COLUMN is_test boolean NOT NULL DEFAULT false;

-- Indexes for fast filtering
CREATE INDEX idx_animals_is_test ON animals(is_test) WHERE is_test = true;
CREATE INDEX idx_owners_is_test ON owners(is_test) WHERE is_test = true;
CREATE INDEX idx_care_events_is_test ON care_events(is_test) WHERE is_test = true;
CREATE INDEX idx_outreach_events_is_test ON outreach_events(is_test) WHERE is_test = true;
