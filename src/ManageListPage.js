import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import './ManageListPage.css';
import { loadGuestListFromFile, parseExcelFile } from './utils/excelParser';
import { loadGuestsFromSupabase, saveGuestsToSupabase, clearAllGuestsFromSupabase, clearAllInvitationsFromSupabase, uncheckAllGuests } from './utils/supabaseGuests';

export const GUEST_LIST_STORAGE_KEY = 'finder-flex:guest-list';

const ManageListPage = ({ onBack }) => {
  const fileInputRef = useRef(null);
  const [guestList, setGuestList] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadGuestList = async () => {
      // Try Supabase first
      const supabaseGuests = await loadGuestsFromSupabase();
      
      // If Supabase is configured (even if empty), use it and don't fall back
      if (supabaseGuests !== null) {
        setGuestList(supabaseGuests);
        // Also save to localStorage as backup
        try {
          window.localStorage.setItem(GUEST_LIST_STORAGE_KEY, JSON.stringify(supabaseGuests));
        } catch (storageError) {
          console.error('Failed to save guest list to storage', storageError);
        }
        return; // Don't fall back to Excel if Supabase is configured
      }

      // Fallback to Excel file only if Supabase is not configured
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
          console.error('Failed to load guest list from storage', storageError);
        }
      }
    };

    loadGuestList();
  }, []);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFileChange = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result;
          const guests = parseExcelFile(buffer);

          if (!guests.length) {
            setGuestList([]);
            setError(
              'We could not find any guests. Make sure column A lists guest names and table labels like "Table 1".'
            );
          } else {
            setGuestList(guests);
            setError('');
            
            // Save to Supabase if configured
            const savedToSupabase = await saveGuestsToSupabase(guests);
            if (savedToSupabase) {
              console.log('Guest list saved to Supabase');
            }
            
            // Also save to localStorage as backup
            try {
              window.localStorage.setItem(
                GUEST_LIST_STORAGE_KEY,
                JSON.stringify(guests)
              );
            } catch (storageError) {
              console.error(
                'Failed to persist guest list to storage',
                storageError
              );
            }
          }
        } catch (err) {
          console.error(err);
          setGuestList([]);
          setError('We could not process that file. Please try another.');
        } finally {
          resetFileInput();
        }
      };

      reader.onerror = () => {
        setGuestList([]);
        setError('We could not read that file. Please try again.');
        resetFileInput();
      };

      reader.readAsArrayBuffer(file);
    },
    [resetFileInput]
  );

  const displayColumns = useMemo(
    () => [
      { key: 'name', label: 'Guest' },
      { key: 'table', label: 'Table' },
      { key: 'downloaded', label: 'Downloaded' },
    ],
    []
  );

  const handleUncheckAll = useCallback(async () => {
    if (!window.confirm('Are you sure you want to uncheck all downloaded invitations? This will allow all guests to download their invitations again.')) {
      return;
    }

    const success = await uncheckAllGuests();
    if (success) {
      // Reload guest list to show updated status
      const supabaseGuests = await loadGuestsFromSupabase();
      if (supabaseGuests !== null) {
        setGuestList(supabaseGuests);
      } else {
        // Update local state
        setGuestList(prev => prev.map(g => ({ ...g, downloaded: false })));
      }
    } else {
      setError('Failed to uncheck all guests. Check console for details.');
    }
  }, []);

  const handleClear = useCallback(async () => {
    if (!window.confirm('Are you sure you want to clear all guests and invitations? This cannot be undone.')) {
      return;
    }

    // Clear guests and invitations from Supabase
    await clearAllGuestsFromSupabase();
    await clearAllInvitationsFromSupabase();

    // Clear from localStorage
    try {
      window.localStorage.removeItem(GUEST_LIST_STORAGE_KEY);
      const uploadsKey = `${GUEST_LIST_STORAGE_KEY}:uploads`;
      window.localStorage.removeItem(uploadsKey);
    } catch (storageError) {
      console.error('Failed to clear guest list from storage', storageError);
    }

    // Reload to show empty state (Supabase will return empty array, not fall back to Excel)
    window.location.reload();

    // Clear state
    setGuestList([]);
    setError('');
  }, []);

  return (
    <main className="ManageListPage">
      <header className="ManageListPage__header">
        <button type="button" className="ManageListPage__back" onClick={onBack}>
          ← Back
        </button>
        <h1 className="ManageListPage__title">Manage List</h1>
      </header>

      <section className="ManageListPage__content">
        {error ? (
          <div className="ManageListPage__status ManageListPage__status--error">
            {error}
          </div>
        ) : guestList.length ? (
          <>
            <div className="ManageListPage__info">
              <p className="ManageListPage__infoText">
                Guest list loaded. You can upload a new file to replace it or clear the list.
              </p>
            </div>
            <div className="ManageListPage__actions">
              <button
                type="button"
                className="ManageListPage__clearButton"
                onClick={handleClear}
              >
                Clear All Guests
              </button>
              <button
                type="button"
                className="ManageListPage__uncheckButton"
                onClick={handleUncheckAll}
              >
                Uncheck All Downloads
              </button>
            </div>
            <div className="ManageListPage__tableWrapper">
              <table className="ManageListPage__table">
                <thead>
                  <tr>
                    {displayColumns.map((column) => (
                      <th key={column.key} scope="col">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guestList.map((guest, index) => (
                    <tr key={`${guest.name}-${index}`}>
                      {displayColumns.map((column) => {
                        if (column.key === 'downloaded') {
                          return (
                            <td key={column.key} className="ManageListPage__checkCell">
                              {guest.downloaded ? (
                                <span className="ManageListPage__checkmark" aria-label="Downloaded">✓</span>
                              ) : (
                                <span className="ManageListPage__noCheck" aria-label="Not downloaded">—</span>
                              )}
                            </td>
                          );
                        }
                        return (
                          <td key={column.key}>
                            {guest[column.key] || '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="ManageListPage__status">
            <p>
              Upload an Excel file (.xlsx or .xls) where column A alternates
              between rows like <strong>Table 1</strong> and the guest names
              for that table. We will list each guest with the table they belong
              to.
            </p>
            <button
              type="button"
              className="ManageListPage__primaryUpload"
              onClick={handleUploadClick}
            >
              Choose Excel File
            </button>
          </div>
        )}
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="ManageListPage__fileInput"
        onChange={handleFileChange}
      />

      {guestList.length > 0 && (
        <div className="ManageListPage__uploadSection">
          <button
            type="button"
            className="ManageListPage__upload"
            onClick={handleUploadClick}
          >
            Upload New List
          </button>
        </div>
      )}
    </main>
  );
};

export default ManageListPage;
