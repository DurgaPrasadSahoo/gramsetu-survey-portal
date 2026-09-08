import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.token, data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Field Agent Registration" subtitle="Create an account to start conducting household surveys in Bhubaneswar">
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        <label className="form-field">
          <span className="form-label">Full Name</span>
          <input value={form.name} onChange={(e) => update('name', e.target.value)} required autoFocus />
        </label>
        <label className="form-field">
          <span className="form-label">Email Address</span>
          <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
        </label>
        <label className="form-field">
          <span className="form-label">Password</span>
          <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={6} />
        </label>
        <label className="form-field">
          <span className="form-label">Confirm Password</span>
          <input type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} required minLength={6} />
        </label>
        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Register as Field Agent'}
        </button>
        <p className="auth-footer-text">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
