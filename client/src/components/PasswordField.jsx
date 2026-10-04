import { useState } from 'react';

export default function PasswordField({ label, value, onChange, required, minLength, autoComplete }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="form-field">
      <span className="form-label">{label}</span>
      <div className="password-input">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          tabIndex={-1}
        >
          {visible ? '🙈' : '👁️'}
        </button>
      </div>
    </label>
  );
}
