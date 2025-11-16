import React from 'react';
import './AdminPage.css';

const AdminPage = ({
  onManageList,
  onUploadInvitations,
  onOpenNameFinder,
}) => {
  return (
    <main className="AdminPage">
      <section className="AdminPage__hero">
        <div className="AdminPage__heroContent">
          <p className="AdminPage__eventLabel">Exclusive celebration</p>
          <h1 className="AdminPage__title">
            TUNDE <span className="AdminPage__titleAccent">@ 60</span>
          </h1>
          <p className="AdminPage__subtitle">
            Manage your guest list, upload invitations, and access the name finder tool.
          </p>
        </div>
        <div className="AdminPage__heroFigure" aria-hidden="true" />
      </section>

      <section className="AdminPage__dashboard">
        <div className="AdminPage__buttons">
          <button
            type="button"
            className="AdminPage__button"
            onClick={onManageList}
          >
            Manage List
          </button>
          <button
            type="button"
            className="AdminPage__button"
            onClick={onUploadInvitations}
          >
            Upload Invitations
          </button>
          <button type="button" className="AdminPage__button AdminPage__button--primary" onClick={onOpenNameFinder}>
            Name Finder
          </button>
        </div>
      </section>
    </main>
  );
};

export default AdminPage;

