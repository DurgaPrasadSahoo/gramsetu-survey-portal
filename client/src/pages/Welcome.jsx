import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Welcome() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="welcome-page">
      <div className="welcome-content">
        <div className="welcome-logo">
          <span className="welcome-emblem">🇮🇳</span>
          <h1 className="welcome-title">GramSetu</h1>
        </div>
        <p className="welcome-tagline">Household Survey &amp; Scheme-Delivery Portal — Bhubaneswar, Odisha</p>

        <div className="welcome-registry">
          <div><span>License No.</span>OD/GRAMSETU/2024/000123</div>
          <div><span>GST No.</span>21ABCDE1234F1Z5</div>
          <div><span>Registered Address</span>Bhubaneswar Municipal Corporation Complex, Saheed Nagar, Bhubaneswar, Khordha, Odisha — 751007</div>
          <div><span>Proprietor</span>Mayadhar Nayak</div>
        </div>
        <p className="welcome-disclaimer">A demonstration e-governance portal. All registry details above are illustrative, not real.</p>
      </div>

      <button className="btn btn-primary btn-lg welcome-login-btn" onClick={() => navigate('/login')}>
        Log In
      </button>
    </div>
  );
}
