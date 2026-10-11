import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import ActionsMenu from '../components/ActionsMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import PasswordField from '../components/PasswordField';
import { ROLE_BADGE_CLASS, ROLE_LABELS, roleLabel } from '../constants/roles';
import { displayUserStatus } from '../constants/userStatus';
import { ODISHA_DISTRICTS, getPanchayatsForDistrict } from '../constants/surveyOptions';

// Developer never appears here (see server/src/routes/users.js), so it's not
// offered as a filter either.
const ROLE_FILTER_OPTIONS = ['head_of_district', 'head_of_panchayat', 'field_agent', 'admin'];
const AREA_LOCKED_ROLES = ['head_of_district', 'head_of_panchayat', 'field_agent'];

export default function Team() {
  const { isDeveloper } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusTarget, setStatusTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState('');
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');

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

  const handleDelete = async () => {
    const user = deleteTarget;
    setDeleteTarget(null);
    setError('');
    try {
      await api.delete(`/users/${user.id}`);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete this profile.');
    }
  };

  const openEdit = (user) => {
    setEditError('');
    setEditForm({ name: user.name, mobileNumber: user.mobile_number || '', district: user.district || '', panchayat: user.panchayat || '' });
    setEditTarget(user);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    try {
      await api.patch(`/users/${editTarget.id}`, editForm);
      setEditTarget(null);
      loadUsers();
    } catch (err) {
      const body = err.response?.data;
      setEditError(body?.conflicts ? body.conflicts.join(' ') : body?.message || 'Unable to update this profile.');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    if (resetPassword.length < 6) {
      setResetError('Password must be at least 6 characters.');
      return;
    }
    try {
      await api.post(`/users/${resetTarget.id}/reset-password`, { password: resetPassword });
      setResetTarget(null);
      setResetPassword('');
    } catch (err) {
      setResetError(err.response?.data?.message || 'Unable to reset this password.');
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
          {filteredUsers.map((user, index) => {
            const status = displayUserStatus(user);
            const pending = user.status === 'under_authentication';
            const items = [
              { label: 'View', to: `/team/${user.id}` },
              {
                label: user.status === 'active' ? 'Deactivate' : 'Activate',
                danger: user.status === 'active',
                disabled: !!user.pending_status_action || pending,
                onClick: () => setStatusTarget(user),
              },
            ];
            if (isDeveloper) {
              items.push(
                { label: 'Edit Profile', onClick: () => openEdit(user) },
                { label: 'Reset Password', onClick: () => { setResetError(''); setResetPassword(''); setResetTarget(user); } },
                { label: 'Delete', danger: true, onClick: () => setDeleteTarget(user) }
              );
            }
            return (
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
                  <span className={`badge ${status.badgeClass}`}>{status.label}</span>
                </span>
                <span data-label="Actions" className="record-actions">
                  <ActionsMenu items={items} />
                </span>
              </div>
            );
          })}
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Profile"
        message={`Permanently delete ${deleteTarget?.name}'s profile? It will be moved to Trash and can be restored later.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {editTarget && editForm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Edit Profile — {editTarget.name}</h3>
            <form className="modal-message" onSubmit={handleEditSubmit}>
              {editError && <div className="alert alert-error">{editError}</div>}
              <label className="form-field">
                <span className="form-label">Full Name</span>
                <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
              </label>
              <label className="form-field">
                <span className="form-label">Mobile Number</span>
                <input
                  value={editForm.mobileNumber}
                  onChange={(e) => setEditForm((f) => ({ ...f, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  maxLength={10}
                  required
                />
              </label>
              {AREA_LOCKED_ROLES.includes(editTarget.role) && (
                <>
                  <label className="form-field">
                    <span className="form-label">District</span>
                    <select
                      value={editForm.district}
                      onChange={(e) => setEditForm((f) => ({ ...f, district: e.target.value, panchayat: '' }))}
                      required
                    >
                      {ODISHA_DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </label>
                  {editTarget.role !== 'head_of_district' && (
                    <label className="form-field">
                      <span className="form-label">Panchayat</span>
                      <select value={editForm.panchayat} onChange={(e) => setEditForm((f) => ({ ...f, panchayat: e.target.value }))}>
                        <option value="">—</option>
                        {getPanchayatsForDistrict(editForm.district).map((p) => <option key={p}>{p}</option>)}
                      </select>
                    </label>
                  )}
                </>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setEditTarget(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Reset Password — {resetTarget.name}</h3>
            <form className="modal-message" onSubmit={handleResetSubmit}>
              {resetError && <div className="alert alert-error">{resetError}</div>}
              <PasswordField label="New Password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} minLength={6} autoComplete="new-password" />
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setResetTarget(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
