// constants.js - enums and settings shared by the whole app.
export const ROLES = { PATIENT: 'patient', DOCTOR: 'doctor', RECEPTIONIST: 'receptionist', ADMIN: 'admin' };
export const ACCOUNT_STATUS = { ACTIVE: 'active', INACTIVE: 'inactive', SUSPENDED: 'suspended' };
export const APPOINTMENT_STATUS = {
  PENDING: 'Pending', CONFIRMED: 'Confirmed', CHECKED_IN: 'Arrived', IN_CONSULTATION: 'In Consultation',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled', NO_SHOW: 'No Show',
};
// What people SEE for a status. The stored value stays "Checked In"; it is shown as "Arrived".
export const ACTIVE_STATUSES = [
  APPOINTMENT_STATUS.PENDING,
  APPOINTMENT_STATUS.CONFIRMED,
  APPOINTMENT_STATUS.CHECKED_IN,
  APPOINTMENT_STATUS.IN_CONSULTATION,
];
export const STATUS_LABEL = { 'Checked In': 'Arrived' };
export const statusLabel = (s) => STATUS_LABEL[s] || s;
export const SERVICE_CATEGORIES = ['Consultation', 'Preventive', 'Diagnostic'];
// The receptionist's URLs start with /staff.
export const ROLE_PREFIX = { patient: '/patient', doctor: '/doctor', receptionist: '/staff', admin: '/admin' };
export const roleHome = (role) => `${ROLE_PREFIX[role]}/dashboard`;
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
// Where a "Book" button leads: guests log in first, patients go to the booking wizard, staff and doctors do not book here.
export const bookPath = (user, query = '') => (!user ? '/login' : user.role === 'patient' ? `/patient/book-appointment${query}` : null);
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
