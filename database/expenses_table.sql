-- SQL script to create the expenses table for the Happy Child app

-- Create 'expenses' table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  payer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE expenses IS 'Table to store expense records for children';
COMMENT ON COLUMN expenses.child_id IS 'Foreign key referencing the child from the children table';
COMMENT ON COLUMN expenses.user_id IS 'Foreign key referencing the user (parent) from auth.users';
COMMENT ON COLUMN expenses.description IS 'Description of what the expense was for';
COMMENT ON COLUMN expenses.amount IS 'Amount of the expense in decimal format';
COMMENT ON COLUMN expenses.date IS 'Date when the expense occurred';
COMMENT ON COLUMN expenses.payer IS 'Who paid for the expense (Mom, Dad, Child, etc.)';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_child_id ON expenses(child_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- Enable Row Level Security (RLS)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see expenses for children they have access to
CREATE POLICY "Users can view expenses for their children" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_children uc 
      WHERE uc.user_id = auth.uid() 
      AND uc.child_id = expenses.child_id
    )
  );

-- Users can only insert expenses for children they have access to
CREATE POLICY "Users can create expenses for their children" ON expenses
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM user_children uc 
      WHERE uc.user_id = auth.uid() 
      AND uc.child_id = expenses.child_id
    )
  );

-- Users can only update expenses they created for children they have access to
CREATE POLICY "Users can update their own expenses for their children" ON expenses
  FOR UPDATE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM user_children uc 
      WHERE uc.user_id = auth.uid() 
      AND uc.child_id = expenses.child_id
    )
  );

-- Users can only delete expenses they created for children they have access to
CREATE POLICY "Users can delete their own expenses for their children" ON expenses
  FOR DELETE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM user_children uc 
      WHERE uc.user_id = auth.uid() 
      AND uc.child_id = expenses.child_id
    )
  );

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
