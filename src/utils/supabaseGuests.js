import { createClient } from '@supabase/supabase-js';
import { supabase, TABLES, isSupabaseConfigured } from '../config/supabase';

// Helper to check if Supabase is available for download tracking
// This allows Supabase to be used for download tracking even if REACT_APP_USE_SUPABASE is not set
const isSupabaseAvailableForDownloads = () => {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '');
};

// Cache for download tracking Supabase client
let downloadSupabaseClient = null;

// Get Supabase client for download tracking (creates one if credentials are available)
// Export this so it can be used for cross-device guest list syncing
export const getSupabaseForDownloads = () => {
  if (!isSupabaseAvailableForDownloads()) {
    return null;
  }
  // If supabase is already created from config, use it
  if (supabase) {
    return supabase;
  }
  // Otherwise create a new client for download tracking (cache it)
  if (!downloadSupabaseClient) {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    downloadSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return downloadSupabaseClient;
};

/**
 * Loads all guests from Supabase
 * @returns {Promise<Array<{name: string, table: string}>|null>} Returns array if Supabase is configured (even if empty), null if not configured
 */
export const loadGuestsFromSupabase = async () => {
  if (!isSupabaseConfigured() || !supabase) {
    return null; // Return null to indicate Supabase is not available
  }

  try {
    const { data, error } = await supabase
      .from(TABLES.GUESTS)
      .select('*')
      .order('table_name', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading guests from Supabase:', error);
      return null;
    }

    // Map to expected format - return empty array if no data (Supabase is configured but empty)
    return (data || []).map(guest => ({
      name: guest.name,
      table: guest.table_name,
      downloaded: guest.downloaded || false,
    }));
  } catch (err) {
    console.error('Error loading guests:', err);
    return null;
  }
};

/**
 * Saves guests to Supabase (replaces all existing guests)
 * @param {Array<{name: string, table: string}>} guests
 * @returns {Promise<boolean>}
 */
export const saveGuestsToSupabase = async (guests) => {
  if (!isSupabaseConfigured() || !supabase) {
    return false;
  }

  try {
    // First, delete all existing guests
    const { error: deleteError } = await supabase
      .from(TABLES.GUESTS)
      .delete()
      .neq('id', 0); // Delete all rows

    if (deleteError) {
      console.error('Error deleting existing guests:', deleteError);
    }

    // Then insert new guests (map to database format)
    if (guests.length > 0) {
      const guestsToInsert = guests.map(guest => ({
        name: guest.name,
        table_name: guest.table,
        downloaded: guest.downloaded || false,
      }));

      const { error: insertError } = await supabase
        .from(TABLES.GUESTS)
        .insert(guestsToInsert);

      if (insertError) {
        console.error('Error inserting guests:', insertError);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('Error saving guests:', err);
    return false;
  }
};

/**
 * Loads all invitations from Supabase
 * @returns {Promise<Object|null>} Object mapping table names to invitation data, or null if not configured
 */
export const loadInvitationsFromSupabase = async () => {
  if (!isSupabaseConfigured() || !supabase) {
    return null; // Return null to indicate Supabase is not available
  }

  try {
    const { data, error } = await supabase
      .from(TABLES.INVITATIONS)
      .select('*');

    if (error) {
      console.error('Error loading invitations from Supabase:', error);
      return null;
    }

    // Convert array to object keyed by table name
    // Store both exact match and normalized versions for flexible matching
    const invitations = {};
    (data || []).forEach((invitation) => {
      const tableName = invitation.table_name;
      const normalizedTableName = tableName.toLowerCase().trim();
      
      // Store with exact table name
      invitations[tableName] = {
        url: invitation.file_url || invitation.data_url, // Use file_url or fallback to data_url
        type: invitation.file_type,
        name: invitation.file_name,
        dataUrl: invitation.data_url, // For base64 encoded files
      };
      
      // Also store normalized version for case-insensitive matching
      if (normalizedTableName !== tableName.toLowerCase()) {
        invitations[normalizedTableName] = invitations[tableName];
      }
      
      // Store variations like "Table 14" and "14"
      const tableNumberMatch = tableName.match(/(\d+)/);
      if (tableNumberMatch) {
        const number = tableNumberMatch[1];
        // Store as "Table X" if it's just a number
        if (/^\d+$/i.test(tableName.trim())) {
          invitations[`Table ${number}`] = invitations[tableName];
          invitations[`table ${number}`] = invitations[tableName];
        }
        // Store as just the number if it's "Table X"
        if (/^table\s*\d+$/i.test(tableName.trim())) {
          invitations[number] = invitations[tableName];
        }
      }
    });

    return invitations;
  } catch (err) {
    console.error('Error loading invitations:', err);
    return null;
  }
};

/**
 * Saves an invitation for a table to Supabase
 * @param {string} tableName - The table name
 * @param {string} fileUrl - URL to the file (or data URL for base64)
 * @param {string} fileType - MIME type of the file
 * @param {string} fileName - Name of the file
 * @param {string} dataUrl - Optional base64 data URL
 * @returns {Promise<boolean>}
 */
export const saveInvitationToSupabase = async (tableName, fileUrl, fileType, fileName, dataUrl = null) => {
  if (!isSupabaseConfigured() || !supabase) {
    return false;
  }

  try {
    // Check if invitation already exists for this table
    const { data: existing } = await supabase
      .from(TABLES.INVITATIONS)
      .select('id')
      .eq('table_name', tableName)
      .single();

    const invitationData = {
      table_name: tableName,
      file_url: fileUrl,
      file_type: fileType,
      file_name: fileName,
      data_url: dataUrl,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Update existing invitation
      const { error } = await supabase
        .from(TABLES.INVITATIONS)
        .update(invitationData)
        .eq('table_name', tableName);

      if (error) {
        console.error('Error updating invitation:', error);
        return false;
      }
    } else {
      // Insert new invitation
      const { error } = await supabase
        .from(TABLES.INVITATIONS)
        .insert(invitationData);

      if (error) {
        console.error('Error inserting invitation:', error);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('Error saving invitation:', err);
    return false;
  }
};

/**
 * Deletes an invitation for a table from Supabase
 * @param {string} tableName - The table name
 * @returns {Promise<boolean>}
 */
export const deleteInvitationFromSupabase = async (tableName) => {
  if (!isSupabaseConfigured() || !supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from(TABLES.INVITATIONS)
      .delete()
      .eq('table_name', tableName);

    if (error) {
      console.error('Error deleting invitation:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error deleting invitation:', err);
    return false;
  }
};

/**
 * Clears all guests from Supabase
 * @returns {Promise<boolean>}
 */
export const clearAllGuestsFromSupabase = async () => {
  if (!isSupabaseConfigured() || !supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from(TABLES.GUESTS)
      .delete()
      .neq('id', 0); // Delete all rows

    if (error) {
      console.error('Error clearing guests from Supabase:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error clearing guests:', err);
    return false;
  }
};

/**
 * Clears all invitations from Supabase
 * @returns {Promise<boolean>}
 */
export const clearAllInvitationsFromSupabase = async () => {
  if (!isSupabaseConfigured() || !supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from(TABLES.INVITATIONS)
      .delete()
      .neq('id', 0); // Delete all rows

    if (error) {
      console.error('Error clearing invitations from Supabase:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error clearing invitations:', err);
    return false;
  }
};

/**
 * Marks a guest as having downloaded their invitation
 * Uses Supabase ONLY for download tracking
 * @param {string} guestName - The guest's name
 * @param {string} tableName - The guest's table (optional, for upsert)
 * @returns {Promise<boolean>}
 */
export const markGuestAsDownloaded = async (guestName, tableName = null) => {
  if (!guestName) {
    console.error('markGuestAsDownloaded: guestName is required');
    return false;
  }

  // Use Supabase ONLY for download tracking
  const downloadSupabase = getSupabaseForDownloads();
  if (!downloadSupabase) {
    console.error('Supabase credentials not found. Cannot track downloads. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.');
    return false;
  }

  try {
    // First, check if guest exists
    const { data: existing, error: selectError } = await downloadSupabase
      .from(TABLES.GUESTS)
      .select('id, name, table_name')
      .eq('name', guestName)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine, other errors are not
      console.error('Error checking if guest exists in Supabase:', selectError);
    }

    if (existing) {
      // Update existing record
      const { error } = await downloadSupabase
        .from(TABLES.GUESTS)
        .update({ downloaded: true })
        .eq('name', guestName);

      if (error) {
        console.error('Error marking guest as downloaded in Supabase (update):', error);
        console.error('Guest name:', guestName, 'Table:', tableName);
        return false;
      }
      console.log('Successfully marked guest as downloaded (update):', guestName);
      return true;
    } else {
      // Insert new record (we only need name and downloaded status)
      // If tableName is provided, include it; otherwise use a placeholder
      const { error } = await downloadSupabase
        .from(TABLES.GUESTS)
        .insert({
          name: guestName,
          table_name: tableName || 'Unknown',
          downloaded: true,
        });

      if (error) {
        console.error('Error inserting guest download status in Supabase:', error);
        console.error('Guest name:', guestName, 'Table:', tableName);
        console.error('Full error details:', JSON.stringify(error, null, 2));
        return false;
      }
      console.log('Successfully marked guest as downloaded (insert):', guestName);
      return true;
    }
  } catch (err) {
    console.error('Error marking guest as downloaded in Supabase (catch):', err);
    console.error('Guest name:', guestName, 'Table:', tableName);
    return false;
  }
};

/**
 * Gets the downloaded status for a guest name
 * Uses Supabase ONLY for download tracking
 * @param {string} guestName - The guest's name
 * @returns {Promise<boolean>}
 */
export const isGuestDownloaded = async (guestName) => {
  if (!guestName) {
    return false;
  }

  // Use Supabase ONLY for download tracking
  const downloadSupabase = getSupabaseForDownloads();
  if (!downloadSupabase) {
    return false;
  }

  try {
    const { data, error } = await downloadSupabase
      .from(TABLES.GUESTS)
      .select('downloaded')
      .eq('name', guestName)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" which is fine
      console.error('Error checking guest download status in Supabase:', error);
      return false;
    }

    return data?.downloaded === true;
  } catch (err) {
    console.error('Error checking guest download status:', err);
    return false;
  }
};

/**
 * Gets all downloaded guest names from Supabase
 * Uses Supabase ONLY for download tracking
 * @returns {Promise<string[]>}
 */
export const getDownloadedGuests = async () => {
  // Use Supabase ONLY for download tracking
  const downloadSupabase = getSupabaseForDownloads();
  if (!downloadSupabase) {
    return [];
  }

  try {
    const { data, error } = await downloadSupabase
      .from(TABLES.GUESTS)
      .select('name')
      .eq('downloaded', true);

    if (error) {
      console.error('Error getting downloaded guests from Supabase:', error);
      return [];
    }

    return (data || []).map(guest => guest.name);
  } catch (err) {
    console.error('Error getting downloaded guests:', err);
    return [];
  }
};

/**
 * Unchecks all guests (sets downloaded to false for all)
 * Uses Supabase ONLY for download tracking
 * @returns {Promise<boolean>}
 */
export const uncheckAllGuests = async () => {
  // Use Supabase ONLY for download tracking
  const downloadSupabase = getSupabaseForDownloads();
  if (!downloadSupabase) {
    console.error('Supabase credentials not found. Cannot reset download statuses. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.');
    return false;
  }

  try {
    const { error } = await downloadSupabase
      .from(TABLES.GUESTS)
      .update({ downloaded: false })
      .neq('id', 0); // Update all rows

    if (error) {
      console.error('Error unchecking all guests in Supabase:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error unchecking all guests in Supabase:', err);
    return false;
  }
};

