// The UI shows only getAvailableActions(); mock services call validateTransition() again, and the backend checks it a third time.
import dayjs from 'dayjs';
import { APPOINTMENT_STATUS as S } from '../config/constants';
import { apiError } from './handleApiError';
import { isToday, startOf } from './dateUtils';

export const LIMITS = { WINDOW_DAYS: 30, MIN_LEAD_MINUTES: 60, CANCEL_CUTOFF_HOURS: 24, MAX_ACTIVE_PER_PATIENT: 3, NO_SHOW_GRACE_MINUTES: 15 };
export const ACTIVE_STATUSES = [S.PENDING, S.CONFIRMED, S.CHECKED_IN, S.IN_CONSULTATION];
export const OCCUPYING_STATUSES = [...ACTIVE_STATUSES, S.COMPLETED]; // only Cancelled and No Show free a slot
export const TERMINAL_STATUSES = [S.COMPLETED, S.CANCELLED, S.NO_SHOW];
const FLOW = {
  [S.PENDING]: { [S.CONFIRMED]: ['receptionist', 'admin'], [S.CANCELLED]: ['patient', 'receptionist', 'admin'] },
  [S.CONFIRMED]: { [S.CANCELLED]: ['patient', 'receptionist', 'admin'], [S.CHECKED_IN]: ['receptionist'], [S.NO_SHOW]: ['receptionist'] },
  [S.CHECKED_IN]: { [S.IN_CONSULTATION]: ['doctor'] },
  [S.IN_CONSULTATION]: { [S.COMPLETED]: ['doctor'] },
};
const hoursUntil = (a) => startOf(a.date, a.startTime).diff(dayjs(), 'hour', true);
const pastGrace = (a) => dayjs().isAfter(startOf(a.date, a.startTime).add(LIMITS.NO_SHOW_GRACE_MINUTES, 'minute'));
const hasPending = (a) => !!(a.reschedulePending && a.reschedulePending.date);
const mine = (a, u) => (u.role === 'patient' ? a.patientId === u._id : u.role === 'doctor' ? a.provider && a.provider.userId === u._id : true);

// Returns the action keys this user may see for this appointment.
export function getAvailableActions(a, u) {
  const out = [];
  const can = (to) => FLOW[a.status] && FLOW[a.status][to] && FLOW[a.status][to].includes(u.role) && mine(a, u);
  if (can(S.CONFIRMED)) out.push('confirm');
  if (can(S.CHECKED_IN) && isToday(a.date)) out.push('checkIn');
  if (can(S.NO_SHOW) && pastGrace(a)) out.push('noShow');
  if (can(S.IN_CONSULTATION)) out.push('startConsultation');
  if (can(S.COMPLETED)) out.push('complete');
  if (can(S.CANCELLED) && (u.role !== 'patient' || hoursUntil(a) >= LIMITS.CANCEL_CUTOFF_HOURS)) out.push('cancel');
  if (a.status === S.CONFIRMED && u.role === 'patient' && mine(a, u) && !hasPending(a) && hoursUntil(a) >= LIMITS.CANCEL_CUTOFF_HOURS) out.push('requestReschedule');
  if (a.status === S.CONFIRMED && ['receptionist', 'admin'].includes(u.role)) out.push(...(hasPending(a) ? ['applyReschedule', 'rejectReschedule'] : []), 'reschedule');
  return out;
}
// Throws a coded error when the change is not allowed. Used by the mock services (the backend does the same).
export function validateTransition(a, to, u, payload = {}) {
  const who = FLOW[a.status] && FLOW[a.status][to];
  if (!who) throw apiError(409, 'INVALID_TRANSITION', `Cannot change an appointment from ${a.status} to ${to}.`);
  if (!who.includes(u.role) || !mine(a, u)) throw apiError(403, 'FORBIDDEN', 'You do not have permission to do that.');
  if (to === S.CANCELLED && u.role === 'patient' && hoursUntil(a) < LIMITS.CANCEL_CUTOFF_HOURS) throw apiError(409, 'CUTOFF_PASSED', 'Appointments can be cancelled online up to 24 hours before the visit.');
  if (to === S.CANCELLED && u.role !== 'patient' && !(payload.reason && payload.reason.trim().length >= 5)) throw apiError(400, 'VALIDATION_ERROR', 'A reason is required.', { reason: 'Enter at least 5 characters.' });
  if (to === S.CHECKED_IN && !isToday(a.date)) throw apiError(409, 'INVALID_TRANSITION', 'Arrival can only be recorded on the appointment date.');
  if (to === S.NO_SHOW && !pastGrace(a)) throw apiError(409, 'INVALID_TRANSITION', 'No Show is available 15 minutes after the start time.');
  if (to === S.COMPLETED && !(payload.summary && payload.summary.length >= 10 && payload.summary.length <= 1000)) throw apiError(400, 'VALIDATION_ERROR', 'Summary must be 10 to 1000 characters.', { summary: 'Summary must be 10 to 1000 characters.' });
}
