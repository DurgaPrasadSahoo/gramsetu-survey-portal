import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Maintenance from './pages/Maintenance';
import Dashboard from './pages/Dashboard';
import SurveyList from './pages/SurveyList';
import SurveyAdd from './pages/SurveyAdd';
import SurveyDetails from './pages/SurveyDetails';
import SurveyEdit from './pages/SurveyEdit';
import EditRequests from './pages/EditRequests';
import AccountRequests from './pages/AccountRequests';
import SoftwareFunctionality from './pages/SoftwareFunctionality';
import Team from './pages/Team';
import UserDetail from './pages/UserDetail';
import Profile from './pages/Profile';
import SchemesInfo from './pages/SchemesInfo';
import NotFound from './pages/NotFound';

const CAN_REGISTER_ROLES = ['developer', 'admin', 'head_of_district', 'head_of_panchayat'];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/maintenance" element={<Maintenance />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/surveys" element={<SurveyList />} />
          <Route path="/surveys/new" element={<SurveyAdd />} />
          <Route path="/surveys/:id" element={<SurveyDetails />} />
          {/* Who may actually edit a given record depends on its status and ownership
              (see getSurveyPermissions) rather than role, so this route itself is open
              to anyone authenticated — the server re-checks and 403s if not allowed. */}
          <Route path="/surveys/:id/edit" element={<SurveyEdit />} />
          <Route path="/schemes" element={<SchemesInfo />} />
          <Route path="/profile" element={<Profile />} />

          <Route element={<ProtectedRoute roles={['developer', 'admin', 'head_of_district', 'head_of_panchayat']} />}>
            <Route path="/team" element={<Team />} />
            <Route path="/team/:id" element={<UserDetail />} />
          </Route>

          {/* Anyone but a field agent can register someone to work under them. */}
          <Route element={<ProtectedRoute roles={CAN_REGISTER_ROLES} />}>
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Deciding edit/profile/status requests and pausing the portal are
              all developer-only actions. */}
          <Route element={<ProtectedRoute roles={['developer']} />}>
            <Route path="/edit-requests" element={<EditRequests />} />
            <Route path="/account-requests" element={<AccountRequests />} />
            <Route path="/software-functionality" element={<SoftwareFunctionality />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
