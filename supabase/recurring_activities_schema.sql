-- Recurring Activities Schema
-- Table to store weekly recurring activities/events for children

CREATE TABLE IF NOT EXISTS public.recurring_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  activity_type TEXT, -- e.g., 'sports', 'music', 'tutoring', 'hobby', etc.
  location TEXT,
  notes TEXT,
  color TEXT DEFAULT '#007AFF', -- Color for visual distinction
  
  -- Days of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  -- Store as array of integers
  days_of_week INTEGER[] NOT NULL, -- e.g., {1, 3, 5} for Mon, Wed, Fri
  
  -- Time information
  start_time TIME NOT NULL, -- e.g., '15:00:00' for 3:00 PM
  end_time TIME NOT NULL,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true, -- Can temporarily disable without deleting
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recurring_activities_child_id ON public.recurring_activities(child_id);
CREATE INDEX IF NOT EXISTS idx_recurring_activities_user_id ON public.recurring_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_activities_active ON public.recurring_activities(is_active);

-- RLS Policies
ALTER TABLE public.recurring_activities ENABLE ROW LEVEL SECURITY;

-- Users can view recurring activities for children they have access to
CREATE POLICY "Users can view recurring activities for their children"
  ON public.recurring_activities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_children
      WHERE user_children.child_id = recurring_activities.child_id
      AND user_children.user_id = auth.uid()
    )
  );

-- Users can insert recurring activities for children they have access to
CREATE POLICY "Users can insert recurring activities for their children"
  ON public.recurring_activities
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_children
      WHERE user_children.child_id = recurring_activities.child_id
      AND user_children.user_id = auth.uid()
    )
  );

-- Users can update recurring activities for children they have access to
CREATE POLICY "Users can update recurring activities for their children"
  ON public.recurring_activities
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_children
      WHERE user_children.child_id = recurring_activities.child_id
      AND user_children.user_id = auth.uid()
    )
  );

-- Users can delete recurring activities for children they have access to
CREATE POLICY "Users can delete recurring activities for their children"
  ON public.recurring_activities
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_children
      WHERE user_children.child_id = recurring_activities.child_id
      AND user_children.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recurring_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recurring_activities_updated_at
  BEFORE UPDATE ON public.recurring_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_activities_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.recurring_activities IS 'Stores weekly recurring activities/events for children';
COMMENT ON COLUMN public.recurring_activities.days_of_week IS 'Array of day numbers: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';
COMMENT ON COLUMN public.recurring_activities.start_time IS 'Start time of the activity (time without date)';
COMMENT ON COLUMN public.recurring_activities.end_time IS 'End time of the activity (time without date)';
COMMENT ON COLUMN public.recurring_activities.is_active IS 'Whether the recurring activity is currently active';
