// RoleRoute.js - the wrong role goes to the 403 page.
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleRoute({ allowedRoles }) {
  const { user } = useAuth();
  return user && allowedRoles.includes(user.role) ? <Outlet /> : <Navigate to="/403" replace />;
}
