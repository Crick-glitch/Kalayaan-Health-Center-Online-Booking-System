// The UI shows only the actions getAvailableActions() returns. The backend checks every change again.
import dayjs from 'dayjs';
import { APPOINTMENT_STATUS as S } from '../config/constants';
import { isToday, startOf } from './dateUtils';

export const LIMITS = { WINDOW_DAYS: 30, MIN_LEAD_MINUTES: 60, CANCEL_CUTOFF_HOURS: 24, MAX_ACTIVE_PER_PATIENT: 3, NO_SHOW_GRACE_MINUTES: 15 };
export const ACTIVE_STATUSES = [S.PENDING, S.CONFIRMED, S.CHECKED_IN, S.IN_CONSULTATION];
export const OCCUPYING_STATUSES = [...ACTIVE_STATUSES, S.COMPLETED]; // only Cancelled and No Show free a slot
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
