import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p className="page-subtitle">Your account details on the GramSetu portal.</p>
        </div>
      </div>

      <div className="panel profile-panel">
        <div className="profile-avatar">{user?.name?.charAt(0)}</div>
        <div className="profile-details">
          <div className="profile-row">
            <span className="profile-label">Full Name</span>
            <span>{user?.name}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Email Address</span>
            <span>{user?.email}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Role</span>
            <span className={`badge ${user?.role === 'admin' ? 'badge-admin' : 'badge-agent'}`}>
              {user?.role === 'admin' ? 'Administrator' : 'Field Agent'}
            </span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Account Status</span>
            <span className="badge badge-active">{user?.status}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Need a password change?</h3>
        <p className="muted">
          Use the <a href="/forgot-password">Forgot Password</a> flow from the login page to reset your credentials securely.
        </p>
      </div>
    </div>
  );
}
