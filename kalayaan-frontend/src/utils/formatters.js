// formatters.js - small display helpers so components never format on their own.
export const nf = new Intl.NumberFormat('en-US');
export const formatCount = (n) => nf.format(n || 0);
export const fullName = (u) => (u ? [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ') : '');
export const initials = (u) => (u ? `${(u.firstName || '')[0] || ''}${(u.lastName || '')[0] || ''}`.toUpperCase() : '?');
export const doctorName = (p) => (p && p.user ? `Dr. ${p.user.firstName} ${p.user.lastName}` : 'Doctor');
export const durationText = (min) => `${min} min`; // plain text: the clock icon is reserved for the Pending status

export const apptDoctor = (a) => (a && a.provider ? doctorName(a.provider) : "—"); // the doctor of an appointment
export const roleLabel = (r) => ({ patient: 'Patient', doctor: 'Doctor', receptionist: 'Receptionist', admin: 'Administrator' }[r] || r);
