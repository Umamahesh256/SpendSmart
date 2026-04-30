-- Drop existing objects
DROP TABLE IF EXISTS group_expenses CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS invites CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS invite_status CASCADE;

-- 1. profiles
CREATE TYPE user_role AS ENUM ('admin', 'member');
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. groups
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. group_members
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 4. transactions
CREATE TYPE transaction_type AS ENUM ('income', 'expense');
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL,
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. group_expenses
CREATE TABLE group_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  UNIQUE(user_id, name)
);

-- 7. budgets
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  monthly_limit DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- 8. invites
CREATE TYPE invite_status AS ENUM ('pending', 'accepted');
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  token UUID DEFAULT gen_random_uuid(),
  status invite_status DEFAULT 'pending',
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles
CREATE POLICY "Users can CRUD own profile" ON profiles USING (id = auth.uid());

-- Categories
CREATE POLICY "Users can CRUD own categories" ON categories USING (user_id = auth.uid());

-- Budgets
CREATE POLICY "Users can CRUD own budgets" ON budgets USING (user_id = auth.uid());

-- Transactions
CREATE POLICY "Users can CRUD own transactions" ON transactions USING (user_id = auth.uid());

-- Groups
CREATE POLICY "Users can view relevant groups" ON groups FOR SELECT USING (
  created_by = auth.uid() OR id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create groups" ON groups FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Group creators can update their groups" ON groups FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Group creators can delete their groups" ON groups FOR DELETE USING (created_by = auth.uid());

-- Group Members
CREATE POLICY "Members can view other members" ON group_members FOR SELECT USING (
  group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()) OR user_id = auth.uid()
);
CREATE POLICY "Group creators can manage members" ON group_members USING (
  group_id IN (SELECT id FROM groups WHERE created_by = auth.uid())
);
CREATE POLICY "Users can insert themselves" ON group_members FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- Group Expenses
CREATE POLICY "Members can read group expenses" ON group_expenses FOR SELECT USING (
  group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);
CREATE POLICY "Members can insert group expenses" ON group_expenses FOR INSERT WITH CHECK (
  group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()) AND added_by = auth.uid()
);
CREATE POLICY "Users can update own group expenses" ON group_expenses FOR UPDATE USING (added_by = auth.uid());
CREATE POLICY "Only group creators can delete group expenses" ON group_expenses FOR DELETE USING (
  group_id IN (SELECT id FROM groups WHERE created_by = auth.uid())
);

-- Invites
CREATE POLICY "Group creators can manage invites" ON invites USING (
  group_id IN (SELECT id FROM groups WHERE created_by = auth.uid())
);
CREATE POLICY "Users can read own invites by email" ON invites FOR SELECT USING (
  email = (auth.jwt() ->> 'email')
);
CREATE POLICY "Users can update own invites" ON invites FOR UPDATE USING (
  email = (auth.jwt() ->> 'email')
);
