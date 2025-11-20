-- Expenses table schema and policies

-- Create the expenses table (if not exists)
CREATE TABLE IF NOT EXISTS expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description text NOT NULL,
    amount numeric NOT NULL,
    date date NOT NULL,
    payer text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view expenses for their children" ON expenses;
DROP POLICY IF EXISTS "Users can insert expenses for their children" ON expenses;
DROP POLICY IF EXISTS "Users can update expenses for their children" ON expenses;
DROP POLICY IF EXISTS "Users can delete expenses for their children" ON expenses;

-- Policy: Users can view expenses for children they have access to
CREATE POLICY "Users can view expenses for their children"
ON expenses FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_children
        WHERE user_children.child_id = expenses.child_id
        AND user_children.user_id = auth.uid()
    )
);

-- Policy: Users can insert expenses for children they have access to
CREATE POLICY "Users can insert expenses for their children"
ON expenses FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_children
        WHERE user_children.child_id = expenses.child_id
        AND user_children.user_id = auth.uid()
    )
);

-- Policy: Users can update expenses for children they have access to
CREATE POLICY "Users can update expenses for their children"
ON expenses FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_children
        WHERE user_children.child_id = expenses.child_id
        AND user_children.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_children
        WHERE user_children.child_id = expenses.child_id
        AND user_children.user_id = auth.uid()
    )
);

-- Policy: Users can delete expenses for children they have access to
CREATE POLICY "Users can delete expenses for their children"
ON expenses FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM user_children
        WHERE user_children.child_id = expenses.child_id
        AND user_children.user_id = auth.uid()
    )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS expenses_child_id_idx ON expenses(child_id);
CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON expenses(user_id);
CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses(date);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_expenses_updated_at();
