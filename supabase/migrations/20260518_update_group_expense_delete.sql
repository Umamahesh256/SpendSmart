-- Migration: Fix Group Expense Delete Policy
-- Description: Drop old delete policy that only allowed creators to delete, and replace it with a policy allowing either the expense owner (added_by) or the group creator (manager) to delete.

-- 1. Drop existing policy
DROP POLICY IF EXISTS "Only group creators can delete group expenses" ON public.group_expenses;

-- 2. Create new policy
CREATE POLICY "Creators or owners can delete group expenses" ON public.group_expenses
FOR DELETE USING (
    added_by = auth.uid() OR
    group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid())
);
