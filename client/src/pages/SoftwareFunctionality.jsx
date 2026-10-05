import { useEffect, useState } from 'react';
import api from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';

export default function SoftwareFunctionality() {
  const [maintenanceMode, setMaintenanceMode] = useState(null);
  const [error, setError] = useState('');
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    api
      .get('/settings/maintenance')
      .then(({ data }) => setMaintenanceMode(data.maintenanceMode))
      .catch(() => setError('Unable to load the portal status.'));
  };

  useEffect(load, []);

  const handleToggle = async () => {
    setConfirmToggle(false);
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.patch('/settings/maintenance', { enabled: !maintenanceMode });
      setMaintenanceMode(data.maintenanceMode);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update the portal status.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Software Functionality</h1>
          <p className="page-subtitle">
            Pause the entire portal for maintenance — every role but Developer is locked out until you resume it.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ marginBottom: '0.25rem' }}>Portal Status</h3>
          {maintenanceMode === null ? (
            <p className="muted">Loading…</p>
          ) : (
            <span className={`badge ${maintenanceMode ? 'badge-inactive' : 'badge-active'}`}>
              {maintenanceMode ? 'Paused — everyone but you is locked out' : 'Running normally'}
            </span>
          )}
        </div>
        <button
          className={`btn ${maintenanceMode ? 'btn-primary' : 'btn-danger'}`}
          disabled={maintenanceMode === null || submitting}
          onClick={() => setConfirmToggle(true)}
        >
          {maintenanceMode ? 'Resume Portal' : 'Pause Portal'}
        </button>
      </div>

      <ConfirmDialog
        open={confirmToggle}
        title={maintenanceMode ? 'Resume Portal' : 'Pause Portal'}
        message={
          maintenanceMode
            ? 'Resume the portal? Everyone will regain access immediately.'
            : 'Pause the entire portal? Every role except Developer will be locked out of every page and action until you resume it.'
        }
        confirmLabel={maintenanceMode ? 'Resume' : 'Pause'}
        danger={!maintenanceMode}
        onConfirm={handleToggle}
        onCancel={() => setConfirmToggle(false)}
      />
    </div>
  );
}
