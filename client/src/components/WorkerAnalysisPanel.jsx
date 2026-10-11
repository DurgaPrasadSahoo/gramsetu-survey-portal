import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { ODISHA_DISTRICTS, PANCHAYATS_BY_DISTRICT, getPanchayatsForDistrict } from '../constants/surveyOptions';
import { ROLE_BADGE_CLASS, roleLabel } from '../constants/roles';
import { TASK_STATUS_LABELS, taskStatusLabel } from '../constants/taskStatus';

const ALL_PANCHAYATS = [...new Set(Object.values(PANCHAYATS_BY_DISTRICT).flat())].sort();
const ALL_TASK_STATUSES = Object.keys(TASK_STATUS_LABELS);

export default function WorkerAnalysisPanel() {
  const [district, setDistrict] = useState('');
  const [panchayat, setPanchayat] = useState('');
  const [village, setVillage] = useState('');
  const [villages, setVillages] = useState([]);
  const [performanceBased, setPerformanceBased] = useState('survey');
  const [statuses, setStatuses] = useState(ALL_TASK_STATUSES);
  const [sort, setSort] = useState('desc');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const panchayatOptions = district ? getPanchayatsForDistrict(district) : ALL_PANCHAYATS;

  useEffect(() => {
    api
      .get('/analysis/villages', { params: { district, panchayat } })
      .then(({ data }) => setVillages(data.data))
      .catch(() => setVillages([]));
  }, [district, panchayat]);

  const toggleStatus = (key) => {
    setStatuses((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const loadResults = (e) => {
    if (e) e.preventDefault();
    if (performanceBased === 'task' && statuses.length === 0) {
      setError('Select at least one work task status.');
      return;
    }
    setError('');
    setLoading(true);
    api
      .get('/analysis/workers', {
        params: {
          district,
          panchayat,
          village,
          performanceBased,
          sort,
          statuses: performanceBased === 'task' ? statuses.join(',') : undefined,
        },
      })
      .then(({ data }) => setRows(data.data))
      .catch((err) => setError(err.response?.data?.message || 'Unable to run this analysis.'))
      .finally(() => {
        setLoading(false);
        setLoaded(true);
      });
  };

  // Load once up front with the sensible defaults (survey count, descending),
  // same as every other list page in the app — filters re-run on demand.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => loadResults(), []);

  return (
    <div>
      <form className="panel" onSubmit={loadResults}>
        <div className="filter-bar" style={{ boxShadow: 'none', padding: 0, marginBottom: '1rem' }}>
          <select
            value={district}
            onChange={(e) => {
              setDistrict(e.target.value);
              setPanchayat('');
              setVillage('');
            }}
          >
            <option value="">All Districts</option>
            {ODISHA_DISTRICTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            value={panchayat}
            onChange={(e) => {
              setPanchayat(e.target.value);
              setVillage('');
            }}
          >
            <option value="">All Panchayats{district ? ` in ${district}` : ' in Odisha'}</option>
            {panchayatOptions.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select value={village} onChange={(e) => setVillage(e.target.value)}>
            <option value="">All Villages</option>
            {villages.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            value={performanceBased}
            onChange={(e) => {
              setPerformanceBased(e.target.value);
              if (e.target.value === 'task') setStatuses(ALL_TASK_STATUSES);
            }}
          >
            <option value="survey">Performance: Surveys Done</option>
            <option value="task">Performance: Work Tasks Added</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="desc">Sort: Highest First</option>
            <option value="asc">Sort: Lowest First</option>
          </select>
        </div>

        {performanceBased === 'task' && (
          <div style={{ marginBottom: '1rem' }}>
            <p className="muted" style={{ marginTop: 0 }}>Count only work tasks currently in these statuses:</p>
            <div className="asset-grid">
              {ALL_TASK_STATUSES.map((key) => (
                <label key={key} className="checkbox-tile">
                  <input type="checkbox" checked={statuses.includes(key)} onChange={() => toggleStatus(key)} />
                  {taskStatusLabel(key)}
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Run Analysis
          </button>
        </div>
      </form>

      {loading ? (
        <div className="page-loader">Running analysis…</div>
      ) : !loaded ? null : rows.length === 0 ? (
        <div className="empty-state">No team workers match this filter.</div>
      ) : (
        <div className="record-table record-table--worker-analysis">
          <div className="record-table-head">
            <span>SL No.</span>
            <span>Profile ID</span>
            <span>Profile</span>
            <span>Count</span>
          </div>
          {rows.map((row, index) => (
            <div className="record-row" key={row.id}>
              <span data-label="SL No.">{index + 1}</span>
              <span data-label="Profile ID">{row.unique_id}</span>
              <span data-label="Profile">
                <Link to={`/team/${row.id}`}>{row.name}</Link>{' '}
                <span className={`badge ${ROLE_BADGE_CLASS[row.role] || ''}`}>{roleLabel(row.role)}</span>
              </span>
              <span data-label="Count">{row.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
