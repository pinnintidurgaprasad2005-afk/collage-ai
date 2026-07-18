/*
# Create core schema for AI College Student Assessment System

1. Purpose
- Multi-user app where students sign in (Supabase email/password auth) and admins use hardcoded credentials.
- Stores student profiles, test attempts (interview/aptitude/vocabulary/technical), AI reports, badges, notifications, and login streaks.
- Admin (anon key) needs to read all student data for analytics/leaderboard, so SELECT policies are open to `anon, authenticated`.
- Writes are ownership-scoped for students; admin writes via service role (server-side) bypass RLS.

2. New Tables
- `students` — student profile (full_name, roll_number, branch, year, section, email, login_streak, last_login_date, badges, overall_score, created_at).
- `interview_reports` — AI interview evaluation (confidence, communication, technical_knowledge, problem_solving, grammar, suggestions, overall_rating, feedback).
- `aptitude_reports` — aptitude test attempt (score, total, answers JSON).
- `vocabulary_reports` — vocabulary test attempt (score, total, answers JSON).
- `technical_reports` — technical test attempt (language, score, total, answers JSON).
- `final_reports` — consolidated AI report (overall_score, grade, strengths, weaknesses, recommendations, gemini_feedback, charts JSON).
- `notifications` — student notifications (type, message, read, created_at).
- `motivations` — motivational quotes (text, author) — public seed data.

3. Security
- RLS enabled on every table.
- SELECT: open to `anon, authenticated` (admin needs to read all; leaderboard/top performer require public reads).
- INSERT/UPDATE/DELETE: ownership-scoped to `auth.uid() = user_id` for authenticated students.
- `motivations` table: full CRUD for `anon, authenticated` (seed data, intentionally public).

4. Notes
- `user_id` columns default to `auth.uid()` so student inserts that omit `user_id` succeed.
- `students.roll_number` is unique per branch+year+section (enforced by composite unique index).
- Admin writes through the service role key (server-side) bypass RLS — not used in the browser.
*/

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  roll_number text NOT NULL,
  branch text NOT NULL,
  year text NOT NULL,
  section text NOT NULL,
  email text NOT NULL,
  login_streak integer NOT NULL DEFAULT 0,
  last_login_date date,
  overall_score numeric NOT NULL DEFAULT 0,
  badges jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (roll_number, branch, year, section)
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_students" ON students;
CREATE POLICY "select_students" ON students FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_student" ON students;
CREATE POLICY "insert_own_student" ON students FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_student" ON students;
CREATE POLICY "update_own_student" ON students FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_student" ON students;
CREATE POLICY "delete_own_student" ON students FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_students_branch_year_section ON students(branch, year, section);
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_overall_score ON students(overall_score DESC);

CREATE TABLE IF NOT EXISTS interview_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  confidence numeric,
  communication numeric,
  technical_knowledge numeric,
  problem_solving numeric,
  grammar numeric,
  overall_rating numeric,
  suggestions text,
  feedback text,
  transcript jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE interview_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_interview_reports" ON interview_reports;
CREATE POLICY "select_interview_reports" ON interview_reports FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_interview" ON interview_reports;
CREATE POLICY "insert_own_interview" ON interview_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_interview" ON interview_reports;
CREATE POLICY "update_own_interview" ON interview_reports FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_interview" ON interview_reports;
CREATE POLICY "delete_own_interview" ON interview_reports FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_interview_user ON interview_reports(user_id);

CREATE TABLE IF NOT EXISTS aptitude_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  answers jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE aptitude_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_aptitude_reports" ON aptitude_reports;
CREATE POLICY "select_aptitude_reports" ON aptitude_reports FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_aptitude" ON aptitude_reports;
CREATE POLICY "insert_own_aptitude" ON aptitude_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_aptitude" ON aptitude_reports;
CREATE POLICY "update_own_aptitude" ON aptitude_reports FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_aptitude" ON aptitude_reports;
CREATE POLICY "delete_own_aptitude" ON aptitude_reports FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_aptitude_user ON aptitude_reports(user_id);

CREATE TABLE IF NOT EXISTS vocabulary_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  answers jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vocabulary_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_vocabulary_reports" ON vocabulary_reports;
CREATE POLICY "select_vocabulary_reports" ON vocabulary_reports FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_vocabulary" ON vocabulary_reports;
CREATE POLICY "insert_own_vocabulary" ON vocabulary_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_vocabulary" ON vocabulary_reports;
CREATE POLICY "update_own_vocabulary" ON vocabulary_reports FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_vocabulary" ON vocabulary_reports;
CREATE POLICY "delete_own_vocabulary" ON vocabulary_reports FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_vocabulary_user ON vocabulary_reports(user_id);

CREATE TABLE IF NOT EXISTS technical_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  language text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  answers jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE technical_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_technical_reports" ON technical_reports;
CREATE POLICY "select_technical_reports" ON technical_reports FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_technical" ON technical_reports;
CREATE POLICY "insert_own_technical" ON technical_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_technical" ON technical_reports;
CREATE POLICY "update_own_technical" ON technical_reports FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_technical" ON technical_reports;
CREATE POLICY "delete_own_technical" ON technical_reports FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_technical_user ON technical_reports(user_id);

CREATE TABLE IF NOT EXISTS final_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score numeric NOT NULL DEFAULT 0,
  grade text,
  strengths jsonb,
  weaknesses jsonb,
  recommendations jsonb,
  gemini_feedback text,
  charts jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE final_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_final_reports" ON final_reports;
CREATE POLICY "select_final_reports" ON final_reports FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_final" ON final_reports;
CREATE POLICY "insert_own_final" ON final_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_final" ON final_reports;
CREATE POLICY "update_own_final" ON final_reports FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_final" ON final_reports;
CREATE POLICY "delete_own_final" ON final_reports FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_final_user ON final_reports(user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_notifications" ON notifications;
CREATE POLICY "select_notifications" ON notifications FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_notification" ON notifications;
CREATE POLICY "insert_own_notification" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notification" ON notifications;
CREATE POLICY "update_own_notification" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notification" ON notifications;
CREATE POLICY "delete_own_notification" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

CREATE TABLE IF NOT EXISTS motivations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  author text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE motivations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_motivations" ON motivations;
CREATE POLICY "select_motivations" ON motivations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_motivations" ON motivations;
CREATE POLICY "insert_motivations" ON motivations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_motivations" ON motivations;
CREATE POLICY "update_motivations" ON motivations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_motivations" ON motivations;
CREATE POLICY "delete_motivations" ON motivations FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO motivations (text, author) VALUES
  ('Keep Learning.', 'Anonymous'),
  ('Never Stop Improving.', 'Anonymous'),
  ('Success Comes from Consistency.', 'Anonymous'),
  ('The expert in anything was once a beginner.', 'Helen Hayes'),
  ('Push yourself, because no one else is going to do it for you.', 'Anonymous'),
  ('Dream it. Wish it. Do it.', 'Anonymous'),
  ('Stay focused. Stay determined.', 'Anonymous')
ON CONFLICT DO NOTHING;
