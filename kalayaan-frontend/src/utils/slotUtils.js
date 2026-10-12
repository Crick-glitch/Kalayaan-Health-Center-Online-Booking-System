// slotUtils.js - 30-minute slot generation. Same rules as the backend.
import dayjs from 'dayjs';
import { LIMITS, OCCUPYING_STATUSES } from './appointmentRules';
import { startOf, todayString } from './dateUtils';

export const mins = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const addMinutes = (t, n) => hhmm(mins(t) + n);

// Working time minus the break, every 30 minutes, where the whole service still fits.
export function baseSlots(schedule, date, duration) {
  const d = schedule && schedule.weeklyTemplate.find((x) => x.day === dayjs(date, 'YYYY-MM-DD').day());
  if (!d) return [];
  const out = [];
  for (let m = mins(d.startTime); m + duration <= mins(d.endTime); m += 30) {
    const b = d.break;
    if (b && b.startTime && m < mins(b.endTime) && m + duration > mins(b.startTime)) continue;
    out.push(hhmm(m));
  }
  return out;
}
// Removes taken slots, past times, the lead time and anything beyond the booking window. `skipId` ignores one appointment (for reschedule).
export function availableSlots({ schedule, service, date, appointments, walkIn = false, skipId }) {
  const busy = appointments.filter((a) => a.date === date && OCCUPYING_STATUSES.includes(a.status) && a._id !== skipId).map((a) => [mins(a.startTime), mins(a.endTime)]);
  if (date < todayString() || date > dayjs().add(LIMITS.WINDOW_DAYS, 'day').format('YYYY-MM-DD')) return [];
  return baseSlots(schedule, date, service.durationMinutes).filter((t) => {
    const s = mins(t), e = s + service.durationMinutes;
    if (busy.some(([a, b]) => s < b && e > a)) return false;
    return walkIn ? date === todayString() : startOf(date, t).isAfter(dayjs().add(LIMITS.MIN_LEAD_MINUTES, 'minute'));
  });
}
