import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import './TableGuestsPage.css';

const formatTableLabel = (raw) => {
  if (!raw) {
    return '';
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  if (/^table/i.test(trimmed)) {
    return trimmed.replace(/\s+/g, ' ');
  }

  return `Table ${trimmed}`;
};

const TableGuestsPage = () => {
  const { tableNumber } = useParams();

  const requestedTableLabel = useMemo(
    () => formatTableLabel(tableNumber || ''),
    [tableNumber]
  );

  return (
    <main className="TableGuestsPage">
      <section className="TableGuestsPage__card">
        <header className="TableGuestsPage__header">
          <p className="TableGuestsPage__eyebrow">Reserved table</p>
          <h1 className="TableGuestsPage__title">
            {requestedTableLabel || 'Unknown Table'}
          </h1>
          <p className="TableGuestsPage__subtitle">
            Share this private link with the guests assigned to this table.
          </p>
        </header>

        {requestedTableLabel ? (
          <div className="TableGuestsPage__welcome">
            <p className="TableGuestsPage__welcomeIntro">Welcome to</p>
            <p className="TableGuestsPage__welcomeTable">{requestedTableLabel}</p>
            <p className="TableGuestsPage__welcomeMessage">
              Take your seats, relax, and enjoy the celebration curated just for you.
            </p>
          </div>
        ) : (
          <p className="TableGuestsPage__status">
            This link is missing a table reference. Please verify the URL you received.
          </p>
        )}

        <footer className="TableGuestsPage__footer">
          <Link to="/" className="TableGuestsPage__link">
            Back to name finder
          </Link>
        </footer>
      </section>
    </main>
  );
};

export default TableGuestsPage;
