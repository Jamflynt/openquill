export type SubscriptionTier = 'free' | 'pro'
export type AccountType = 'checking' | 'savings' | 'credit' | 'investment'
export type SubscriptionPlan = 'pro_monthly' | 'pro_annual' | 'lifetime'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due'

export type TransactionCategory =
  | 'Housing'
  | 'Utilities'
  | 'Food & Groceries'
  | 'Dining Out'
  | 'Transportation'
  | 'Subscriptions'
  | 'Shopping'
  | 'Health'
  | 'Entertainment'
  | 'Debt Payments'
  | 'Savings / Transfers'
  | 'Income'
  | 'Other'

export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  'Housing',
  'Utilities',
  'Food & Groceries',
  'Dining Out',
  'Transportation',
  'Subscriptions',
  'Shopping',
  'Health',
  'Entertainment',
  'Debt Payments',
  'Savings / Transfers',
  'Income',
  'Other',
]

export interface User {
  id: string
  email: string
  name: string | null
  created_at: string
  subscription_tier: SubscriptionTier
  stripe_customer_id: string | null
  income_biweekly: number | null
  income_monthly: number | null
}

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  institution: string | null
  balance: number
  apr: number | null
  credit_limit: number | null
  pay_in_full: boolean
  goal_balance: number | null
  updated_at: string
}

export interface Statement {
  id: string
  user_id: string
  account_id: string
  period_start: string | null
  period_end: string | null
  beginning_balance: number | null
  ending_balance: number | null
  pdf_path: string | null
  parsed_at: string | null
  created_at: string
}

export interface Transaction {
  id: string
  statement_id: string | null
  user_id: string
  account_id: string
  date: string
  description: string
  amount: number
  category: string
  is_income: boolean
  is_transfer: boolean
  merchant: string | null
  user_notes: string | null
  created_at: string
}

export interface Debt {
  id: string
  user_id: string
  name: string
  balance: number
  apr: number
  min_payment: number
  due_date: string | null
  pay_in_full: boolean
  ends_in_months: number | null
  is_active: boolean
  updated_at: string
}

export interface FixedObligation {
  id: string
  user_id: string
  name: string
  amount: number
  variable: boolean
  notes: string | null
  active_from: string | null
  active_until: string | null
}

export interface SavingsGoal {
  id: string
  user_id: string
  account_id: string | null
  name: string
  goal_amount: number
  current_amount: number
  target_date: string | null
  priority: number
}

export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  current_period_end: string | null
  created_at: string
}

// Parsed transaction from Claude API (pre-commit)
export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  suggestedCategory: TransactionCategory
  isIncome: boolean
  isTransfer: boolean
}

// Database generic type for Supabase client
export type Database = {
  public: {
    Tables: {
      users: { Row: User; Insert: Partial<User>; Update: Partial<User> }
      accounts: { Row: Account; Insert: Omit<Account, 'id' | 'updated_at'>; Update: Partial<Account> }
      statements: { Row: Statement; Insert: Omit<Statement, 'id' | 'created_at'>; Update: Partial<Statement> }
      transactions: { Row: Transaction; Insert: Omit<Transaction, 'id' | 'created_at'>; Update: Partial<Transaction> }
      debts: { Row: Debt; Insert: Omit<Debt, 'id' | 'updated_at'>; Update: Partial<Debt> }
      fixed_obligations: { Row: FixedObligation; Insert: Omit<FixedObligation, 'id'>; Update: Partial<FixedObligation> }
      savings_goals: { Row: SavingsGoal; Insert: Omit<SavingsGoal, 'id'>; Update: Partial<SavingsGoal> }
      subscriptions: { Row: Subscription; Insert: Omit<Subscription, 'id' | 'created_at'>; Update: Partial<Subscription> }
    }
  }
}
