-- Track parse API calls for rate limiting
CREATE TABLE parse_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE parse_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own parse events" ON parse_events
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX parse_events_user_time ON parse_events (user_id, created_at DESC);
