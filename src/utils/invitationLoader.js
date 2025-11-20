/**
 * Normalizes a table name to create a safe filename
 * @param {string} tableName - The table name (e.g., "Table 1", "Table 12")
 * @returns {string} Normalized table name for file lookup
 */
const normalizeTableName = (tableName) => {
  if (!tableName) return '';
  // Remove extra spaces and normalize
  return tableName.trim().replace(/\s+/g, ' ');
};

/**
 * Gets the invitation file URL for a given table
 * @param {string} tableName - The table name
 * @returns {Promise<{url: string, type: string} | null>} Invitation file info or null
 */
export const getInvitationForTable = async (tableName) => {
  if (!tableName) return null;

  const normalizedTable = normalizeTableName(tableName);
  const baseUrl = `${process.env.PUBLIC_URL || ''}/data/invitations/`;
  
  // Try common file extensions
  const extensions = ['.pdf', '.png', '.jpg', '.jpeg'];
  
  for (const ext of extensions) {
    const filename = `${encodeURIComponent(normalizedTable)}${ext}`;
    const url = `${baseUrl}${filename}`;
    
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        return {
          url,
          type: contentType,
          name: `${normalizedTable}${ext}`,
        };
      }
    } catch (err) {
      // Continue to next extension
    }
  }
  
  return null;
};

/**
 * Loads all available invitations from the public folder
 * @returns {Promise<Object>} Object mapping table names to invitation URLs
 */
export const loadAllInvitations = async (tableNames) => {
  const invitations = {};
  
  if (!Array.isArray(tableNames) || tableNames.length === 0) {
    return invitations;
  }
  
  // Check each table for an invitation file
  const checks = tableNames.map(async (tableName) => {
    const invitation = await getInvitationForTable(tableName);
    if (invitation) {
      invitations[tableName] = invitation;
    }
  });
  
  await Promise.all(checks);
  return invitations;
};

