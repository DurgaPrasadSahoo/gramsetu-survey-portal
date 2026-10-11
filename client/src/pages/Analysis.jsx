import { useState } from 'react';
import SurveyAnalysisPanel from '../components/SurveyAnalysisPanel';
import WorkerAnalysisPanel from '../components/WorkerAnalysisPanel';

const TABS = [
  { key: 'survey', label: 'Survey Analysis' },
  { key: 'worker', label: 'Team Worker Analysis' },
];

export default function Analysis() {
  const [tab, setTab] = useState('survey');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Analysis</h1>
          <p className="page-subtitle">Portal-wide reporting across every household survey and every team worker.</p>
        </div>
      </div>

      <div className="record-actions" style={{ marginBottom: '1rem' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'survey' ? <SurveyAnalysisPanel /> : <WorkerAnalysisPanel />}
    </div>
  );
}
