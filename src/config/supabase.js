import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// Get these from your Supabase project settings: https://app.supabase.com
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '');
};

if (!isSupabaseConfigured()) {
  console.warn('Supabase is not configured. The app will use local files/localStorage. To enable Supabase, set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in your .env file');
}

// Create Supabase client (will work even if not configured, but won't connect)
export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Table names
export const TABLES = {
  GUESTS: 'guests',
  INVITATIONS: 'invitations',
};

