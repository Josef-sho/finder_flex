import React, { useEffect, useMemo, useState } from 'react';
import './UploadInvitationsPage.css';
import { GUEST_LIST_STORAGE_KEY } from './ManageListPage';
import { loadGuestListFromFile } from './utils/excelParser';
import { loadAllInvitations, findInvitationInMap } from './utils/invitationLoader';

const UploadInvitationsPage = ({ onBack }) => {
  const [guestList, setGuestList] = useState([]);
  const [invitations, setInvitations] = useState({});
  const [loadingInvites, setLoadingInvites] = useState(false);

  useEffect(() => {
    const loadGuestList = async () => {
      const possibleFilenames = [
        'Mr Tunde Martins AKande @60 Guest List.xlsx',
        'guest-list.xlsx',
      ];

      let guests = [];
      for (const filename of possibleFilenames) {
        const excelUrl = `${process.env.PUBLIC_URL || ''}/data/${encodeURIComponent(filename)}`;
        guests = await loadGuestListFromFile(excelUrl);
        if (guests.length > 0) {
          break;
        }
      }

      if (guests.length > 0) {
        setGuestList(guests);
        try {
          window.localStorage.setItem(GUEST_LIST_STORAGE_KEY, JSON.stringify(guests));
    } catch (storageError) {
          console.error('Failed to save guest list to storage', storageError);
    }
      } else {
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
      setLoadingInvites(true);
      const tableNames = [...new Set(guestList.map((guest) => guest.table).filter(Boolean))];
      const loadedInvitations = await loadAllInvitations(tableNames);
      setInvitations(loadedInvitations);
      setLoadingInvites(false);
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
      .map(([name, guests]) => {
        const invitation = findInvitationInMap(name, invitations);
        return {
        name,
        count: guests.length,
          invitation,
        };
      })
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
          Invitations are now served directly from <code>public/data/invitations/</code>. Place files like
          <strong> 45.THE PENT CLUB.pdf</strong> in that folder and redeploy so they are available on every device.
          Supported formats: PDF, PNG, JPG, JPEG.
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
          {loadingInvites ? (
            <p className="UploadInvitationsPage__status">Scanning public folder for invitations...</p>
          ) : (
            tables.map((table) => (
            <article key={table.name} className="UploadInvitationsPage__card">
              <h2 className="UploadInvitationsPage__cardTitle">{table.name}</h2>
              <p className="UploadInvitationsPage__cardMeta">
                {table.count} guest{table.count === 1 ? '' : 's'}
              </p>
                <div className="UploadInvitationsPage__status">
                  {table.invitation ? (
                    <div className="UploadInvitationsPage__statusBadge UploadInvitationsPage__statusBadge--success">
                      ✓ Invitation Found
                    </div>
                  ) : (
                    <div className="UploadInvitationsPage__statusBadge UploadInvitationsPage__statusBadge--missing">
                      Missing Invitation
                    </div>
                  )}
              </div>
                {table.invitation ? (
                <div className="UploadInvitationsPage__fileInfo">
                    <p className="UploadInvitationsPage__fileName">{table.invitation.name}</p>
                  <a
                      href={table.invitation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="UploadInvitationsPage__view"
                  >
                      View
                  </a>
                </div>
                ) : (
                  <p className="UploadInvitationsPage__missingNote">
                    Place <strong>{table.name}.pdf</strong> (or .png/.jpg) in <code>public/data/invitations/</code>.
                  </p>
                )}
            </article>
            ))
          )}
        </section>
      )}
    </main>
  );
};

export default UploadInvitationsPage;
