// AppRoutes.js - route definitions and access boundaries for the application.
// Portals are wrapped in ProtectedRoute (logged in) and RoleRoute (right role). Login is wrapped in GuestRoute.
import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, Link } from 'react-router-dom';
import { Button, Result, Spin } from 'antd';
import PublicLayout from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import PlaceholderPage from '../components/common/PlaceholderPage';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import GuestRoute from './GuestRoute';
import LoginPage from '../pages/auth/LoginPage';
import HomePage from '../pages/public/HomePage';

// Pages load on demand: a visitor only downloads the code for the screens they open. The login and home pages stay in the main bundle.
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'));
const VerifyAccountPage = lazy(() => import('../pages/auth/VerifyAccountPage'));
const AboutPage = lazy(() => import('../pages/public/AboutPage'));
const PrivacyPage = lazy(() => import('../pages/public/PrivacyPage'));
const ServicesPage = lazy(() => import('../pages/public/ServicesPage'));
const ProvidersPage = lazy(() => import('../pages/public/ProvidersPage'));
const ProviderDetailsPage = lazy(() => import('../pages/public/ProviderDetailsPage'));
const PatientDashboardPage = lazy(() => import('../pages/patient/PatientDashboardPage'));
const BookAppointmentPage = lazy(() => import('../pages/patient/BookAppointmentPage'));
const MyAppointmentsPage = lazy(() => import('../pages/patient/MyAppointmentsPage'));
const AppointmentDetailsPage = lazy(() => import('../pages/patient/AppointmentDetailsPage'));
const AppointmentsListPage = lazy(() => import('../pages/staff/AppointmentsListPage'));
const TodayDashboardPage = lazy(() => import('../pages/staff/TodayDashboardPage'));
const NotificationsPage = lazy(() => import('../pages/shared/NotificationsPage'));
const ProfilePage = lazy(() => import('../pages/shared/ProfilePage'));
const SettingsPage = lazy(() => import('../pages/shared/SettingsPage'));
const PatientsPage = lazy(() => import('../pages/staff/PatientsPage'));
const SchedulesPage = lazy(() => import('../pages/staff/SchedulesPage'));
const SchedulePage = lazy(() => import('../pages/doctor/SchedulePage'));
const DoctorProfilePage = lazy(() => import('../pages/doctor/DoctorProfilePage'));
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'));
const UsersPage = lazy(() => import('../pages/admin/UsersPage'));
const UserDetailsPage = lazy(() => import('../pages/admin/UserDetailsPage'));
const AdminProvidersPage = lazy(() => import('../pages/admin/AdminProvidersPage'));
const AdminServicesPage = lazy(() => import('../pages/admin/AdminServicesPage'));
const AdminSchedulesPage = lazy(() => import('../pages/admin/AdminSchedulesPage'));
const ArchivePage = lazy(() => import('../pages/admin/ArchivePage'));

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
  'admin/dashboard': <AdminDashboardPage />, 'admin/employees': <UsersPage />, 'admin/employees/:id': <UserDetailsPage />, 'admin/patients': <PatientsPage variant="admin" />,
  'admin/providers': <AdminProvidersPage />, 'admin/services': <AdminServicesPage />, 'admin/schedules': <AdminSchedulesPage />, 'admin/archive': <ArchivePage />, 'admin/settings': <SettingsPage />,
  'patient/services': <ServicesPage />, 'patient/providers': <ProvidersPage />, 'patient/providers/:id': <ProviderDetailsPage />, 'staff/providers': <ProvidersPage readOnly />,
};
const PUBLIC = Object.keys(BUILT).filter((k) => !k.includes('/') || k === 'providers/:id');
const ROLE_OF = { patient: 'patient', doctor: 'doctor', staff: 'receptionist', admin: 'admin' };
const PORTAL = {
  patient: [['dashboard', 'Dashboard'], ['book-appointment', 'Book Appointment'], ['appointments', 'My Appointments'], ['appointments/:id', 'Appointment details'], ['services', 'Services'], ['providers', 'Physicians'], ['providers/:id', 'Physician details'], ['notifications', 'Notifications'], ['profile', 'Profile'], ['settings', 'Settings']],
  doctor: [['dashboard', 'Dashboard'], ['appointments', 'Appointments'], ['appointments/:id', 'Appointment details'], ['schedule', 'Schedule'], ['patients', 'Patients'], ['notifications', 'Notifications'], ['profile', 'Profile']],
  staff: [['dashboard', 'Dashboard'], ['appointments', 'Appointments'], ['appointments/create', 'Create appointment'], ['appointments/:id', 'Appointment details'], ['patients', 'Patients'], ['providers', 'Physicians'], ['schedules', 'Schedules'], ['notifications', 'Notifications'], ['profile', 'Profile']],
  admin: [['dashboard', 'Dashboard'], ['employees', 'Employees'], ['employees/:id', 'Employee details'], ['patients', 'Patients'], ['providers', 'Physicians'], ['services', 'Services'], ['appointments', 'Appointments'], ['appointments/:id', 'Appointment details'], ['schedules', 'Schedules'], ['archive', 'Archive'], ['notifications', 'Notifications'], ['settings', 'Settings']],
};
const PageLoading = () => <div style={{ display: 'grid', placeItems: 'center', padding: 64 }}><Spin size="large" aria-label="Loading page" /></div>;
const Page = ({ children }) => <Suspense fallback={<PageLoading />}>{children}</Suspense>; // inside the layout, so the menu stays while a page loads
const ErrorPage = ({ code, title, sub }) => <Result status={code} title={title} subTitle={sub} extra={<Link to="/"><Button type="primary">Go home</Button></Link>} />;

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route element={<GuestRoute />}><Route path="login" element={<LoginPage />} /><Route path="register" element={<Page><RegisterPage /></Page>} /><Route path="verify-account" element={<Page><VerifyAccountPage /></Page>} /></Route>
        {PUBLIC.map((path) => <Route key={path} path={path} element={<Page>{BUILT[path]}</Page>} />)}
        <Route path="403" element={<ErrorPage code="403" title="Access denied" sub="You do not have permission to view this page." />} />
        <Route path="*" element={<ErrorPage code="404" title="Page not found" sub="The page you requested does not exist." />} />
      </Route>
      {Object.entries(PORTAL).map(([prefix, pages]) => (
        <Route key={prefix} element={<ProtectedRoute />}>
          <Route path={prefix} element={<RoleRoute allowedRoles={[ROLE_OF[prefix]]} />}>
            <Route element={<DashboardLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              {pages.map(([path, title]) => <Route key={path} path={path} element={<Page>{BUILT[`${prefix}/${path}`] || <PlaceholderPage title={title} />}</Page>} />)}
            </Route>
          </Route>
        </Route>
      ))}
    </Routes>
  );
}