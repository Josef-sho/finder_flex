import React, { useEffect, useMemo, useState } from 'react';
import './NameFinderPage.css';
import { GUEST_LIST_STORAGE_KEY } from './ManageListPage';

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

const NameFinderPage = ({ onBack }) => {
  const [guestList, setGuestList] = useState([]);
  const [uploads, setUploads] = useState({});
  const [query, setQuery] = useState('');

  const uploadsStorageKey = useMemo(
    () => `${GUEST_LIST_STORAGE_KEY}:uploads`,
    []
  );

  useEffect(() => {
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
  };

  const handleSubmit = (event) => {
    event.preventDefault();
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
        <button type="button" className="NameFinderPage__back" onClick={onBack}>
          ← Back to Admin
        </button>
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
        {query.trim() === '' ? (
          <p className="NameFinderPage__hint">
            Start typing your name to see if you are on the guest list.
          </p>
        ) : results.length ? (
          <div className="NameFinderPage__resultsContainer">
            {results.map((guest) => {
              const invitation = uploads[guest.table];
              const isImage = invitation?.type?.startsWith('image/');
              const isPDF = invitation?.type === 'application/pdf';

              return (
                <div key={`${guest.name}-${guest.table}`} className="NameFinderPage__result">
                  <h2 className="NameFinderPage__guestName">{guest.name}</h2>
                  {invitation ? (
                    <div className="NameFinderPage__invitation">
                      {isImage ? (
                        <>
                          <img
                            src={invitation.dataUrl}
                            alt={`Invitation for ${guest.name}`}
                            className="NameFinderPage__invitationImage"
                          />
                          <a
                            href={invitation.dataUrl}
                            download={invitation.name}
                            className="NameFinderPage__downloadButton"
                          >
                            Download Invitation
                          </a>
                        </>
                      ) : isPDF ? (
                        <div className="NameFinderPage__pdfContainer">
                          <p className="NameFinderPage__pdfLabel">
                            Your invitation is ready
                          </p>
                          <div className="NameFinderPage__pdfActions">
                            <a
                              href={invitation.dataUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="NameFinderPage__pdfLink NameFinderPage__pdfLink--view"
                            >
                              View PDF
                            </a>
                            <a
                              href={invitation.dataUrl}
                              download={invitation.name}
                              className="NameFinderPage__pdfLink NameFinderPage__pdfLink--download"
                            >
                              Download PDF
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="NameFinderPage__fileContainer">
                          <p className="NameFinderPage__fileName">{invitation.name}</p>
                          <a
                            href={invitation.dataUrl}
                            download={invitation.name}
                            className="NameFinderPage__downloadLink"
                          >
                            Download Invitation
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="NameFinderPage__noInvitation">
                      No invitation available for your table ({guest.table})
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="NameFinderPage__hint">
            No guests matched the name you entered. Double-check your spelling or
            contact the event coordinator.
          </p>
        )}
      </section>
    </main>
  );
};

export default NameFinderPage;
