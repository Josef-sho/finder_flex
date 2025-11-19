import { useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
} from 'react-router-dom';
import './App.css';
import AdminPage from './AdminPage';
import ManageListPage from './ManageListPage';
import UploadInvitationsPage from './UploadInvitationsPage';
import NameFinderPage from './NameFinderPage';
import TableGuestsPage from './TableGuestsPage';

const ADMIN_SECRET_PATH = '/admin-9083securepanel';
const GATE_STORAGE_KEY = 'nf-admin-auth';
const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || '';

const AdminGate = () => {
  const [authorized, setAuthorized] = useState(
    () => window.sessionStorage.getItem(GATE_STORAGE_KEY) === 'true'
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!ADMIN_PASSWORD) {
      setError('Admin password is not configured.');
      return;
    }

    if (password === ADMIN_PASSWORD) {
      window.sessionStorage.setItem(GATE_STORAGE_KEY, 'true');
      setAuthorized(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  if (authorized) {
    return <Outlet />;
  }

  return (
    <div className="AdminGate">
      <div className="AdminGate__panel">
        <h1 className="AdminGate__title">Admin Access</h1>
        {ADMIN_PASSWORD ? (
          <>
            <p className="AdminGate__subtitle">
              Enter the admin password to open the management panel.
            </p>
            <form className="AdminGate__form" onSubmit={handleSubmit}>
              <input
                type="password"
                className="AdminGate__input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                autoComplete="off"
              />
              {error ? <p className="AdminGate__error">{error}</p> : null}
              <button type="submit" className="AdminGate__button">
                Unlock Admin
              </button>
            </form>
          </>
        ) : (
          <p className="AdminGate__subtitle AdminGate__subtitle--warning">
            Admin password is not configured. Set
            {' '}
            <code>REACT_APP_ADMIN_PASSWORD</code>
            {' '}
            in your .env file.
          </p>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();

  return (
    <AdminPage
      onManageList={() => navigate('manage')}
      onUploadInvitations={() => navigate('upload')}
      onOpenNameFinder={() => navigate('/')}
    />
  );
};

const ManageListRoute = () => {
  const navigate = useNavigate();
  return <ManageListPage onBack={() => navigate(-1)} />;
};

const UploadInvitationsRoute = () => {
  const navigate = useNavigate();
  return <UploadInvitationsPage onBack={() => navigate(-1)} />;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<NameFinderPage />} />
          <Route path="/tables/:tableNumber" element={<TableGuestsPage />} />
          <Route path={`${ADMIN_SECRET_PATH}/*`} element={<AdminGate />}>
            <Route index element={<AdminDashboard />} />
            <Route path="manage" element={<ManageListRoute />} />
            <Route path="upload" element={<UploadInvitationsRoute />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
