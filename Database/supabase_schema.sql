-- ================================================================
-- MeetMind — Supabase Schema
-- Run this entire file in:
-- Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ================================================================


-- ── 1. Meetings table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  video_url   TEXT,
  status      TEXT DEFAULT 'processing'
              CHECK (status IN ('processing', 'ready', 'failed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ── 2. Transcripts table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transcripts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ── 3. Summaries table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS summaries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id   UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE UNIQUE,
  summary      TEXT,
  action_items JSONB DEFAULT '[]',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ================================================================
-- ROW LEVEL SECURITY
-- Ensures users can only access their own data
-- ================================================================

ALTER TABLE meetings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries   ENABLE ROW LEVEL SECURITY;


-- ── Meetings RLS policies ────────────────────────────────────────

-- Logged in users can read their own meetings
CREATE POLICY "users_select_own_meetings"
  ON meetings FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (backend) has full access
CREATE POLICY "service_role_all_meetings"
  ON meetings FOR ALL
  USING (true)
  WITH CHECK (true);


-- ── Transcripts RLS policies ─────────────────────────────────────

-- Service role (backend) has full access
CREATE POLICY "service_role_all_transcripts"
  ON transcripts FOR ALL
  USING (true)
  WITH CHECK (true);


-- ── Summaries RLS policies ───────────────────────────────────────

-- Service role (backend) has full access
CREATE POLICY "service_role_all_summaries"
  ON summaries FOR ALL
  USING (true)
  WITH CHECK (true);


-- ================================================================
-- STORAGE BUCKET
-- Do this manually in Supabase Dashboard:
-- Storage → New bucket → Name: "meeting-recordings" → Public: ON
-- ================================================================