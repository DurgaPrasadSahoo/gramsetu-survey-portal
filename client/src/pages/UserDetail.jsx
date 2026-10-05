import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import { ROLE_BADGE_CLASS, roleLabel } from '../constants/roles';
import { displayUserStatus } from '../constants/userStatus';
import { STATUS_BADGE_CLASS } from '../constants/surveyStatus';
import { TASK_STATUS_BADGE_CLASS, taskStatusLabel } from '../constants/taskStatus';

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

  const ownStatus = displayUserStatus(profile);

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
            <span className="profile-label">Mobile Number</span>
            <span>{profile.mobile_number || '—'}</span>
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
            <span className={`badge ${ownStatus.badgeClass}`}>{ownStatus.label}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Reporting Hierarchy</h3>
        <p className="muted" style={{ marginTop: '-0.3rem', marginBottom: '0.9rem' }}>
          {profile.name}'s chain of command, from the top of the organisation down to them.
        </p>
        <ol className="hierarchy-chain">
          {profile.hierarchy.map((node) => (
            <li key={node.id} className={`hierarchy-step ${node.id === profile.id ? 'is-self' : ''}`}>
              <span className={`badge ${ROLE_BADGE_CLASS[node.role] || ''}`}>{roleLabel(node.role)}</span>
              <span className="hierarchy-name">{node.name}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Field agents have no one beneath them, so this section is skipped for them entirely. */}
      {profile.role !== 'field_agent' && (
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
              {profile.subordinates.map((sub, index) => {
                const subStatus = displayUserStatus(sub);
                return (
                  <div className="record-row" key={sub.id}>
                    <span data-label="SL No.">{index + 1}</span>
                    <span data-label="Unique ID">{sub.unique_id}</span>
                    <span data-label="Name">{sub.name}</span>
                    <span data-label="Role">
                      <span className={`badge ${ROLE_BADGE_CLASS[sub.role] || ''}`}>{roleLabel(sub.role)}</span>
                    </span>
                    <span data-label="Surveys Submitted">{sub.surveyCount}</span>
                    <span data-label="Status">
                      <span className={`badge ${subStatus.badgeClass}`}>{subStatus.label}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="panel">
        <h3>Surveys Done by {profile.name}</h3>
        <p className="muted" style={{ marginTop: '-0.3rem', marginBottom: '0.9rem' }}>
          Every household record {profile.name} has submitted.
        </p>
        {profile.surveys.length === 0 ? (
          <div className="empty-state">No surveys submitted yet.</div>
        ) : (
          <div className="record-table record-table--profile-surveys">
            <div className="record-table-head">
              <span>SL No.</span>
              <span>Unique ID</span>
              <span>Household</span>
              <span>Status</span>
            </div>
            {profile.surveys.map((survey, index) => (
              <div className="record-row" key={survey.id}>
                <span data-label="SL No.">{index + 1}</span>
                <span data-label="Unique ID"><Link to={`/surveys/${survey.id}`}>{survey.unique_id}</Link></span>
                <span data-label="Household">{survey.full_name}</span>
                <span data-label="Status">
                  <span className={`badge ${STATUS_BADGE_CLASS[survey.status] || ''}`}>{survey.status}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Work Tasks Done by {profile.name}</h3>
        <p className="muted" style={{ marginTop: '-0.3rem', marginBottom: '0.9rem' }}>
          Every work task {profile.name} has initiated.
        </p>
        {profile.tasks.length === 0 ? (
          <div className="empty-state">No work tasks initiated yet.</div>
        ) : (
          <div className="record-table record-table--profile-tasks">
            <div className="record-table-head">
              <span>SL No.</span>
              <span>Unique ID</span>
              <span>Scheme</span>
              <span>Household</span>
              <span>Status</span>
            </div>
            {profile.tasks.map((task, index) => (
              <div className="record-row" key={task.id}>
                <span data-label="SL No.">{index + 1}</span>
                <span data-label="Unique ID">{task.unique_id}</span>
                <span data-label="Scheme">{task.scheme_label}</span>
                <span data-label="Household"><Link to={`/surveys/${task.survey_id}`}>{task.survey_full_name}</Link></span>
                <span data-label="Status">
                  <span className={`badge ${TASK_STATUS_BADGE_CLASS[task.status] || ''}`}>{taskStatusLabel(task.status)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
