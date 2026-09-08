import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import SurveyForm from '../components/SurveyForm';

export default function SurveyAdd() {
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    setSubmitting(true);
    setServerError('');
    setErrors({});
    try {
      const { data } = await api.post('/surveys', values);
      navigate(`/surveys/${data.data.id}`, { state: { justCreated: true } });
    } catch (err) {
      if (err.response?.status === 400 && err.response.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setServerError(err.response?.data?.message || 'Unable to save this survey record.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>New Household Survey Entry</h1>
          <p className="page-subtitle">
            Fill in the household details accurately. Once submitted, this entry cannot be edited by you —
            only a portal administrator can make corrections.
          </p>
        </div>
      </div>
      {serverError && <div className="alert alert-error">{serverError}</div>}
      <div className="panel">
        <SurveyForm onSubmit={handleSubmit} submitting={submitting} submitLabel="Submit Survey Entry" errors={errors} />
      </div>
    </div>
  );
}
