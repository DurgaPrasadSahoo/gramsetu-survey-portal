import { useEffect, useState } from 'react';
import api from '../api/client';
import ActionsMenu from './ActionsMenu';
import ConfirmDialog from './ConfirmDialog';
import { TASK_STATUS_BADGE_CLASS, taskStatusLabel } from '../constants/taskStatus';

// Forward-only: a task naturally progresses added -> initiated -> completed.
const NEXT_STATUS = { added: 'initiated', initiated: 'completed' };

export default function WorkTasks({ surveyId }) {
  const [tasks, setTasks] = useState([]);
  const [unmarkedSchemes, setUnmarkedSchemes] = useState([]);
  const [canAdd, setCanAdd] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmAdd, setConfirmAdd] = useState(false);
  const [requestTarget, setRequestTarget] = useState(null); // { task, action, proposedStatus }

  const load = () => {
    setLoading(true);
    api
      .get(`/surveys/${surveyId}/tasks`)
      .then(({ data }) => {
        setTasks(data.data);
        setUnmarkedSchemes(data.unmarkedSchemes);
        setCanAdd(data.canAdd);
        setSelectedScheme((prev) => (data.unmarkedSchemes.some((s) => s.key === prev) ? prev : data.unmarkedSchemes[0]?.key || ''));
      })
      .catch(() => setError('Unable to load work tasks.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [surveyId]);

  const handleAdd = async () => {
    setConfirmAdd(false);
    setError('');
    try {
      await api.post(`/surveys/${surveyId}/tasks`, { schemeKey: selectedScheme });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to add this work task.');
    }
  };

  const handleRequest = async () => {
    const { task, action, proposedStatus } = requestTarget;
    setRequestTarget(null);
    setError('');
    try {
      await api.post(`/tasks/${task.id}/request`, { action, proposedStatus });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit this request.');
    }
  };

  const selectedSchemeLabel = unmarkedSchemes.find((s) => s.key === selectedScheme)?.label;

  return (
    <div className="panel">
      <h3>Work Tasks</h3>
      <p className="muted" style={{ marginTop: '-0.3rem', marginBottom: '0.9rem' }}>
        One task per government scheme this household hasn't been enrolled in yet. Once added, a task is
        locked — changing its status or deleting it needs developer approval.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {canAdd && (
        <div className="filter-bar" style={{ marginBottom: '1.25rem' }}>
          <select value={selectedScheme} onChange={(e) => setSelectedScheme(e.target.value)} disabled={unmarkedSchemes.length === 0}>
            {unmarkedSchemes.length === 0 ? (
              <option value="">No remaining schemes to track</option>
            ) : (
              unmarkedSchemes.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)
            )}
          </select>
          <button className="btn btn-primary" disabled={!selectedScheme} onClick={() => setConfirmAdd(true)}>
            + Add Work Task
          </button>
        </div>
      )}
      {!canAdd && (
        <div className="alert alert-info" style={{ marginBottom: '1.25rem' }}>
          Work tasks can only be added while this record is Final — not while an edit is in progress.
        </div>
      )}

      {loading ? (
        <div className="page-loader">Loading work tasks…</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">No work tasks yet.</div>
      ) : (
        <div className="record-table record-table--tasks">
          <div className="record-table-head">
            <span>Unique ID</span>
            <span>Scheme</span>
            <span>Status</span>
            <span>Initiated By</span>
            <span>Actions</span>
          </div>
          {tasks.map((task) => {
            const nextStatus = NEXT_STATUS[task.status];
            const hasPending = !!task.pending_action;
            const items = [];
            if (nextStatus) {
              items.push({
                label: `Request: Mark ${taskStatusLabel(nextStatus)}`,
                disabled: hasPending,
                onClick: () => setRequestTarget({ task, action: 'status_change', proposedStatus: nextStatus }),
              });
            }
            items.push({
              label: 'Request Delete',
              danger: true,
              disabled: hasPending,
              onClick: () => setRequestTarget({ task, action: 'delete' }),
            });

            return (
              <div className="record-row" key={task.id}>
                <span data-label="Unique ID">{task.unique_id}</span>
                <span data-label="Scheme">{task.scheme_label}</span>
                <span data-label="Status">
                  <span className={`badge ${TASK_STATUS_BADGE_CLASS[task.status] || ''}`}>{taskStatusLabel(task.status)}</span>
                  {hasPending && <span className="muted" style={{ marginLeft: '0.4rem', fontSize: '0.78rem' }}>(request pending)</span>}
                </span>
                <span data-label="Initiated By">{task.initiated_by_name}</span>
                <span data-label="Actions" className="record-actions">
                  <ActionsMenu items={items} />
                </span>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmAdd}
        title="Add Work Task"
        message={`Add a work task to get this household enrolled in "${selectedSchemeLabel}"?`}
        confirmLabel="Add Task"
        onConfirm={handleAdd}
        onCancel={() => setConfirmAdd(false)}
      />

      <ConfirmDialog
        open={!!requestTarget}
        title={requestTarget?.action === 'delete' ? 'Request Delete' : 'Request Status Change'}
        message={
          requestTarget?.action === 'delete'
            ? `Ask the developer to delete the work task for "${requestTarget?.task.scheme_label}"?`
            : `Ask the developer to mark the work task for "${requestTarget?.task.scheme_label}" as ${taskStatusLabel(requestTarget?.proposedStatus)}?`
        }
        confirmLabel="Submit Request"
        danger={requestTarget?.action === 'delete'}
        onConfirm={handleRequest}
        onCancel={() => setRequestTarget(null)}
      />
    </div>
  );
}
