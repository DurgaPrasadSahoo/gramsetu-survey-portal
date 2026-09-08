export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="auth-banner">
        <span className="brand-emblem">🇮🇳</span>
        <div>
          <div className="brand-title">GramSetu</div>
          <div className="brand-subtitle">Household Socio-Economic Survey Portal</div>
        </div>
      </div>
      <div className="auth-card">
        <h1>{title}</h1>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        {children}
      </div>
      <p className="auth-page-footer">Government of Demo State &middot; Department of Rural Development</p>
    </div>
  );
}
