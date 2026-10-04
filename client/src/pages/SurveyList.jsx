import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import ActionsMenu from '../components/ActionsMenu';
import { STATUS_BADGE_CLASS } from '../constants/surveyStatus';
import { getSurveyPermissions } from '../utils/surveyPermissions';
import { formatAadhaar } from '../utils/aadhaar';

const PAGE_SIZE = 10;

export default function SurveyList() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editRequestTarget, setEditRequestTarget] = useState(null);
  const [requestingId, setRequestingId] = useState(null);

  const loadData = () => {
    setLoading(true);
    api
      .get('/surveys', { params: { search, page, pageSize: PAGE_SIZE } })
      .then(({ data }) => {
        setRows(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch(() => setError('Unable to load household records.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/surveys/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadData();
    } catch {
      setError('Unable to delete this record.');
      setDeleteTarget(null);
    }
  };

  const handleEditRequest = async () => {
    const row = editRequestTarget;
    setEditRequestTarget(null);
    setRequestingId(row.id);
    setError('');
    try {
      await api.post(`/surveys/${row.id}/edit-request`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit an edit request for this record.');
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Household Records</h1>
          <p className="page-subtitle">{total} household{total === 1 ? '' : 's'} surveyed so far.</p>
        </div>
        <Link to="/surveys/new" className="btn btn-primary">+ New Survey Entry</Link>
      </div>

      <form className="filter-bar" onSubmit={handleSearchSubmit}>
        <input
          className="filter-search"
          placeholder="Search by name, mobile or Aadhaar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-outline" type="submit">Apply Filters</button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="page-loader">Loading records…</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">No household records found. Try adjusting your search.</div>
      ) : (
        <div className="record-table record-table--surveys">
          <div className="record-table-head">
            <span>SL No.</span>
            <span>Unique ID</span>
            <span>Name</span>
            <span>Mobile</span>
            <span>Aadhaar Number</span>
            <span>Added By</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {rows.map((row, index) => {
            const perms = getSurveyPermissions(row, user);
            const menuItems = [
              { label: 'View', to: `/surveys/${row.id}` },
              {
                label: requestingId === row.id ? 'Requesting…' : 'Edit Request',
                disabled: !perms.canRequestEdit || requestingId === row.id,
                onClick: () => setEditRequestTarget(row),
              },
              { label: 'Edit', to: `/surveys/${row.id}/edit`, disabled: !perms.canEdit },
              { label: 'Delete', disabled: !perms.canDelete, danger: true, onClick: () => setDeleteTarget(row) },
            ];
            return (
              <div className="record-row" key={row.id}>
                <span data-label="SL No.">{(page - 1) * PAGE_SIZE + index + 1}</span>
                <span data-label="Unique ID">{row.unique_id}</span>
                <span data-label="Name">{row.full_name}</span>
                <span data-label="Mobile">{row.mobile_number}</span>
                <span data-label="Aadhaar Number">{formatAadhaar(row.aadhaar_number) || '—'}</span>
                <span data-label="Added By">{row.created_by_name}</span>
                <span data-label="Status">
                  <span className={`badge ${STATUS_BADGE_CLASS[row.status] || ''}`}>{row.status}</span>
                </span>
                <span data-label="Actions" className="record-actions">
                  <ActionsMenu items={menuItems} />
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Household Record"
        message={`Are you sure you want to permanently delete the record for "${deleteTarget?.full_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={!!editRequestTarget}
        title="Request an Edit"
        message={`Send a request to the developer to unlock "${editRequestTarget?.full_name}" for editing?`}
        confirmLabel="Send Request"
        onConfirm={handleEditRequest}
        onCancel={() => setEditRequestTarget(null)}
      />
    </div>
  );
}
