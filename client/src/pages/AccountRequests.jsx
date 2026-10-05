import { useEffect, useState } from 'react';
import api from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';
import PasswordField from '../components/PasswordField';
import { roleLabel } from '../constants/roles';

function ProfileRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approveTarget, setApproveTarget] = useState(null);
  const [declineTarget, setDeclineTarget] = useState(null);
  const [password, setPassword] = useState('');
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

  const openApprove = (ticket) => {
    setPassword('');
    setApproveTarget(ticket);
  };

  const handleApprove = async () => {
    if (!password || password.length < 6) {
      setError('Enter a password of at least 6 characters to activate this account.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/profile-requests/${approveTarget.id}/approve`, { password });
      setApproveTarget(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to approve this request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      await api.post(`/profile-requests/${declineTarget.id}/decline`);
      setDeclineTarget(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to decline this request.');
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
            <span>Actions</span>
          </div>
          {requests.map((ticket) => (
            <div className="record-row" key={ticket.id}>
              <span data-label="Proposed User">{ticket.name} ({ticket.email})</span>
              <span data-label="Role">{roleLabel(ticket.role)}</span>
              <span data-label="Requested By">{ticket.requested_by_name} ({roleLabel(ticket.requested_by_role)})</span>
              <span data-label="District">{ticket.district}</span>
              <span data-label="Requested On">{new Date(ticket.created_at).toLocaleString()}</span>
              <span data-label="Actions" className="record-actions">
                <button className="btn btn-primary btn-sm" onClick={() => openApprove(ticket)}>Approve</button>
                <button className="btn btn-danger btn-sm" onClick={() => setDeclineTarget(ticket)}>Decline</button>
              </span>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!approveTarget}
        title="Approve Account"
        message={
          <>
            <p style={{ marginBottom: '0.75rem' }}>
              Set a password for {approveTarget?.name} ({approveTarget?.email}). They'll use this to log in.
            </p>
            <PasswordField label="Password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} autoComplete="new-password" />
          </>
        }
        confirmLabel={submitting ? 'Approving…' : 'Approve & Activate'}
        onConfirm={handleApprove}
        onCancel={() => setApproveTarget(null)}
      />

      <ConfirmDialog
        open={!!declineTarget}
        title="Decline Registration"
        message={`Decline and permanently remove the registration for "${declineTarget?.name}"?`}
        confirmLabel={submitting ? 'Declining…' : 'Decline & Remove'}
        danger
        onConfirm={handleDecline}
        onCancel={() => setDeclineTarget(null)}
      />
    </div>
  );
}

function StatusRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/status-requests')
      .then(({ data }) => setRequests(data.data))
      .catch(() => setError('Unable to load status requests.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleConfirm = async () => {
    const { ticket, action } = pendingAction;
    setPendingAction(null);
    try {
      await api.post(`/status-requests/${ticket.id}/${action}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || `Unable to ${action} this request.`);
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
            <span>Actions</span>
          </div>
          {requests.map((ticket) => (
            <div className="record-row" key={ticket.id}>
              <span data-label="User">{ticket.name} ({roleLabel(ticket.role)})</span>
              <span data-label="Action">{ticket.action === 'activate' ? 'Activate' : 'Deactivate'}</span>
              <span data-label="Requested By">{ticket.requested_by_name} ({roleLabel(ticket.requested_by_role)})</span>
              <span data-label="Current Status">{ticket.current_status}</span>
              <span data-label="Requested On">{new Date(ticket.created_at).toLocaleString()}</span>
              <span data-label="Actions" className="record-actions">
                <button className="btn btn-primary btn-sm" onClick={() => setPendingAction({ ticket, action: 'approve' })}>Approve</button>
                <button className="btn btn-danger btn-sm" onClick={() => setPendingAction({ ticket, action: 'decline' })}>Decline</button>
              </span>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingAction}
        title={pendingAction?.action === 'approve' ? 'Approve Request' : 'Decline Request'}
        message={`${pendingAction?.action === 'approve' ? 'Approve' : 'Decline'} the ${pendingAction?.ticket.action} request for "${pendingAction?.ticket.name}"?`}
        confirmLabel={pendingAction?.action === 'approve' ? 'Approve' : 'Decline'}
        danger={pendingAction?.action === 'decline'}
        onConfirm={handleConfirm}
        onCancel={() => setPendingAction(null)}
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
