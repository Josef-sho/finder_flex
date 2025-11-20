import { supabase, TABLES, isSupabaseConfigured } from '../config/supabase';

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
    const invitations = {};
    (data || []).forEach((invitation) => {
      invitations[invitation.table_name] = {
        url: invitation.file_url || invitation.data_url, // Use file_url or fallback to data_url
        type: invitation.file_type,
        name: invitation.file_name,
        dataUrl: invitation.data_url, // For base64 encoded files
      };
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

