export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <header className="auth-topbar">
        <span className="brand-emblem">🇮🇳</span>
        <div>
          <div className="brand-title">GramSetu</div>
          <div className="brand-subtitle">Household Survey Portal — Bhubaneswar, Odisha</div>
        </div>
      </header>
      <div className="auth-page-body">
        <div className="auth-card">
          <h1>{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          {children}
        </div>
        <p className="auth-page-footer">Government of Odisha &middot; Bhubaneswar Municipal Corporation (Demo Portal)</p>
      </div>
    </div>
  );
}
