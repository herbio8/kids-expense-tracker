-- Clean up existing tables and types if they exist
DROP TABLE IF EXISTS expense_to_expense_report CASCADE;
DROP TABLE IF EXISTS expense_report CASCADE;
DROP TABLE IF EXISTS expense CASCADE;
DROP TABLE IF EXISTS parent_child CASCADE;
DROP TABLE IF EXISTS child CASCADE;
DROP TABLE IF EXISTS parent CASCADE;
DROP TYPE IF EXISTS expense_category CASCADE;

-- 1. Create Enum type for Expense Category
CREATE TYPE expense_category AS ENUM ('education', 'aftercare');

-- 2. Create Parent table
CREATE TABLE parent (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL
);

-- 3. Create Child table
CREATE TABLE child (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL
);

-- 4. Create Junction table for Parent <-> Child (Many-to-Many)
CREATE TABLE parent_child (
  parent_id UUID REFERENCES parent(id) ON DELETE CASCADE,
  child_id UUID REFERENCES child(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, child_id)
);

-- 5. Create Expense table (with Enum category)
CREATE TABLE expense (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT,
  category expense_category NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  invoice_url TEXT,
  receipt_url TEXT,
  proof_of_payment_url TEXT,
  reimbursement_requested BOOLEAN NOT NULL DEFAULT false,
  reimbursement_granted BOOLEAN NOT NULL DEFAULT false
);

-- 6. Create Expense Report table
CREATE TABLE expense_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL, -- e.g., "August 2026 Reimbursements"
  status TEXT NOT NULL DEFAULT 'draft' -- e.g., draft, submitted, paid
);

-- 7. Create Junction table for Report <-> Expense (Many-to-Many / One-to-Many mapping)
CREATE TABLE expense_to_expense_report (
  report_id UUID REFERENCES expense_report(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES expense(id) ON DELETE CASCADE,
  PRIMARY KEY (report_id, expense_id)
);

-- ==========================================
-- ENABLE RLS
-- ==========================================
ALTER TABLE parent ENABLE ROW LEVEL SECURITY;
ALTER TABLE child ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_child ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_report ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_to_expense_report ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- 1. PARENT POLICIES
CREATE POLICY "Users can manage their own parent profile" 
ON parent FOR ALL TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- 2. PARENT_CHILD POLICIES
CREATE POLICY "Users can manage their own parent_child links" 
ON parent_child FOR ALL TO authenticated 
USING (parent_id = auth.uid()) 
WITH CHECK (parent_id = auth.uid());

-- 3. CHILD POLICIES
CREATE POLICY "Users can manage their own children" 
ON child FOR ALL TO authenticated 
USING (
  id IN (
    SELECT child_id FROM parent_child WHERE parent_id = auth.uid()
  )
)
WITH CHECK (true);

-- 4. EXPENSE POLICIES
CREATE POLICY "Users can manage expenses for their children" 
ON expense FOR ALL TO authenticated 
USING (
  child_id IN (
    SELECT child_id FROM parent_child WHERE parent_id = auth.uid()
  )
)
WITH CHECK (
  child_id IN (
    SELECT child_id FROM parent_child WHERE parent_id = auth.uid()
  )
);

-- 5. EXPENSE REPORT POLICIES
CREATE POLICY "Users can manage their own expense reports"
ON expense_report FOR ALL TO authenticated
USING (parent_id = auth.uid())
WITH CHECK (parent_id = auth.uid());

-- 6. EXPENSE_TO_EXPENSE_REPORT POLICIES (Mapping table)
-- User can only link expenses to a report if they own the report.
CREATE POLICY "Users can manage links for their own reports"
ON expense_to_expense_report FOR ALL TO authenticated
USING (
  report_id IN (
    SELECT id FROM expense_report WHERE parent_id = auth.uid()
  )
)
WITH CHECK (
  report_id IN (
    SELECT id FROM expense_report WHERE parent_id = auth.uid()
  )
);