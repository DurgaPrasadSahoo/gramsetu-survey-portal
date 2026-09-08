export default function StatCard({ label, value, accent = 'blue' }) {
  return (
    <div className={`stat-card accent-${accent}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
