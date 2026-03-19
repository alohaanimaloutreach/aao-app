-- Attachments table for files linked to events or animals
CREATE TABLE attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_type text,
  file_size bigint,
  outreach_event_id uuid REFERENCES outreach_events(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES animals(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY attachments_select ON attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY attachments_insert ON attachments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY attachments_delete ON attachments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true);

CREATE POLICY storage_attachments_select ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'attachments');
CREATE POLICY storage_attachments_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attachments');
CREATE POLICY storage_attachments_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'attachments');
