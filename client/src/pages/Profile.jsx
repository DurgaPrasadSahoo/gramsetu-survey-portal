import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ROLE_BADGE_CLASS, roleLabel } from '../constants/roles';

export default function Profile() {
  const { user } = useAuth();
  const [hierarchy, setHierarchy] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/users/hierarchy')
      .then(({ data }) => setHierarchy(data.data))
      .catch(() => setError('Unable to load your reporting hierarchy.'));
  }, []);

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
            <span className="profile-label">Unique ID</span>
            <span>{user?.unique_id}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Full Name</span>
            <span>{user?.name}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Email Address</span>
            <span>{user?.email}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Mobile Number</span>
            <span>{user?.mobile_number || '—'}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Role</span>
            <span className={`badge ${ROLE_BADGE_CLASS[user?.role] || ''}`}>
              {roleLabel(user?.role)}
            </span>
          </div>
          <div className="profile-row">
            <span className="profile-label">District</span>
            <span>{user?.district || '—'}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Account Status</span>
            <span className="badge badge-active">{user?.status}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Reporting Hierarchy</h3>
        <p className="muted" style={{ marginTop: '-0.3rem', marginBottom: '0.9rem' }}>
          Your chain of command, from the top of the organisation down to you.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        {!error && !hierarchy && <div className="page-loader">Loading hierarchy…</div>}
        {hierarchy && (
          <ol className="hierarchy-chain">
            {hierarchy.map((node) => (
              <li key={node.id} className={`hierarchy-step ${node.id === user?.id ? 'is-self' : ''}`}>
                <span className={`badge ${ROLE_BADGE_CLASS[node.role] || ''}`}>{roleLabel(node.role)}</span>
                <span className="hierarchy-name">
                  {node.name}
                  {node.id === user?.id && ' (You)'}
                </span>
              </li>
            ))}
          </ol>
        )}
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
