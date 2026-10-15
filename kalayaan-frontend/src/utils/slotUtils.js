// slotUtils.js - 30-minute slot generation. Same rules as the backend.
import dayjs from 'dayjs';

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
