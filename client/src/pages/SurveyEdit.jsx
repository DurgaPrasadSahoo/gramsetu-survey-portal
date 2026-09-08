import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import SurveyForm from '../components/SurveyForm';

export default function SurveyEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get(`/surveys/${id}`)
      .then(({ data }) => setSurvey(data.data))
      .catch(() => setServerError('This household record could not be found.'));
  }, [id]);

  const handleSubmit = async (values) => {
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
          <p className="page-subtitle">Editing record #{survey.id} for {survey.full_name}.</p>
        </div>
      </div>
      {serverError && <div className="alert alert-error">{serverError}</div>}
      <div className="panel">
        <SurveyForm initialValues={survey} onSubmit={handleSubmit} submitting={submitting} submitLabel="Save Changes" errors={errors} />
      </div>
    </div>
  );
}
