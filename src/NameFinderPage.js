import React, { useEffect, useMemo, useState } from 'react';
import './NameFinderPage.css';
import { GUEST_LIST_STORAGE_KEY } from './ManageListPage';
import { loadGuestListFromFile } from './utils/excelParser';
import { loadAllInvitations, findInvitationInMap } from './utils/invitationLoader';
import { downloadFile } from './utils/downloadHelper';
import { loadGuestsFromSupabase, loadInvitationsFromSupabase, markGuestAsDownloaded, getDownloadedGuests, isGuestDownloaded, getSupabaseForDownloads } from './utils/supabaseGuests';

const HERO_IMAGE_FILENAME = 'CELEBRANT IMAGE.png';
const HERO_IMAGE_URL = `${process.env.PUBLIC_URL || ''}/images/${encodeURIComponent(
  HERO_IMAGE_FILENAME
)}`;
const STARFIELD_IMAGE_FILENAME = 'stars-bg.png';
const STARFIELD_IMAGE_URL = `${process.env.PUBLIC_URL || ''}/images/${encodeURIComponent(
  STARFIELD_IMAGE_FILENAME
)}`;

const normalizeValue = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

// Stricter matching: requires query to match at the start of the name or any word (including last names)
// Complete word matches (like full last names) work regardless of length
// Handles hyphenated names like "Martins-Akande" by splitting on both spaces and hyphens
const isVerySimilar = (name, query) => {
  if (!query) {
    return false;
  }

  // Split into words BEFORE normalizing, handling both spaces and hyphens
  // This handles names like "John Martins-Akande" or "Mary-Jane Smith"
  const nameWords = name
    .split(/[\s-]+/) // Split on spaces and hyphens
    .filter(w => w.trim().length > 0);
  const normalizedQuery = normalizeValue(query);
  const normalizedName = normalizeValue(name);

  // Check if query exactly matches any complete word (first name, last name, etc.)
  // This allows short last names to work (e.g., "Smith" = 5 chars, "Akande" = 6 chars)
  // Normalize each word individually for comparison
  for (const word of nameWords) {
    const normalizedWord = normalizeValue(word);
    if (normalizedWord === normalizedQuery) {
      return true; // Exact match of a complete word - always show
    }
  }

  // For partial matches, require at least 9 characters
  if (normalizedQuery.length < 9) {
    return false;
  }

  // Exact match at the start of full name
  if (normalizedName.startsWith(normalizedQuery)) {
    return true;
  }

  // Match at the start of any word in the name
  for (const word of nameWords) {
    const normalizedWord = normalizeValue(word);
    if (normalizedWord.startsWith(normalizedQuery)) {
      return true;
    }
    // Also check if query matches anywhere in the word (for longer queries)
    if (normalizedWord.length >= normalizedQuery.length && normalizedWord.includes(normalizedQuery)) {
      return true;
    }
  }

  // Check if any word contains the query (for last name matching)
  for (const word of nameWords) {
    const normalizedWord = normalizeValue(word);
    if (normalizedWord.includes(normalizedQuery)) {
      return true;
    }
  }

  // Very strict fuzzy match: query must match in order with minimal gaps
  // Require at least 80% of query characters to match in sequence
  let queryIndex = 0;
  let matchedChars = 0;
  
  for (let i = 0; i < normalizedName.length && queryIndex < normalizedQuery.length; i++) {
    if (normalizedName[i] === normalizedQuery[queryIndex]) {
      matchedChars++;
      queryIndex++;
    }
  }

  // Require at least 80% match and query must be mostly consumed
  const matchRatio = matchedChars / normalizedQuery.length;
  return matchRatio >= 0.8 && queryIndex >= normalizedQuery.length * 0.8;
};

const NameFinderPage = () => {
  const [guestList, setGuestList] = useState([]);
  const [uploads, setUploads] = useState({});
  const [query, setQuery] = useState('');
  const [selectedGuest, setSelectedGuest] = useState(null);

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

      // Fallback to localStorage first (to get any edits from ManageListPage), then Excel file
      let guests = [];
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

      // If localStorage is empty, try Excel file
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

    // Listen for storage changes to reload when guest list is updated in ManageListPage
    const handleStorageChange = (e) => {
      if (e.key === GUEST_LIST_STORAGE_KEY && e.newValue) {
        loadGuestList();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event for same-tab updates
    const handleCustomStorageUpdate = () => {
      loadGuestList();
    };
    window.addEventListener('guestListUpdated', handleCustomStorageUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('guestListUpdated', handleCustomStorageUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadInvitations = async () => {
      if (guestList.length === 0) return;

      // Try Supabase first
      const supabaseInvitations = await loadInvitationsFromSupabase();
      
      if (supabaseInvitations !== null) {
        // Use Supabase invitations
        setUploads(supabaseInvitations);
        return;
      }

      // Fallback to public folder if Supabase not configured
      const tableNames = [...new Set(guestList.map(guest => guest.table).filter(Boolean))];
      const invitations = await loadAllInvitations(tableNames);
      setUploads(invitations);
    };

    loadInvitations();
  }, [guestList]);

  const results = useMemo(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }
    // Note: isVerySimilar handles the 9-character requirement for partial matches
    // but allows complete word matches regardless of length

    return guestList.filter((guest) => {
      if (!guest?.name) {
        return false;
      }
      return isVerySimilar(guest.name, trimmedQuery);
    });
  }, [guestList, query]);

  const handleChange = (event) => {
    setQuery(event.target.value);
    setSelectedGuest(null); // Clear selection when typing
  };

  const handleSuggestionClick = async (guest) => {
    setQuery(guest.name);
    // Check download status from Supabase (Supabase is used ONLY for download tracking)
    const downloaded = await isGuestDownloaded(guest.name);
    setSelectedGuest({ ...guest, downloaded });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    // If there's exactly one result, select it
    if (results.length === 1 && !selectedGuest) {
      const guest = results[0];
      // Check download status from Supabase (Supabase is used ONLY for download tracking)
      const downloaded = await isGuestDownloaded(guest.name);
      setSelectedGuest({ ...guest, downloaded });
    } else if (results.length > 0 && query.trim()) {
      // If multiple results, select the first one
      const guest = results[0];
      // Check download status from Supabase (Supabase is used ONLY for download tracking)
      const downloaded = await isGuestDownloaded(guest.name);
      setSelectedGuest({ ...guest, downloaded });
    }
  };

  const pageStyle = useMemo(
    () => ({
      '--nf-stars-bg': `url("${STARFIELD_IMAGE_URL}")`,
    }),
    []
  );

  const stars = useMemo(() => {
    const count = 120;
    return Array.from({ length: count }).map((_, index) => ({
      id: index,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: `${(Math.random() * 2 + 1).toFixed(2)}px`,
      delay: `${(Math.random() * 8).toFixed(2)}s`,
      duration: `${(Math.random() * 5 + 4).toFixed(2)}s`,
      opacity: (0.4 + Math.random() * 0.5).toFixed(2),
    }));
  }, []);

  return (
    <main className="NameFinderPage" style={pageStyle}>
      <div className="NFStarsLayer" aria-hidden="true">
        {stars.map((star) => (
          <span
            key={`nf-star-${star.id}`}
            className="NFStar"
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              animationDelay: star.delay,
              animationDuration: star.duration,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>
      <section className="NameFinderPage__hero">
        <div className="NameFinderPage__heroContent">
          <p className="NameFinderPage__eventLabel">Exclusive celebration</p>
          <h1 className="NameFinderPage__title">
            TUNDE <span className="NameFinderPage__titleAccent">@ 60</span>
          </h1>
          <p className="NameFinderPage__subtitle">
            Kindly enter your first name exactly as it appears on your invitation to
            confirm attendance.
          </p>
        </div>
        <div className="NameFinderPage__heroPortrait">
          <img
            src={HERO_IMAGE_URL}
            alt="Celebrant portrait"
            className="NameFinderPage__heroPortraitImage"
          />
        </div>
        <form className="NameFinderPage__search" onSubmit={handleSubmit}>
          <input
            type="search"
            value={query}
            onChange={handleChange}
            className="NameFinderPage__input"
            placeholder="Write first name"
            aria-label="Search guest name"
          />
          <button type="submit" className="NameFinderPage__searchButton">
            Confirm Attendance
          </button>
        </form>
      </section>

      <section className="NameFinderPage__results">
        {!selectedGuest ? (
          <>
            {query.trim() === '' ? (
              <p className="NameFinderPage__hint">
                Start typing your name to see if you are on the guest list.
              </p>
            ) : results.length ? (
              <div className="NameFinderPage__suggestions">
                <p className="NameFinderPage__suggestionsLabel">
                  Select your name from the list:
                </p>
                <ul className="NameFinderPage__suggestionsList">
                  {results.map((guest) => (
                    <li key={`${guest.name}-${guest.table}`}>
                      <button
                        type="button"
                        className="NameFinderPage__suggestion"
                        onClick={() => handleSuggestionClick(guest)}
                      >
                        {guest.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="NameFinderPage__hint">
                No guests matched the name you entered. Double-check your spelling or
                contact the event coordinator.
              </p>
            )}
          </>
        ) : (
          <div className="NameFinderPage__resultsContainer">
            <button
              type="button"
              className="NameFinderPage__backButton"
              onClick={() => {
                setSelectedGuest(null);
                setQuery('');
              }}
            >
              ← Search Again
            </button>
            <div className="NameFinderPage__result">
              <h2 className="NameFinderPage__guestName">{selectedGuest.name}</h2>
              {(() => {
                const guestTable = selectedGuest.table;
                const invitation = findInvitationInMap(guestTable, uploads);
                
                return invitation ? (
                <div className="NameFinderPage__invitation">
                  {invitation?.type?.startsWith('image/') || 
                   /\.(png|jpg|jpeg)$/i.test(invitation?.url || '') ? (
                    <>
                      <img
                        src={invitation.url}
                        alt={`Invitation for ${selectedGuest.name}`}
                        className="NameFinderPage__invitationImage"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (selectedGuest.downloaded) {
                            alert('This invitation has already been downloaded.');
                            return;
                          }
                          // Use dataUrl if available (for base64), otherwise use url
                          const fileUrl = invitation.dataUrl || invitation.url;
                          const fileName = invitation.name || `invitation-${selectedGuest.table}.pdf`;
                          
                          try {
                            await downloadFile(fileUrl, fileName);
                            // Mark as downloaded only after successful download (Supabase is used ONLY for download tracking)
                            const marked = await markGuestAsDownloaded(selectedGuest.name, selectedGuest.table);
                            if (marked) {
                              // Update local state
                              setGuestList(prev => prev.map(g => 
                                g.name === selectedGuest.name ? { ...g, downloaded: true } : g
                              ));
                              setSelectedGuest(prev => prev ? { ...prev, downloaded: true } : null);
                            }
                          } catch (error) {
                            console.error('Download failed:', error);
                            alert('Failed to download invitation. Please try again.');
                          }
                        }}
                        className="NameFinderPage__downloadButton"
                        disabled={selectedGuest?.downloaded}
                      >
                        {selectedGuest?.downloaded ? 'Already Downloaded' : 'Download Invitation'}
                      </button>
                    </>
                  ) : invitation?.type === 'application/pdf' || invitation?.url?.endsWith('.pdf') ? (
                    <div className="NameFinderPage__pdfContainer">
                      <p className="NameFinderPage__pdfLabel">
                        Your invitation is ready
                      </p>
                      <div className="NameFinderPage__pdfActions">
                        <button
                          type="button"
                          onClick={async () => {
                            if (selectedGuest.downloaded) {
                              alert('This invitation has already been downloaded.');
                              return;
                            }
                            // Use dataUrl if available (for base64), otherwise use url
                            const fileUrl = invitation.dataUrl || invitation.url;
                            const fileName = invitation.name || `invitation-${selectedGuest.table}.pdf`;
                            
                            try {
                              await downloadFile(fileUrl, fileName);
                              // Mark as downloaded only after successful download
                              const marked = await markGuestAsDownloaded(selectedGuest.name);
                              if (marked) {
                                // Update local state
                                setGuestList(prev => prev.map(g => 
                                  g.name === selectedGuest.name ? { ...g, downloaded: true } : g
                                ));
                                setSelectedGuest(prev => prev ? { ...prev, downloaded: true } : null);
                              }
                            } catch (error) {
                              console.error('Download failed:', error);
                              alert('Failed to download invitation. Please try again.');
                            }
                          }}
                          className="NameFinderPage__pdfLink NameFinderPage__pdfLink--download"
                          disabled={selectedGuest?.downloaded}
                        >
                          {selectedGuest?.downloaded ? 'Already Downloaded' : 'Download PDF'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="NameFinderPage__fileContainer">
                      <p className="NameFinderPage__fileName">{invitation.name}</p>
                      <button
                        type="button"
                        onClick={async () => {
                          if (selectedGuest.downloaded) {
                            alert('This invitation has already been downloaded.');
                            return;
                          }
                          // Use dataUrl if available (for base64), otherwise use url
                          const fileUrl = invitation.dataUrl || invitation.url;
                          const fileName = invitation.name || `invitation-${selectedGuest.table}`;
                          
                          try {
                            await downloadFile(fileUrl, fileName);
                            // Mark as downloaded only after successful download (Supabase is used ONLY for download tracking)
                            const marked = await markGuestAsDownloaded(selectedGuest.name, selectedGuest.table);
                            if (marked) {
                              // Update local state
                              setGuestList(prev => prev.map(g => 
                                g.name === selectedGuest.name ? { ...g, downloaded: true } : g
                              ));
                              setSelectedGuest(prev => prev ? { ...prev, downloaded: true } : null);
                            }
                          } catch (error) {
                            console.error('Download failed:', error);
                            alert('Failed to download invitation. Please try again.');
                          }
                        }}
                        className="NameFinderPage__downloadLink"
                        disabled={selectedGuest?.downloaded}
                      >
                        {selectedGuest?.downloaded ? 'Already Downloaded' : 'Download Invitation'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="NameFinderPage__noInvitation">
                  No invitation available for your table ({selectedGuest.table})
                </p>
              );
              })()}
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default NameFinderPage;
