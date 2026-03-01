-- QUILL — Migration 006: Add current_amount to savings_goals
-- Allows manual progress tracking for goals not linked to an account.

ALTER TABLE public.savings_goals
  ADD COLUMN IF NOT EXISTS current_amount numeric NOT NULL DEFAULT 0;
