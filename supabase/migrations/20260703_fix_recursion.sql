-- Migration: Fix Infinite Recursion in RLS Policies
-- Description: Replaces self-referencing subqueries with a SECURITY DEFINER function to avoid infinite recursion loops in Postgres RLS.

-- 1. Create a function that runs with bypass RLS (SECURITY DEFINER)
-- This allows us to check membership without triggering the RLS policies recursively.
CREATE OR REPLACE FUNCTION public.is_group_member(check_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = check_group_id AND user_id = auth.uid()
  );
$$;

-- 2. Drop the recursive policy created in the Guest Members migration
DROP POLICY IF EXISTS "Members can add guests" ON public.group_members;

-- 3. Recreate it using the non-recursive function
CREATE POLICY "Members can add guests" ON public.group_members FOR INSERT WITH CHECK (
  public.is_group_member(group_id) AND is_guest = true
);

-- 4. Update group_expenses policy to use the same non-recursive function
DROP POLICY IF EXISTS "Members can insert group expenses" ON public.group_expenses;
CREATE POLICY "Members can insert group expenses" ON public.group_expenses FOR INSERT WITH CHECK (
  public.is_group_member(group_id) AND recorded_by = auth.uid()
);

-- 5. IMPORTANT: Overwrite the original SELECT policy if it also caused recursion
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;
CREATE POLICY "Users can view members of their groups" ON public.group_members FOR SELECT USING (
  public.is_group_member(group_id)
);
