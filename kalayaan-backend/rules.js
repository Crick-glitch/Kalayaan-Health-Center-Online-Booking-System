// rules.js - booking rules and slot generation in one place.
const dayjs = require('dayjs');
const R = { WINDOW_DAYS: 30, MIN_LEAD: 60, CUTOFF_H: 24, MAX_ACTIVE: 3, GRACE: 15 };
const ACTIVE = ['Pending', 'Confirmed', 'Checked In', 'In Consultation'];
const OCCUPY = [...ACTIVE, 'Completed']; // every status except Cancelled and No Show holds a slot
// What people SEE for a status. The stored value stays "Checked In"; it is shown as "Arrived".
const statusLabel = (s) => ({ 'Checked In': 'Arrived' }[s] || s);
const mins = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');

// Working time minus the break, every 30 minutes, where the whole service still fits.
function baseSlots(tpl, date, dur) {
  const d = tpl.find((x) => x.day === dayjs(date).day());
  if (!d) return [];
  const out = [];
  for (let m = mins(d.startTime); m + dur <= mins(d.endTime); m += 30) {
    const b = d.break;
    if (b && b.startTime && m < mins(b.endTime) && m + dur > mins(b.startTime)) continue;
    out.push(hhmm(m));
  }
  return out;
}
// Past times, the lead time and the 30-day window.
function allowed(date, t, walkIn) {
  const today = dayjs().format('YYYY-MM-DD');
  if (date < today || date > dayjs().add(R.WINDOW_DAYS, 'day').format('YYYY-MM-DD')) return false;
  return walkIn ? date === today : dayjs(`${date} ${t}`).isAfter(dayjs().add(R.MIN_LEAD, 'minute'));
}
// Readable date and time for messages: "October 12, 2026 at 2:30 PM". Raw ISO strings are never shown to users.
const when = (date, t) => `${dayjs(date).format('MMMM D, YYYY')} at ${dayjs('2000-01-01 ' + t).format('h:mm A')}`;
// REQUIRE_EMAIL_VERIFICATION=false lets new patients log in right after registering (password recovery still uses an emailed code).
// When the setting is missing it stays true.
const requireEmailVerification = () => String(process.env.REQUIRE_EMAIL_VERIFICATION ?? 'true').trim().toLowerCase() !== 'false';
module.exports = { R, ACTIVE, OCCUPY, statusLabel, mins, hhmm, baseSlots, allowed, when, requireEmailVerification };
