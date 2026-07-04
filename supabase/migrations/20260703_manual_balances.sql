-- Add manual_paid to member_budgets
ALTER TABLE public.member_budgets
  ADD COLUMN IF NOT EXISTS manual_paid DECIMAL(12,2) DEFAULT NULL;
