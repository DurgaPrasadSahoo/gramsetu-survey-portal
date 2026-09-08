import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAgents = () => {
    setLoading(true);
    api
      .get('/agents')
      .then(({ data }) => setAgents(data.data))
      .catch(() => setError('Unable to load field agents.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadAgents, []);

  const toggleStatus = async (agent) => {
    const nextStatus = agent.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/agents/${agent.id}/status`, { status: nextStatus });
      loadAgents();
    } catch {
      setError('Unable to update agent status.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Field Agents</h1>
          <p className="page-subtitle">Manage field agent accounts and monitor their survey contributions.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="page-loader">Loading agents…</div>
      ) : agents.length === 0 ? (
        <div className="empty-state">No field agents have registered yet.</div>
      ) : (
        <div className="record-table">
          <div className="record-table-head">
            <span>Name</span>
            <span>Email</span>
            <span>Surveys Submitted</span>
            <span>Joined</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {agents.map((agent) => (
            <div className="record-row" key={agent.id}>
              <span data-label="Name">{agent.name}</span>
              <span data-label="Email">{agent.email}</span>
              <span data-label="Surveys Submitted">{agent.surveyCount}</span>
              <span data-label="Joined">{new Date(agent.created_at).toLocaleDateString()}</span>
              <span data-label="Status">
                <span className={`badge ${agent.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                  {agent.status}
                </span>
              </span>
              <span data-label="Actions" className="record-actions">
                <button
                  className={`btn btn-sm ${agent.status === 'active' ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => toggleStatus(agent)}
                >
                  {agent.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
