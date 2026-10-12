// ProtectedRoute.js - not logged in goes to /login and remembers the page. (Frontend guards are UX only; the API enforces access.)
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, expired } = useAuth(), loc = useLocation();
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: loc.pathname, expired }} />;
}
