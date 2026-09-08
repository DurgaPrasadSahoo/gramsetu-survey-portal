import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import AuthShell from '../components/AuthShell';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Reset Password" subtitle="Choose a new password for your account">
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">Password reset successfully. Redirecting to login…</div>}
        {!success && (
          <>
            <label className="form-field">
              <span className="form-label">Reset Token</span>
              <input value={token} onChange={(e) => setToken(e.target.value)} required placeholder="Paste the token from the reset link" />
            </label>
            <label className="form-field">
              <span className="form-label">New Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </label>
            <label className="form-field">
              <span className="form-label">Confirm New Password</span>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
            </label>
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </>
        )}
        <p className="auth-footer-text">
          <Link to="/login">← Back to Login</Link>
        </p>
      </form>
    </AuthShell>
  );
}
