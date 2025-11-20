import React, { useEffect, useMemo, useState } from 'react';
import './UploadInvitationsPage.css';
import { GUEST_LIST_STORAGE_KEY } from './ManageListPage';
import { loadGuestListFromFile } from './utils/excelParser';
import { getInvitationForTable } from './utils/invitationLoader';

const UploadInvitationsPage = ({ onBack }) => {
  const [guestList, setGuestList] = useState([]);
  const [invitations, setInvitations] = useState({});

  useEffect(() => {
    const loadGuestList = async () => {
      // Try to load from Excel file - try actual filename first, then fallback
      const possibleFilenames = [
        'Mr Tunde Martins AKande @60 Guest List.xlsx',
        'guest-list.xlsx'
      ];
      
      let guests = [];
      for (const filename of possibleFilenames) {
        const excelUrl = `${process.env.PUBLIC_URL || ''}/data/${encodeURIComponent(filename)}`;
        guests = await loadGuestListFromFile(excelUrl);
        if (guests.length > 0) {
          break; // Found a valid file
        }
      }
      
      if (guests.length > 0) {
        setGuestList(guests);
        // Also save to localStorage as backup
        try {
          window.localStorage.setItem(GUEST_LIST_STORAGE_KEY, JSON.stringify(guests));
        } catch (storageError) {
          console.error('Failed to save guest list to storage', storageError);
        }
      } else {
        // Fallback to localStorage if Excel file not found
        try {
          const storedValue = window.localStorage.getItem(GUEST_LIST_STORAGE_KEY);
          if (storedValue) {
            const parsed = JSON.parse(storedValue);
            if (Array.isArray(parsed)) {
              setGuestList(parsed);
            }
          }
        } catch (storageError) {
          console.error('Failed to read guest list from storage', storageError);
        }
      }
    };

    loadGuestList();
  }, []);

  useEffect(() => {
    const loadInvitations = async () => {
      if (guestList.length > 0) {
        // Get unique table names
        const tableNames = [...new Set(guestList.map(guest => guest.table).filter(Boolean))];
        const loadedInvitations = {};
        
        // Check each table for an invitation file
        for (const tableName of tableNames) {
          const invitation = await getInvitationForTable(tableName);
          if (invitation) {
            loadedInvitations[tableName] = invitation;
          }
        }
        
        setInvitations(loadedInvitations);
      }
    };

    if (guestList.length > 0) {
      loadInvitations();
    }
  }, [guestList]);

  const tables = useMemo(() => {
    const tableMap = new Map();

    guestList.forEach((guest) => {
      const tableName = guest.table || 'Unassigned';
      if (!tableMap.has(tableName)) {
        tableMap.set(tableName, []);
      }
      tableMap.get(tableName).push(guest);
    });

    return Array.from(tableMap.entries())
      .map(([name, guests]) => ({
        name,
        count: guests.length,
        hasInvitation: !!invitations[name],
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [guestList, invitations]);

  return (
    <main className="UploadInvitationsPage">
      <header className="UploadInvitationsPage__header">
        <button
          type="button"
          className="UploadInvitationsPage__back"
          onClick={onBack}
        >
          ← Back
        </button>
        <h1 className="UploadInvitationsPage__title">Invitations</h1>
      </header>

      <section className="UploadInvitationsPage__info">
        <p className="UploadInvitationsPage__infoText">
          <strong>How to add invitations:</strong> Place invitation files in <code>public/data/invitations/</code> 
          named by table (e.g., <code>Table 1.pdf</code>, <code>Table 2.png</code>). 
          Supported formats: PDF, PNG, JPG, JPEG. After adding files, rebuild the app.
        </p>
      </section>

      {guestList.length === 0 ? (
        <section className="UploadInvitationsPage__status">
          <p>
            No guest list found. Upload a list first so we can show table information.
          </p>
        </section>
      ) : (
        <section className="UploadInvitationsPage__grid">
          {tables.map((table) => (
            <article key={table.name} className="UploadInvitationsPage__card">
              <h2 className="UploadInvitationsPage__cardTitle">{table.name}</h2>
              <p className="UploadInvitationsPage__cardMeta">
                {table.count} guest{table.count === 1 ? '' : 's'}
              </p>
              <div className="UploadInvitationsPage__status">
                {table.hasInvitation ? (
                  <div className="UploadInvitationsPage__statusBadge UploadInvitationsPage__statusBadge--success">
                    ✓ Invitation Available
                  </div>
                ) : (
                  <div className="UploadInvitationsPage__statusBadge UploadInvitationsPage__statusBadge--missing">
                    No Invitation
                  </div>
                )}
              </div>
              {table.hasInvitation && invitations[table.name] && (
                <div className="UploadInvitationsPage__fileInfo">
                  <p className="UploadInvitationsPage__fileName">
                    {invitations[table.name].name}
                  </p>
                  <a
                    href={invitations[table.name].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="UploadInvitationsPage__view"
                  >
                    View
                  </a>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
};

export default UploadInvitationsPage;
