import React, { useEffect, useMemo, useRef, useState } from 'react';
import './UploadInvitationsPage.css';
import { GUEST_LIST_STORAGE_KEY } from './ManageListPage';

const UploadInvitationsPage = ({ onBack }) => {
  const [guestList, setGuestList] = useState([]);
  const [uploads, setUploads] = useState({});
  const fileInputsRef = useRef({});

  const uploadsStorageKey = useMemo(
    () => `${GUEST_LIST_STORAGE_KEY}:uploads`,
    []
  );

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
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [guestList]);

  const handleSelectFile = (tableName) => {
    if (fileInputsRef.current[tableName]) {
      fileInputsRef.current[tableName].click();
    }
  };

  const handleFileChange = (tableName, event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const fileUrl = e.target?.result;
      if (!fileUrl || typeof fileUrl !== 'string') {
        return;
      }

      const tableUpload = {
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        dataUrl: fileUrl,
      };

      setUploads((prev) => {
        const next = {
          ...prev,
          [tableName]: tableUpload,
        };

        try {
          window.localStorage.setItem(uploadsStorageKey, JSON.stringify(next));
        } catch (storageError) {
          console.error('Failed to persist invitation upload', storageError);
        }

        return next;
      });
    };

    reader.readAsDataURL(file);

    // reset the input so the same file can be re-uploaded
    event.target.value = '';
  };

  const handleClearUpload = (tableName) => {
    setUploads((prev) => {
      const next = { ...prev };
      delete next[tableName];
      try {
        window.localStorage.setItem(uploadsStorageKey, JSON.stringify(next));
      } catch (storageError) {
        console.error('Failed to update stored uploads', storageError);
      }
      return next;
    });
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
        <h1 className="UploadInvitationsPage__title">Upload Invitations</h1>
      </header>

      {guestList.length === 0 ? (
        <section className="UploadInvitationsPage__status">
          <p>
            No guest list found. Upload a list first so we can generate table
            upload buttons.
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
              <div className="UploadInvitationsPage__actions">
                <button
                  type="button"
                  className="UploadInvitationsPage__upload"
                  onClick={() => handleSelectFile(table.name)}
                >
                  {uploads[table.name] ? 'Replace File' : 'Upload Invitations'}
                </button>
                {uploads[table.name] ? (
                  <button
                    type="button"
                    className="UploadInvitationsPage__clear"
                    onClick={() => handleClearUpload(table.name)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              {uploads[table.name] ? (
                <div className="UploadInvitationsPage__fileInfo">
                  <p className="UploadInvitationsPage__fileName">
                    {uploads[table.name].name}
                  </p>
                  <a
                    href={uploads[table.name].dataUrl}
                    download={uploads[table.name].name}
                    className="UploadInvitationsPage__download"
                  >
                    Download
                  </a>
                </div>
              ) : null}
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

