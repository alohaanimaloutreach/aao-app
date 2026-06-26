-- ============================================================
-- NEW EVENT SYSTEM (Launchpad architecture)
-- Clean schema separate from legacy outreach_events
-- ============================================================

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  event_time time,
  location_id uuid REFERENCES locations(id),
  event_type text NOT NULL DEFAULT 'distribution',
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE event_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  item text NOT NULL,
  quantity numeric,
  unit text,
  weight_per_unit numeric,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE event_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  note text NOT NULL,
  is_task boolean NOT NULL DEFAULT false,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE event_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_type text,
  file_size bigint,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_events_date ON events(event_date DESC);
CREATE INDEX idx_events_location ON events(location_id);
CREATE INDEX idx_event_products_event ON event_products(event_id);
CREATE INDEX idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX idx_event_notes_event ON event_notes(event_id);
CREATE INDEX idx_event_files_event ON event_files(event_id);

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read events" ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert events" ON events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update events" ON events FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete events" ON events FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read event_products" ON event_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert event_products" ON event_products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update event_products" ON event_products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete event_products" ON event_products FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read event_attendees" ON event_attendees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert event_attendees" ON event_attendees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update event_attendees" ON event_attendees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete event_attendees" ON event_attendees FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read event_notes" ON event_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert event_notes" ON event_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update event_notes" ON event_notes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete event_notes" ON event_notes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read event_files" ON event_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert event_files" ON event_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update event_files" ON event_files FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete event_files" ON event_files FOR DELETE TO authenticated USING (true);
