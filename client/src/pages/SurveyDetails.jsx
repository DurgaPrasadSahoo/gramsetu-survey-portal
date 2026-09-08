import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import SurveyForm from '../components/SurveyForm';
import ConfirmDialog from '../components/ConfirmDialog';

export default function SurveyDetails() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [survey, setSurvey] = useState(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    api
      .get(`/surveys/${id}`)
      .then(({ data }) => setSurvey(data.data))
      .catch(() => setError('This household record could not be found.'));
  }, [id]);

  const handleDelete = async () => {
    try {
      await api.delete(`/surveys/${id}`);
      navigate('/surveys');
    } catch {
      setError('Unable to delete this record.');
      setConfirmDelete(false);
    }
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!survey) return <div className="page-loader">Loading record…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{survey.full_name}</h1>
          <p className="page-subtitle">
            Household record #{survey.id} · added by {survey.created_by_name} on{' '}
            {new Date(survey.created_at).toLocaleDateString()}
            {survey.updated_at && ` · last edited ${new Date(survey.updated_at).toLocaleDateString()}`}
          </p>
        </div>
        <div className="page-header-actions">
          <Link to="/surveys" className="btn btn-outline">← Back to List</Link>
          {isAdmin && (
            <>
              <Link to={`/surveys/${id}/edit`} className="btn btn-primary">Edit Record</Link>
              <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>Delete</button>
            </>
          )}
        </div>
      </div>

      {location.state?.justCreated && (
        <div className="alert alert-success">Survey record submitted successfully.</div>
      )}
      {!isAdmin && (
        <div className="alert alert-info">
          This record is locked. Field agents cannot edit or delete household records once submitted.
        </div>
      )}

      <div className="panel">
        <SurveyForm initialValues={survey} readOnly />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Household Record"
        message={`Are you sure you want to permanently delete the record for "${survey.full_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
