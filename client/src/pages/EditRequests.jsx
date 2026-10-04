import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';
import { roleLabel } from '../constants/roles';

const ACTION_LABEL = { approve: 'Approve', decline: 'Decline' };

export default function EditRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decidingId, setDecidingId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  const loadRequests = () => {
    setLoading(true);
    api
      .get('/edit-requests')
      .then(({ data }) => setRequests(data.data))
      .catch(() => setError('Unable to load edit requests.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadRequests, []);

  const handleConfirm = async () => {
    const { ticket, action } = pendingAction;
    setPendingAction(null);
    setDecidingId(ticket.id);
    setError('');
    try {
      await api.post(`/edit-requests/${ticket.id}/${action}`);
      loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || `Unable to ${action} this request.`);
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Edit Requests</h1>
          <p className="page-subtitle">
            Household records whose owners want to make corrections. Approving unlocks the record for that
            owner only; declining returns it to Final.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="page-loader">Loading edit requests…</div>
      ) : requests.length === 0 ? (
        <div className="empty-state">No pending edit requests.</div>
      ) : (
        <div className="record-table record-table--tickets">
          <div className="record-table-head">
            <span>SL No.</span>
            <span>Record</span>
            <span>Requested By</span>
            <span>Role</span>
            <span>Requested On</span>
            <span>Actions</span>
          </div>
          {requests.map((ticket, index) => (
            <div className="record-row" key={ticket.id}>
              <span data-label="SL No.">{index + 1}</span>
              <span data-label="Record">
                <Link to={`/surveys/${ticket.survey_id}`}>{ticket.survey_full_name}</Link>
              </span>
              <span data-label="Requested By">{ticket.requester_name} ({ticket.requester_email})</span>
              <span data-label="Role">{roleLabel(ticket.requester_role)}</span>
              <span data-label="Requested On">{new Date(ticket.created_at).toLocaleString()}</span>
              <span data-label="Actions" className="record-actions">
                <button
                  className="btn btn-primary btn-sm"
                  disabled={decidingId === ticket.id}
                  onClick={() => setPendingAction({ ticket, action: 'approve' })}
                >
                  Approve
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  disabled={decidingId === ticket.id}
                  onClick={() => setPendingAction({ ticket, action: 'decline' })}
                >
                  Decline
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingAction}
        title={`${ACTION_LABEL[pendingAction?.action]} Edit Request`}
        message={`${ACTION_LABEL[pendingAction?.action]} the edit request for "${pendingAction?.ticket.survey_full_name}" from ${pendingAction?.ticket.requester_name}?`}
        confirmLabel={ACTION_LABEL[pendingAction?.action]}
        danger={pendingAction?.action === 'decline'}
        onConfirm={handleConfirm}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
