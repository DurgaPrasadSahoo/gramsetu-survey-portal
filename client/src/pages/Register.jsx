import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import PasswordField from '../components/PasswordField';
import ConfirmDialog from '../components/ConfirmDialog';
import { REQUIRED_PARENT_ROLES, OPTIONAL_PARENT_ROLES, ROLE_LABELS, CREATABLE_ROLES_BY_ROLE, roleLabel } from '../constants/roles';
import { ODISHA_DISTRICTS } from '../constants/surveyOptions';

function emptyForm(defaultRole) {
  return {
    name: '', email: '', mobileNumber: '', password: '', confirmPassword: '',
    role: defaultRole, parentId: '', district: 'Khordha',
  };
}

export default function Register() {
  const { user, isDeveloper } = useAuth();
  const creatableRoles = CREATABLE_ROLES_BY_ROLE[user?.role] || [];
  const defaultRole = creatableRoles[creatableRoles.length - 1];

  const [form, setForm] = useState(() => emptyForm(defaultRole));
  const [parentOptions, setParentOptions] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

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

  if (creatableRoles.length === 0) {
    return <div className="alert alert-error">You do not have permission to register new accounts.</div>;
  }

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleRoleChange = (role) => setForm((prev) => ({ ...prev, role, parentId: '' }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (isDeveloper && form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (needsParent && !form.parentId) {
      setError('Please select who this user reports to.');
      return;
    }
    setConfirmSubmit(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmSubmit(false);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        mobileNumber: form.mobileNumber,
        role: form.role,
        parentId: form.parentId || undefined,
        district: form.district,
        ...(isDeveloper ? { password: form.password, confirmPassword: form.confirmPassword } : {}),
      });
      setSuccess(
        data.pendingApproval
          ? `${roleLabel(data.user.role)} account submitted for ${data.user.name} (${data.user.email}) — awaiting developer approval before it can be used.`
          : `${roleLabel(data.user.role)} account created for ${data.user.name} (${data.user.email}) — ${data.user.unique_id}.`
      );
      setForm(emptyForm(defaultRole));
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
            {isDeveloper
              ? 'Create accounts anywhere in the hierarchy — the account goes live immediately.'
              : "Create an account for someone who'll work under you. A developer reviews and activates it before it can log in."}
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
            <span className="form-label">Mobile Number</span>
            <input
              value={form.mobileNumber}
              onChange={(e) => update('mobileNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
              inputMode="numeric"
              placeholder="10-digit mobile"
              required
            />
          </label>
          <label className="form-field">
            <span className="form-label">Role</span>
            <select value={form.role} onChange={(e) => handleRoleChange(e.target.value)}>
              {creatableRoles.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="form-label">District</span>
            <select value={form.district} onChange={(e) => update('district', e.target.value)} required>
              {ODISHA_DISTRICTS.map((d) => <option key={d}>{d}</option>)}
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

          {isDeveloper && (
            <>
              <PasswordField label="Password" value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={6} autoComplete="new-password" />
              <PasswordField label="Confirm Password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} required minLength={6} autoComplete="new-password" />
            </>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Submitting…' : isDeveloper ? 'Create Account' : 'Submit for Approval'}
          </button>
          <p className="auth-footer-text">
            <Link to="/team">View team directory</Link>
          </p>
        </form>
      </div>

      <ConfirmDialog
        open={confirmSubmit}
        title={isDeveloper ? 'Create Account' : 'Submit Registration'}
        message={
          isDeveloper
            ? `Create a ${roleLabel(form.role)} account for ${form.name || 'this user'} (${form.email})?`
            : `Submit a ${roleLabel(form.role)} registration for ${form.name || 'this user'} (${form.email})? A developer will need to review and activate it.`
        }
        confirmLabel={isDeveloper ? 'Create Account' : 'Submit'}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setConfirmSubmit(false)}
      />
    </div>
  );
}
