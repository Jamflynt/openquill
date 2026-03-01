-- =============================================================
-- QUILL — Seed / Demo Data
-- Fictional scenario for demo purposes
-- Run AFTER creating a user account via magic link login
-- Replace 'YOUR_USER_UUID' with the actual UUID from auth.users
-- =============================================================

-- Usage:
-- 1. Log in to the app with your email to create your auth account
-- 2. In Supabase dashboard: Authentication → Users → copy your UUID
-- 3. Replace all instances of 'YOUR_USER_UUID' below
-- 4. Run this in the Supabase SQL editor

DO $$
DECLARE
  v_user_id uuid := 'YOUR_USER_UUID'; -- REPLACE THIS

  -- Account IDs
  v_usaa_checking uuid := uuid_generate_v4();
  v_usaa_savings   uuid := uuid_generate_v4();
  v_ally_hys       uuid := uuid_generate_v4();
  v_usaa_amex      uuid := uuid_generate_v4();
  v_apple_card     uuid := uuid_generate_v4();

BEGIN

-- =============================================================
-- Update user income
-- =============================================================
UPDATE public.users
SET
  name = 'Demo User',
  income_biweekly = 2250.00,
  income_monthly = 4500.00
WHERE id = v_user_id;

-- =============================================================
-- Accounts
-- =============================================================
INSERT INTO public.accounts (id, user_id, name, type, institution, balance, updated_at) VALUES
  (v_usaa_checking, v_user_id, 'USAA Checking', 'checking', 'USAA', 1842.33, now()),
  (v_usaa_savings,  v_user_id, 'USAA Savings',  'savings',  'USAA', 2400.00, now()),
  (v_ally_hys,      v_user_id, 'Ally High Yield Savings', 'savings', 'Ally Bank', 4216.21, now());

INSERT INTO public.accounts (id, user_id, name, type, institution, balance, apr, credit_limit, pay_in_full, updated_at) VALUES
  (v_usaa_amex,   v_user_id, 'USAA Amex Card', 'credit', 'USAA', -1596.28, 18.4, 5000, true, now()),
  (v_apple_card,  v_user_id, 'Apple Card',     'credit', 'Apple / GS Bank', -178.10, 0, 2000, true, now());

-- =============================================================
-- Debts (active)
-- =============================================================
INSERT INTO public.debts (user_id, name, balance, apr, min_payment, due_date, pay_in_full, ends_in_months, is_active, updated_at) VALUES
  (v_user_id, 'USAA Amex Card', 1596.28, 18.4, 16.00, '03/16', true, null, true, now()),
  (v_user_id, 'Buy Now Pay Later (x2)', 920.00, 18.0, 100.00, null, false, 11, true, now()),
  (v_user_id, 'Klarna',         176.24,  0.0,  88.00,  null,   false, 2, true, now()),
  (v_user_id, 'Apple Card',     178.10,  0.0,  15.00,  null,   true, null, true, now()),
  (v_user_id, 'iPhone Installment (AT&T)', 775.05, 0.0, 52.50, null, false, 18, true, now());

-- =============================================================
-- Fixed Monthly Obligations
-- =============================================================
INSERT INTO public.fixed_obligations (user_id, name, amount, variable, notes) VALUES
  (v_user_id, 'Rent',           900.00,  false, null),
  (v_user_id, 'Car Payment', 675.00, false, 'Due around 15th'),
  (v_user_id, 'Internet (altafiber)', 77.21, false, null),
  (v_user_id, 'USAA Auto + Renters Insurance', 150.00, false, null),
  (v_user_id, 'BNPL Payment',   100.00,  false, 'Ends ~Month 11'),
  (v_user_id, 'Klarna',          88.00,  false, 'Ends April — 2 months remaining'),
  (v_user_id, 'iPhone Installment', 52.50, false, '~18 months remaining'),
  (v_user_id, 'Electric (Duke Energy)', 200.00, true, 'Winter: $477-677 / Spring-Fall: ~$170');

-- =============================================================
-- Savings Goals
-- =============================================================
INSERT INTO public.savings_goals (user_id, account_id, name, goal_amount, target_date, priority) VALUES
  (v_user_id, v_ally_hys,    'Emergency Fund (Ally)', 12000.00, '2026-12-31', 1),
  (v_user_id, v_usaa_savings, 'USAA Liquid Buffer',    7000.00, null, 2);

-- =============================================================
-- Sample Transactions (February 2026)
-- =============================================================
INSERT INTO public.transactions (user_id, account_id, date, description, amount, category, is_income, is_transfer) VALUES
  -- Income
  (v_user_id, v_usaa_checking, '2026-02-07', 'ACME CORP PAYROLL', 2250.00, 'Income', true, false),
  (v_user_id, v_usaa_checking, '2026-02-21', 'ACME CORP PAYROLL', 2250.00, 'Income', true, false),
  (v_user_id, v_usaa_checking, '2026-02-15', 'COMMUNITY ARTS COUNCIL PAYMENT', 200.00, 'Income', true, false),

  -- Housing
  (v_user_id, v_usaa_checking, '2026-02-01', 'RENT PAYMENT', -900.00, 'Housing', false, false),

  -- Transportation
  (v_user_id, v_usaa_checking, '2026-02-15', 'HONDA FINANCIAL SERVICES', -675.00, 'Transportation', false, false),
  (v_user_id, v_usaa_checking, '2026-02-10', 'SHELL OIL', -62.40, 'Transportation', false, false),
  (v_user_id, v_usaa_checking, '2026-02-18', 'SPEEDWAY', -58.20, 'Transportation', false, false),

  -- Utilities
  (v_user_id, v_usaa_checking, '2026-02-05', 'DUKE ENERGY', -477.00, 'Utilities', false, false),
  (v_user_id, v_usaa_checking, '2026-02-12', 'ALTAFIBER INTERNET', -77.21, 'Utilities', false, false),

  -- Insurance
  (v_user_id, v_usaa_checking, '2026-02-08', 'USAA INSURANCE PAYMENT', -150.00, 'Subscriptions', false, false),

  -- Food & Groceries
  (v_user_id, v_usaa_checking, '2026-02-03', 'KROGER #0421', -87.34, 'Food & Groceries', false, false),
  (v_user_id, v_usaa_checking, '2026-02-11', 'KROGER #0421', -124.56, 'Food & Groceries', false, false),
  (v_user_id, v_usaa_checking, '2026-02-19', 'ALDI', -64.20, 'Food & Groceries', false, false),

  -- Dining Out
  (v_user_id, v_usaa_checking, '2026-02-04', 'CHIPOTLE 1842', -14.75, 'Dining Out', false, false),
  (v_user_id, v_usaa_checking, '2026-02-09', 'STARBUCKS #4821', -7.45, 'Dining Out', false, false),
  (v_user_id, v_usaa_checking, '2026-02-14', 'ROOSTERS WINGS', -38.90, 'Dining Out', false, false),
  (v_user_id, v_usaa_checking, '2026-02-20', 'SKYLINE CHILI', -12.30, 'Dining Out', false, false),

  -- Subscriptions
  (v_user_id, v_usaa_checking, '2026-02-02', 'NETFLIX.COM', -17.99, 'Subscriptions', false, false),
  (v_user_id, v_usaa_checking, '2026-02-06', 'SPOTIFY USA', -11.99, 'Subscriptions', false, false),
  (v_user_id, v_usaa_checking, '2026-02-06', 'APPLE.COM/BILL', -14.99, 'Subscriptions', false, false),

  -- Debt Payments
  (v_user_id, v_usaa_checking, '2026-02-05', 'BNPL PAYMENT', -100.00, 'Debt Payments', false, false),
  (v_user_id, v_usaa_checking, '2026-02-05', 'KLARNA PAYMENT', -88.00, 'Debt Payments', false, false),

  -- Shopping
  (v_user_id, v_usaa_checking, '2026-02-13', 'AMAZON.COM', -43.97, 'Shopping', false, false),
  (v_user_id, v_usaa_checking, '2026-02-16', 'TARGET', -67.43, 'Shopping', false, false),

  -- Savings transfer
  (v_user_id, v_usaa_checking, '2026-02-22', 'TRANSFER TO ALLY SAVINGS', -300.00, 'Savings / Transfers', false, true);

END $$;
