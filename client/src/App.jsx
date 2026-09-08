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
import Agents from './pages/Agents';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/surveys" element={<SurveyList />} />
          <Route path="/surveys/new" element={<SurveyAdd />} />
          <Route path="/surveys/:id" element={<SurveyDetails />} />
          <Route path="/profile" element={<Profile />} />

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/surveys/:id/edit" element={<SurveyEdit />} />
            <Route path="/agents" element={<Agents />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
