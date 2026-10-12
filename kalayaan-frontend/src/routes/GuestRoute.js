// GuestRoute.js - logged-in users visiting /login or /register go to their own dashboard.
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleHome } from '../config/constants';

export default function GuestRoute() {
  const { user } = useAuth();
  return user ? <Navigate to={roleHome(user.role)} replace /> : <Outlet />;
}
