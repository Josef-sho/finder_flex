import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// Get these from your Supabase project settings: https://app.supabase.com
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
const supabaseEnabled = process.env.REACT_APP_USE_SUPABASE === 'true';

// Check if Supabase is configured and explicitly enabled
export const isSupabaseConfigured = () => {
  return !!(
    supabaseEnabled &&
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== '' &&
    supabaseAnonKey !== ''
  );
};

if (!isSupabaseConfigured()) {
  console.warn(
    'Supabase is disabled. The app will use local files/localStorage. Set REACT_APP_USE_SUPABASE=true (and provide Supabase URL/key) to re-enable it.'
  );
}

// Create Supabase client only when configured
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Table names
export const TABLES = {
  GUESTS: 'guests',
  INVITATIONS: 'invitations',
};

