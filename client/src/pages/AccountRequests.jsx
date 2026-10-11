import { useEffect, useState } from 'react';
import api from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';
import PasswordField from '../components/PasswordField';
import { roleLabel } from '../constants/roles';
import { ODISHA_DISTRICTS } from '../constants/surveyOptions';

function ProfileRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null); // the ticket shown in the Action popup
  const [form, setForm] = useState(null); // editable fields + password within that popup
  const [formError, setFormError] = useState('');
  const [confirmDecision, setConfirmDecision] = useState(null); // 'approve' | 'decline'
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/profile-requests')
      .then(({ data }) => setRequests(data.data))
      .catch(() => setError('Unable to load profile requests.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAction = (ticket) => {
    setFormError('');
    setForm({ name: ticket.name, district: ticket.district, mobileNumber: ticket.mobile_number || '', password: '', confirmPassword: '' });
    setDetail(ticket);
  };

  const requestDecision = (decision) => {
    if (decision === 'approve') {
      if (!form.password || form.password.length < 6) {
        setFormError('Enter a password of at least 6 characters to activate this account.');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setFormError('Passwords do not match.');
        return;
      }
    }
    setFormError('');
    setConfirmDecision(decision);
  };

  const handleFinalConfirm = async () => {
    const decision = confirmDecision;
    setConfirmDecision(null);
    setSubmitting(true);
    try {
      if (decision === 'approve') {
        await api.post(`/profile-requests/${detail.id}/approve`, {
          password: form.password,
          name: form.name,
          district: form.district,
          mobileNumber: form.mobileNumber,
        });
      } else {
        await api.post(`/profile-requests/${detail.id}/decline`);
      }
      setDetail(null);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || `Unable to ${decision} this request.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel">
      <h3>New Profile Requests</h3>
      <p className="muted" style={{ marginTop: '-0.3rem', marginBottom: '0.9rem' }}>
        Accounts registered by someone other than a developer. Approving sets a password and activates them.
      </p>
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="page-loader">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="empty-state">No pending profile requests.</div>
      ) : (
        <div className="record-table record-table--tickets">
          <div className="record-table-head">
            <span>Proposed User</span>
            <span>Role</span>
            <span>Requested By</span>
            <span>District</span>
            <span>Requested On</span>
            <span>Action</span>
          </div>
          {requests.map((ticket) => (
            <div className="record-row" key={ticket.id}>
              <span data-label="Proposed User">{ticket.name} ({ticket.email})</span>
              <span data-label="Role">{roleLabel(ticket.role)}</span>
              <span data-label="Requested By">{ticket.requested_by_name} ({roleLabel(ticket.requested_by_role)})</span>
              <span data-label="District">{ticket.district}</span>
              <span data-label="Requested On">{new Date(ticket.created_at).toLocaleString()}</span>
              <span data-label="Action" className="record-actions">
                <button className="btn btn-primary btn-sm" onClick={() => openAction(ticket)}>Action</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {detail && form && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Profile Request — {detail.name}</h3>
            <div className="modal-message">
              <p className="muted" style={{ marginTop: 0 }}>
                Requested by {detail.requested_by_name} ({roleLabel(detail.requested_by_role)}) on{' '}
                {new Date(detail.created_at).toLocaleString()}.
              </p>
              {formError && <div className="alert alert-error">{formError}</div>}

              <label className="form-field">
                <span className="form-label">Email Address</span>
                <input value={detail.email} disabled />
              </label>
              <label className="form-field">
                <span className="form-label">Role</span>
                <input value={roleLabel(detail.role)} disabled />
              </label>
              <label className="form-field">
                <span className="form-label">Full Name</span>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label className="form-field">
                <span className="form-label">District</span>
                <select value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}>
                  {ODISHA_DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">Mobile Number</span>
                <input
                  value={form.mobileNumber}
                  onChange={(e) => setForm((f) => ({ ...f, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  maxLength={10}
                />
              </label>
              <PasswordField label="Password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} minLength={6} autoComplete="new-password" />
              <PasswordField label="Confirm Password" value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} minLength={6} autoComplete="new-password" />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setDetail(null)} disabled={submitting}>Cancel</button>
              <button className="btn btn-danger" onClick={() => requestDecision('decline')} disabled={submitting}>Decline</button>
              <button className="btn btn-primary" onClick={() => requestDecision('approve')} disabled={submitting}>Approve</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDecision}
        title={confirmDecision === 'approve' ? 'Confirm Approval' : 'Confirm Decline'}
        message={
          confirmDecision === 'approve'
            ? `Approve and activate the account for ${form?.name} (${detail?.email})?`
            : `Decline and permanently remove the registration for ${detail?.name}?`
        }
        confirmLabel={submitting ? 'Submitting…' : confirmDecision === 'approve' ? 'Approve & Activate' : 'Decline & Remove'}
        danger={confirmDecision === 'decline'}
        onConfirm={handleFinalConfirm}
        onCancel={() => setConfirmDecision(null)}
      />
    </div>
  );
}

function StatusRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [confirmDecision, setConfirmDecision] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/status-requests')
      .then(({ data }) => setRequests(data.data))
      .catch(() => setError('Unable to load status requests.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleFinalConfirm = async () => {
    const decision = confirmDecision;
    setConfirmDecision(null);
    setSubmitting(true);
    try {
      await api.post(`/status-requests/${detail.id}/${decision}`);
      setDetail(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || `Unable to ${decision} this request.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel">
      <h3>Status Change Requests</h3>
      <p className="muted" style={{ marginTop: '-0.3rem', marginBottom: '0.9rem' }}>
        Activate/deactivate requests raised by managers for people in their own team.
      </p>
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="page-loader">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="empty-state">No pending status requests.</div>
      ) : (
        <div className="record-table record-table--tickets">
          <div className="record-table-head">
            <span>User</span>
            <span>Action</span>
            <span>Requested By</span>
            <span>Current Status</span>
            <span>Requested On</span>
            <span>Action</span>
          </div>
          {requests.map((ticket) => (
            <div className="record-row" key={ticket.id}>
              <span data-label="User">{ticket.name} ({roleLabel(ticket.role)})</span>
              <span data-label="Action">{ticket.action === 'activate' ? 'Activate' : 'Deactivate'}</span>
              <span data-label="Requested By">{ticket.requested_by_name} ({roleLabel(ticket.requested_by_role)})</span>
              <span data-label="Current Status">{ticket.current_status}</span>
              <span data-label="Requested On">{new Date(ticket.created_at).toLocaleString()}</span>
              <span data-label="Action" className="record-actions">
                <button className="btn btn-primary btn-sm" onClick={() => setDetail(ticket)}>Action</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {detail && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Status Request — {detail.name}</h3>
            <div className="modal-message">
              <p><strong>Requested change:</strong> {detail.action === 'activate' ? 'Activate' : 'Deactivate'}</p>
              <p><strong>Current status:</strong> {detail.current_status}</p>
              <p><strong>Role:</strong> {roleLabel(detail.role)}</p>
              <p><strong>Requested by:</strong> {detail.requested_by_name} ({roleLabel(detail.requested_by_role)})</p>
              <p><strong>Requested on:</strong> {new Date(detail.created_at).toLocaleString()}</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setDetail(null)} disabled={submitting}>Cancel</button>
              <button className="btn btn-danger" onClick={() => setConfirmDecision('decline')} disabled={submitting}>Decline</button>
              <button className="btn btn-primary" onClick={() => setConfirmDecision('approve')} disabled={submitting}>Approve</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDecision}
        title={confirmDecision === 'approve' ? 'Confirm Approval' : 'Confirm Decline'}
        message={`${confirmDecision === 'approve' ? 'Approve' : 'Decline'} the ${detail?.action} request for "${detail?.name}"?`}
        confirmLabel={submitting ? 'Submitting…' : confirmDecision === 'approve' ? 'Approve' : 'Decline'}
        danger={confirmDecision === 'decline'}
        onConfirm={handleFinalConfirm}
        onCancel={() => setConfirmDecision(null)}
      />
    </div>
  );
}

export default function AccountRequests() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Account Requests</h1>
          <p className="page-subtitle">New profile registrations and activate/deactivate tickets awaiting your review.</p>
        </div>
      </div>
      <ProfileRequests />
      <StatusRequests />
    </div>
  );
}
