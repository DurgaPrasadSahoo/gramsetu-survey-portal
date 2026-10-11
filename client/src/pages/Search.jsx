import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { ROLE_BADGE_CLASS, roleLabel } from '../constants/roles';
import { displayUserStatus } from '../constants/userStatus';
import { STATUS_BADGE_CLASS } from '../constants/surveyStatus';

export default function Search() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runSearch = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    api
      .get('/search', { params: { q: q.trim() } })
      .then(({ data }) => setResults(data))
      .catch(() => setError('Unable to search right now.'))
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Search</h1>
          <p className="page-subtitle">Search profiles and household surveys by name, mobile number, ID, or location.</p>
        </div>
      </div>

      <form className="filter-bar" onSubmit={runSearch}>
        <input
          className="filter-search"
          placeholder="Search by name, mobile number, Aadhaar, unique ID, district, panchayat, village…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {results && (
        <>
          <div className="panel">
            <h3>Profiles ({results.profiles.length})</h3>
            {results.profiles.length === 0 ? (
              <div className="empty-state">No matching profiles.</div>
            ) : (
              <div className="record-table record-table--search-profiles">
                <div className="record-table-head">
                  <span>Unique ID</span>
                  <span>Name</span>
                  <span>Role</span>
                  <span>Mobile</span>
                  <span>District / Panchayat</span>
                  <span>Status</span>
                </div>
                {results.profiles.map((p) => {
                  const status = displayUserStatus(p);
                  return (
                    <div className="record-row" key={`p${p.id}`}>
                      <span data-label="Unique ID"><Link to={`/team/${p.id}`}>{p.unique_id}</Link></span>
                      <span data-label="Name">{p.name}</span>
                      <span data-label="Role">
                        <span className={`badge ${ROLE_BADGE_CLASS[p.role] || ''}`}>{roleLabel(p.role)}</span>
                      </span>
                      <span data-label="Mobile">{p.mobile_number || '—'}</span>
                      <span data-label="District / Panchayat">{[p.district, p.panchayat].filter(Boolean).join(' / ') || '—'}</span>
                      <span data-label="Status">
                        <span className={`badge ${status.badgeClass}`}>{status.label}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="panel">
            <h3>Surveys ({results.surveys.length})</h3>
            {results.surveys.length === 0 ? (
              <div className="empty-state">No matching survey records.</div>
            ) : (
              <div className="record-table record-table--search-surveys">
                <div className="record-table-head">
                  <span>Survey ID</span>
                  <span>Household</span>
                  <span>Mobile</span>
                  <span>District / Panchayat / Village</span>
                  <span>Added By</span>
                  <span>Status</span>
                </div>
                {results.surveys.map((s) => (
                  <div className="record-row" key={`s${s.id}`}>
                    <span data-label="Survey ID"><Link to={`/surveys/${s.id}`}>{s.unique_id}</Link></span>
                    <span data-label="Household">{s.full_name}</span>
                    <span data-label="Mobile">{s.mobile_number}</span>
                    <span data-label="District / Panchayat / Village">
                      {[s.district, s.panchayat, s.village_town].filter(Boolean).join(' / ') || '—'}
                    </span>
                    <span data-label="Added By">{s.created_by_name}</span>
                    <span data-label="Status">
                      <span className={`badge ${STATUS_BADGE_CLASS[s.status] || ''}`}>{s.status}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
