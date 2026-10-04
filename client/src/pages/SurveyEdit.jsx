import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import SurveyForm from '../components/SurveyForm';
import ConfirmDialog from '../components/ConfirmDialog';

export default function SurveyEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingValues, setPendingValues] = useState(null);

  useEffect(() => {
    api
      .get(`/surveys/${id}`)
      .then(({ data }) => setSurvey(data.data))
      .catch(() => setServerError('This household record could not be found.'));
  }, [id]);

  const handleConfirmSubmit = async () => {
    const values = pendingValues;
    setPendingValues(null);
    setSubmitting(true);
    setServerError('');
    setErrors({});
    try {
      await api.put(`/surveys/${id}`, values);
      navigate(`/surveys/${id}`, { state: { justUpdated: true } });
    } catch (err) {
      if (err.response?.status === 400 && err.response.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setServerError(err.response?.data?.message || 'Unable to update this record.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (serverError && !survey) return <div className="alert alert-error">{serverError}</div>;
  if (!survey) return <div className="page-loader">Loading record…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Edit Household Record</h1>
          <p className="page-subtitle">Editing {survey.unique_id} for {survey.full_name}.</p>
        </div>
      </div>
      {serverError && <div className="alert alert-error">{serverError}</div>}
      <div className="panel">
        <SurveyForm initialValues={survey} onSubmit={setPendingValues} submitting={submitting} submitLabel="Save Changes" errors={errors} />
      </div>

      <ConfirmDialog
        open={!!pendingValues}
        title="Save Changes"
        message="Save these changes to the household record? The record will relock to Final once saved."
        confirmLabel="Save"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setPendingValues(null)}
      />
    </div>
  );
}
