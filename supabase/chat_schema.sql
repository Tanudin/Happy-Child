-- ============================================
-- CHAT MESSAGES DATABASE SCHEMA
-- ============================================
-- This creates a simple real-time chat system for friends
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create messages table
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent empty messages
  CONSTRAINT non_empty_message CHECK (LENGTH(TRIM(content)) > 0),
  -- Prevent self-messages
  CONSTRAINT no_self_message CHECK (sender_id != receiver_id)
);

-- 2. Create indexes for better performance
-- ============================================
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages(sender_id, receiver_id, created_at DESC);

-- 3. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist
-- ============================================
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages to friends" ON public.messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own sent messages" ON public.messages;

-- 5. Create RLS Policies
-- ============================================

-- Users can view messages they sent or received
CREATE POLICY "Users can view their messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id
  );

-- Users can only send messages to their friends
CREATE POLICY "Users can insert messages to friends"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    -- Check if users are friends (accepted friendship exists)
    EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
      AND (
        (user_id = auth.uid() AND friend_id = receiver_id) OR
        (user_id = receiver_id AND friend_id = auth.uid())
      )
    )
  );

-- Users can update (mark as read) messages they received
CREATE POLICY "Users can update their received messages"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Users can delete messages they sent
CREATE POLICY "Users can delete their own sent messages"
  ON public.messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- 6. Create function to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger for updated_at
-- ============================================
DROP TRIGGER IF EXISTS set_message_updated_at ON public.messages;
CREATE TRIGGER set_message_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_message_updated_at();

-- 8. Enable Realtime for messages table
-- ============================================
-- This allows real-time subscriptions to work
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============================================
-- HELPER VIEWS AND FUNCTIONS
-- ============================================

-- Create a view for conversation list (last message with each friend)
CREATE OR REPLACE VIEW public.conversation_list AS
WITH latest_messages AS (
  SELECT DISTINCT ON (
    CASE 
      WHEN sender_id < receiver_id THEN sender_id || '-' || receiver_id
      ELSE receiver_id || '-' || sender_id
    END
  )
    id,
    sender_id,
    receiver_id,
    content,
    read,
    created_at,
    CASE 
      WHEN sender_id < receiver_id THEN sender_id || '-' || receiver_id
      ELSE receiver_id || '-' || sender_id
    END as conversation_key
  FROM public.messages
  ORDER BY conversation_key, created_at DESC
)
SELECT 
  lm.*,
  sender_profile.display_name as sender_name,
  sender_profile.email as sender_email,
  sender_profile.avatar_url as sender_avatar,
  receiver_profile.display_name as receiver_name,
  receiver_profile.email as receiver_email,
  receiver_profile.avatar_url as receiver_avatar
FROM latest_messages lm
LEFT JOIN user_profiles sender_profile ON lm.sender_id = sender_profile.user_id
LEFT JOIN user_profiles receiver_profile ON lm.receiver_id = receiver_profile.user_id
ORDER BY lm.created_at DESC;

-- ============================================
-- HELPER QUERIES FOR TESTING
-- ============================================

-- View all messages with user details
SELECT 
  m.id,
  sender.email as sender_email,
  sender.display_name as sender_name,
  receiver.email as receiver_email,
  receiver.display_name as receiver_name,
  m.content,
  m.read,
  m.created_at
FROM messages m
JOIN user_profiles sender ON m.sender_id = sender.user_id
JOIN user_profiles receiver ON m.receiver_id = receiver.user_id
ORDER BY m.created_at DESC;

-- Count unread messages for a specific user
-- Replace 'YOUR_USER_ID' with actual user ID
-- SELECT COUNT(*) as unread_count
-- FROM messages
-- WHERE receiver_id = 'YOUR_USER_ID' AND read = FALSE;

-- Get conversation between two users
-- Replace 'USER_1_ID' and 'USER_2_ID' with actual user IDs
-- SELECT 
--   m.*,
--   sender.display_name as sender_name
-- FROM messages m
-- JOIN user_profiles sender ON m.sender_id = sender.user_id
-- WHERE 
--   (sender_id = 'USER_1_ID' AND receiver_id = 'USER_2_ID') OR
--   (sender_id = 'USER_2_ID' AND receiver_id = 'USER_1_ID')
-- ORDER BY created_at ASC;
