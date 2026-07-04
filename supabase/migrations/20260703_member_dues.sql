-- 1. Create member_dues table
CREATE TABLE IF NOT EXISTS public.member_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.group_members(id) ON DELETE CASCADE NOT NULL,
  category_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  remaining_amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partially Paid', 'Paid')),
  type TEXT NOT NULL DEFAULT 'One-Time' CHECK (type IN ('One-Time', 'Recurring')),
  priority TEXT DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Critical')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.member_dues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view member dues" ON public.member_dues
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage member dues" ON public.member_dues
  FOR ALL USING (
    group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid())
  ) WITH CHECK (
    group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid())
  );

-- 2. Add member_due_id to group_contributions
ALTER TABLE public.group_contributions
  ADD COLUMN IF NOT EXISTS member_due_id UUID REFERENCES public.member_dues(id) ON DELETE SET NULL;


-- 3. Create Trigger Function for Automatic Member Due Reduction
CREATE OR REPLACE FUNCTION public.trg_update_member_due_balance()
RETURNS TRIGGER AS $$
DECLARE
  old_due_amount DECIMAL(12,2);
  new_due_amount DECIMAL(12,2);
BEGIN
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.member_due_id IS NOT NULL THEN
      -- Re-add the deleted contribution amount back to the due
      UPDATE public.member_dues
      SET remaining_amount = remaining_amount + OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.member_due_id;
    END IF;
    RETURN OLD;
  END IF;

  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.member_due_id IS NOT NULL THEN
      -- Subtract the new contribution amount from the due
      UPDATE public.member_dues
      SET remaining_amount = GREATEST(0, remaining_amount - NEW.amount),
          updated_at = NOW()
      WHERE id = NEW.member_due_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- If the due ID changed
    IF OLD.member_due_id IS DISTINCT FROM NEW.member_due_id THEN
      -- Re-add to old due
      IF OLD.member_due_id IS NOT NULL THEN
        UPDATE public.member_dues
        SET remaining_amount = remaining_amount + OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.member_due_id;
      END IF;
      -- Subtract from new due
      IF NEW.member_due_id IS NOT NULL THEN
        UPDATE public.member_dues
        SET remaining_amount = GREATEST(0, remaining_amount - NEW.amount),
            updated_at = NOW()
        WHERE id = NEW.member_due_id;
      END IF;
    -- If the amount changed but due ID is the same
    ELSIF NEW.member_due_id IS NOT NULL AND OLD.amount != NEW.amount THEN
      UPDATE public.member_dues
      SET remaining_amount = GREATEST(0, remaining_amount + OLD.amount - NEW.amount),
          updated_at = NOW()
      WHERE id = NEW.member_due_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach Trigger to group_contributions
DROP TRIGGER IF EXISTS trg_update_member_due_balance ON public.group_contributions;
CREATE TRIGGER trg_update_member_due_balance
AFTER INSERT OR UPDATE OR DELETE ON public.group_contributions
FOR EACH ROW
EXECUTE FUNCTION public.trg_update_member_due_balance();


-- 5. Trigger Function for Member Due Status Update based on remaining_amount
CREATE OR REPLACE FUNCTION public.trg_update_member_due_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.remaining_amount <= 0 THEN
    NEW.status = 'Paid';
    NEW.remaining_amount = 0; -- Prevent negative
  ELSIF NEW.remaining_amount < NEW.amount THEN
    NEW.status = 'Partially Paid';
  ELSE
    NEW.status = 'Pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Attach Trigger to member_dues
DROP TRIGGER IF EXISTS trg_update_member_due_status ON public.member_dues;
CREATE TRIGGER trg_update_member_due_status
BEFORE INSERT OR UPDATE OF remaining_amount, amount ON public.member_dues
FOR EACH ROW
EXECUTE FUNCTION public.trg_update_member_due_status();
