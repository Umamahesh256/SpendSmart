-- Migration: Group Budgets & Member Budgets
-- Description: Adds monthly group budgets and per-member contribution targets

-- 1. group_budgets: Monthly budget for the entire group
CREATE TABLE IF NOT EXISTS public.group_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  budget_amount DECIMAL(12,2) NOT NULL CHECK (budget_amount > 0),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, month, year)
);

-- 2. member_budgets: Per-member contribution targets for a given group budget
CREATE TABLE IF NOT EXISTS public.member_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_budget_id UUID REFERENCES public.group_budgets(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.group_members(id) ON DELETE CASCADE NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL CHECK (target_amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_budget_id, member_id)
);

-- 3. Enable RLS
ALTER TABLE public.group_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_budgets ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for group_budgets
-- Members can view
CREATE POLICY "Members can view group budgets" ON public.group_budgets
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

-- Only group owner/admin can manage
CREATE POLICY "Admins can manage group budgets" ON public.group_budgets
  FOR ALL USING (
    group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid())
  ) WITH CHECK (
    group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid())
  );

-- 5. RLS Policies for member_budgets
-- Members can view
CREATE POLICY "Members can view member budgets" ON public.member_budgets
  FOR SELECT USING (
    group_budget_id IN (
      SELECT gb.id FROM public.group_budgets gb
      JOIN public.group_members gm ON gb.group_id = gm.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

-- Only group owner/admin can manage
CREATE POLICY "Admins can manage member budgets" ON public.member_budgets
  FOR ALL USING (
    group_budget_id IN (
      SELECT gb.id FROM public.group_budgets gb
      JOIN public.groups g ON gb.group_id = g.id
      WHERE g.created_by = auth.uid()
    )
  ) WITH CHECK (
    group_budget_id IN (
      SELECT gb.id FROM public.group_budgets gb
      JOIN public.groups g ON gb.group_id = g.id
      WHERE g.created_by = auth.uid()
    )
  );
