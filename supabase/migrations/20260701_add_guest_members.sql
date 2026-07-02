-- Migration: Universal Participant Model for Guest Members
-- Description: Supports guests in groups and shifts expenses/contributions to reference member_id

-- 1. Modify group_members to support guests
ALTER TABLE public.group_members ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.group_members 
ADD COLUMN guest_name VARCHAR(255),
ADD COLUMN guest_phone VARCHAR(20),
ADD COLUMN is_guest BOOLEAN DEFAULT false,
ADD COLUMN role VARCHAR(50) DEFAULT 'member';

-- Ensure a member is either a registered user or a valid guest
ALTER TABLE public.group_members
ADD CONSTRAINT check_guest_or_user 
CHECK (
  (is_guest = false AND user_id IS NOT NULL) OR 
  (is_guest = true AND guest_name IS NOT NULL AND guest_phone IS NOT NULL)
);

-- Ensure guests are unique by phone per group
CREATE UNIQUE INDEX unique_guest_phone_per_group ON public.group_members (group_id, guest_phone) WHERE is_guest = true;

-- 2. Modify group_contributions (Universal Participant Model)
ALTER TABLE public.group_contributions ADD COLUMN member_id UUID REFERENCES public.group_members(id) ON DELETE CASCADE;

-- Data Migration: Link existing contributions to their respective group_member row
UPDATE public.group_contributions gc
SET member_id = gm.id
FROM public.group_members gm
WHERE gc.user_id = gm.user_id AND gc.group_id = gm.group_id;

-- Ensure all rows got a member_id before enforcing NOT NULL (delete orphaned if any)
DELETE FROM public.group_contributions WHERE member_id IS NULL;

ALTER TABLE public.group_contributions ALTER COLUMN member_id SET NOT NULL;
ALTER TABLE public.group_contributions DROP COLUMN user_id;

-- 3. Modify group_expenses (Universal Participant Model)
ALTER TABLE public.group_expenses ADD COLUMN paid_by_member_id UUID REFERENCES public.group_members(id) ON DELETE CASCADE;

-- 5. Allow members to insert guests
CREATE POLICY "Members can add guests" ON public.group_members FOR INSERT WITH CHECK (
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()) 
  AND is_guest = true
);

-- Data migration: 'added_by' was essentially the payer. Let's map it.
UPDATE public.group_expenses ge
SET paid_by_member_id = gm.id
FROM public.group_members gm
WHERE ge.added_by = gm.user_id AND ge.group_id = gm.group_id;

-- Ensure all rows got a paid_by_member_id before enforcing NOT NULL (delete orphaned if any)
DELETE FROM public.group_expenses WHERE paid_by_member_id IS NULL;

ALTER TABLE public.group_expenses ALTER COLUMN paid_by_member_id SET NOT NULL;

-- Keep a record of the actual authenticated user who *recorded* the expense in the system (for auditing/RLS),
-- but rename it to `recorded_by` to avoid confusion.
ALTER TABLE public.group_expenses RENAME COLUMN added_by TO recorded_by;

-- 4. Update RLS Policies for group_expenses
DROP POLICY IF EXISTS "Members can insert group expenses" ON public.group_expenses;
CREATE POLICY "Members can insert group expenses" ON public.group_expenses FOR INSERT WITH CHECK (
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()) AND recorded_by = auth.uid()
);

DROP POLICY IF EXISTS "Users can update own group expenses" ON public.group_expenses;
CREATE POLICY "Users can update own group expenses" ON public.group_expenses FOR UPDATE USING (recorded_by = auth.uid());
