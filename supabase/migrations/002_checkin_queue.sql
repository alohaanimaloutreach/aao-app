-- 002: Checkin queue for outreach event staging
-- Adds queue table for two-pass check-in flow and status column on events

-- Add status column to outreach_events (existing events default to 'completed')
ALTER TABLE outreach_events ADD COLUMN status text NOT NULL DEFAULT 'completed';

-- Checkin queue staging table
CREATE TABLE checkin_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_event_id uuid NOT NULL REFERENCES outreach_events(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES owners(id),
  queue_position integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'waiting',
  checked_in_by uuid REFERENCES users(id),
  completed_by uuid REFERENCES users(id),
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  notes text,
  staged_care jsonb NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_checkin_queue_event ON checkin_queue(outreach_event_id);
CREATE INDEX idx_checkin_queue_status ON checkin_queue(outreach_event_id, status);

-- RLS
ALTER TABLE checkin_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkin_queue_select" ON checkin_queue
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "checkin_queue_insert" ON checkin_queue
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "checkin_queue_update" ON checkin_queue
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "checkin_queue_delete" ON checkin_queue
  FOR DELETE TO authenticated USING (true);

-- Enable realtime for live queue updates
ALTER PUBLICATION supabase_realtime ADD TABLE checkin_queue;
