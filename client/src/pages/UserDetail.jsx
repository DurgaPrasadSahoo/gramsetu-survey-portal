import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import { ROLE_BADGE_CLASS, roleLabel } from '../constants/roles';

export default function UserDetail() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/users/${id}`)
      .then(({ data }) => setProfile(data.data))
      .catch(() => setError('This user could not be found, or you do not have permission to view them.'));
  }, [id]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!profile) return <div className="page-loader">Loading profile…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{profile.name}</h1>
          <p className="page-subtitle">{profile.unique_id}</p>
        </div>
        <Link to="/team" className="btn btn-outline">← Back to Team Directory</Link>
      </div>

      <div className="panel profile-panel">
        <div className="profile-avatar">{profile.name?.charAt(0)}</div>
        <div className="profile-details">
          <div className="profile-row">
            <span className="profile-label">Email Address</span>
            <span>{profile.email}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Role</span>
            <span className={`badge ${ROLE_BADGE_CLASS[profile.role] || ''}`}>{roleLabel(profile.role)}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">District</span>
            <span>{profile.district || '—'}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Reports To</span>
            <span>{profile.parent_name || '—'}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Surveys Submitted</span>
            <span>{profile.surveyCount}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Account Status</span>
            <span className={`badge ${profile.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
              {profile.status}
            </span>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Working Under {profile.name}</h3>
        <p className="muted" style={{ marginTop: '-0.3rem', marginBottom: '0.9rem' }}>
          Everyone who reports to {profile.name}, directly or indirectly.
        </p>

        {profile.subordinates.length === 0 ? (
          <div className="empty-state">No one reports to {profile.name}.</div>
        ) : (
          <div className="record-table record-table--subordinates">
            <div className="record-table-head">
              <span>SL No.</span>
              <span>Unique ID</span>
              <span>Name</span>
              <span>Role</span>
              <span>Surveys Submitted</span>
              <span>Status</span>
            </div>
            {profile.subordinates.map((sub, index) => (
              <div className="record-row" key={sub.id}>
                <span data-label="SL No.">{index + 1}</span>
                <span data-label="Unique ID">{sub.unique_id}</span>
                <span data-label="Name">{sub.name}</span>
                <span data-label="Role">
                  <span className={`badge ${ROLE_BADGE_CLASS[sub.role] || ''}`}>{roleLabel(sub.role)}</span>
                </span>
                <span data-label="Surveys Submitted">{sub.surveyCount}</span>
                <span data-label="Status">
                  <span className={`badge ${sub.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                    {sub.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
