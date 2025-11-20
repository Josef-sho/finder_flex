# Supabase Setup - Easy Way! 🚀

## Step 1: Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign up/login
3. Click "New Project"
4. Fill in name, password, and region
5. Wait 1-2 minutes for project to be created

## Step 2: Get Your API Keys

1. In your project, go to **Settings** → **API**
2. Copy:
   - **Project URL**
   - **anon public** key

## Step 3: Create .env File

Create a `.env` file in your project root:

```env
REACT_APP_SUPABASE_URL=paste_your_project_url_here
REACT_APP_SUPABASE_ANON_KEY=paste_your_anon_key_here
```

## Step 4: Create Tables (Easy Way - No SQL!)

### Create Guests Table

1. Go to **Table Editor** in your Supabase dashboard
2. Click **"New table"**
3. Name it: `guests`
4. Click **"Add column"** and add these columns:

   | Column Name | Type | Default | Nullable |
   |------------|------|---------|----------|
   | id | int8 | (auto) | ❌ |
   | name | text | - | ❌ |
   | table_name | text | - | ❌ |
   | created_at | timestamptz | now() | ❌ |
   | updated_at | timestamptz | now() | ❌ |

5. Make `id` the **Primary Key** (click the key icon)
6. Click **"Save"**

### Create Invitations Table

1. Click **"New table"** again
2. Name it: `invitations`
3. Add these columns:

   | Column Name | Type | Default | Nullable | Unique |
   |------------|------|---------|----------|--------|
   | id | int8 | (auto) | ❌ | - |
   | table_name | text | - | ❌ | ✅ |
   | file_url | text | - | ✅ | - |
   | file_type | text | - | ✅ | - |
   | file_name | text | - | ✅ | - |
   | data_url | text | - | ✅ | - |
   | created_at | timestamptz | now() | ❌ | - |
   | updated_at | timestamptz | now() | ❌ | - |

4. Make `id` the **Primary Key**
5. Make `table_name` **Unique** (click the unique icon)
6. Click **"Save"**

## Step 5: Enable Public Access

1. Go to **Authentication** → **Policies**
2. For the `guests` table:
   - Click **"New Policy"**
   - Name: "Allow public read"
   - Operation: **SELECT**
   - Policy: `true` (allow everyone)
   - Click **"Save"**
   
   Repeat for **INSERT**, **UPDATE**, **DELETE** operations

3. Do the same for the `invitations` table

**OR** (Even Easier - One Click):

1. Go to **Table Editor**
2. Click on `guests` table
3. Click **"Enable RLS"** toggle OFF (this makes it public - simpler for now)
4. Do the same for `invitations` table

⚠️ **Note**: Disabling RLS makes tables fully public. For production, you may want to enable RLS with proper policies.

## Step 6: Test It!

1. Restart your dev server: `npm start`
2. Check browser console - should see no Supabase errors
3. You're done! 🎉

---

## That's It!

No SQL needed! The visual table editor is much easier. Once you've created the tables, the app will automatically use Supabase instead of local files.

