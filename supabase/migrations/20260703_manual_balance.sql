-- Migration: Manual Group Balance
-- Description: Adds a manual balance field to the groups table for manual tracking

ALTER TABLE public.groups
ADD COLUMN manual_balance DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN manual_balance_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create a policy to allow managers (creators) to update the manual balance
-- Note: 'Users can update own groups' policy might already exist, but let's ensure it's there
DROP POLICY IF EXISTS "Users can update own groups" ON public.groups;
CREATE POLICY "Users can update own groups" ON public.groups
FOR UPDATE USING (created_by = auth.uid());
