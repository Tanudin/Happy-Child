-- Drop the existing table if it exists
DROP TABLE IF EXISTS public.custody_schedules CASCADE;

-- Create the custody_schedules table
CREATE TABLE public.custody_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    days_of_week INTEGER[] NOT NULL DEFAULT '{}',
    color TEXT NOT NULL DEFAULT '#FF6B6B',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, child_id)
);

-- Create index for faster queries
CREATE INDEX idx_custody_schedules_user_id ON public.custody_schedules(user_id);
CREATE INDEX idx_custody_schedules_child_id ON public.custody_schedules(child_id);

-- Enable Row Level Security
ALTER TABLE public.custody_schedules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view custody schedules for their children" ON public.custody_schedules;
DROP POLICY IF EXISTS "Users can insert their own custody schedules" ON public.custody_schedules;
DROP POLICY IF EXISTS "Users can update their own custody schedules" ON public.custody_schedules;
DROP POLICY IF EXISTS "Users can delete their own custody schedules" ON public.custody_schedules;
DROP POLICY IF EXISTS "Guardians can view custody schedules for shared children" ON public.custody_schedules;
DROP POLICY IF EXISTS "Guardians can insert custody schedules for shared children" ON public.custody_schedules;
DROP POLICY IF EXISTS "Guardians can update custody schedules for shared children" ON public.custody_schedules;
DROP POLICY IF EXISTS "Guardians can delete custody schedules for shared children" ON public.custody_schedules;

-- RLS Policy: Guardians can view ALL custody schedules for children they have access to
CREATE POLICY "Guardians can view custody schedules for shared children"
ON public.custody_schedules
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_children
        WHERE user_children.child_id = custody_schedules.child_id
        AND user_children.user_id = auth.uid()
    )
);

-- RLS Policy: Guardians can insert custody schedules for ANY guardian of their shared children
CREATE POLICY "Guardians can insert custody schedules for shared children"
ON public.custody_schedules
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_children
        WHERE user_children.child_id = custody_schedules.child_id
        AND user_children.user_id = auth.uid()
    )
    AND EXISTS (
        SELECT 1 FROM public.user_children
        WHERE user_children.child_id = custody_schedules.child_id
        AND user_children.user_id = custody_schedules.user_id
    )
);

-- RLS Policy: Guardians can update ANY custody schedule for their shared children
CREATE POLICY "Guardians can update custody schedules for shared children"
ON public.custody_schedules
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.user_children
        WHERE user_children.child_id = custody_schedules.child_id
        AND user_children.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_children
        WHERE user_children.child_id = custody_schedules.child_id
        AND user_children.user_id = auth.uid()
    )
);

-- RLS Policy: Guardians can delete ANY custody schedule for their shared children
CREATE POLICY "Guardians can delete custody schedules for shared children"
ON public.custody_schedules
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.user_children
        WHERE user_children.child_id = custody_schedules.child_id
        AND user_children.user_id = auth.uid()
    )
);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_custody_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_custody_schedules_updated_at
    BEFORE UPDATE ON public.custody_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_custody_schedules_updated_at();

-- Grant permissions
GRANT ALL ON public.custody_schedules TO authenticated;
GRANT ALL ON public.custody_schedules TO service_role;
