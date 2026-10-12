// AppRoutes.js - route definitions and access boundaries for the application.
// Portals are wrapped in ProtectedRoute (logged in) and RoleRoute (right role). Login is wrapped in GuestRoute.
import { Navigate, Route, Routes, Link } from 'react-router-dom';
import { Button, Result } from 'antd';
import PublicLayout from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import PlaceholderPage from '../components/common/PlaceholderPage';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import GuestRoute from './GuestRoute';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import VerifyAccountPage from '../pages/auth/VerifyAccountPage';
import HomePage from '../pages/public/HomePage';
import AboutPage from '../pages/public/AboutPage';
import PrivacyPage from '../pages/public/PrivacyPage';
import ServicesPage from '../pages/public/ServicesPage';
import ProvidersPage from '../pages/public/ProvidersPage';
import ProviderDetailsPage from '../pages/public/ProviderDetailsPage';
import PatientDashboardPage from '../pages/patient/PatientDashboardPage';
import BookAppointmentPage from '../pages/patient/BookAppointmentPage';
import MyAppointmentsPage from '../pages/patient/MyAppointmentsPage';
import AppointmentDetailsPage from '../pages/patient/AppointmentDetailsPage';
import AppointmentsListPage from '../pages/staff/AppointmentsListPage';
import TodayDashboardPage from '../pages/staff/TodayDashboardPage';
import NotificationsPage from '../pages/shared/NotificationsPage';
import ProfilePage from '../pages/shared/ProfilePage';
import SettingsPage from '../pages/shared/SettingsPage';
import PatientsPage from '../pages/staff/PatientsPage';
import SchedulesPage from '../pages/staff/SchedulesPage';
import SchedulePage from '../pages/doctor/SchedulePage';
import DoctorProfilePage from '../pages/doctor/DoctorProfilePage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import UsersPage from '../pages/admin/UsersPage';
import UserDetailsPage from '../pages/admin/UserDetailsPage';
import AdminProvidersPage from '../pages/admin/AdminProvidersPage';
import AdminServicesPage from '../pages/admin/AdminServicesPage';
import AdminSchedulesPage from '../pages/admin/AdminSchedulesPage';
import ArchivePage from '../pages/admin/ArchivePage';

// One page can serve several roles; only route entries without a component use the placeholder fallback.
const BUILT = {
  about: <AboutPage />, services: <ServicesPage />, providers: <ProvidersPage />, 'providers/:id': <ProviderDetailsPage />, 'forgot-password': <ForgotPasswordPage />, 'reset-password': <ResetPasswordPage />, privacy: <PrivacyPage />,
  'patient/dashboard': <PatientDashboardPage />, 'patient/book-appointment': <BookAppointmentPage />, 'patient/appointments': <MyAppointmentsPage />, 'patient/appointments/:id': <AppointmentDetailsPage />,
  'staff/dashboard': <TodayDashboardPage variant="receptionist" />, 'doctor/dashboard': <TodayDashboardPage variant="doctor" />,
  'staff/appointments': <AppointmentsListPage />, 'doctor/appointments': <AppointmentsListPage />, 'admin/appointments': <AppointmentsListPage />,
  'staff/appointments/:id': <AppointmentDetailsPage />, 'doctor/appointments/:id': <AppointmentDetailsPage />, 'admin/appointments/:id': <AppointmentDetailsPage />,
  'patient/notifications': <NotificationsPage />, 'doctor/notifications': <NotificationsPage />, 'staff/notifications': <NotificationsPage />, 'admin/notifications': <NotificationsPage />,
  'patient/profile': <ProfilePage />, 'patient/settings': <SettingsPage />, 'staff/profile': <ProfilePage />,
  'staff/appointments/create': <BookAppointmentPage staff />, 'staff/patients': <PatientsPage />, 'staff/schedules': <SchedulesPage />,
  'doctor/schedule': <SchedulePage />, 'doctor/patients': <PatientsPage variant="doctor" />, 'doctor/profile': <DoctorProfilePage />,
  'admin/dashboard': <AdminDashboardPage />, 'admin/users': <UsersPage />, 'admin/users/:id': <UserDetailsPage />, 'admin/patients': <PatientsPage variant="admin" />,
  'admin/providers': <AdminProvidersPage />, 'admin/services': <AdminServicesPage />, 'admin/schedules': <AdminSchedulesPage />, 'admin/archive': <ArchivePage />, 'admin/settings': <SettingsPage />,
  'patient/services': <ServicesPage />, 'patient/providers': <ProvidersPage />, 'patient/providers/:id': <ProviderDetailsPage />, 'staff/providers': <ProvidersPage readOnly />,
};
const PUBLIC = Object.keys(BUILT).filter((k) => !k.includes('/') || k === 'providers/:id');
const ROLE_OF = { patient: 'patient', doctor: 'doctor', staff: 'receptionist', admin: 'admin' };
const PORTAL = {
  patient: [['dashboard', 'Dashboard'], ['book-appointment', 'Book Appointment'], ['appointments', 'My Appointments'], ['appointments/:id', 'Appointment details'], ['services', 'Services'], ['providers', 'Providers'], ['providers/:id', 'Provider details'], ['notifications', 'Notifications'], ['profile', 'Profile'], ['settings', 'Settings']],
  doctor: [['dashboard', 'Dashboard'], ['appointments', 'Appointments'], ['appointments/:id', 'Appointment details'], ['schedule', 'Schedule'], ['patients', 'Patients'], ['notifications', 'Notifications'], ['profile', 'Profile']],
  staff: [['dashboard', 'Dashboard'], ['appointments', 'Appointments'], ['appointments/create', 'Create appointment'], ['appointments/:id', 'Appointment details'], ['patients', 'Patients'], ['providers', 'Providers'], ['schedules', 'Schedules'], ['notifications', 'Notifications'], ['profile', 'Profile']],
  admin: [['dashboard', 'Dashboard'], ['users', 'Users'], ['users/:id', 'User details'], ['patients', 'Patients'], ['providers', 'Providers'], ['services', 'Services'], ['appointments', 'Appointments'], ['appointments/:id', 'Appointment details'], ['schedules', 'Schedules'], ['archive', 'Archive'], ['notifications', 'Notifications'], ['settings', 'Settings']],
};
const ErrorPage = ({ code, title, sub }) => <Result status={code} title={title} subTitle={sub} extra={<Link to="/"><Button type="primary">Go home</Button></Link>} />;

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route element={<GuestRoute />}><Route path="login" element={<LoginPage />} /><Route path="register" element={<RegisterPage />} /><Route path="verify-account" element={<VerifyAccountPage />} /></Route>
        {PUBLIC.map((path) => <Route key={path} path={path} element={BUILT[path]} />)}
        <Route path="403" element={<ErrorPage code="403" title="Access denied" sub="You do not have permission to view this page." />} />
        <Route path="*" element={<ErrorPage code="404" title="Page not found" sub="The page you requested does not exist." />} />
      </Route>
      {Object.entries(PORTAL).map(([prefix, pages]) => (
        <Route key={prefix} element={<ProtectedRoute />}>
          <Route path={prefix} element={<RoleRoute allowedRoles={[ROLE_OF[prefix]]} />}>
            <Route element={<DashboardLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              {pages.map(([path, title]) => <Route key={path} path={path} element={BUILT[`${prefix}/${path}`] || <PlaceholderPage title={title} />} />)}
            </Route>
          </Route>
        </Route>
      ))}
    </Routes>
  );
}
