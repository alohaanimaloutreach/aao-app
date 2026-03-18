-- AAO Test Environment — Part 3: Storage Bucket
-- Run this THIRD in the SQL Editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "photos_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'photos');

CREATE POLICY "photos_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos');

CREATE POLICY "photos_storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'photos');

CREATE POLICY "photos_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'photos');
