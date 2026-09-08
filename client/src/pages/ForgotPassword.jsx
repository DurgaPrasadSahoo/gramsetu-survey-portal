import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import AuthShell from '../components/AuthShell';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMessage(data.message);
      // This demo portal has no email/SMS gateway wired up, so the token is
      // returned directly by the API. In production this would be emailed instead.
      if (data.devResetToken) {
        setTimeout(() => navigate(`/reset-password?token=${data.devResetToken}`), 1800);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Forgot Password" subtitle="We'll help you get back into your account">
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
        <label className="form-field">
          <span className="form-label">Registered Email Address</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? 'Sending…' : 'Send Reset Link'}
        </button>
        <p className="auth-footer-text">
          <Link to="/login">← Back to Login</Link>
        </p>
      </form>
    </AuthShell>
  );
}
