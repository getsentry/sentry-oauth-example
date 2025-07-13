import { useAuth } from '../contexts/AuthContext';
import { SentryMetrics } from './SentryMetrics';
import './Dashboard.css';

export function Dashboard() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Dashboard</h1>
            <p>Welcome back, {user.name}!</p>
          </div>
          <div className="header-right">
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="user-card">
          <div className="user-avatar">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} />
            ) : (
              <div className="avatar-fallback">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="user-info">
            <h2>{user.name}</h2>
            <p className="user-email">{user.email}</p>
            {user.username && (
              <p className="user-username">@{user.username}</p>
            )}
          </div>
        </div>


        {/* Sentry Metrics Dashboard */}
        <SentryMetrics />
      </main>
    </div>
  );
}