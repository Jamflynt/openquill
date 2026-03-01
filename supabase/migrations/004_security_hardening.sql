-- =============================================================
-- QUILL — Security Hardening Migration
-- Addresses:
--   1. parse_events FOR ALL policy allows users to delete rate-limit rows
--   2. subscription_tier protection uses fragile subquery — replace with trigger
--   3. UPDATE policies on all tables lack explicit WITH CHECK clauses
-- Run this in the Supabase SQL editor after 003_parse_events.sql
-- =============================================================

-- -------------------------------------------------------------
-- 1. Fix parse_events RLS: remove DELETE/UPDATE grants
--    The FOR ALL policy allowed authenticated users to delete
--    their own parse_events rows, bypassing the rate limit entirely.
--    Users can call DELETE on the Supabase client with the anon key
--    to erase their rate-limit history and get unlimited Claude calls.
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own parse events" ON parse_events;

CREATE POLICY "parse_events_select_own" ON parse_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "parse_events_insert_own" ON parse_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policies — parse_events rows are immutable from the client

-- -------------------------------------------------------------
-- 2. Replace subscription_tier subquery protection with a trigger
--    The WITH CHECK subquery in migration 002 is fragile under
--    certain PostgreSQL isolation levels and creates a recursive
--    read. A BEFORE UPDATE trigger is simpler and more reliable.
-- -------------------------------------------------------------
DROP POLICY IF EXISTS users_update_own ON public.users;

CREATE POLICY users_update_own ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.prevent_tier_self_promotion()
RETURNS trigger AS $$
BEGIN
  IF NEW.subscription_tier != OLD.subscription_tier THEN
    RAISE EXCEPTION 'subscription_tier cannot be changed directly';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS no_tier_self_promotion ON public.users;
CREATE TRIGGER no_tier_self_promotion
  BEFORE UPDATE OF subscription_tier ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_tier_self_promotion();

-- -------------------------------------------------------------
-- 3. Add explicit WITH CHECK to all UPDATE policies
--    Without WITH CHECK, the USING expression is implicitly reused,
--    but this is fragile. Explicit WITH CHECK ensures the post-update
--    row still belongs to the authenticated user regardless of
--    how the application layer evolves.
-- -------------------------------------------------------------
ALTER POLICY "accounts_update_own" ON public.accounts
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "statements_update_own" ON public.statements
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "transactions_update_own" ON public.transactions
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "debts_update_own" ON public.debts
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "fixed_obligations_update_own" ON public.fixed_obligations
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "savings_goals_update_own" ON public.savings_goals
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "subscriptions_update_own" ON public.subscriptions
  WITH CHECK (auth.uid() = user_id);
