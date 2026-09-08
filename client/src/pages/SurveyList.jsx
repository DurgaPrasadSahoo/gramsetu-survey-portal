import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { CATEGORIES, RATION_CARD_TYPES } from '../constants/surveyOptions';

export default function SurveyList() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [rationCardType, setRationCardType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = () => {
    setLoading(true);
    api
      .get('/surveys', { params: { search, category, rationCardType, page, pageSize: 10 } })
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
        <select value={category} onChange={(e) => { setCategory(e.target.value); }}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={rationCardType} onChange={(e) => { setRationCardType(e.target.value); }}>
          <option value="">All Ration Card Types</option>
          {RATION_CARD_TYPES.map((r) => <option key={r.value} value={r.value}>{r.value}</option>)}
        </select>
        <button className="btn btn-outline" type="submit">Apply Filters</button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="page-loader">Loading records…</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">No household records found. Try adjusting your search or filters.</div>
      ) : (
        <div className="record-table">
          <div className="record-table-head">
            <span>Name</span>
            <span>Mobile</span>
            <span>District</span>
            <span>Category</span>
            <span>Ration Card</span>
            <span>Added By</span>
            <span>Actions</span>
          </div>
          {rows.map((row) => (
            <div className="record-row" key={row.id}>
              <span data-label="Name">{row.full_name}</span>
              <span data-label="Mobile">{row.mobile_number}</span>
              <span data-label="District">{row.district || '—'}</span>
              <span data-label="Category">{row.category || '—'}</span>
              <span data-label="Ration Card">
                <span className={`badge badge-${(row.ration_card_type || 'none').toLowerCase()}`}>
                  {row.ration_card_type || 'N/A'}
                </span>
              </span>
              <span data-label="Added By">{row.created_by_name}</span>
              <span data-label="Actions" className="record-actions">
                <Link to={`/surveys/${row.id}`} className="btn btn-outline btn-sm">View</Link>
                {isAdmin && (
                  <>
                    <Link to={`/surveys/${row.id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(row)}>Delete</button>
                  </>
                )}
              </span>
            </div>
          ))}
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
    </div>
  );
}
