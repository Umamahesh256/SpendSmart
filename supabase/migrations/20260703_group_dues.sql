-- 1. Create group_dues table
CREATE TABLE IF NOT EXISTS public.group_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  category_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  remaining_amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  due_date DATE,
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
ALTER TABLE public.group_dues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group dues" ON public.group_dues
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage group dues" ON public.group_dues
  FOR ALL USING (
    group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid())
  ) WITH CHECK (
    group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid())
  );


-- 2. Add group_due_id to group_expenses
ALTER TABLE public.group_expenses
  ADD COLUMN IF NOT EXISTS group_due_id UUID REFERENCES public.group_dues(id) ON DELETE SET NULL;


-- 3. Create Trigger Function for Automatic Due Reduction
CREATE OR REPLACE FUNCTION public.trg_update_due_balance()
RETURNS TRIGGER AS $$
DECLARE
  old_due_amount DECIMAL(12,2);
  new_due_amount DECIMAL(12,2);
BEGIN
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.group_due_id IS NOT NULL THEN
      UPDATE public.group_dues
      SET remaining_amount = remaining_amount + OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.group_due_id;
    END IF;
    RETURN OLD;
  END IF;

  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.group_due_id IS NOT NULL THEN
      UPDATE public.group_dues
      SET remaining_amount = remaining_amount - NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.group_due_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- If due ID changed
    IF OLD.group_due_id IS DISTINCT FROM NEW.group_due_id THEN
      IF OLD.group_due_id IS NOT NULL THEN
        UPDATE public.group_dues
        SET remaining_amount = remaining_amount + OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.group_due_id;
      END IF;
      IF NEW.group_due_id IS NOT NULL THEN
        UPDATE public.group_dues
        SET remaining_amount = remaining_amount - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.group_due_id;
      END IF;
    -- If due ID is same, but amount changed
    ELSIF OLD.group_due_id IS NOT NULL AND OLD.amount != NEW.amount THEN
      UPDATE public.group_dues
      SET remaining_amount = remaining_amount + OLD.amount - NEW.amount,
          updated_at = NOW()
      WHERE id = OLD.group_due_id;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger on group_expenses
DROP TRIGGER IF EXISTS trg_group_expenses_due_update ON public.group_expenses;
CREATE TRIGGER trg_group_expenses_due_update
AFTER INSERT OR UPDATE OR DELETE ON public.group_expenses
FOR EACH ROW EXECUTE FUNCTION public.trg_update_due_balance();

-- 5. Create Trigger to update status based on remaining_amount
CREATE OR REPLACE FUNCTION public.trg_update_due_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.remaining_amount <= 0 THEN
    NEW.status = 'Paid';
    NEW.remaining_amount = 0; -- cap it at 0 to avoid negative due balances if overpaid slightly
  ELSIF NEW.remaining_amount < NEW.amount THEN
    NEW.status = 'Partially Paid';
  ELSE
    NEW.status = 'Pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_group_dues_status_update ON public.group_dues;
CREATE TRIGGER trg_group_dues_status_update
BEFORE INSERT OR UPDATE OF remaining_amount, amount ON public.group_dues
FOR EACH ROW EXECUTE FUNCTION public.trg_update_due_status();
