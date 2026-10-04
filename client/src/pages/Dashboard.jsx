import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import { ASSET_FIELDS } from '../constants/surveyOptions';

export default function Dashboard() {
  const { user, isAdmin, isDeveloper } = useAuth();
  const isTopLevel = isAdmin || isDeveloper;
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/surveys/stats/summary')
      .then(({ data }) => setStats(data))
      .catch(() => setError('Unable to load dashboard statistics.'));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Welcome, {user?.name?.split(' ')[0]}</h1>
          <p className="page-subtitle">
            {isTopLevel
              ? 'Overview of all household surveys collected across Bhubaneswar, Odisha.'
              : 'Overview of the household surveys visible to you and your team. Add new entries from the field.'}
          </p>
        </div>
        <Link to="/surveys/new" className="btn btn-primary">+ New Survey Entry</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {stats && (
        <>
          <div className="stat-grid">
            <StatCard label={isTopLevel ? 'Total Households Surveyed' : 'Households Surveyed by Your Team'} value={stats.total} accent="blue" />
            {!isTopLevel && <StatCard label="Surveyed by You" value={stats.myCount} accent="green" />}
            <StatCard
              label="Subsidised Ration Card Holders (AAY/PHH/SFSS)"
              value={stats.byRationCard
                .filter((r) => ['AAY', 'PHH', 'SFSS'].includes(r.ration_card_type))
                .reduce((sum, r) => sum + r.c, 0)}
              accent="orange"
            />
            <StatCard
              label="Households with Bank Account"
              value={stats.assetOwnership.has_bank_account || 0}
              accent="teal"
            />
          </div>

          <div className="panel-grid">
            <div className="panel">
              <h3>Households by Category</h3>
              <ul className="breakdown-list">
                {stats.byCategory.length === 0 && <li className="muted">No data yet.</li>}
                {stats.byCategory.map((row) => (
                  <li key={row.category || 'unspecified'}>
                    <span>{row.category || 'Unspecified'}</span>
                    <span className="breakdown-count">{row.c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel">
              <h3>Households by Ration Card Type</h3>
              <ul className="breakdown-list">
                {stats.byRationCard.length === 0 && <li className="muted">No data yet.</li>}
                {stats.byRationCard.map((row) => (
                  <li key={row.ration_card_type || 'unspecified'}>
                    <span>{row.ration_card_type || 'Unspecified'}</span>
                    <span className="breakdown-count">{row.c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel">
              <h3>Asset Ownership</h3>
              <ul className="breakdown-list">
                {ASSET_FIELDS.map((asset) => (
                  <li key={asset.key}>
                    <span>{asset.label}</span>
                    <span className="breakdown-count">{stats.assetOwnership[asset.key] || 0}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
