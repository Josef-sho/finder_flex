/**
 * Loads invitations from a JSON file in the public/data folder
 * @param {string} url - URL to the invitations JSON file
 * @returns {Promise<Object>} Promise resolving to invitations object
 */
export const loadInvitationsFromFile = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null; // File doesn't exist, return null
    }
    const data = await response.json();
    if (data && typeof data === 'object') {
      return data;
    }
    return null;
  } catch (err) {
    // File doesn't exist or other error - return null
    return null;
  }
};

/**
 * Exports invitations to a downloadable JSON file
 * @param {Object} invitations - Invitations object to export
 * @param {string} filename - Name of the file to download
 */
export const exportInvitationsToFile = (invitations, filename = 'invitations.json') => {
  try {
    const dataStr = JSON.stringify(invitations, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export invitations:', err);
  }
};

