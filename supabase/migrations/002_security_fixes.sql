-- =============================================================
-- QUILL — Security Fix Migration
-- Addresses:
--   1. users_update_own RLS policy lacks WITH CHECK (pro self-promotion)
--   2. SECURITY DEFINER trigger missing search_path (schema injection)
--   3. Drop raw_text column to prevent accidental bank data storage
-- Run this in the Supabase SQL editor after 001_initial_schema.sql
-- =============================================================

-- -------------------------------------------------------------
-- 1. Fix RLS: prevent users from self-promoting subscription_tier
--    The original policy had no WITH CHECK clause, meaning any
--    authenticated user could set subscription_tier = 'pro'
--    from the browser console.
-- -------------------------------------------------------------
DROP POLICY IF EXISTS users_update_own ON public.users;

CREATE POLICY users_update_own ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND subscription_tier = (SELECT subscription_tier FROM public.users WHERE id = auth.uid())
  );

-- -------------------------------------------------------------
-- 2. Fix SECURITY DEFINER trigger: add search_path
--    Without a fixed search_path, a malicious schema could shadow
--    public tables and hijack the trigger's elevated permissions.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- -------------------------------------------------------------
-- 3. Drop raw_text column from statements
--    The UI promises users their statement text is not stored.
--    This column contradicts that promise. Dropping it makes the
--    guarantee structural rather than just behavioral.
--    If you want to restore it later, add it back explicitly and
--    document the retention policy in the privacy page.
-- -------------------------------------------------------------
ALTER TABLE public.statements DROP COLUMN IF EXISTS raw_text;
