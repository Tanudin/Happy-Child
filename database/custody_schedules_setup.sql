-- Create custody_schedules table for managing divorced parents' custody arrangements
CREATE TABLE IF NOT EXISTS public.custody_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    days_of_week INTEGER[] NOT NULL, -- Array of day numbers: [0,1,2] for Mon,Tue,Wed
    parent_name TEXT NOT NULL, -- "Mom", "Dad", or custom name
    parent_type TEXT NOT NULL CHECK (parent_type IN ('mom', 'dad')), -- Parent type
    color TEXT NOT NULL DEFAULT '#4285f4', -- Color for visual representation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add Row Level Security (RLS)
ALTER TABLE public.custody_schedules ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see their own child's custody schedules
CREATE POLICY "Users can view custody schedules for their children" ON public.custody_schedules
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to insert custody schedules for their children
CREATE POLICY "Users can insert custody schedules for their children" ON public.custody_schedules
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update custody schedules for their children
CREATE POLICY "Users can update custody schedules for their children" ON public.custody_schedules
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy for users to delete custody schedules for their children
CREATE POLICY "Users can delete custody schedules for their children" ON public.custody_schedules
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custody_schedules_child_id ON public.custody_schedules(child_id);
CREATE INDEX IF NOT EXISTS idx_custody_schedules_user_id ON public.custody_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_custody_schedules_parent_type ON public.custody_schedules(parent_type);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_custody_schedules_updated_at
    BEFORE UPDATE ON public.custody_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.custody_schedules IS 'Stores recurring custody schedules for divorced parents';
COMMENT ON COLUMN public.custody_schedules.days_of_week IS 'Array of day numbers where 0=Monday, 1=Tuesday, etc.';
COMMENT ON COLUMN public.custody_schedules.parent_name IS 'Display name for the parent (e.g., "Mom", "Dad", "Sarah", "John")';
COMMENT ON COLUMN public.custody_schedules.parent_type IS 'Type of parent for categorization (mom or dad)';
COMMENT ON COLUMN public.custody_schedules.color IS 'Hex color code for visual representation in calendar';
