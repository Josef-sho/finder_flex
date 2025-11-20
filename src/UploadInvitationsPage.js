import React, { useEffect, useMemo, useRef, useState } from 'react';
import './UploadInvitationsPage.css';
import { GUEST_LIST_STORAGE_KEY } from './ManageListPage';
import { loadGuestListFromFile } from './utils/excelParser';
import { getInvitationForTable } from './utils/invitationLoader';
import { loadGuestsFromSupabase, loadInvitationsFromSupabase, saveInvitationToSupabase, deleteInvitationFromSupabase } from './utils/supabaseGuests';

const UploadInvitationsPage = ({ onBack }) => {
  const [guestList, setGuestList] = useState([]);
  const [invitations, setInvitations] = useState({});
  const fileInputsRef = useRef({});
  const [uploading, setUploading] = useState({});

  useEffect(() => {
    const loadGuestList = async () => {
      // Try Supabase first
      const supabaseGuests = await loadGuestsFromSupabase();
      
      if (supabaseGuests !== null && supabaseGuests.length > 0) {
        // Use Supabase data
        setGuestList(supabaseGuests);
        // Also save to localStorage as backup
        try {
          window.localStorage.setItem(GUEST_LIST_STORAGE_KEY, JSON.stringify(supabaseGuests));
        } catch (storageError) {
          console.error('Failed to save guest list to storage', storageError);
        }
        return;
      }

      // Fallback to Excel file if Supabase not configured or empty
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
      if (guestList.length === 0) return;

      // Try Supabase first
      const supabaseInvitations = await loadInvitationsFromSupabase();
      
      if (supabaseInvitations !== null) {
        // Use Supabase invitations
        setInvitations(supabaseInvitations);
        return;
      }

      // Fallback to public folder if Supabase not configured
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
    };

    loadInvitations();
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

  const handleSelectFile = (tableName) => {
    if (fileInputsRef.current[tableName]) {
      fileInputsRef.current[tableName].click();
    }
  };

  const handleFileChange = async (tableName, event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(prev => ({ ...prev, [tableName]: true }));

    const reader = new FileReader();

    reader.onload = async (e) => {
      const dataUrl = e.target?.result;
      if (!dataUrl || typeof dataUrl !== 'string') {
        setUploading(prev => ({ ...prev, [tableName]: false }));
        return;
      }

      // Save to Supabase
      const saved = await saveInvitationToSupabase(
        tableName,
        null, // file_url (not using external URLs)
        file.type,
        file.name,
        dataUrl // Store as base64 data URL
      );

      if (saved) {
        // Reload invitations to show the new one
        const updatedInvitations = await loadInvitationsFromSupabase();
        if (updatedInvitations !== null) {
          setInvitations(updatedInvitations);
        } else {
          // Fallback: update local state
          setInvitations(prev => ({
            ...prev,
            [tableName]: {
              url: dataUrl,
              type: file.type,
              name: file.name,
              dataUrl: dataUrl,
            },
          }));
        }
      }

      setUploading(prev => ({ ...prev, [tableName]: false }));
      // Reset file input
      if (fileInputsRef.current[tableName]) {
        fileInputsRef.current[tableName].value = '';
      }
    };

    reader.onerror = () => {
      setUploading(prev => ({ ...prev, [tableName]: false }));
    };

    reader.readAsDataURL(file);
  };

  const handleClearInvitation = async (tableName) => {
    if (!window.confirm(`Are you sure you want to remove the invitation for ${tableName}?`)) {
      return;
    }

    const deleted = await deleteInvitationFromSupabase(tableName);
    if (deleted) {
      // Reload invitations
      const updatedInvitations = await loadInvitationsFromSupabase();
      if (updatedInvitations !== null) {
        setInvitations(updatedInvitations);
      } else {
        // Fallback: update local state
        setInvitations(prev => {
          const next = { ...prev };
          delete next[tableName];
          return next;
        });
      }
    }
  };

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
          <strong>Upload invitations:</strong> Click "Upload Invitation" for each table to add invitation files. 
          Supported formats: PDF, PNG, JPG, JPEG. Invitations are saved to Supabase and available on all devices.
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
              <div className="UploadInvitationsPage__actions">
                <button
                  type="button"
                  className="UploadInvitationsPage__upload"
                  onClick={() => handleSelectFile(table.name)}
                  disabled={uploading[table.name]}
                >
                  {uploading[table.name] ? 'Uploading...' : (table.hasInvitation ? 'Replace Invitation' : 'Upload Invitation')}
                </button>
                {table.hasInvitation && (
                  <button
                    type="button"
                    className="UploadInvitationsPage__clear"
                    onClick={() => handleClearInvitation(table.name)}
                  >
                    Remove
                  </button>
                )}
              </div>
              {table.hasInvitation && invitations[table.name] && (
                <div className="UploadInvitationsPage__fileInfo">
                  <p className="UploadInvitationsPage__fileName">
                    {invitations[table.name].name}
                  </p>
                  <a
                    href={invitations[table.name].url || invitations[table.name].dataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="UploadInvitationsPage__view"
                  >
                    View
                  </a>
                </div>
              )}
              <input
                ref={(node) => {
                  fileInputsRef.current[table.name] = node;
                }}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
                className="UploadInvitationsPage__fileInput"
                onChange={(event) => handleFileChange(table.name, event)}
              />
            </article>
          ))}
        </section>
      )}
    </main>
  );
};

export default UploadInvitationsPage;
