-- Phase 2: Volunteer roster, follow-up tasks, day linking, Drive folder auto-link
-- Applied to both prod and dev on 2026-04-02

-- 1. Add name_override to volunteers (for walk-up volunteers without accounts)
ALTER TABLE outreach_event_volunteers ADD COLUMN IF NOT EXISTS name_override text;
ALTER TABLE outreach_event_volunteers ALTER COLUMN user_id DROP NOT NULL;

-- 2. Follow-up tasks table
CREATE TABLE IF NOT EXISTS outreach_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_event_id uuid REFERENCES outreach_events(id) ON DELETE CASCADE NOT NULL,
  task text NOT NULL,
  assigned_to uuid REFERENCES users(id),
  assigned_name text,
  due_date date,
  completed boolean DEFAULT false,
  completed_by uuid REFERENCES users(id),
  completed_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE outreach_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY outreach_tasks_select ON outreach_tasks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY outreach_tasks_insert ON outreach_tasks
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY outreach_tasks_update ON outreach_tasks
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY outreach_tasks_delete ON outreach_tasks
  FOR DELETE TO authenticated USING (is_admin());

-- 3. Same-day event linking columns
ALTER TABLE outreach_events ADD COLUMN IF NOT EXISTS day_group_id uuid;
ALTER TABLE outreach_events ADD COLUMN IF NOT EXISTS day_group_label text;

-- 4. Drive folders table
CREATE TABLE IF NOT EXISTS drive_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL,
  folder_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE drive_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY drive_folders_select ON drive_folders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY drive_folders_insert ON drive_folders
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY drive_folders_update ON drive_folders
  FOR UPDATE TO authenticated USING (is_admin());

-- 2026 Google Drive folder IDs
INSERT INTO drive_folders (year, month, folder_id) VALUES
(2026, 1, '1Yv1mDOkCFpsYOtH_x3IJ_QAXfpWoHjHS'),
(2026, 2, '1B15jTmvStNzxGM-7gkotSnpXNPOk7vkm'),
(2026, 3, '18fAG5CDKfUrAoc6BpaZipeqNIqxmrgBM'),
(2026, 4, '1qLBC5I4JB1sc2PxdF10ASiR9rd34Fqf7'),
(2026, 5, '1xwTeP6ew6zs1fZHl9Hcd9_Vfbl_lzHTD'),
(2026, 6, '14d01__DuLXu7Rgj0mAbxsTZj8eYGXaHn'),
(2026, 7, '1wyBGv8HYQPLbywLWaqigYsPnSalH85nA'),
(2026, 8, '1AZwiX77TdpRoFKpxYJmchmzQn_wu-GiT'),
(2026, 9, '1ZOEG3r0jxwiE_gpbu96detRcGJOPs3bc'),
(2026, 10, '1Ax1gjVD5m-wA80_h-hrVB8xmq4CKU5fV'),
(2026, 11, '1p0lDhWTJiDaWeZx52krTGbtkptmUFoIj'),
(2026, 12, '1bGcNUGUGNXoFkLpT3ekJjBrdKY0Faaf8');

-- 5. Drive folder URL on outreach events
ALTER TABLE outreach_events ADD COLUMN IF NOT EXISTS drive_folder_url text;
