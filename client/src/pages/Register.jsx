import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import PasswordField from '../components/PasswordField';
import { REQUIRED_PARENT_ROLES, OPTIONAL_PARENT_ROLES, ROLE_LABELS, roleLabel } from '../constants/roles';

const CREATABLE_ROLES = ['head_of_district', 'head_of_panchayat', 'field_agent', 'admin', 'developer'];

const EMPTY_FORM = { name: '', email: '', password: '', confirmPassword: '', role: 'field_agent', parentId: '' };

export default function Register() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [parentOptions, setParentOptions] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const needsParent = !!REQUIRED_PARENT_ROLES[form.role];
  const parentIsOptional = !!OPTIONAL_PARENT_ROLES[form.role];
  const showParentField = needsParent || parentIsOptional;

  useEffect(() => {
    if (!showParentField) {
      setParentOptions([]);
      return;
    }
    api
      .get('/users/parents', { params: { role: form.role } })
      .then(({ data }) => setParentOptions(data.data))
      .catch(() => setParentOptions([]));
  }, [form.role, showParentField]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleRoleChange = (role) => setForm((prev) => ({ ...prev, role, parentId: '' }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (needsParent && !form.parentId) {
      setError('Please select who this user reports to.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        role: form.role,
        parentId: form.parentId || undefined,
      });
      setSuccess(`${roleLabel(data.user.role)} account created for ${data.user.name} (${data.user.email}).`);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create this account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Register New User</h1>
          <p className="page-subtitle">
            Developer-only: create accounts anywhere in the hierarchy — Head of District, Head of Panchayat, or Field Agent.
          </p>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 520 }}>
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <label className="form-field">
            <span className="form-label">Full Name</span>
            <input value={form.name} onChange={(e) => update('name', e.target.value)} required />
          </label>
          <label className="form-field">
            <span className="form-label">Email Address</span>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          </label>
          <label className="form-field">
            <span className="form-label">Role</span>
            <select value={form.role} onChange={(e) => handleRoleChange(e.target.value)}>
              {CREATABLE_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </label>

          {showParentField && (
            <label className="form-field">
              <span className="form-label">Reports To{needsParent ? '' : ' (optional)'}</span>
              <select value={form.parentId} onChange={(e) => update('parentId', e.target.value)} required={needsParent}>
                <option value="">
                  {parentOptions.length === 0 ? 'No eligible supervisors yet' : 'Select a supervisor…'}
                </option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {roleLabel(p.role)}</option>
                ))}
              </select>
            </label>
          )}

          <PasswordField label="Password" value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={6} autoComplete="new-password" />
          <PasswordField label="Confirm Password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} required minLength={6} autoComplete="new-password" />

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
          <p className="auth-footer-text">
            <Link to="/team">View team directory</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
