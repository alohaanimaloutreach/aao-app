-- Suggestions table for user feedback
CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'complete')),
  submitted_by UUID REFERENCES auth.users(id),
  submitted_by_name TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert
CREATE POLICY "Users can submit suggestions"
  ON suggestions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Anyone authenticated can read (so admin page works; non-admins only see their own via app logic)
CREATE POLICY "Users can read suggestions"
  ON suggestions FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update (mark complete)
CREATE POLICY "Admins can update suggestions"
  ON suggestions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
