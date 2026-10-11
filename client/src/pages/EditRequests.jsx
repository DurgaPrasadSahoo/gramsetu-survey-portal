import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';
import { roleLabel } from '../constants/roles';
import { taskStatusLabel } from '../constants/taskStatus';

function SurveyEditRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [confirmDecision, setConfirmDecision] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = () => {
    setLoading(true);
    api
      .get('/edit-requests')
      .then(({ data }) => setRequests(data.data))
      .catch(() => setError('Unable to load edit requests.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadRequests, []);

  const handleFinalConfirm = async () => {
    const decision = confirmDecision;
    setConfirmDecision(null);
    setSubmitting(true);
    try {
      await api.post(`/edit-requests/${detail.id}/${decision}`);
      setDetail(null);
      loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || `Unable to ${decision} this request.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel">
      <h3>Survey Edit Requests</h3>
      <p className="muted" style={{ marginTop: '-0.3rem', marginBottom: '0.9rem' }}>
        Household records whose owners want to make corrections. Approving unlocks the record for that
        owner only; declining returns it to Final.
      </p>

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
            <span>Action</span>
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
            <h3>Edit Request — {detail.survey_full_name}</h3>
            <div className="modal-message">
              <p><strong>Requested by:</strong> {detail.requester_name} ({detail.requester_email}, {roleLabel(detail.requester_role)})</p>
              <p><strong>Requested on:</strong> {new Date(detail.created_at).toLocaleString()}</p>
              <p>Approving unlocks this record for the owner to edit; declining returns it to Final, unchanged.</p>
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
        message={`${confirmDecision === 'approve' ? 'Approve' : 'Decline'} the edit request for "${detail?.survey_full_name}" from ${detail?.requester_name}?`}
        confirmLabel={submitting ? 'Submitting…' : confirmDecision === 'approve' ? 'Approve' : 'Decline'}
        danger={confirmDecision === 'decline'}
        onConfirm={handleFinalConfirm}
        onCancel={() => setConfirmDecision(null)}
      />
    </div>
  );
}

function TaskEditRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [confirmDecision, setConfirmDecision] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = () => {
    setLoading(true);
    api
      .get('/tasks/requests')
      .then(({ data }) => setRequests(data.data))
      .catch(() => setError('Unable to load task requests.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadRequests, []);

  const handleFinalConfirm = async () => {
    const decision = confirmDecision;
    setConfirmDecision(null);
    setSubmitting(true);
    try {
      await api.post(`/tasks/requests/${detail.id}/${decision}`);
      setDetail(null);
      loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || `Unable to ${decision} this request.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel">
      <h3>Work Task Requests</h3>
      <p className="muted" style={{ marginTop: '-0.3rem', marginBottom: '0.9rem' }}>
        Status-change and delete requests for work tasks. Approving a status change applies it immediately;
        approving a delete moves the task to Trash.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="page-loader">Loading task requests…</div>
      ) : requests.length === 0 ? (
        <div className="empty-state">No pending task requests.</div>
      ) : (
        <div className="record-table record-table--tickets">
          <div className="record-table-head">
            <span>SL No.</span>
            <span>Task</span>
            <span>Requested Change</span>
            <span>Requested By</span>
            <span>Requested On</span>
            <span>Action</span>
          </div>
          {requests.map((ticket, index) => (
            <div className="record-row" key={ticket.id}>
              <span data-label="SL No.">{index + 1}</span>
              <span data-label="Task">
                <Link to={`/surveys/${ticket.survey_id}`}>{ticket.scheme_label}</Link> ({ticket.survey_full_name})
              </span>
              <span data-label="Requested Change">
                {ticket.action === 'delete' ? 'Delete task' : `Mark ${taskStatusLabel(ticket.proposed_status)}`}
              </span>
              <span data-label="Requested By">{ticket.requested_by_name} ({roleLabel(ticket.requested_by_role)})</span>
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
            <h3>Task Request — {detail.scheme_label}</h3>
            <div className="modal-message">
              <p><strong>Survey:</strong> {detail.survey_full_name}</p>
              <p><strong>Requested change:</strong> {detail.action === 'delete' ? 'Delete task' : `Mark ${taskStatusLabel(detail.proposed_status)}`}</p>
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
        message={`${confirmDecision === 'approve' ? 'Approve' : 'Decline'} the request for "${detail?.scheme_label}" from ${detail?.requested_by_name}?`}
        confirmLabel={submitting ? 'Submitting…' : confirmDecision === 'approve' ? 'Approve' : 'Decline'}
        danger={confirmDecision === 'decline'}
        onConfirm={handleFinalConfirm}
        onCancel={() => setConfirmDecision(null)}
      />
    </div>
  );
}

export default function EditRequests() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Edit Requests</h1>
          <p className="page-subtitle">Survey and work-task changes awaiting your review.</p>
        </div>
      </div>
      <SurveyEditRequests />
      <TaskEditRequests />
    </div>
  );
}
