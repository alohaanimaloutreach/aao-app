-- AAO Test Environment — Part 2: RLS Policies
-- Run this SECOND in the SQL Editor

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE situations ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_event_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_rescues ENABLE ROW LEVEL SECURITY;
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_queue ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY "users_select" ON users
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "users_insert" ON users
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "users_update" ON users
  FOR UPDATE TO authenticated
  USING (true);

-- LOCATIONS
CREATE POLICY "locations_select" ON locations
  FOR SELECT TO authenticated
  USING (archived = false OR is_admin());
CREATE POLICY "locations_insert" ON locations
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "locations_update" ON locations
  FOR UPDATE TO authenticated
  USING (true);
CREATE POLICY "locations_delete" ON locations
  FOR DELETE TO authenticated
  USING (is_admin());

-- OWNERS
CREATE POLICY "owners_select" ON owners
  FOR SELECT TO authenticated
  USING (archived = false OR is_admin());
CREATE POLICY "owners_insert" ON owners
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "owners_update" ON owners
  FOR UPDATE TO authenticated
  USING (true);
CREATE POLICY "owners_delete" ON owners
  FOR DELETE TO authenticated
  USING (is_admin());

-- ANIMALS
CREATE POLICY "animals_select" ON animals
  FOR SELECT TO authenticated
  USING (archived = false OR is_admin());
CREATE POLICY "animals_insert" ON animals
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "animals_update" ON animals
  FOR UPDATE TO authenticated
  USING (true);
CREATE POLICY "animals_delete" ON animals
  FOR DELETE TO authenticated
  USING (is_admin());

-- SITUATIONS
CREATE POLICY "situations_select" ON situations
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "situations_insert" ON situations
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "situations_update" ON situations
  FOR UPDATE TO authenticated
  USING (true);

-- OUTREACH EVENTS
CREATE POLICY "outreach_events_select" ON outreach_events
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "outreach_events_insert" ON outreach_events
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "outreach_events_update" ON outreach_events
  FOR UPDATE TO authenticated
  USING (true);

-- OUTREACH EVENT VOLUNTEERS
CREATE POLICY "oev_select" ON outreach_event_volunteers
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "oev_insert" ON outreach_event_volunteers
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "oev_delete" ON outreach_event_volunteers
  FOR DELETE TO authenticated
  USING (true);

-- CARE EVENTS
CREATE POLICY "care_events_select" ON care_events
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "care_events_insert" ON care_events
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "care_events_update" ON care_events
  FOR UPDATE TO authenticated
  USING (true);

-- FIELD NOTES
CREATE POLICY "field_notes_select" ON field_notes
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "field_notes_insert" ON field_notes
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "field_notes_update" ON field_notes
  FOR UPDATE TO authenticated
  USING (true);

-- PHOTOS
CREATE POLICY "photos_select" ON photos
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "photos_insert" ON photos
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "photos_update" ON photos
  FOR UPDATE TO authenticated
  USING (true);
CREATE POLICY "photos_delete" ON photos
  FOR DELETE TO authenticated
  USING (is_admin());

-- TRANSFER RESCUES
CREATE POLICY "transfer_rescues_select" ON transfer_rescues
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "transfer_rescues_insert" ON transfer_rescues
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "transfer_rescues_update" ON transfer_rescues
  FOR UPDATE TO authenticated
  USING (true);

-- FLAGS
CREATE POLICY "flags_select" ON flags
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "flags_insert" ON flags
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "flags_update" ON flags
  FOR UPDATE TO authenticated
  USING (true);

-- ACTIVITY LOG (append only)
CREATE POLICY "activity_log_select" ON activity_log
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "activity_log_insert" ON activity_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- RECORD VERSIONS (append only)
CREATE POLICY "record_versions_select" ON record_versions
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "record_versions_insert" ON record_versions
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- CHECKIN QUEUE
CREATE POLICY "checkin_queue_select" ON checkin_queue
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "checkin_queue_insert" ON checkin_queue
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "checkin_queue_update" ON checkin_queue
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
CREATE POLICY "checkin_queue_delete" ON checkin_queue
  FOR DELETE TO authenticated
  USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE checkin_queue;
