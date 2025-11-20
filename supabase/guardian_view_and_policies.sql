-- Create a view to get guardian information for children
-- This allows guardians to see other guardians' names for shared children
CREATE OR REPLACE VIEW public.child_guardians AS
SELECT 
    uc.child_id,
    uc.user_id,
    COALESCE(
        up.first_name || ' ' || up.last_name,
        up.display_name,
        up.email,
        'Guardian'
    ) as guardian_name,
    uc.created_at
FROM public.user_children uc
LEFT JOIN public.user_profiles up ON uc.user_id = up.user_id;

-- Grant access to the view
GRANT SELECT ON public.child_guardians TO authenticated;

-- Enable RLS on the view
ALTER VIEW public.child_guardians SET (security_invoker = true);

-- Update custody_schedules RLS policies to allow all guardians to manage schedules

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view custody schedules for their children" ON public.custody_schedules;
DROP POLICY IF EXISTS "Users can insert their own custody schedules" ON public.custody_schedules;
DROP POLICY IF EXISTS "Users can update their own custody schedules" ON public.custody_schedules;
DROP POLICY IF EXISTS "Users can delete their own custody schedules" ON public.custody_schedules;

-- New Policy: Guardians can view ALL custody schedules for children they share
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

-- New Policy: Guardians can insert custody schedules for ANY guardian of their shared children
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

-- New Policy: Guardians can update ANY custody schedule for their shared children
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

-- New Policy: Guardians can delete ANY custody schedule for their shared children
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

-- Create an index on the view for better performance
CREATE INDEX IF NOT EXISTS idx_user_children_child_id ON public.user_children(child_id);
CREATE INDEX IF NOT EXISTS idx_user_children_user_id ON public.user_children(user_id);
