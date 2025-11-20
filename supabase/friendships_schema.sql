-- ============================================
-- FRIENDSHIPS DATABASE SCHEMA
-- ============================================
-- This creates a simple friendships system
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Drop old tables if they exist (CAREFUL - this deletes data!)
-- ============================================
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

-- 2. Create or update friendships table
-- ============================================
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate friendships
  CONSTRAINT unique_friendship UNIQUE(user_id, friend_id),
  -- Prevent self-friendships
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id)
);

-- 3. Create indexes for better performance
-- ============================================
CREATE INDEX IF NOT EXISTS friendships_user_id_idx ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS friendships_friend_id_idx ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS friendships_status_idx ON public.friendships(status);

-- 4. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies
-- ============================================
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can insert friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can update their own friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can delete their own friendships" ON public.friendships;

-- 6. Create RLS Policies
-- ============================================

-- Users can view friendships where they are involved
CREATE POLICY "Users can view their own friendships"
  ON public.friendships
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

-- Users can create friendships (send friend requests)
CREATE POLICY "Users can insert friendships"
  ON public.friendships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update friendships where they are the friend (to accept/deny requests)
CREATE POLICY "Users can update their own friendships"
  ON public.friendships
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = friend_id)
  WITH CHECK (auth.uid() = friend_id);

-- Users can delete their own friendships
CREATE POLICY "Users can delete their own friendships"
  ON public.friendships
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

-- 7. Create function to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_friendship_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger for updated_at
-- ============================================
DROP TRIGGER IF EXISTS set_friendship_updated_at ON public.friendships;
CREATE TRIGGER set_friendship_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_friendship_updated_at();

-- ============================================
-- HELPER QUERIES
-- ============================================

-- View all friendships
SELECT 
  f.id,
  f.status,
  up1.email as user_email,
  up1.display_name as user_name,
  up2.email as friend_email,
  up2.display_name as friend_name,
  f.created_at
FROM friendships f
JOIN user_profiles up1 ON f.user_id = up1.user_id
JOIN user_profiles up2 ON f.friend_id = up2.user_id
ORDER BY f.created_at DESC;

-- Count friendships by status
SELECT status, COUNT(*) 
FROM friendships 
GROUP BY status;
