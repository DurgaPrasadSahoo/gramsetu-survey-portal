import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import SurveyForm from '../components/SurveyForm';
import ConfirmDialog from '../components/ConfirmDialog';

export default function SurveyAdd() {
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [pendingValues, setPendingValues] = useState(null);
  const navigate = useNavigate();

  const handleConfirmSubmit = async () => {
    const values = pendingValues;
    setPendingValues(null);
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
            Fill in the household details accurately. Once submitted, this entry is locked — use "Edit Request"
            from Household Records to ask the developer to unlock it for corrections.
          </p>
        </div>
      </div>
      {serverError && <div className="alert alert-error">{serverError}</div>}
      <div className="panel">
        <SurveyForm onSubmit={setPendingValues} submitting={submitting} submitLabel="Submit Survey Entry" errors={errors} />
      </div>

      <ConfirmDialog
        open={!!pendingValues}
        title="Submit Survey Entry"
        message="Submit this household survey entry? Once submitted, it will be locked until an edit request is approved."
        confirmLabel="Submit"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setPendingValues(null)}
      />
    </div>
  );
}
