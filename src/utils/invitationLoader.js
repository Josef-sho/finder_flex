const normalizeTableName = (tableName) => {
  if (!tableName) return '';
  return tableName.trim().replace(/\s+/g, ' ');
};

const extractTableNumber = (tableName) => {
  if (!tableName) return null;
  const match = tableName.match(/\b(\d+)\b/);
  return match ? match[1] : null;
};

const extractDescriptiveName = (tableName) => {
  if (!tableName) return null;

  const parenMatch = tableName.match(/\(([^)]+)\)/);
  if (parenMatch) {
    let descriptive = parenMatch[1].trim().toUpperCase();

    if (tableName.includes('Celebrant Table') && !tableName.includes('Celebrant Table Annex')) {
      descriptive = `${descriptive} TABLE`;
    }

    return descriptive;
  }

  return null;
};

const addKeysForTable = (tableName, callback) => {
  if (!tableName || typeof callback !== 'function') {
    return;
  }

  const trimmed = tableName.trim();
  const normalized = tableName.toLowerCase().trim();
  const numberMatch = tableName.match(/(\d+)/);

  const keys = new Set([tableName, trimmed, normalized]);

  if (trimmed !== tableName.toLowerCase()) {
    keys.add(trimmed.toLowerCase());
  }

  if (numberMatch) {
    const number = numberMatch[1];
    keys.add(number);
    keys.add(`Table ${number}`);
    keys.add(`table ${number}`);
  }

  keys.forEach((key) => {
    if (key) {
      callback(key);
    }
  });
};

export const addInvitationVariants = (target, tableName, invitation, overwrite = false) => {
  if (!target || !tableName || !invitation) {
    return target;
  }

  addKeysForTable(tableName, (key) => {
    if (overwrite || !(key in target)) {
      target[key] = invitation;
    }
  });

  return target;
};

export const findInvitationInMap = (tableName, invitationMap) => {
  if (!tableName || !invitationMap) {
    return null;
  }

  const trimmed = tableName.trim();
  const normalized = tableName.toLowerCase().trim();
  const numberMatch = tableName.match(/(\d+)/);

  return (
    invitationMap[tableName] ||
    invitationMap[trimmed] ||
    invitationMap[normalized] ||
    invitationMap[trimmed.toLowerCase()] ||
    (numberMatch
      ? invitationMap[numberMatch[1]] ||
        invitationMap[`Table ${numberMatch[1]}`] ||
        invitationMap[`table ${numberMatch[1]}`]
      : null)
  );
};

export const getInvitationForTable = async (tableName) => {
  if (!tableName) return null;

  const normalizedTable = normalizeTableName(tableName);
  const tableNumber = extractTableNumber(tableName);
  const descriptiveName = extractDescriptiveName(tableName);
  const baseUrl = `${process.env.PUBLIC_URL || ''}/data/invitations/`;
  const extensions = ['.pdf', '.png', '.jpg', '.jpeg'];

  const filenameVariations = [];
  if (tableNumber && descriptiveName) {
    filenameVariations.push(`${tableNumber}.${descriptiveName}`);
    const compactName = descriptiveName.replace(/[\s._-]+/g, '');
    if (compactName && compactName !== descriptiveName) {
      filenameVariations.push(`${tableNumber}.${compactName}`);
    }
  }
  filenameVariations.push(normalizedTable);

  for (const filenameBase of filenameVariations) {
    for (const ext of extensions) {
      const rawFilename = `${filenameBase}${ext}`;
      const encodedFilename = `${encodeURIComponent(filenameBase)}${ext}`;
      const candidates = [
        { filename: encodedFilename, isEncoded: true },
        { filename: rawFilename, isEncoded: false },
      ];

      for (const candidate of candidates) {
        const url = `${baseUrl}${candidate.filename}`;
        try {
          const response = await fetch(url, { method: 'HEAD' });
          if (!response.ok) {
            continue;
          }

          const contentType = response.headers.get('content-type') || '';
          const contentLength = response.headers.get('content-length');

          if (contentType && contentType.includes('text/html')) {
            console.log(`Skipping ${url} - server returned HTML (likely 404 page)`);
            continue;
          }

          if (contentLength && parseInt(contentLength, 10) < 500) {
            console.log(`Skipping ${url} - file too small (${contentLength} bytes, likely error page)`);
            continue;
          }

          let fileType = contentType;
          if (!fileType || fileType === 'application/octet-stream') {
            if (ext === '.pdf') {
              fileType = 'application/pdf';
            } else if (ext === '.png') {
              fileType = 'image/png';
            } else if (ext === '.jpg' || ext === '.jpeg') {
              fileType = 'image/jpeg';
            }
          }

          console.log(
            `Found invitation: ${tableName} -> ${candidate.filename}${
              contentLength ? ` (${contentLength} bytes)` : ''
            }`
          );
          return {
            url,
            type: fileType,
            name: candidate.isEncoded ? `${filenameBase}${ext}` : rawFilename,
          };
        } catch (err) {
          console.warn(`Error checking file ${candidate.filename}:`, err);
        }
      }
    }
  }

  return null;
};

export const loadAllInvitations = async (tableNames) => {
  const invitations = {};

  if (!Array.isArray(tableNames) || tableNames.length === 0) {
    return invitations;
  }

  const checks = tableNames.map(async (tableName) => {
    const invitation = await getInvitationForTable(tableName);
    if (invitation) {
      addInvitationVariants(invitations, tableName, invitation);
    }
  });

  await Promise.all(checks);
  return invitations;
};

