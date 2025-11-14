import React, { useEffect, useMemo, useState } from 'react';
import './NameFinderPage.css';
import { GUEST_LIST_STORAGE_KEY } from './ManageListPage';

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

  return (
    <main className="NameFinderPage">
      <header className="NameFinderPage__header">
        <button type="button" className="NameFinderPage__back" onClick={onBack}>
          ← Back
        </button>
        <h1 className="NameFinderPage__title">Name Finder</h1>
      </header>

      <form className="NameFinderPage__search" onSubmit={handleSubmit}>
        <input
          type="search"
          value={query}
          onChange={handleChange}
          className="NameFinderPage__input"
          placeholder="Search for your name"
          aria-label="Search guest name"
        />
        <button type="submit" className="NameFinderPage__searchButton">
          Search
        </button>
      </form>

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

