-- =============================================================
-- QUILL — Initial Schema Migration
-- Run this in the Supabase SQL editor to initialize the database
-- =============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- USERS (extends Supabase auth.users)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             text UNIQUE NOT NULL,
  name              text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  subscription_tier text NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
  stripe_customer_id text,
  income_biweekly   numeric,
  income_monthly    numeric
);

-- =============================================================
-- ACCOUNTS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.accounts (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  type         text NOT NULL CHECK (type IN ('checking', 'savings', 'credit', 'investment')),
  institution  text,
  balance      numeric NOT NULL DEFAULT 0,
  apr          numeric,
  credit_limit numeric,
  pay_in_full  boolean NOT NULL DEFAULT false,
  goal_balance numeric,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- STATEMENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.statements (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id        uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  period_start      date,
  period_end        date,
  beginning_balance numeric,
  ending_balance    numeric,
  raw_text          text,
  pdf_path          text,
  parsed_at         timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- TRANSACTIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_id uuid REFERENCES public.statements(id) ON DELETE SET NULL,
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id   uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  date         date NOT NULL,
  description  text NOT NULL,
  amount       numeric NOT NULL,  -- negative=debit, positive=credit
  category     text NOT NULL DEFAULT 'Other',
  is_income    boolean NOT NULL DEFAULT false,
  is_transfer  boolean NOT NULL DEFAULT false,
  merchant     text,
  user_notes   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- DEBTS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.debts (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name           text NOT NULL,
  balance        numeric NOT NULL DEFAULT 0,
  apr            numeric NOT NULL DEFAULT 0,
  min_payment    numeric NOT NULL DEFAULT 0,
  due_date       text,
  pay_in_full    boolean NOT NULL DEFAULT false,
  ends_in_months integer,
  is_active      boolean NOT NULL DEFAULT true,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- FIXED OBLIGATIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.fixed_obligations (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  amount       numeric NOT NULL,
  variable     boolean NOT NULL DEFAULT false,
  notes        text,
  active_from  date,
  active_until date
);

-- =============================================================
-- SAVINGS GOALS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id  uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  name        text NOT NULL,
  goal_amount numeric NOT NULL,
  target_date date,
  priority    integer NOT NULL DEFAULT 1
);

-- =============================================================
-- SUBSCRIPTIONS (Stripe)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL,
  plan                   text NOT NULL CHECK (plan IN ('pro_monthly', 'pro_annual', 'lifetime')),
  status                 text NOT NULL CHECK (status IN ('active', 'canceled', 'past_due')),
  current_period_end     timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- INDEXES for performance
-- =============================================================
CREATE INDEX IF NOT EXISTS transactions_user_id_date_idx ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS transactions_account_id_idx ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS transactions_category_idx ON public.transactions(user_id, category);
CREATE INDEX IF NOT EXISTS statements_user_id_idx ON public.statements(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS debts_user_id_idx ON public.debts(user_id);
CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON public.accounts(user_id);

-- =============================================================
-- ROW LEVEL SECURITY
-- CRITICAL: Every table must filter by auth.uid() = user_id
-- =============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users table: users can only read/update their own row
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_delete_own" ON public.users FOR DELETE USING (auth.uid() = id);

-- Accounts
CREATE POLICY "accounts_select_own" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert_own" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update_own" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "accounts_delete_own" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- Statements
CREATE POLICY "statements_select_own" ON public.statements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "statements_insert_own" ON public.statements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "statements_update_own" ON public.statements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "statements_delete_own" ON public.statements FOR DELETE USING (auth.uid() = user_id);

-- Transactions
CREATE POLICY "transactions_select_own" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert_own" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update_own" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transactions_delete_own" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Debts
CREATE POLICY "debts_select_own" ON public.debts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "debts_insert_own" ON public.debts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "debts_update_own" ON public.debts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "debts_delete_own" ON public.debts FOR DELETE USING (auth.uid() = user_id);

-- Fixed Obligations
CREATE POLICY "fixed_obligations_select_own" ON public.fixed_obligations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fixed_obligations_insert_own" ON public.fixed_obligations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fixed_obligations_update_own" ON public.fixed_obligations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fixed_obligations_delete_own" ON public.fixed_obligations FOR DELETE USING (auth.uid() = user_id);

-- Savings Goals
CREATE POLICY "savings_goals_select_own" ON public.savings_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "savings_goals_insert_own" ON public.savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "savings_goals_update_own" ON public.savings_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "savings_goals_delete_own" ON public.savings_goals FOR DELETE USING (auth.uid() = user_id);

-- Subscriptions
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_insert_own" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subscriptions_update_own" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_delete_own" ON public.subscriptions FOR DELETE USING (auth.uid() = user_id);

-- =============================================================
-- TRIGGER: auto-create user profile on signup
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
