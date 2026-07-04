-- Enable Realtime for tables safely
DO $$
DECLARE
    tbl text;
    tables_to_add text[] := ARRAY['transactions', 'groups', 'group_members', 'group_expenses', 'group_contributions', 'group_budgets'];
BEGIN
    FOREACH tbl IN ARRAY tables_to_add
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
        END IF;
    END LOOP;
END
$$;

-- Create budget_carry_forwards table
CREATE TABLE IF NOT EXISTS budget_carry_forwards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  member_id UUID REFERENCES group_members(id) ON DELETE CASCADE,
  
  from_month INTEGER NOT NULL,
  from_year INTEGER NOT NULL,
  
  to_month INTEGER NOT NULL,
  to_year INTEGER NOT NULL,
  
  original_amount NUMERIC NOT NULL,
  used_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC NOT NULL,
  
  status TEXT DEFAULT 'active',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE budget_carry_forwards ENABLE ROW LEVEL SECURITY;

-- Policies for budget_carry_forwards
CREATE POLICY "Users can view carry forwards of their groups"
  ON budget_carry_forwards FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can manage carry forwards"
  ON budget_carry_forwards FOR ALL
  USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
