import AuthShell from '../components/AuthShell';

export default function Maintenance() {
  return (
    <AuthShell title="Portal Paused" subtitle="GramSetu is temporarily paused for maintenance">
      <p className="muted" style={{ marginBottom: '1.2rem' }}>
        The developer has paused the portal for maintenance. Please check back shortly — your session
        will still be here when it's back.
      </p>
      <button className="btn btn-primary btn-block" onClick={() => window.location.assign('/dashboard')}>
        Try Again
      </button>
    </AuthShell>
  );
}
