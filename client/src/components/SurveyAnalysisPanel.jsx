import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Pagination from '../components/Pagination';
import { ODISHA_DISTRICTS, PANCHAYATS_BY_DISTRICT, getPanchayatsForDistrict, CENTRAL_SCHEMES, ODISHA_SCHEMES } from '../constants/surveyOptions';

const PAGE_SIZE = 10;

// Every panchayat across every district, for when no district is selected.
const ALL_PANCHAYATS = [...new Set(Object.values(PANCHAYATS_BY_DISTRICT).flat())].sort();

export default function SurveyAnalysisPanel() {
  const [district, setDistrict] = useState('');
  const [panchayat, setPanchayat] = useState('');
  const [village, setVillage] = useState('');
  const [villages, setVillages] = useState([]);
  const [selectedSchemes, setSelectedSchemes] = useState([]);
  const [availability, setAvailability] = useState('');

  const [appliedFilters, setAppliedFilters] = useState(null);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const panchayatOptions = district ? getPanchayatsForDistrict(district) : ALL_PANCHAYATS;

  useEffect(() => {
    api
      .get('/analysis/villages', { params: { district, panchayat } })
      .then(({ data }) => setVillages(data.data))
      .catch(() => setVillages([]));
  }, [district, panchayat]);

  const toggleScheme = (key) => {
    setSelectedSchemes((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const loadResults = (filters, targetPage) => {
    setLoading(true);
    setError('');
    api
      .get('/analysis/surveys', {
        params: {
          district: filters.district,
          panchayat: filters.panchayat,
          village: filters.village,
          schemes: filters.selectedSchemes.join(','),
          availability: filters.availability,
          page: targetPage,
          pageSize: PAGE_SIZE,
        },
      })
      .then(({ data }) => {
        setRows(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch((err) => setError(err.response?.data?.message || 'Unable to run this analysis.'))
      .finally(() => setLoading(false));
  };

  const handleApply = (e) => {
    e.preventDefault();
    if (selectedSchemes.length === 0 || !availability) {
      setError('Select at least one scheme and an availability option to run this analysis.');
      return;
    }
    const filters = { district, panchayat, village, selectedSchemes, availability };
    setAppliedFilters(filters);
    setPage(1);
    loadResults(filters, 1);
  };

  const handlePageChange = (next) => {
    setPage(next);
    loadResults(appliedFilters, next);
  };

  const renderSchemeGroup = (title, schemes) => (
    <div>
      <h4 className="scheme-group-title">{title}</h4>
      <div className="asset-grid">
        {schemes.map((s) => (
          <label key={s.key} className="checkbox-tile" title={s.description}>
            <input type="checkbox" checked={selectedSchemes.includes(s.key)} onChange={() => toggleScheme(s.key)} />
            {s.label}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <form className="panel" onSubmit={handleApply}>
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
          <select value={availability} onChange={(e) => setAvailability(e.target.value)}>
            <option value="">Availability…</option>
            <option value="yes">Marked Availed</option>
            <option value="no">Not Availed</option>
          </select>
        </div>

        <p className="muted" style={{ marginTop: 0 }}>
          Select the scheme(s) to check, and whether the matched surveys should have all of them marked availed
          or none of them.
        </p>
        {renderSchemeGroup('Central Government Schemes', CENTRAL_SCHEMES)}
        {renderSchemeGroup('Odisha State Government Schemes', ODISHA_SCHEMES)}

        {error && (
          <div className="alert alert-error" style={{ marginTop: '1rem' }}>
            {error}
          </div>
        )}

        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Run Analysis
          </button>
        </div>
      </form>

      {appliedFilters &&
        (loading ? (
          <div className="page-loader">Running analysis…</div>
        ) : rows.length === 0 ? (
          <div className="empty-state">No surveys match this filter.</div>
        ) : (
          <>
            <p className="page-subtitle">{total} household{total === 1 ? '' : 's'} matched.</p>
            <div className="record-table record-table--survey-analysis">
              <div className="record-table-head">
                <span>SL No.</span>
                <span>Survey ID</span>
                <span>Owner Name</span>
                <span>Added By</span>
                <span>District</span>
                <span>Panchayat</span>
                <span>Village</span>
              </div>
              {rows.map((row, index) => (
                <div className="record-row" key={row.id}>
                  <span data-label="SL No.">{(page - 1) * PAGE_SIZE + index + 1}</span>
                  <span data-label="Survey ID">
                    <Link to={`/surveys/${row.id}`}>{row.unique_id}</Link>
                  </span>
                  <span data-label="Owner Name">{row.full_name}</span>
                  <span data-label="Added By">{row.created_by_name}</span>
                  <span data-label="District">{row.district}</span>
                  <span data-label="Panchayat">{row.panchayat}</span>
                  <span data-label="Village">{row.village_town}</span>
                </div>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
          </>
        ))}
    </div>
  );
}
