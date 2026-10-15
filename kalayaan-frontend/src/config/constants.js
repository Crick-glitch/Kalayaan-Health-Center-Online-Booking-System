// constants.js - enums and settings shared by the whole app.
export const APPOINTMENT_STATUS = {
  PENDING: 'Pending', CONFIRMED: 'Confirmed', CHECKED_IN: 'Checked In', IN_CONSULTATION: 'In Consultation',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled', NO_SHOW: 'No Show',
};
// What people SEE for a status. The stored value stays "Checked In"; it is shown as "Arrived".
const STATUS_LABEL = { 'Checked In': 'Arrived' };
export const statusLabel = (s) => STATUS_LABEL[s] || s;
export const SERVICE_CATEGORIES = ['Consultation', 'Preventive', 'Diagnostic'];
// The receptionist's URLs start with /staff.
export const ROLE_PREFIX = { patient: '/patient', doctor: '/doctor', receptionist: '/staff', admin: '/admin' };
export const roleHome = (role) => `${ROLE_PREFIX[role]}/dashboard`;
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
