import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as XLSX from 'xlsx';
import './ManageListPage.css';

const hasMetadata = (row) =>
  row.slice(1).some((value) => {
    if (value === undefined || value === null) {
      return false;
    }
    const text = value.toString().trim();
    return text.length > 0;
  });

export const GUEST_LIST_STORAGE_KEY = 'finder-flex:guest-list';

const ManageListPage = ({ onBack }) => {
  const fileInputRef = useRef(null);
  const [guestList, setGuestList] = useState([]);
  const [error, setError] = useState('');

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
      console.error('Failed to load guest list from storage', storageError);
    }
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

      reader.onload = (e) => {
        try {
          const buffer = e.target?.result;
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: '',
            blankrows: false,
          });

          if (!rows.length) {
            setGuestList([]);
            setError('The uploaded file is empty.');
            resetFileInput();
            return;
          }

          let headerSeen = false;
          let currentTable = '';
          const guests = [];

          rows.forEach((row) => {
            const cells = row.map((cell) =>
              cell === undefined || cell === null
                ? ''
                : cell.toString().trim()
            );

            const primary = cells[0];

            if (!primary) {
              return;
            }

            if (!headerSeen && /guest/i.test(primary)) {
              headerSeen = true;
              return;
            }

            if (!headerSeen) {
              return;
            }

            if (/table/i.test(primary) && !hasMetadata(cells)) {
              currentTable = primary;
              return;
            }

            if (!hasMetadata(cells)) {
              return;
            }

            guests.push({
              name: primary,
              table: currentTable || 'Unassigned',
            });
          });

          if (!guests.length) {
            setGuestList([]);
            setError(
              'We could not find any guests. Make sure column A lists guest names and table labels like "Table 1".'
            );
          } else {
            setGuestList(guests);
            setError('');
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
    ],
    []
  );

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
                    {displayColumns.map((column) => (
                      <td key={column.key}>
                        {guest[column.key] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      <button
        type="button"
        className="ManageListPage__upload"
        onClick={handleUploadClick}
      >
        Upload List
      </button>
    </main>
  );
};

export default ManageListPage;
