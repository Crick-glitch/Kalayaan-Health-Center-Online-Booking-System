// navConfig.js - sidebar menu for each role. Keys are the URLs.
import {
  BellOutlined, CalendarOutlined, DashboardOutlined, InboxOutlined, MedicineBoxOutlined,
  ScheduleOutlined, SettingOutlined, TeamOutlined, UnorderedListOutlined, UserOutlined,
} from '@ant-design/icons';

const ICONS = {
  dashboard: <DashboardOutlined />,
  'book-appointment': <CalendarOutlined />,
  'appointments/create': <CalendarOutlined />,
  appointments: <UnorderedListOutlined />,
  users: <TeamOutlined />,
  patients: <UserOutlined />,
  providers: <MedicineBoxOutlined />,
  services: <MedicineBoxOutlined />,
  schedule: <ScheduleOutlined />,
  schedules: <ScheduleOutlined />,
  notifications: <BellOutlined />,
  archive: <InboxOutlined />,
  profile: <UserOutlined />,
  settings: <SettingOutlined />,
};
const menu = (prefix, items) => items.map(([path, label]) => ({ key: `${prefix}/${path}`, label, icon: ICONS[path] }));

export const NAV = {
  patient: menu('/patient', [['dashboard', 'Dashboard'], ['book-appointment', 'Book Appointment'], ['appointments', 'My Appointments'], ['services', 'Services'], ['providers', 'Providers'], ['notifications', 'Notifications'], ['profile', 'Profile'], ['settings', 'Settings']]),
  doctor: menu('/doctor', [['dashboard', 'Dashboard'], ['appointments', 'Appointments'], ['schedule', 'Schedule'], ['patients', 'Patients'], ['notifications', 'Notifications'], ['profile', 'Profile']]),
  staff: menu('/staff', [['dashboard', 'Dashboard'], ['appointments', 'Appointments'], ['appointments/create', 'Create Appointment'], ['patients', 'Patients'], ['providers', 'Providers'], ['schedules', 'Schedules'], ['notifications', 'Notifications'], ['profile', 'Profile']]),
  admin: menu('/admin', [['dashboard', 'Dashboard'], ['users', 'Users'], ['patients', 'Patients'], ['providers', 'Providers'], ['services', 'Services'], ['appointments', 'Appointments'], ['schedules', 'Schedules'], ['archive', 'Archive'], ['notifications', 'Notifications'], ['settings', 'Settings']]),
};
export const ROLE_LABEL = { patient: 'Patient', doctor: 'Doctor', staff: 'Receptionist', admin: 'Administrator' };
