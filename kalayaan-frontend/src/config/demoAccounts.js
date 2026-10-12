// demoAccounts.js - DEV ONLY. The demo logins created by the backend seed (npm run seed). Remove before real use.
// Shown on the login page only when clinic.SHOW_DEMO_ACCOUNTS is true.
export const DEMO_PASSWORD = 'Kalayaan#2026';
const DEMO_ACCOUNTS = [
  { role: 'Patient', name: 'Ana Reyes', email: 'ana.reyes@email.com' },
  { role: 'Doctor', name: 'Dr. Elena Santos', email: 'elena@kalayaan.example' },
  { role: 'Receptionist', name: 'Joy Mendoza', email: 'joy@kalayaan.example' },
  { role: 'Admin', name: 'Paolo Cruz', email: 'paolo@kalayaan.example' },
];
export default DEMO_ACCOUNTS;
