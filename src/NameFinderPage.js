import React, { useEffect, useMemo, useState } from 'react';
import './NameFinderPage.css';
import { GUEST_LIST_STORAGE_KEY } from './ManageListPage';
import { loadGuestListFromFile } from './utils/excelParser';

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

const fuzzyIncludes = (target, query) => {
  if (!query) {
    return true;
  }

  let targetIndex = 0;
  let queryIndex = 0;

  while (targetIndex < target.length && queryIndex < query.length) {
    if (target[targetIndex] === query[queryIndex]) {
      queryIndex += 1;
    }
    targetIndex += 1;
  }

  return queryIndex === query.length;
};

const NameFinderPage = () => {
  const [guestList, setGuestList] = useState([]);
  const [uploads, setUploads] = useState({});
  const [query, setQuery] = useState('');
  const [selectedGuest, setSelectedGuest] = useState(null);

  const uploadsStorageKey = useMemo(
    () => `${GUEST_LIST_STORAGE_KEY}:uploads`,
    []
  );

  useEffect(() => {
    const loadGuestList = async () => {
      // Try to load from Excel file first
      const excelUrl = `${process.env.PUBLIC_URL || ''}/data/guest-list.xlsx`;
      const guests = await loadGuestListFromFile(excelUrl);
      
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
    try {
      const storedUploads = window.localStorage.getItem(uploadsStorageKey);
      if (storedUploads) {
        const parsed = JSON.parse(storedUploads);
        if (parsed && typeof parsed === 'object') {
          setUploads(parsed);
        }
      }
    } catch (storageError) {
      console.error('Failed to load invitation uploads from storage', storageError);
    }
  }, [uploadsStorageKey]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    const normalizedQuery = normalizeValue(query.trim());
    return guestList.filter((guest) => {
      if (!guest?.name) {
        return false;
      }
      const normalizedName = normalizeValue(guest.name);
      return (
        normalizedName.includes(normalizedQuery) ||
        fuzzyIncludes(normalizedName, normalizedQuery)
      );
    });
  }, [guestList, query]);

  const handleChange = (event) => {
    setQuery(event.target.value);
    setSelectedGuest(null); // Clear selection when typing
  };

  const handleSuggestionClick = (guest) => {
    setQuery(guest.name);
    setSelectedGuest(guest);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // If there's exactly one result, select it
    if (results.length === 1 && !selectedGuest) {
      setSelectedGuest(results[0]);
    } else if (results.length > 0 && query.trim()) {
      // If multiple results, select the first one
      setSelectedGuest(results[0]);
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
            Kindly enter your full name exactly as it appears on your invitation to
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
            placeholder="Write full name"
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
              {uploads[selectedGuest.table] ? (
                <div className="NameFinderPage__invitation">
                  {uploads[selectedGuest.table]?.type?.startsWith('image/') ? (
                    <>
                      <img
                        src={uploads[selectedGuest.table].dataUrl}
                        alt={`Invitation for ${selectedGuest.name}`}
                        className="NameFinderPage__invitationImage"
                      />
                      <a
                        href={uploads[selectedGuest.table].dataUrl}
                        download={uploads[selectedGuest.table].name}
                        className="NameFinderPage__downloadButton"
                      >
                        Download Invitation
                      </a>
                    </>
                  ) : uploads[selectedGuest.table]?.type === 'application/pdf' ? (
                    <div className="NameFinderPage__pdfContainer">
                      <p className="NameFinderPage__pdfLabel">
                        Your invitation is ready
                      </p>
                      <div className="NameFinderPage__pdfActions">
                        <a
                          href={uploads[selectedGuest.table].dataUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="NameFinderPage__pdfLink NameFinderPage__pdfLink--view"
                        >
                          View PDF
                        </a>
                        <a
                          href={uploads[selectedGuest.table].dataUrl}
                          download={uploads[selectedGuest.table].name}
                          className="NameFinderPage__pdfLink NameFinderPage__pdfLink--download"
                        >
                          Download PDF
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="NameFinderPage__fileContainer">
                      <p className="NameFinderPage__fileName">{uploads[selectedGuest.table].name}</p>
                      <a
                        href={uploads[selectedGuest.table].dataUrl}
                        download={uploads[selectedGuest.table].name}
                        className="NameFinderPage__downloadLink"
                      >
                        Download Invitation
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="NameFinderPage__noInvitation">
                  No invitation available for your table ({selectedGuest.table})
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default NameFinderPage;
