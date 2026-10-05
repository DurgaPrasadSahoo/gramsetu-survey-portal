import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import SurveyForm from '../components/SurveyForm';
import ConfirmDialog from '../components/ConfirmDialog';
import WorkTasks from '../components/WorkTasks';
import { STATUS_BADGE_CLASS, SURVEY_STATUS } from '../constants/surveyStatus';
import { getSurveyPermissions } from '../utils/surveyPermissions';

const STATUS_MESSAGES = {
  [SURVEY_STATUS.FINAL]: 'This record is locked. Submit an edit request to ask the developer to unlock it for corrections.',
  [SURVEY_STATUS.EDIT_REQUESTED]: 'An edit request for this record is awaiting developer approval.',
  [SURVEY_STATUS.REQUEST_APPROVED]: 'Your edit request was approved — you can now edit or delete this record.',
};

export default function SurveyDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [survey, setSurvey] = useState(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmEditRequest, setConfirmEditRequest] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const loadSurvey = () => {
    api
      .get(`/surveys/${id}`)
      .then(({ data }) => setSurvey(data.data))
      .catch(() => setError('This household record could not be found.'));
  };

  useEffect(loadSurvey, [id]);

  const handleDelete = async () => {
    try {
      await api.delete(`/surveys/${id}`);
      navigate('/surveys');
    } catch {
      setError('Unable to delete this record.');
      setConfirmDelete(false);
    }
  };

  const handleEditRequest = async () => {
    setConfirmEditRequest(false);
    setRequesting(true);
    setError('');
    try {
      await api.post(`/surveys/${id}/edit-request`);
      loadSurvey();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit an edit request for this record.');
    } finally {
      setRequesting(false);
    }
  };

  if (error && !survey) return <div className="alert alert-error">{error}</div>;
  if (!survey) return <div className="page-loader">Loading record…</div>;

  const perms = getSurveyPermissions(survey, user);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{survey.full_name}</h1>
          <p className="page-subtitle">
            {survey.unique_id} · added by {survey.created_by_name} on{' '}
            {new Date(survey.created_at).toLocaleDateString()}
            {survey.updated_at && ` · last edited ${new Date(survey.updated_at).toLocaleDateString()}`}
          </p>
        </div>
        <div className="page-header-actions">
          <Link to="/surveys" className="btn btn-outline">← Back to List</Link>
          <button className="btn btn-outline" disabled={!perms.canRequestEdit || requesting} onClick={() => setConfirmEditRequest(true)}>
            {requesting ? 'Requesting…' : 'Edit Request'}
          </button>
          {perms.canEdit ? (
            <Link to={`/surveys/${id}/edit`} className="btn btn-primary">Edit Record</Link>
          ) : (
            <button className="btn btn-primary" disabled>Edit Record</button>
          )}
          <button className="btn btn-danger" disabled={!perms.canDelete} onClick={() => setConfirmDelete(true)}>Delete</button>
        </div>
      </div>

      {location.state?.justCreated && (
        <div className="alert alert-success">Survey record submitted successfully.</div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span className={`badge ${STATUS_BADGE_CLASS[survey.status] || ''}`}>{survey.status}</span>
        {user.role !== 'developer' && <span className="muted">{STATUS_MESSAGES[survey.status]}</span>}
      </div>

      <div className="panel">
        <SurveyForm initialValues={survey} readOnly />
      </div>

      <WorkTasks surveyId={id} />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Household Record"
        message={`Are you sure you want to permanently delete the record for "${survey.full_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={confirmEditRequest}
        title="Request an Edit"
        message={`Send a request to the developer to unlock "${survey.full_name}" for editing?`}
        confirmLabel="Send Request"
        onConfirm={handleEditRequest}
        onCancel={() => setConfirmEditRequest(false)}
      />
    </div>
  );
}
