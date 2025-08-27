-- SQL script to create the chat system tables for the Happy Child app

-- Create 'user_profiles' table to store user display information
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  is_searchable BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create 'friendships' table to manage friend relationships
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- Create 'conversations' table to manage chat conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'child_related')) DEFAULT 'direct',
  name TEXT, -- For group chats or child-related chats
  child_id UUID REFERENCES children(id) ON DELETE CASCADE, -- Optional: for child-related conversations
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create 'conversation_participants' table to manage who's in each conversation
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(conversation_id, user_id)
);

-- Create 'chat_messages' table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'file')) DEFAULT 'text',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false
);

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'Table to store user profile information for chat';
COMMENT ON TABLE friendships IS 'Table to manage friend relationships between users';
COMMENT ON TABLE conversations IS 'Table to manage different types of conversations';
COMMENT ON TABLE conversation_participants IS 'Table to track who participates in each conversation';
COMMENT ON TABLE chat_messages IS 'Table to store chat messages in conversations';

COMMENT ON COLUMN user_profiles.display_name IS 'Display name shown in chat';
COMMENT ON COLUMN user_profiles.is_searchable IS 'Whether user can be found in search';
COMMENT ON COLUMN friendships.status IS 'Status of friendship: pending, accepted, or blocked';
COMMENT ON COLUMN conversations.type IS 'Type of conversation: direct, group, or child_related';
COMMENT ON COLUMN conversations.child_id IS 'Optional child reference for child-related conversations';
COMMENT ON COLUMN chat_messages.message_type IS 'Type of message: text, image, or file';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_searchable ON user_profiles(is_searchable);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_child_id ON conversations(child_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_active ON conversation_participants(is_active);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view all searchable profiles" ON user_profiles;
CREATE POLICY "Users can view all searchable profiles" ON user_profiles
  FOR SELECT USING (is_searchable = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create RLS policies for friendships
DROP POLICY IF EXISTS "Users can view friendships they're involved in" ON friendships;
CREATE POLICY "Users can view friendships they're involved in" ON friendships
  FOR SELECT USING (requester_id = auth.uid() OR addressee_id = auth.uid());

DROP POLICY IF EXISTS "Users can create friendship requests" ON friendships;
CREATE POLICY "Users can create friendship requests" ON friendships
  FOR INSERT WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "Users can update friendships they're involved in" ON friendships;
CREATE POLICY "Users can update friendships they're involved in" ON friendships
  FOR UPDATE USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Create RLS policies for conversations
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
CREATE POLICY "Users can view conversations they participate in" ON conversations
  FOR SELECT USING (
    id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update conversations they created" ON conversations;
CREATE POLICY "Users can update conversations they created" ON conversations
  FOR UPDATE USING (created_by = auth.uid());

-- Create RLS policies for conversation_participants
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
CREATE POLICY "Users can view participants in their conversations" ON conversation_participants
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can add participants to conversations they created" ON conversation_participants;
CREATE POLICY "Users can add participants to conversations they created" ON conversation_participants
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE created_by = auth.uid()
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own participation" ON conversation_participants;
CREATE POLICY "Users can update their own participation" ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Create RLS policies for chat_messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON chat_messages;
CREATE POLICY "Users can view messages in their conversations" ON chat_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON chat_messages;
CREATE POLICY "Users can send messages to their conversations" ON chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
CREATE POLICY "Users can update their own messages" ON chat_messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON friendships TO authenticated;
GRANT SELECT, INSERT, UPDATE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON chat_messages TO authenticated;

-- Create functions to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_friendships_updated_at ON friendships;
CREATE TRIGGER update_friendships_updated_at 
    BEFORE UPDATE ON friendships 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER update_chat_messages_updated_at 
    BEFORE UPDATE ON chat_messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update conversation last_message_at when new message is added
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET last_message_at = NEW.created_at 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON chat_messages;
CREATE TRIGGER update_conversation_last_message_trigger
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Helper function to create or get direct conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
BEGIN
    -- Try to find existing direct conversation between these users
    SELECT c.id INTO conversation_id
    FROM conversations c
    WHERE c.type = 'direct'
    AND c.id IN (
        SELECT cp1.conversation_id 
        FROM conversation_participants cp1
        WHERE cp1.user_id = user1_id AND cp1.is_active = true
    )
    AND c.id IN (
        SELECT cp2.conversation_id 
        FROM conversation_participants cp2
        WHERE cp2.user_id = user2_id AND cp2.is_active = true
    )
    AND (
        SELECT COUNT(*) 
        FROM conversation_participants cp 
        WHERE cp.conversation_id = c.id AND cp.is_active = true
    ) = 2;
    
    -- If no conversation exists, create one
    IF conversation_id IS NULL THEN
        INSERT INTO conversations (type, created_by)
        VALUES ('direct', user1_id)
        RETURNING id INTO conversation_id;
        
        -- Add both users as participants
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES (conversation_id, user1_id), (conversation_id, user2_id);
    END IF;
    
    RETURN conversation_id;
END;
$$ language 'plpgsql';

-- Create function to automatically create user profile when a user signs up
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id, display_name, email, is_searchable)
    VALUES (
        NEW.id,
        COALESCE(SPLIT_PART(NEW.email, '@', 1), 'User'),
        COALESCE(NEW.email, ''),
        true
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically create user profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile_on_signup();

-- Create function to search for users by email and create profiles if needed
CREATE OR REPLACE FUNCTION search_users_by_email(search_email TEXT, current_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    email TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    -- First try to find users in user_profiles
    RETURN QUERY
    SELECT up.user_id, up.display_name, up.email, up.avatar_url
    FROM user_profiles up
    WHERE up.is_searchable = true 
    AND up.user_id != current_user_id
    AND up.email ILIKE '%' || search_email || '%';

    -- If no results found in user_profiles, check auth.users and create profiles
    IF NOT FOUND THEN
        -- Insert missing profiles for users who exist in auth.users but not in user_profiles
        INSERT INTO user_profiles (user_id, display_name, email, is_searchable)
        SELECT au.id, COALESCE(SPLIT_PART(au.email, '@', 1), 'User'), au.email, true
        FROM auth.users au
        LEFT JOIN user_profiles up ON au.id = up.user_id
        WHERE up.user_id IS NULL 
        AND au.email ILIKE '%' || search_email || '%'
        AND au.id != current_user_id
        ON CONFLICT (user_id) DO NOTHING;

        -- Now return the results including newly created profiles
        RETURN QUERY
        SELECT up.user_id, up.display_name, up.email, up.avatar_url
        FROM user_profiles up
        JOIN auth.users au ON up.user_id = au.id
        WHERE up.is_searchable = true 
        AND up.user_id != current_user_id
        AND up.email ILIKE '%' || search_email || '%';
    END IF;
END;
$$ language 'plpgsql';

-- Create function to ensure a user profile exists for a given user_id
CREATE OR REPLACE FUNCTION ensure_user_profile_exists(target_user_id UUID)
RETURNS user_profiles AS $$
DECLARE
    profile_record user_profiles;
    user_email TEXT;
BEGIN
    -- First try to get existing profile
    SELECT * INTO profile_record FROM user_profiles WHERE user_id = target_user_id;
    
    -- If profile exists, return it
    IF FOUND THEN
        RETURN profile_record;
    END IF;
    
    -- Profile doesn't exist, get user email from auth.users
    SELECT email INTO user_email FROM auth.users WHERE id = target_user_id;
    
    -- Create new profile
    INSERT INTO user_profiles (user_id, display_name, email, is_searchable)
    VALUES (
        target_user_id,
        COALESCE(SPLIT_PART(user_email, '@', 1), 'User'),
        COALESCE(user_email, ''),
        true
    )
    RETURNING * INTO profile_record;
    
    RETURN profile_record;
EXCEPTION
    WHEN OTHERS THEN
        -- If any error occurs, try to return existing profile or create a minimal one
        SELECT * INTO profile_record FROM user_profiles WHERE user_id = target_user_id;
        IF FOUND THEN
            RETURN profile_record;
        END IF;
        
        -- Create minimal profile as fallback
        INSERT INTO user_profiles (user_id, display_name, email, is_searchable)
        VALUES (target_user_id, 'User', '', true)
        ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name
        RETURNING * INTO profile_record;
        
        RETURN profile_record;
END;
$$ language 'plpgsql';
