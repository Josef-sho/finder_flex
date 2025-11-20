# Supabase Setup Instructions

Follow these steps to set up Supabase for your finder-flex app.

## 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: finder-flex (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create new project" (takes 1-2 minutes)

## 2. Get Your API Keys

1. In your Supabase project, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

## 3. Create Environment File

1. Create a `.env` file in the root of your project (if it doesn't exist)
2. Add your Supabase credentials:

```env
REACT_APP_SUPABASE_URL=your_project_url_here
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
REACT_APP_ADMIN_PASSWORD=your_admin_password_here
```

Replace the values with your actual Supabase URL and anon key.

## 4. Create Database Tables

Go to **SQL Editor** in your Supabase dashboard and run these SQL commands:

### Create Guests Table

```sql
CREATE TABLE IF NOT EXISTS guests (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_guests_table ON guests(table_name);
CREATE INDEX IF NOT EXISTS idx_guests_name ON guests(name);
```

### Create Invitations Table

```sql
CREATE TABLE IF NOT EXISTS invitations (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL UNIQUE,
  file_url TEXT,
  file_type TEXT,
  file_name TEXT,
  data_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_invitations_table ON invitations(table_name);
```

### Enable Row Level Security (RLS)

For public read access (guests can view, but only you can edit):

```sql
-- Enable RLS
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on guests" ON guests
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on invitations" ON invitations
  FOR SELECT USING (true);

-- Allow public insert/update (for admin operations)
-- Note: In production, you may want to restrict this to authenticated users
CREATE POLICY "Allow public insert on guests" ON guests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on guests" ON guests
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on guests" ON guests
  FOR DELETE USING (true);

CREATE POLICY "Allow public insert on invitations" ON invitations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on invitations" ON invitations
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on invitations" ON invitations
  FOR DELETE USING (true);
```

## 5. Set Up Storage (Optional - for file uploads)

If you want to store invitation files in Supabase Storage:

1. Go to **Storage** in your Supabase dashboard
2. Click "Create a new bucket"
3. Name it `invitations`
4. Make it **Public** (so files can be accessed via URL)
5. Click "Create bucket"

## 6. Test Your Setup

1. Restart your development server: `npm start`
2. The app should now connect to Supabase
3. Check the browser console for any connection errors

## Troubleshooting

- **"Supabase URL and Anon Key are not configured"**: Make sure your `.env` file exists and has the correct variable names (they must start with `REACT_APP_`)
- **Connection errors**: Verify your Supabase URL and anon key are correct
- **Permission errors**: Check that RLS policies are set up correctly
- **Table not found**: Make sure you ran the SQL commands to create the tables

## Next Steps

After setup, the app will:
- Load guests from Supabase instead of Excel files
- Store invitations in Supabase
- Work across all devices automatically (no manual file placement needed!)

