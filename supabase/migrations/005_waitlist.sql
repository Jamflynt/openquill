-- =============================================================
-- QUILL — Pro Waitlist
-- Stores emails + feature interest for the Pro tier launch list.
-- Anyone can join (no account required).
-- =============================================================

CREATE TABLE IF NOT EXISTS public.pro_waitlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  feature    text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pro_waitlist_email_key UNIQUE (email)
);

ALTER TABLE public.pro_waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone (logged in or not) can join the waitlist
CREATE POLICY "waitlist_insert_anyone" ON public.pro_waitlist
  FOR INSERT WITH CHECK (true);

-- Only the row owner (matched by email) can view their own entry — not used by the app
-- Count is exposed via a SECURITY DEFINER function below (no email leakage)

CREATE INDEX IF NOT EXISTS waitlist_created_idx ON public.pro_waitlist (created_at DESC);

-- =============================================================
-- Function: get_waitlist_count()
-- Returns the total number of waitlist signups.
-- SECURITY DEFINER so it can bypass RLS; callable by anon role.
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM public.pro_waitlist;
$$;

GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO anon, authenticated;
