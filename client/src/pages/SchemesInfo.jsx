import { CENTRAL_SCHEMES, ODISHA_SCHEMES } from '../constants/surveyOptions';

function SchemeList({ schemes }) {
  return (
    <ul className="scheme-list">
      {schemes.map((s) => (
        <li key={s.key}>
          <span className="scheme-name">{s.label}</span>
          <span className="scheme-desc">{s.description}</span>
        </li>
      ))}
    </ul>
  );
}

export default function SchemesInfo() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Government Schemes</h1>
          <p className="page-subtitle">
            Central and Odisha State Government welfare schemes tracked by this survey for households
            in Bhubaneswar — India's first-ranked Smart City. Use this list as a reference while filling
            the "Government Schemes Availed" section of a survey entry.
          </p>
        </div>
      </div>

      <div className="panel-grid">
        <div className="panel">
          <h3>Central Government Schemes</h3>
          <SchemeList schemes={CENTRAL_SCHEMES} />
        </div>
        <div className="panel">
          <h3>Odisha State Government Schemes</h3>
          <SchemeList schemes={ODISHA_SCHEMES} />
        </div>
      </div>
    </div>
  );
}
