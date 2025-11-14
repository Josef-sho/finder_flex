import { useState } from 'react';
import './App.css';
import AdminPage from './AdminPage';
import ManageListPage from './ManageListPage';
import UploadInvitationsPage from './UploadInvitationsPage';
import NameFinderPage from './NameFinderPage';

function App() {
  const [view, setView] = useState('admin');

  const handleShowManageList = () => setView('manage-list');
  const handleShowUploadInvitations = () => setView('upload-invitations');
  const handleShowAdmin = () => setView('admin');
  const handleShowNameFinder = () => setView('name-finder');

  return (
    <div className="App">
      {view === 'admin' ? (
        <AdminPage
          onManageList={handleShowManageList}
          onUploadInvitations={handleShowUploadInvitations}
          onOpenNameFinder={handleShowNameFinder}
        />
      ) : view === 'manage-list' ? (
        <ManageListPage onBack={handleShowAdmin} />
      ) : view === 'upload-invitations' ? (
        <UploadInvitationsPage onBack={handleShowAdmin} />
      ) : (
        <NameFinderPage onBack={handleShowAdmin} />
      )}
    </div>
  );
}

export default App;
