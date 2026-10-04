import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import ActionsMenu from '../components/ActionsMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import { ROLE_BADGE_CLASS, ROLE_LABELS, roleLabel } from '../constants/roles';

const ROLE_FILTER_OPTIONS = ['head_of_district', 'head_of_panchayat', 'field_agent', 'admin', 'developer'];

export default function Team() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusTarget, setStatusTarget] = useState(null);

  const loadUsers = () => {
    setLoading(true);
    api
      .get('/users')
      .then(({ data }) => setUsers(data.data))
      .catch(() => setError('Unable to load the team directory.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadUsers, []);

  const filteredUsers = useMemo(
    () => (roleFilter ? users.filter((u) => u.role === roleFilter) : users),
    [users, roleFilter]
  );

  const handleToggleStatus = async () => {
    const user = statusTarget;
    setStatusTarget(null);
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

      <form className="filter-bar" onSubmit={(e) => e.preventDefault()}>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {ROLE_FILTER_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="page-loader">Loading team…</div>
      ) : filteredUsers.length === 0 ? (
        <div className="empty-state">
          {users.length === 0 ? 'No one reports to you yet.' : 'No one matches this filter.'}
        </div>
      ) : (
        <div className="record-table record-table--team">
          <div className="record-table-head">
            <span>SL No.</span>
            <span>Unique ID</span>
            <span>Name</span>
            <span>Role</span>
            <span>Reports To</span>
            <span>Surveys Submitted</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {filteredUsers.map((user, index) => (
            <div className="record-row" key={user.id}>
              <span data-label="SL No.">{index + 1}</span>
              <span data-label="Unique ID">{user.unique_id}</span>
              <span data-label="Name">{user.name}</span>
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
                <ActionsMenu
                  items={[
                    { label: 'View', to: `/team/${user.id}` },
                    {
                      label: user.status === 'active' ? 'Deactivate' : 'Activate',
                      danger: user.status === 'active',
                      onClick: () => setStatusTarget(user),
                    },
                  ]}
                />
              </span>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!statusTarget}
        title={statusTarget?.status === 'active' ? 'Deactivate User' : 'Activate User'}
        message={`${statusTarget?.status === 'active' ? 'Deactivate' : 'Activate'} ${statusTarget?.name}'s account?`}
        confirmLabel={statusTarget?.status === 'active' ? 'Deactivate' : 'Activate'}
        danger={statusTarget?.status === 'active'}
        onConfirm={handleToggleStatus}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
}
