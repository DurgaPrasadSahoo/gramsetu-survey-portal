import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';
import { roleLabel } from '../constants/roles';

function SectionHeader({ title, count }) {
  return <h3>{title} ({count})</h3>;
}

export default function Trash() {
  const [data, setData] = useState({ surveys: [], tasks: [], profiles: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restoreTarget, setRestoreTarget] = useState(null); // { recordType, row }
  const [conflict, setConflict] = useState(null); // { recordType, row, conflicts, record }
  const [overrides, setOverrides] = useState({});

  const load = () => {
    setLoading(true);
    api
      .get('/trash')
      .then(({ data }) => setData(data))
      .catch(() => setError('Unable to load the trash.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const attemptRestore = async (recordType, row, overridePayload) => {
    setError('');
    try {
      await api.post(`/trash/${row.trash_id}/restore`, overridePayload ? { overrides: overridePayload } : {});
      setConflict(null);
      load();
    } catch (err) {
      const body = err.response?.data;
      if (err.response?.status === 409 && body?.conflicts) {
        setConflict({ recordType, row, conflicts: body.conflicts, record: body.record });
        setOverrides({});
      } else {
        setError(body?.message || 'Unable to restore this record.');
      }
    }
  };

  const handleConfirmRestore = () => {
    const { recordType, row } = restoreTarget;
    setRestoreTarget(null);
    attemptRestore(recordType, row);
  };

  const handleRetryWithOverrides = () => {
    attemptRestore(conflict.recordType, conflict.row, overrides);
  };

  if (loading) return <div className="page-loader">Loading trash…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Trash</h1>
          <p className="page-subtitle">Deleted surveys, work tasks and profiles. Restore any of them back into the portal.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel">
        <SectionHeader title="Deleted Surveys" count={data.surveys.length} />
        {data.surveys.length === 0 ? (
          <div className="empty-state">No deleted surveys.</div>
        ) : (
          <div className="record-table record-table--trash-surveys">
            <div className="record-table-head">
              <span>SL No.</span>
              <span>Survey ID</span>
              <span>Household</span>
              <span>Mobile</span>
              <span>Deleted By</span>
              <span>Deleted On</span>
              <span>Actions</span>
            </div>
            {data.surveys.map((item, index) => (
              <div className="record-row" key={item.trash_id}>
                <span data-label="SL No.">{index + 1}</span>
                <span data-label="Survey ID">{item.record.unique_id}</span>
                <span data-label="Household">{item.record.full_name}</span>
                <span data-label="Mobile">{item.record.mobile_number}</span>
                <span data-label="Deleted By">{item.deleted_by_name}</span>
                <span data-label="Deleted On">{new Date(item.deleted_at).toLocaleString()}</span>
                <span data-label="Actions" className="record-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => setRestoreTarget({ recordType: 'survey', row: item })}>
                    Restore
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <SectionHeader title="Deleted Work Tasks" count={data.tasks.length} />
        {data.tasks.length === 0 ? (
          <div className="empty-state">No deleted work tasks.</div>
        ) : (
          <div className="record-table record-table--trash-tasks">
            <div className="record-table-head">
              <span>SL No.</span>
              <span>Task ID</span>
              <span>Scheme</span>
              <span>Survey</span>
              <span>Deleted By</span>
              <span>Deleted On</span>
              <span>Actions</span>
            </div>
            {data.tasks.map((item, index) => (
              <div className="record-row" key={item.trash_id}>
                <span data-label="SL No.">{index + 1}</span>
                <span data-label="Task ID">{item.record.unique_id}</span>
                <span data-label="Scheme">{item.record.scheme_label}</span>
                <span data-label="Survey"><Link to={`/surveys/${item.record.survey_id}`}>#{item.record.survey_id}</Link></span>
                <span data-label="Deleted By">{item.deleted_by_name}</span>
                <span data-label="Deleted On">{new Date(item.deleted_at).toLocaleString()}</span>
                <span data-label="Actions" className="record-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => setRestoreTarget({ recordType: 'task', row: item })}>
                    Restore
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <SectionHeader title="Deleted Profiles" count={data.profiles.length} />
        {data.profiles.length === 0 ? (
          <div className="empty-state">No deleted profiles.</div>
        ) : (
          <div className="record-table record-table--trash-profiles">
            <div className="record-table-head">
              <span>SL No.</span>
              <span>Unique ID</span>
              <span>Name</span>
              <span>Role</span>
              <span>Deleted By</span>
              <span>Deleted On</span>
              <span>Actions</span>
            </div>
            {data.profiles.map((item, index) => (
              <div className="record-row" key={item.trash_id}>
                <span data-label="SL No.">{index + 1}</span>
                <span data-label="Unique ID">{item.record.unique_id}</span>
                <span data-label="Name">{item.record.name} ({item.record.email})</span>
                <span data-label="Role">{roleLabel(item.record.role)}</span>
                <span data-label="Deleted By">{item.deleted_by_name}</span>
                <span data-label="Deleted On">{new Date(item.deleted_at).toLocaleString()}</span>
                <span data-label="Actions" className="record-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => setRestoreTarget({ recordType: 'profile', row: item })}>
                    Restore
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!restoreTarget}
        title="Restore Record"
        message="Restore this record back into the portal?"
        confirmLabel="Restore"
        onConfirm={handleConfirmRestore}
        onCancel={() => setRestoreTarget(null)}
      />

      {conflict && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Cannot Restore — Conflict Found</h3>
            <div className="modal-message">
              <ul style={{ margin: '0 0 1rem', paddingLeft: '1.2rem' }}>
                {conflict.conflicts.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              {conflict.recordType === 'survey' && (
                <>
                  <p>Edit the conflicting value(s) and try again:</p>
                  <label className="form-field">
                    <span className="form-label">Mobile Number</span>
                    <input
                      defaultValue={conflict.record.mobile_number}
                      onChange={(e) => setOverrides((o) => ({ ...o, mobile_number: e.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Aadhaar Number</span>
                    <input
                      defaultValue={conflict.record.aadhaar_number}
                      onChange={(e) => setOverrides((o) => ({ ...o, aadhaar_number: e.target.value }))}
                    />
                  </label>
                </>
              )}
              {conflict.recordType === 'profile' && (
                <>
                  <p>Edit the conflicting value and try again:</p>
                  <label className="form-field">
                    <span className="form-label">Email Address</span>
                    <input
                      defaultValue={conflict.record.email}
                      onChange={(e) => setOverrides((o) => ({ ...o, email: e.target.value }))}
                    />
                  </label>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setConflict(null)}>Close</button>
              {conflict.recordType !== 'task' && (
                <button className="btn btn-primary" onClick={handleRetryWithOverrides}>Retry Restore</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
