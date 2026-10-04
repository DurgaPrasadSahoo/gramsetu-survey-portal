import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import SurveyList from './pages/SurveyList';
import SurveyAdd from './pages/SurveyAdd';
import SurveyDetails from './pages/SurveyDetails';
import SurveyEdit from './pages/SurveyEdit';
import Team from './pages/Team';
import Profile from './pages/Profile';
import SchemesInfo from './pages/SchemesInfo';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/surveys" element={<SurveyList />} />
          <Route path="/surveys/new" element={<SurveyAdd />} />
          <Route path="/surveys/:id" element={<SurveyDetails />} />
          <Route path="/schemes" element={<SchemesInfo />} />
          <Route path="/profile" element={<Profile />} />

          <Route element={<ProtectedRoute roles={['admin', 'developer']} />}>
            <Route path="/surveys/:id/edit" element={<SurveyEdit />} />
          </Route>

          <Route element={<ProtectedRoute roles={['developer', 'admin', 'head_of_district', 'head_of_panchayat']} />}>
            <Route path="/team" element={<Team />} />
          </Route>

          {/* Registering new accounts (any role, including field agents) is a developer-only action. */}
          <Route element={<ProtectedRoute roles={['developer']} />}>
            <Route path="/register" element={<Register />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
