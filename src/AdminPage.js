import React from 'react';
import './AdminPage.css';

const AdminPage = ({
  onManageList,
  onUploadInvitations,
  onOpenNameFinder,
}) => {
  return (
    <main className="AdminPage">
      <h1 className="AdminPage__title">Admin Dashboard</h1>
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
        <button type="button" className="AdminPage__button" onClick={onOpenNameFinder}>
          Name Finder
        </button>
      </div>
    </main>
  );
};

export default AdminPage;

