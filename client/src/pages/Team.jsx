import { useEffect, useState } from 'react';
import api from '../api/client';
import { ROLE_BADGE_CLASS, roleLabel } from '../constants/roles';

export default function Team() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = () => {
    setLoading(true);
    api
      .get('/users')
      .then(({ data }) => setUsers(data.data))
      .catch(() => setError('Unable to load the team directory.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadUsers, []);

  const toggleStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/users/${user.id}/status`, { status: nextStatus });
      loadUsers();
    } catch {
      setError('Unable to update this user’s status.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Team Directory</h1>
          <p className="page-subtitle">
            Everyone in your reporting line, and their survey contributions. You only see the users beneath you.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="page-loader">Loading team…</div>
      ) : users.length === 0 ? (
        <div className="empty-state">No one reports to you yet.</div>
      ) : (
        <div className="record-table">
          <div className="record-table-head">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Reports To</span>
            <span>Surveys Submitted</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {users.map((user) => (
            <div className="record-row" key={user.id}>
              <span data-label="Name">{user.name}</span>
              <span data-label="Email">{user.email}</span>
              <span data-label="Role">
                <span className={`badge ${ROLE_BADGE_CLASS[user.role] || ''}`}>{roleLabel(user.role)}</span>
              </span>
              <span data-label="Reports To">{user.parent_name || '—'}</span>
              <span data-label="Surveys Submitted">{user.surveyCount}</span>
              <span data-label="Status">
                <span className={`badge ${user.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                  {user.status}
                </span>
              </span>
              <span data-label="Actions" className="record-actions">
                <button
                  className={`btn btn-sm ${user.status === 'active' ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => toggleStatus(user)}
                >
                  {user.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
