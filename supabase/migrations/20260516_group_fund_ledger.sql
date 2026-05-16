-- Migration: Centralized Group Fund Ledger
-- Description: Adds group_contributions table and updates group_expenses for pool tracking.

-- 1. Create group_contributions table
CREATE TABLE IF NOT EXISTS public.group_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add payment_source to group_expenses
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='group_expenses' AND column_name='payment_source') THEN
        ALTER TABLE public.group_expenses ADD COLUMN payment_source TEXT DEFAULT 'personal_pocket' NOT NULL;
    END IF;
END $$;

-- 3. Enable RLS on group_contributions
ALTER TABLE public.group_contributions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for group_contributions

-- Members can view contributions
CREATE POLICY "Members can view group contributions" ON public.group_contributions
FOR SELECT USING (
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);

-- Only group managers (creators) can manage contributions
CREATE POLICY "Managers can manage group contributions" ON public.group_contributions
FOR ALL USING (
    group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid())
) WITH CHECK (
    group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid())
);

-- 5. Update RLS Policies for group_expenses (if needed)
-- Existing policy already allows members to insert. We just need to ensure they can set payment_source.
-- The existing policy is:
-- CREATE POLICY "Members can insert group expenses" ON group_expenses FOR INSERT WITH CHECK (
--   group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()) AND added_by = auth.uid()
-- );
-- This is sufficient as it doesn't restrict columns.
