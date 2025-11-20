-- QUICK SETUP: Copy and paste ALL of this into Supabase SQL Editor
-- Go to: SQL Editor → New Query → Paste this → Run

-- Create Guests Table
CREATE TABLE IF NOT EXISTS guests (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_guests_table ON guests(table_name);
CREATE INDEX IF NOT EXISTS idx_guests_name ON guests(name);

-- Create Invitations Table
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

CREATE INDEX IF NOT EXISTS idx_invitations_table ON invitations(table_name);

-- Enable Row Level Security
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on guests" ON guests
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on invitations" ON invitations
  FOR SELECT USING (true);

-- Allow public insert/update/delete (for admin operations)
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

-- Done! Your tables are ready.

