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

3. **Run the expenses table setup**
   - Copy the contents of `expenses_table.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the script

## Tables Created

### expenses
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

## Security

The table includes Row Level Security (RLS) policies that ensure:
- Users can only view, create, update, and delete expenses for children they have access to
- Users can only modify expenses they created themselves
- All operations are properly authenticated through Supabase Auth

## Indexes

The following indexes are created for optimal performance:
- `idx_expenses_child_id`: For filtering by child
- `idx_expenses_user_id`: For filtering by user
- `idx_expenses_date`: For date-based queries and sorting

## Triggers

An automatic trigger updates the `updated_at` timestamp whenever a record is modified.
