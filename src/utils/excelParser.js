import * as XLSX from 'xlsx';

const hasMetadata = (row) =>
  row.slice(1).some((value) => {
    if (value === undefined || value === null) {
      return false;
    }
    const text = value.toString().trim();
    return text.length > 0;
  });

/**
 * Parses an Excel file buffer and extracts guest list data
 * @param {ArrayBuffer} buffer - The Excel file buffer
 * @returns {Array<{name: string, table: string}>} Array of guest objects
 */
export const parseExcelFile = (buffer) => {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (!rows.length) {
      return [];
    }

    let headerSeen = false;
    let currentTable = '';
    const guests = [];

    rows.forEach((row) => {
      const cells = row.map((cell) =>
        cell === undefined || cell === null ? '' : cell.toString().trim()
      );

      const primary = cells[0];

      if (!primary) {
        return;
      }

      if (!headerSeen && /guest/i.test(primary)) {
        headerSeen = true;
        return;
      }

      if (!headerSeen) {
        return;
      }

      if (/table/i.test(primary) && !hasMetadata(cells)) {
        currentTable = primary;
        return;
      }

      if (!hasMetadata(cells)) {
        return;
      }

      guests.push({
        name: primary,
        table: currentTable || 'Unassigned',
      });
    });

    return guests;
  } catch (err) {
    console.error('Error parsing Excel file:', err);
    throw new Error('Failed to parse Excel file');
  }
};

/**
 * Fetches and parses an Excel file from a URL
 * @param {string} url - URL to the Excel file
 * @returns {Promise<Array<{name: string, table: string}>>} Promise resolving to guest list
 */
export const loadGuestListFromFile = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch guest list: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return parseExcelFile(buffer);
  } catch (err) {
    console.error('Error loading guest list from file:', err);
    return [];
  }
};

