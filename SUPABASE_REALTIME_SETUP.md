# Supabase Realtime Setup Guide

## ✅ What You Need to Enable on Supabase

Real-time chat requires **2 steps** in your Supabase project:

---

## Step 1: Run the SQL Migration ⚡

This creates the `messages` table and configures it for Realtime.

### Instructions:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `ifhmpedzbaoehjrevvlr`

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Copy & Paste SQL**
   - Open: `supabase/chat_schema.sql`
   - Copy **ALL** contents
   - Paste into SQL Editor

4. **Run the Migration**
   - Click **RUN** button (or press Ctrl/Cmd + Enter)
   - Wait for success message: ✅ "Success. No rows returned"

5. **Verify Table Created**
   - Go to **Table Editor** in left sidebar
   - You should see a new table: `messages`
   - Columns: `id`, `sender_id`, `receiver_id`, `content`, `read`, `created_at`, `updated_at`

### What This Does:
- ✅ Creates `messages` table
- ✅ Adds indexes for performance
- ✅ Enables Row Level Security (RLS)
- ✅ Creates security policies
- ✅ Adds Realtime to publication (via `ALTER PUBLICATION`)

---

## Step 2: Enable Realtime in Dashboard UI 🔌

**CRITICAL:** Even though the SQL includes `ALTER PUBLICATION`, you still need to enable Realtime in the UI!

### Instructions:

1. **Navigate to Replication**
   - In Supabase Dashboard
   - Click **Database** → **Replication** (in left sidebar)

2. **Find the Messages Table**
   - Look for table: `public.messages`
   - Under "Source" section

3. **Enable Realtime**
   - Find the toggle switch next to `messages`
   - Click to turn it **ON** (should turn green)
   - Alternatively, click the table name, then toggle "Enable Realtime"

4. **Verify It's Enabled**
   - The toggle should be **green** and **ON**
   - You should see `messages` under "Source" section
   - Status should show "Realtime enabled"

### Visual Guide:
```
Database → Replication
├── Source
│   ├── messages        [●●●●●●] ON  ✅ (This should be green/enabled)
│   ├── friendships     [○○○○○○] OFF (Optional)
│   └── user_profiles   [○○○○○○] OFF (Optional)
```

---

## Step 3: Verify Realtime is Working ✅

### Check in Dashboard:

1. **Go to API Docs**
   - Click **API Docs** in left sidebar
   - Scroll to **Realtime** section
   - Should show `messages` table is available

2. **Test Query**
   - Open SQL Editor
   - Run:
     ```sql
     SELECT * FROM messages LIMIT 5;
     ```
   - Should return empty result (if no messages yet) or your test messages

### Check in App:

1. **Open Developer Console**
   - Run your app
   - Open chat screen
   - Check console logs

2. **Look for Success Message**
   ```
   🔌 Realtime subscription status: SUBSCRIBED
   ```
   ✅ **Good!** Realtime is working!

3. **If You See Error**
   ```
   🔌 Realtime subscription status: CHANNEL_ERROR
   ```
   ❌ **Problem!** Go back and check Step 2

---

## Common Issues & Solutions

### Issue 1: "ALTER PUBLICATION" Error

**Error Message:**
```
publication "supabase_realtime" does not exist
```

**Solution:**
This is normal for **new Supabase projects**. The publication is created automatically. Just ignore this error and proceed to Step 2 (enable in UI).

---

### Issue 2: Realtime Not Enabled in UI

**Symptom:**
- SQL ran successfully
- But toggle is still OFF in Replication tab

**Solution:**
1. Manually turn the toggle ON (Step 2)
2. The SQL command doesn't automatically enable the UI toggle
3. Both the SQL **AND** the UI toggle are needed

---

### Issue 3: Can't Find Replication Tab

**Location:**
```
Supabase Dashboard
└── Database
    └── Replication  ← Here!
```

**Alternative Path:**
- Some older Supabase versions: **Database** → **Publication**
- Or search for "Realtime" in dashboard search

---

### Issue 4: Table Not Showing in Replication

**Possible Causes:**
1. SQL didn't run successfully
2. Table created in wrong schema
3. Browser cache issue

**Solutions:**
1. Go to **Table Editor** - verify `messages` table exists
2. Check table is in `public` schema (not `auth` or other)
3. Refresh browser (Ctrl/Cmd + Shift + R)
4. Re-run the SQL migration

---

### Issue 5: "CHANNEL_ERROR" in Console

**Symptoms:**
```javascript
🔌 Realtime subscription status: CHANNEL_ERROR
```

**Solutions:**

1. **Check Realtime Enabled**
   - Go to Database → Replication
   - Verify `messages` toggle is ON (green)

2. **Check RLS Policies**
   - Go to Authentication → Policies
   - Verify policies exist for `messages` table
   - You should see 4 policies (SELECT, INSERT, UPDATE, DELETE)

3. **Check Your Auth**
   - Make sure you're logged in
   - Verify `supabase.auth.getUser()` returns valid user

4. **Check API Keys**
   - In `lib/supabase.ts`
   - Verify `supabaseUrl` and `supabaseAnonKey` are correct
   - Get them from: Dashboard → Settings → API

---

## Additional Supabase Settings (Optional)

### Enable Realtime for Other Tables (Optional)

If you want real-time updates for friendships or user profiles:

1. Go to **Database** → **Replication**
2. Enable toggles for:
   - `friendships` (for real-time friend requests)
   - `user_profiles` (for real-time profile updates)

**Note:** Not required for chat to work, but improves UX.

---

### Check Realtime Limits (Important!)

**Supabase Free Tier:**
- ✅ Realtime included
- ✅ Unlimited real-time connections
- ✅ Unlimited messages
- ⚠️ Max 2 GB database size
- ⚠️ Max 500 MB storage

**If You Exceed:**
- Upgrade to Pro plan ($25/month)
- Or implement pagination/cleanup for old messages

---

## Verification Checklist

Before testing your chat, verify all these:

- [ ] ✅ SQL migration ran successfully
- [ ] ✅ `messages` table exists in Table Editor
- [ ] ✅ Realtime toggle is **ON** (green) in Replication tab
- [ ] ✅ RLS policies exist (4 policies for messages table)
- [ ] ✅ App console shows: `SUBSCRIBED` status
- [ ] ✅ No errors in browser/app console
- [ ] ✅ `supabaseUrl` and `supabaseAnonKey` are correct

---

## Testing Real-Time (After Setup)

### Quick Test:

1. **Open SQL Editor**
2. **Insert a test message manually:**
   ```sql
   -- Replace USER_A_ID and USER_B_ID with actual user IDs
   INSERT INTO messages (sender_id, receiver_id, content, read)
   VALUES (
     'USER_A_ID',
     'USER_B_ID',
     'Test real-time message!',
     false
   );
   ```

3. **Check your app**
   - If User B has chat open with User A
   - Message should appear **instantly**!
   - Console should show: `📩 Received message from friend:`

4. **Success!** ✅ Real-time is working!

---

## Full Setup Summary

### What You Need to Do:

1. ✅ **Run SQL migration** (creates table + enables publication)
   - Copy `supabase/chat_schema.sql`
   - Paste in SQL Editor
   - Click Run

2. ✅ **Enable Realtime toggle** (enables broadcasting)
   - Database → Replication
   - Find `messages` table
   - Turn toggle ON (green)

3. ✅ **Test in app**
   - Open chat on 2 devices
   - Send messages
   - See real-time updates!

### Time Required:
- 🕒 **5 minutes** total
- 2 min for SQL migration
- 1 min to enable Realtime toggle
- 2 min to test

---

## Still Not Working?

### Debug Steps:

1. **Check Supabase Status**
   - Visit: https://status.supabase.com/
   - Ensure all systems operational

2. **Check Browser Console**
   - Press F12 → Console tab
   - Look for errors related to Supabase or WebSocket

3. **Check Network Tab**
   - F12 → Network tab
   - Look for WebSocket connections
   - Should see `wss://` connection to Supabase

4. **Test Basic Supabase Connection**
   ```typescript
   // Add to your app temporarily
   const testConnection = async () => {
     const { data, error } = await supabase
       .from('messages')
       .select('count');
     console.log('Connection test:', data, error);
   };
   ```

5. **Contact Support**
   - Supabase Discord: https://discord.supabase.com
   - Or check documentation: https://supabase.com/docs

---

## Important Notes

⚠️ **You need BOTH:**
1. SQL command: `ALTER PUBLICATION supabase_realtime ADD TABLE`
2. UI toggle: Database → Replication → ON

One without the other **will not work**!

✅ **After enabling, no app code changes needed**
- Realtime works automatically
- No additional configuration in code
- Just enable on Supabase side

🔄 **Changes take effect immediately**
- No need to restart app
- Just refresh/reload chat screen
- Should see `SUBSCRIBED` status

---

## Next Steps

After completing setup:

1. ✅ Verify Realtime is enabled
2. ✅ Test with 2 devices
3. ✅ Check console logs
4. ✅ Enjoy real-time chat! 🎉

Need help? Check `REALTIME_DEBUG_GUIDE.md` for testing steps!
