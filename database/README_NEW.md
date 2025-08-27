# Database Setup for Happy Child App

## Overview
This directory contains SQL scripts to set up the database tables for the Happy Child app.

## Setup Instructions

1. **Log into your Supabase dashboard**
   - Go to [supabase.com](https://supabase.com)
   - Navigate to your project

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Create a new query

3. **Run the scripts in order:**

   **First, run the expenses table setup:**
   - Copy the contents of `expenses_table.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the script

   **Then, run the custody schedules setup:**
   - Copy the contents of `custody_schedules_setup.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the script

   **Finally, run the chat system setup:**
   - Copy the contents of `chat_messages_table.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the script

## What Gets Created

### Chat System Tables
- `user_profiles`: Stores user display information for chat functionality
- `friendships`: Manages friend relationships between users
- `conversations`: Manages different types of conversations (direct, group, child-related)
- `conversation_participants`: Tracks who participates in each conversation
- `chat_messages`: Stores chat messages in conversations

### Expenses Table
- `expenses`: Stores expense records for children

### Custody Schedules Table
- `custody_schedules`: Stores recurring custody schedules for children

## Key Features

### Automatic User Profile Creation
- When users sign up, a user profile is automatically created in the `user_profiles` table
- This enables search functionality and chat features

### Smart User Search
- The `search_users_by_email` function searches for users by email
- Automatically creates profiles for existing users who don't have them yet
- This ensures all users can be found and added as friends

### Friend Management
- Users can search for and add friends by email
- Friend requests are managed through the `friendships` table
- Accepted friendships enable chat functionality

### Automatic Conversation Creation
- When users become friends, conversations are automatically created
- The `get_or_create_direct_conversation` function handles this seamlessly

### Security
All tables include Row Level Security (RLS) policies that ensure:
- Users can only access data they have permission to see
- All operations are properly authenticated through Supabase Auth
- User privacy is maintained

## Troubleshooting

### Search Not Working
If email search isn't returning results:
1. Make sure the `chat_messages_table.sql` script has been run
2. Verify that users have profiles in the `user_profiles` table
3. Check that the `search_users_by_email` function exists

### Friends Not Showing Up
If friends aren't appearing in the chat:
1. Ensure friendships have status 'accepted' in the `friendships` table
2. Verify that both users have profiles in the `user_profiles` table
3. Check that the `ensure_user_profile_exists` function is working

### Messages Not Appearing
If chat messages aren't showing:
1. Confirm that conversations exist in the `conversations` table
2. Check that both users are participants in `conversation_participants`
3. Verify that the `get_or_create_direct_conversation` function is working

## Manual Profile Creation
If you need to manually create profiles for existing users, you can run:

```sql
-- Replace 'user_id_here' with the actual user ID from auth.users
-- Replace 'email_here' with the user's email
INSERT INTO user_profiles (user_id, display_name, email, is_searchable)
VALUES (
  'user_id_here',
  'Display Name',
  'email_here',
  true
);
```

## Old Content (Legacy)

### expenses table
This table stores expense records for children with the following columns:
- `id`: Unique identifier (UUID)
- `child_id`: Reference to the child (foreign key)
- `user_id`: Reference to the user who created the expense (foreign key)
- `description`: What the expense was for
- `amount`: Cost of the expense (decimal with 2 decimal places)
- `date`: Date when the expense occurred
- `payer`: Who paid for the expense (text field)
- `created_at`: When the record was created
- `updated_at`: When the record was last updated

### Security (Legacy)
The table includes Row Level Security (RLS) policies that ensure:
- Users can only view, create, update, and delete expenses for children they have access to
- Users can only modify expenses they created themselves
- All operations are properly authenticated through Supabase Auth

### Indexes (Legacy)
The following indexes are created for optimal performance:
- `idx_expenses_child_id`: For filtering by child
- `idx_expenses_user_id`: For filtering by user
- `idx_expenses_date`: For date-based queries and sorting

### Triggers (Legacy)
An automatic trigger updates the `updated_at` timestamp whenever a record is modified.
