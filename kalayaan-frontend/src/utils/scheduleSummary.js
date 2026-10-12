// scheduleSummary.js - one line for a weekly schedule: "Mon to Fri, 9:00 AM - 5:00 PM", "Mon, Tue, Thu to Fri, hours vary" or "No schedule set".
import { formatTime } from './dateUtils';

const NAMES = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' }, ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function scheduleSummary(template) {
  const days = ORDER.filter((d) => (template || []).some((x) => x.day === d));
  if (!days.length) return 'No schedule set';
  const parts = []; let run = [];
  const flush = () => { if (run.length >= 3) parts.push(`${NAMES[run[0]]} to ${NAMES[run[run.length - 1]]}`); else run.forEach((d) => parts.push(NAMES[d])); run = []; };
  days.forEach((d) => { if (run.length && ORDER.indexOf(d) !== ORDER.indexOf(run[run.length - 1]) + 1) flush(); run.push(d); });
  flush();
  const hours = [...new Set(template.map((x) => `${x.startTime}-${x.endTime}`))];
  return `${parts.join(', ')}, ${hours.length === 1 ? `${formatTime(template[0].startTime)} - ${formatTime(template[0].endTime)}` : 'hours vary'}`;
}
