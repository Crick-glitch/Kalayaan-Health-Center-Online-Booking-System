// dateUtils.js - ALL date logic goes through Day.js here. Never use new Date("YYYY-MM-DD") (it is parsed as UTC and breaks in UTC+8).
// Dates are "YYYY-MM-DD" strings and times are "HH:mm" (24h) strings.
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);
export const DATE_FMT = 'YYYY-MM-DD';
export const parseDate = (str) => dayjs(str, DATE_FMT);
export const toDateString = (d) => dayjs(d).format(DATE_FMT);
export const todayString = () => dayjs().format(DATE_FMT);
export const formatLong = (str) => (str ? parseDate(str).format('MMMM D, YYYY') : '—'); // October 12, 2026
export const formatTime = (hhmm) => (hhmm ? dayjs(`2000-01-01 ${hhmm}`, 'YYYY-MM-DD HH:mm').format('h:mm A') : '—'); // 10:30 AM
export const formatTimeRange = (a, b) => `${formatTime(a)} – ${formatTime(b)}`;
export const formatDateTime = (iso) => (iso ? `${dayjs(iso).format('MMMM D, YYYY')} · ${dayjs(iso).format('h:mm A')}` : '—'); // never show raw ISO strings
export const ageOf = (dob) => (dob ? dayjs().diff(parseDate(dob), 'year') : null); // whole years
export const isToday = (str) => parseDate(str).isSame(dayjs(), 'day');
export const isTomorrow = (str) => parseDate(str).isSame(dayjs().add(1, 'day'), 'day');
export const daysFromNow = (str) => parseDate(str).startOf('day').diff(dayjs().startOf('day'), 'day');
export const startOf = (date, time) => dayjs(`${date} ${time}`, 'YYYY-MM-DD HH:mm'); // an appointment's start moment
export const isPast = (date, time = '23:59') => startOf(date, time).isBefore(dayjs());
