import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import './ManageListPage.css';
import { loadGuestListFromFile, parseExcelFile } from './utils/excelParser';
import { loadGuestsFromSupabase, saveGuestsToSupabase, clearAllGuestsFromSupabase, clearAllInvitationsFromSupabase, uncheckAllGuests, getDownloadedGuests, markGuestAsDownloaded, getSupabaseForDownloads } from './utils/supabaseGuests';

export const GUEST_LIST_STORAGE_KEY = 'finder-flex:guest-list';

const normalizeValue = (value) =>
  value
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const ManageListPage = ({ onBack }) => {
  const fileInputRef = useRef(null);
  const [guestList, setGuestList] = useState([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDownloaded, setFilterDownloaded] = useState(false);
  const [filterTable, setFilterTable] = useState('');
  const [editingGuest, setEditingGuest] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestTable, setNewGuestTable] = useState('');

  useEffect(() => {
    const loadGuestList = async () => {
      // Try Supabase first (with full config)
      let supabaseGuests = await loadGuestsFromSupabase();
      
      // If Supabase is not configured with flag, try loading from Supabase using download client
      if (supabaseGuests === null) {
        const downloadSupabase = getSupabaseForDownloads();
        if (downloadSupabase) {
          try {
            const { data, error } = await downloadSupabase
              .from('guests')
              .select('*')
              .order('table_name', { ascending: true })
              .order('name', { ascending: true });
            
            if (!error && data) {
              supabaseGuests = data.map(guest => ({
                name: guest.name,
                table: guest.table_name,
                downloaded: guest.downloaded || false,
              }));
            }
          } catch (err) {
            console.error('Error loading guests from Supabase:', err);
          }
        }
      }
      
      // If Supabase is configured (even if empty), use it and don't fall back
      if (supabaseGuests !== null) {
        // Load download status from Supabase (Supabase is used ONLY for download tracking)
        const downloadedNames = await getDownloadedGuests();
        const guestsWithStatus = supabaseGuests.map(guest => ({
          ...guest,
          downloaded: guest.downloaded === true || downloadedNames.includes(guest.name)
        }));
        setGuestList(guestsWithStatus);
        // Also save to localStorage as backup
        try {
          window.localStorage.setItem(GUEST_LIST_STORAGE_KEY, JSON.stringify(guestsWithStatus));
        } catch (storageError) {
          console.error('Failed to save guest list to storage', storageError);
        }
        return; // Don't fall back to Excel if Supabase is configured
      }

      // Fallback to localStorage first (to preserve edits), then Excel file only if Supabase is not configured
      let guests = [];
      
      // Check localStorage first to preserve any edits
      try {
        const storedValue = window.localStorage.getItem(GUEST_LIST_STORAGE_KEY);
        if (storedValue) {
          const parsed = JSON.parse(storedValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            guests = parsed;
          }
        }
      } catch (storageError) {
        console.error('Failed to read guest list from storage', storageError);
      }

      // Only load from Excel if localStorage is empty
      if (guests.length === 0) {
        const possibleFilenames = [
          'Mr Tunde Martins AKande @60 Guest List.xlsx',
          'guest-list.xlsx'
        ];
        
        for (const filename of possibleFilenames) {
          const excelUrl = `${process.env.PUBLIC_URL || ''}/data/${encodeURIComponent(filename)}`;
          guests = await loadGuestListFromFile(excelUrl);
          if (guests.length > 0) {
            break; // Found a valid file
          }
        }
      }
      
      if (guests.length > 0) {
        // Load download status from Supabase (Supabase is used ONLY for download tracking)
        const downloadedNames = await getDownloadedGuests();
        const guestsWithStatus = guests.map(guest => ({
          ...guest,
          downloaded: downloadedNames.includes(guest.name)
        }));
        
        setGuestList(guestsWithStatus);
        // Also save to localStorage as backup (in case it wasn't already there)
        try {
          window.localStorage.setItem(GUEST_LIST_STORAGE_KEY, JSON.stringify(guestsWithStatus));
        } catch (storageError) {
          console.error('Failed to save guest list to storage', storageError);
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
          const newGuests = parseExcelFile(buffer);

          if (!newGuests.length) {
            setGuestList([]);
            setError(
              'We could not find any guests. Make sure column A lists guest names and table labels like "Table 1".'
            );
          } else {
            // Preserve download statuses from existing list and Supabase
            const downloadedNames = await getDownloadedGuests();
            
            // Create a map of existing guests with their download status
            const existingGuestsMap = new Map();
            guestList.forEach(guest => {
              existingGuestsMap.set(guest.name.toLowerCase(), guest.downloaded);
            });
            
            // Merge new guests with preserved download statuses
            const guestsWithStatus = newGuests.map(guest => {
              const normalizedName = guest.name.toLowerCase();
              const wasDownloaded = existingGuestsMap.get(normalizedName) || 
                                    downloadedNames.includes(guest.name);
              
              return {
                ...guest,
                downloaded: wasDownloaded
              };
            });
            
            setGuestList(guestsWithStatus);
            setError('');
            
            // Save to Supabase if configured
            const supabaseGuests = await loadGuestsFromSupabase();
            if (supabaseGuests !== null) {
              const saved = await saveGuestsToSupabase(guestsWithStatus);
              if (saved) {
                console.log('Guest list saved to Supabase with preserved download statuses');
              }
            } else {
              // Even if Supabase isn't configured with flag, try to save using download client
              const downloadSupabase = getSupabaseForDownloads();
              if (downloadSupabase) {
                try {
                  // Get all existing guests from Supabase to preserve their download status
                  const { data: existingData } = await downloadSupabase
                    .from('guests')
                    .select('name, downloaded');
                  
                  const existingDownloadMap = new Map();
                  if (existingData) {
                    existingData.forEach(g => {
                      existingDownloadMap.set(g.name.toLowerCase(), g.downloaded);
                    });
                  }
                  
                  // Merge download statuses
                  const finalGuests = guestsWithStatus.map(guest => {
                    const normalizedName = guest.name.toLowerCase();
                    const supabaseDownloaded = existingDownloadMap.get(normalizedName);
                    return {
                      ...guest,
                      downloaded: supabaseDownloaded !== undefined ? supabaseDownloaded : guest.downloaded
                    };
                  });
                  
                  // Delete all and insert updated list
                  await downloadSupabase.from('guests').delete().neq('id', 0);
                  
                  if (finalGuests.length > 0) {
                    const guestsToInsert = finalGuests.map(guest => ({
                      name: guest.name,
                      table_name: guest.table || 'Unknown',
                      downloaded: guest.downloaded || false,
                    }));
                    
                    const { error } = await downloadSupabase.from('guests').insert(guestsToInsert);
                    if (error) {
                      console.error('Error saving guest list to Supabase:', error);
                    } else {
                      console.log('Guest list saved to Supabase with preserved download statuses');
                    }
                  }
                } catch (err) {
                  console.error('Error saving guest list to Supabase:', err);
                }
              }
            }
            
            // Also save to localStorage as backup
            try {
              window.localStorage.setItem(
                GUEST_LIST_STORAGE_KEY,
                JSON.stringify(guestsWithStatus)
              );
              // Dispatch event to notify other tabs/pages
              window.dispatchEvent(new Event('guestListUpdated'));
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
      { key: 'actions', label: 'Actions' },
    ],
    []
  );

  // Get unique tables for filter dropdown
  const uniqueTables = useMemo(() => {
    const tables = [...new Set(guestList.map(g => g.table).filter(Boolean))];
    return tables.sort((a, b) => {
      // Extract numbers for numeric sorting
      const numA = parseInt(a.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.match(/\d+/)?.[0] || '0');
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
  }, [guestList]);

  // Filter guests based on search query, download status, and table
  const filteredGuestList = useMemo(() => {
    let filtered = guestList;

    // Filter by table first
    if (filterTable) {
      filtered = filtered.filter((guest) => guest.table === filterTable);
    }

    // Filter by download status
    if (filterDownloaded) {
      filtered = filtered.filter((guest) => guest.downloaded === true);
    }

    // Then filter by search query
    if (searchQuery.trim()) {
      const normalizedQuery = normalizeValue(searchQuery);
      filtered = filtered.filter((guest) => {
        const normalizedName = normalizeValue(guest.name || '');
        const normalizedTable = normalizeValue(guest.table || '');
        
        // Check if query matches name or table
        return (
          normalizedName.includes(normalizedQuery) ||
          normalizedTable.includes(normalizedQuery)
        );
      });
    }

    return filtered;
  }, [guestList, searchQuery, filterDownloaded, filterTable]);

  const handleToggleDownloaded = useCallback(async (guestName, currentStatus) => {
    const newStatus = !currentStatus;
    const guest = guestList.find(g => g.name === guestName);

    // Update local state immediately
    const updatedList = guestList.map(g => 
      g.name === guestName 
        ? { ...g, downloaded: newStatus }
        : g
    );
    setGuestList(updatedList);

    // Update Supabase
    if (newStatus) {
      await markGuestAsDownloaded(guestName, guest?.table);
    } else {
      // To unmark, we need to update Supabase directly
      const downloadSupabase = getSupabaseForDownloads();
      if (downloadSupabase) {
        try {
          const { error } = await downloadSupabase
            .from('guests')
            .update({ downloaded: false })
            .eq('name', guestName);
          if (error) {
            console.error('Error unmarking download in Supabase:', error);
          }
        } catch (err) {
          console.error('Error unmarking download in Supabase:', err);
        }
      }
    }

    // Update localStorage
    try {
      window.localStorage.setItem(GUEST_LIST_STORAGE_KEY, JSON.stringify(updatedList));
      window.dispatchEvent(new Event('guestListUpdated'));
    } catch (storageError) {
      console.error('Failed to update guest list in storage', storageError);
    }
  }, [guestList]);

  const handleUncheckAll = useCallback(async () => {
    if (!window.confirm('Are you sure you want to reset all download statuses? This will allow all guests to download their invitations again.')) {
      return;
    }

    const success = await uncheckAllGuests();
    if (success) {
      // Update local state to reflect cleared download status
      setGuestList(prev => prev.map(g => ({ ...g, downloaded: false })));
      
      // Also update localStorage backup to reflect the change
      try {
        const updatedList = guestList.map(g => ({ ...g, downloaded: false }));
        window.localStorage.setItem(GUEST_LIST_STORAGE_KEY, JSON.stringify(updatedList));
      } catch (storageError) {
        console.error('Failed to update guest list in storage', storageError);
      }
      
      setError('');
    } else {
      setError('Failed to reset download statuses. Check console for details.');
    }
  }, [guestList]);

  const handleStartEdit = useCallback((guest, originalName) => {
    setEditingGuest(originalName);
    setEditingName(guest.name);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingGuest(null);
    setEditingName('');
  }, []);

  const handleSaveEdit = useCallback(async (originalName) => {
    if (!editingName.trim()) {
      alert('Name cannot be empty');
      return;
    }

    const trimmedName = editingName.trim();
    
    // Check if the new name already exists (excluding the current guest)
    const nameExists = guestList.some(
      g => g.name.toLowerCase() === trimmedName.toLowerCase() && g.name !== originalName
    );
    
    if (nameExists) {
      alert('A guest with this name already exists');
      return;
    }

    // Find the guest being edited to preserve download status
    const guestBeingEdited = guestList.find(g => g.name === originalName);
    const hadDownloaded = guestBeingEdited?.downloaded || false;

    // Update local state
    const updatedList = guestList.map(guest => 
      guest.name === originalName 
        ? { ...guest, name: trimmedName }
        : guest
    );
    setGuestList(updatedList);

    // Always try to save to Supabase if credentials are available (for cross-device sync)
    // First check if Supabase is configured for full guest list
    const supabaseGuests = await loadGuestsFromSupabase();
    if (supabaseGuests !== null) {
      // Update the entire list in Supabase
      const saved = await saveGuestsToSupabase(updatedList);
      if (!saved) {
        console.error('Failed to save updated guest list to Supabase');
        setError('Failed to save changes to Supabase. Changes saved locally only.');
      }
    } else {
      // Even if Supabase isn't configured for guest list, try to save using the download tracking client
      // This allows cross-device sync even when REACT_APP_USE_SUPABASE is not set
      const downloadSupabase = getSupabaseForDownloads();
      
      if (downloadSupabase) {
        try {
          // Delete all existing guests and insert the updated list
          await downloadSupabase.from('guests').delete().neq('id', 0);
          
          if (updatedList.length > 0) {
            const guestsToInsert = updatedList.map(guest => ({
              name: guest.name,
              table_name: guest.table || 'Unknown',
              downloaded: guest.downloaded || false,
            }));
            
            const { error } = await downloadSupabase.from('guests').insert(guestsToInsert);
            if (error) {
              console.error('Error saving guest list to Supabase:', error);
            } else {
              console.log('Guest list saved to Supabase for cross-device sync');
            }
          }
        } catch (err) {
          console.error('Error saving guest list to Supabase:', err);
        }
      }
      
      // Update download record if needed
      if (hadDownloaded) {
        await markGuestAsDownloaded(trimmedName, guestBeingEdited?.table);
      }
    }

    // Update localStorage
    try {
      window.localStorage.setItem(GUEST_LIST_STORAGE_KEY, JSON.stringify(updatedList));
      // Dispatch custom event to notify other tabs/pages
      window.dispatchEvent(new Event('guestListUpdated'));
    } catch (storageError) {
      console.error('Failed to update guest list in storage', storageError);
    }

    setEditingGuest(null);
    setEditingName('');
    setError('');
  }, [editingName, guestList]);

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
            <div className="ManageListPage__stats">
              <div className="ManageListPage__statItem">
                <span className="ManageListPage__statLabel">Total Guests</span>
                <span className="ManageListPage__statValue">{guestList.length}</span>
              </div>
              <div className="ManageListPage__statItem">
                <span className="ManageListPage__statLabel">Downloaded</span>
                <span className="ManageListPage__statValue ManageListPage__statValue--downloaded">
                  {guestList.filter(g => g.downloaded).length}
                </span>
              </div>
              <div className="ManageListPage__statItem">
                <span className="ManageListPage__statLabel">Not Downloaded</span>
                <span className="ManageListPage__statValue ManageListPage__statValue--notDownloaded">
                  {guestList.filter(g => !g.downloaded).length}
                </span>
              </div>
            </div>
            <div className="ManageListPage__info">
              <p className="ManageListPage__infoText">
                Guest list loaded. You can upload a new file to replace it or clear the list.
              </p>
            </div>
            <div className="ManageListPage__searchWrapper">
              <input
                type="text"
                className="ManageListPage__searchInput"
                placeholder="Search by name or table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="ManageListPage__searchClear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            <div className="ManageListPage__filters">
              <div className="ManageListPage__tableFilterWrapper">
                <label htmlFor="table-filter" className="ManageListPage__tableFilterLabel">
                  Filter by Table:
                </label>
                <select
                  id="table-filter"
                  className="ManageListPage__tableFilter"
                  value={filterTable}
                  onChange={(e) => setFilterTable(e.target.value)}
                >
                  <option value="">All Tables</option>
                  {uniqueTables.map((table) => (
                    <option key={table} value={table}>
                      {table}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className={`ManageListPage__filterButton ${filterDownloaded ? 'ManageListPage__filterButton--active' : ''}`}
                onClick={() => setFilterDownloaded(!filterDownloaded)}
              >
                {filterDownloaded ? (
                  <>
                    <span className="ManageListPage__filterIcon">✓</span>
                    Show Only Downloaded
                  </>
                ) : (
                  <>
                    <span className="ManageListPage__filterIcon">○</span>
                    Show Only Downloaded
                  </>
                )}
              </button>
            </div>
            {(searchQuery || filterDownloaded || filterTable) && (
              <div className="ManageListPage__searchResults">
                <p className="ManageListPage__searchResultsText">
                  Showing {filteredGuestList.length} of {guestList.length} guests
                  {filterTable && ` from ${filterTable}`}
                  {filterDownloaded && ` (${guestList.filter(g => g.downloaded).length} downloaded)`}
                </p>
              </div>
            )}
            <div className="ManageListPage__actions">
              <button
                type="button"
                className="ManageListPage__addButton"
                onClick={() => setShowAddGuest(true)}
              >
                + Add New Guest
              </button>
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
                Reset All Downloads
              </button>
            </div>
            {showAddGuest && (
              <div className="ManageListPage__addGuestModal">
                <div className="ManageListPage__addGuestContent">
                  <h3 className="ManageListPage__addGuestTitle">Add New Guest</h3>
                  <div className="ManageListPage__addGuestForm">
                    <div className="ManageListPage__addGuestField">
                      <label htmlFor="new-guest-name" className="ManageListPage__addGuestLabel">
                        Guest Name:
                      </label>
                      <input
                        id="new-guest-name"
                        type="text"
                        className="ManageListPage__addGuestInput"
                        value={newGuestName}
                        onChange={(e) => setNewGuestName(e.target.value)}
                        placeholder="Enter guest name"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddGuest();
                          } else if (e.key === 'Escape') {
                            setShowAddGuest(false);
                            setNewGuestName('');
                            setNewGuestTable('');
                          }
                        }}
                      />
                    </div>
                    <div className="ManageListPage__addGuestField">
                      <label htmlFor="new-guest-table" className="ManageListPage__addGuestLabel">
                        Table:
                      </label>
                      <select
                        id="new-guest-table"
                        className="ManageListPage__addGuestInput"
                        value={newGuestTable}
                        onChange={(e) => setNewGuestTable(e.target.value)}
                      >
                        <option value="">Select a table</option>
                        {uniqueTables.map((table) => (
                          <option key={table} value={table}>
                            {table}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="ManageListPage__addGuestActions">
                      <button
                        type="button"
                        className="ManageListPage__addGuestSave"
                        onClick={handleAddGuest}
                      >
                        Add Guest
                      </button>
                      <button
                        type="button"
                        className="ManageListPage__addGuestCancel"
                        onClick={() => {
                          setShowAddGuest(false);
                          setNewGuestName('');
                          setNewGuestTable('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                  {filteredGuestList.length > 0 ? (
                    filteredGuestList.map((guest, index) => {
                      const isEditing = editingGuest === guest.name;
                      return (
                        <tr key={`${guest.name}-${index}`}>
                          {displayColumns.map((column) => {
                            if (column.key === 'downloaded') {
                              return (
                                <td key={column.key} className="ManageListPage__checkCell">
                                  <button
                                    type="button"
                                    className={`ManageListPage__downloadToggle ${guest.downloaded ? 'ManageListPage__downloadToggle--downloaded' : ''}`}
                                    onClick={() => handleToggleDownloaded(guest.name, guest.downloaded)}
                                    aria-label={guest.downloaded ? 'Mark as not downloaded' : 'Mark as downloaded'}
                                    title={guest.downloaded ? 'Click to mark as not downloaded' : 'Click to mark as downloaded'}
                                  >
                                    {guest.downloaded ? (
                                      <span className="ManageListPage__checkmark">✓</span>
                                    ) : (
                                      <span className="ManageListPage__noCheck">—</span>
                                    )}
                                  </button>
                                </td>
                              );
                            }
                            if (column.key === 'name' && isEditing) {
                              return (
                                <td key={column.key} className="ManageListPage__editCell">
                                  <div className="ManageListPage__editWrapper">
                                    <input
                                      type="text"
                                      className="ManageListPage__editInput"
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveEdit(guest.name);
                                        } else if (e.key === 'Escape') {
                                          handleCancelEdit();
                                        }
                                      }}
                                      autoFocus
                                    />
                                    <div className="ManageListPage__editActions">
                                      <button
                                        type="button"
                                        className="ManageListPage__editSave"
                                        onClick={() => handleSaveEdit(guest.name)}
                                        aria-label="Save"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        type="button"
                                        className="ManageListPage__editCancel"
                                        onClick={handleCancelEdit}
                                        aria-label="Cancel"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              );
                            }
                            if (column.key === 'name' && !isEditing) {
                              return (
                                <td key={column.key} className="ManageListPage__nameCell">
                                  <div className="ManageListPage__nameWrapper">
                                    <span>{guest.name || '—'}</span>
                                    <button
                                      type="button"
                                      className="ManageListPage__editButton"
                                      onClick={() => handleStartEdit(guest, guest.name)}
                                      aria-label="Edit name"
                                    >
                                      ✎
                                    </button>
                                  </div>
                                </td>
                              );
                            }
                            if (column.key === 'actions') {
                              return (
                                <td key={column.key} className="ManageListPage__actionsCell">
                                  <button
                                    type="button"
                                    className="ManageListPage__deleteButton"
                                    onClick={() => handleDeleteGuest(guest.name)}
                                    aria-label={`Delete ${guest.name}`}
                                    title="Delete guest"
                                  >
                                    🗑
                                  </button>
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
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={displayColumns.length} className="ManageListPage__noResults">
                        No guests found matching "{searchQuery}"
                      </td>
                    </tr>
                  )}
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
