-- Weekly Poems table: stores auto-generated weekly compositions
CREATE TABLE IF NOT EXISTS weekly_poems (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lines jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  posted_twitter boolean DEFAULT false,
  posted_instagram boolean DEFAULT false
);

ALTER TABLE weekly_poems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON weekly_poems FOR SELECT USING (true);
