// smoke-test.js - checks the RUNNING API end to end (roles, booking rules, lifecycle, archive, new Part 3 endpoints).
// Use: 1) npm run seed   2) npm run dev (another terminal)   3) npm run smoke
// It books, cancels and archives real records, so run `npm run seed` again afterwards to get the clean demo data back.
// Set SKIP_INDEX_TEST=1 only if your database cannot create partial unique indexes (real MongoDB can).
process.env.TZ = process.env.TZ || 'Asia/Manila'; // same clock as the server, so "today" means the same day in both
const dayjs = require('dayjs');
const BASE = process.env.API_URL || 'http://localhost:8000/api', PASSWORD = 'Kalayaan#2026';
let passed = 0, failed = 0;

const call = async (method, path, body, token) => {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body == null ? undefined : JSON.stringify(body) });
  return { s: r.status, d: await r.json().catch(() => ({})) };
};
const check = (name, cond, detail) => { if (cond) { passed++; console.log('  ok    ' + name); } else { failed++; console.log('  FAIL  ' + name + (detail ? '  -> ' + JSON.stringify(detail).slice(0, 260) : '')); } };
const section = (t) => console.log('\n' + t);
const login = async (email, password = PASSWORD) => { const r = await call('POST', '/auth/login', { email, password }); if (r.s !== 200) throw new Error(`Cannot log in as ${email}: ${JSON.stringify(r.d)}`); return { token: r.d.token, user: r.d.user }; };
const day = (n) => dayjs().add(n, 'day').format('YYYY-MM-DD');
const DOCTOR_EMAIL = { Santos: 'elena', Lim: 'marco', Tan: 'grace', Villanueva: 'rhea' }; // provider last name -> seeded doctor login
const SLOT_GONE = 'This appointment slot is no longer available. Please select another time.';
const PROFILE = (extra = {}) => ({ firstName: 'Smoke', lastName: 'Tester', sex: 'Female', dateOfBirth: '1996-04-12', contactNumber: '09175550101', address: '10 Test Avenue, Barangay Kalayaan', emergencyContact: { name: 'Mina Tester', relationship: 'Mother', contactNumber: '09175550102' }, ...extra });

(async () => {
  const id = Date.now(), tag = String(id).slice(-6);
  const [paolo, joy, elena, ana] = await Promise.all(['paolo@kalayaan.example', 'joy@kalayaan.example', 'elena@kalayaan.example', 'ana.reyes@email.com'].map((e) => login(e)));
  const services = (await call('GET', '/services')).d.services, providers = (await call('GET', '/providers')).d.providers;
  const followUp = services.find((s) => s.name === 'Follow-up Consultation'); // offered by all four doctors, 15 minutes: handy for tests
  const slots = async (p, date, tok, extra = '') => (await call('GET', `/providers/${p._id}/slots?serviceId=${followUp._id}&date=${date}${extra}`, null, tok)).d.slots || [];
  const firstOpen = async (from, tok, notBefore = 0) => { // first provider, date and slot available from `from` days ahead
    for (let i = from; i < from + 14; i++) for (const p of providers) { const s = (await slots(p, day(i), tok)).filter((t) => dayjs(`${day(i)} ${t}`).isAfter(dayjs().add(notBefore, 'hour'))); if (s.length) return { p, date: day(i), s }; }
  };
  const book = (tok, p, date, startTime, extra = {}) => call('POST', '/appointments', { providerId: p._id, serviceId: followUp._id, date, startTime, reason: 'Review of recent test results', ...extra }, tok);

  section('Accounts and security');
  let r = await call('POST', '/auth/login', { email: 'ana.reyes@email.com', password: 'wrong' }); check('wrong password gives the generic message', r.s === 401 && r.d.message === 'Invalid email or password.', r.d);
  r = await call('POST', '/auth/login', { email: 'jo.lacson@email.com', password: PASSWORD }); check('archived account is unavailable', r.s === 403 && r.d.message === 'Account unavailable. Contact the health center.', r.d);
  r = await call('GET', '/appointments'); check('no token gives 401', r.s === 401, r.d);
  r = await call('POST', '/auth/register', { ...PROFILE(), email: 'bad' }); check('register lists every wrong field at once', r.s === 400 && r.d.fieldErrors.email && r.d.fieldErrors.password && r.d.fieldErrors.agreement, r.d);
  const email = `smoke.${tag}@email.com`;
  r = await call('POST', '/auth/register', { ...PROFILE(), email, password: 'Smoke#1234', agreement: true });
  check('register sends a code and never returns a password hash', r.s === 201 && r.d.developmentCode && !JSON.stringify(r.d).includes('passwordHash'), r.d);
  let authResult = await call('POST', '/auth/login', { email, password: 'Smoke#1234' });
  check('unverified account cannot log in', authResult.s === 403 && authResult.d.code === 'ACCOUNT_UNVERIFIED', authResult.d);
  r = await call('POST', '/auth/verify-registration', { identifier: email, code: r.d.developmentCode });
  check('verification code activates the account', r.s === 200, r.d);
  authResult = await call('POST', '/auth/login', { email, password: 'Smoke#1234' });
  const smoke = { token: authResult.d.token, user: authResult.d.user };
  r = await call('POST', '/auth/register', { ...PROFILE(), email, password: 'Smoke#1234', agreement: true }); check('duplicate email gives 409', r.s === 409 && r.d.message === 'An account with this email already exists.', r.d);
  r = await call('GET', '/auth/me', null, smoke.token); check('me has no password hash', r.s === 200 && !JSON.stringify(r.d).includes('passwordHash'), r.d);
  r = await fetch(BASE + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' }); check('malformed JSON gives 400, not 500', r.status === 400, r.status);
  r = await call('GET', '/appointments/not-an-id', null, ana.token); check('invalid id gives 400', r.s === 400, r.d);
  r = await call('GET', '/users', null, ana.token); check('patient cannot open the user list (403)', r.s === 403, r.d);
  r = await call('PATCH', `/users/${paolo.user._id}/status`, { accountStatus: 'inactive' }, paolo.token); check('nobody changes their own status', r.s === 403 && r.d.code === 'SELF_PROTECTION', r.d);

  section('Edit my profile (PUT /auth/me)');
  r = await call('PUT', '/auth/me', { contactNumber: '09176660000', role: 'admin', email: 'x@y.zz' }, smoke.token);
  check('patient edits own contact number; role and email are ignored', r.s === 200 && r.d.user.contactNumber === '09176660000' && r.d.user.role === 'patient' && r.d.user.email === email, r.d);
  r = await call('PUT', '/auth/me', { contactNumber: '123', address: 'short' }, smoke.token);
  check('invalid profile gives field errors', r.s === 400 && r.d.fieldErrors.contactNumber && r.d.fieldErrors.address, r.d);
  r = await call('PUT', '/auth/me', { emergencyContact: { name: 'Mina Tester', relationship: 'Mother', contactNumber: '09176660000' } }, smoke.token); // same number as the patient's own
  check('emergency number must differ from the patient\'s own', r.s === 400 && r.d.fieldErrors.emergencyNumber, r.d);
  r = await call('PUT', '/auth/me', { dateOfBirth: '' }, smoke.token); check('patient cannot blank the date of birth', r.s === 400 && r.d.fieldErrors.dateOfBirth, r.d);
  r = await call('PUT', '/auth/me', { middleName: 'Dela', address: 'Rizal Street, Barangay Kalayaan, Quezon City' }, joy.token); check('receptionist edits own profile', r.s === 200 && r.d.user.middleName === 'Dela', r.d);
  await call('PUT', '/auth/me', { middleName: '' }, joy.token);

  section('Slots and booking rules');
  r = await call('GET', `/providers/${providers[0]._id}/slots?serviceId=${followUp._id}`, null, ana.token); check('slots without a date give 400', r.s === 400 && r.d.fieldErrors.date, r.d);
  r = await call('GET', `/providers/${providers[0]._id}/slots?serviceId=${followUp._id}&date=banana`, null, ana.token); check('slots with a bad date give 400', r.s === 400, r.d);
  const A = await firstOpen(3, joy.token); // a day at least 3 days ahead, so the 24-hour rules do not interfere
  r = await book(smoke.token, A.p, A.date, A.s[0], { reason: 'abc' }); check('short reason gives a field error', r.s === 400 && r.d.fieldErrors.reason, r.d);
  r = await book(smoke.token, A.p, 'tomorrow', A.s[0]); check('bad date on booking gives 400', r.s === 400 && r.d.fieldErrors.date, r.d);
  r = await book(smoke.token, A.p, A.date, A.s[0]); check('patient books: Pending with APT-YYYY-NNNNN', r.s === 201 && r.d.appointment.status === 'Pending' && /^APT-\d{4}-\d{5}$/.test(r.d.appointment.referenceNo), r.d);
  const apptA = r.d.appointment;
  const smoke2Registration = await call('POST', '/auth/register', { ...PROFILE({ firstName: 'Second' }), email: `smoke2.${tag}@email.com`, password: 'Smoke#1234', agreement: true });
  await call('POST', '/auth/verify-registration', { identifier: smoke2Registration.d.identifier, code: smoke2Registration.d.developmentCode });
  const smoke2Login = await call('POST', '/auth/login', { email: smoke2Registration.d.identifier, password: 'Smoke#1234' });
  const smoke2 = { d: { token: smoke2Login.d.token, user: smoke2Login.d.user } };
  r = await book(smoke2.d.token, A.p, A.date, A.s[0]); check('same slot for someone else gives the exact message', r.s === 409 && r.d.code === 'SLOT_UNAVAILABLE' && r.d.message === SLOT_GONE, r.d);
  r = await slots(A.p, A.date, smoke.token, `&appointmentId=${apptA._id}`); check('slots with appointmentId include the appointment\'s own time', r.includes(A.s[0]));
  check('slots without it do not', !(await slots(A.p, A.date, smoke.token)).includes(A.s[0]));
  const other = providers.find((p) => p._id !== A.p._id && (p.services || []).length); // a second doctor with the same open time: the patient cannot be in two places
  const sameTime = (await slots(other, A.date, joy.token)).includes(A.s[0]);
  if (sameTime) { r = await book(smoke.token, other, A.date, A.s[0]); check('patient cannot have two overlapping appointments', r.s === 409 && r.d.code === 'PATIENT_CONFLICT', r.d); } else console.log('  skip  overlap test (no second doctor free at that time)');
  const more = A.s.slice(2, 4), ids = [];
  for (const t of more) { r = await book(smoke.token, A.p, A.date, t); ids.push(r.d.appointment && r.d.appointment._id); }
  r = await book(smoke.token, A.p, A.date, A.s[5] || A.s[4]); check('a patient may hold at most 3 active appointments', r.s === 409 && r.d.code === 'LIMIT_REACHED', r.d);

  section('Lifecycle, cutoff and notifications');
  r = await call('PATCH', `/appointments/${apptA._id}/status`, { status: 'Confirmed' }, smoke.token); check('patient cannot confirm (403)', r.s === 403, r.d);
  r = await call('PATCH', `/appointments/${apptA._id}/status`, { status: 'Completed', summary: 'A long enough summary.' }, joy.token); check('cannot jump to Completed (409)', r.s === 409 && r.d.code === 'INVALID_TRANSITION', r.d);
  r = await call('PATCH', `/appointments/${apptA._id}/status`, { status: 'Confirmed' }, joy.token); check('receptionist confirms', r.s === 200 && r.d.appointment.status === 'Confirmed', r.d);
  r = await call('PATCH', `/appointments/${apptA._id}/status`, { status: 'Checked In' }, joy.token); check('check-in before the appointment date gives 409', r.s === 409, r.d);
  r = await call('PATCH', `/appointments/${apptA._id}/status`, { status: 'No Show' }, joy.token); check('No Show before 15 minutes after start gives 409', r.s === 409, r.d);
  r = await call('GET', '/notifications', null, smoke.token);
  check('patient was notified of the confirmation; unread count works', r.s === 200 && r.d.unread >= 1 && r.d.notifications.some((n) => n.title === 'Your appointment has been confirmed.'), r.d);
  const soon = await (async () => { for (let i = 0; i < 2; i++) for (const p of providers) { const s = (await slots(p, day(i), joy.token)).filter((t) => { const h = dayjs(`${day(i)} ${t}`).diff(dayjs(), 'hour', true); return h > 1.1 && h < 23.5; }); if (s.length) return { p, date: day(i), t: s[0] }; } })();
  const s2Registration = await call('POST', '/auth/register', { ...PROFILE({ firstName: 'Inside' }), email: `smoke3.${tag}@email.com`, password: 'Smoke#1234', agreement: true });
  await call('POST', '/auth/verify-registration', { identifier: s2Registration.d.identifier, code: s2Registration.d.developmentCode });
  const s2Login = await call('POST', '/auth/login', { email: s2Registration.d.identifier, password: 'Smoke#1234' });
  const s2 = { d: { token: s2Login.d.token, user: s2Login.d.user } };
  if (soon) {
    r = await call('POST', '/appointments', { providerId: soon.p._id, serviceId: followUp._id, date: soon.date, startTime: soon.t, patientId: s2.d.user._id }, joy.token);
    check('staff-created appointment is Confirmed immediately', r.s === 201 && r.d.appointment.status === 'Confirmed' && !r.d.appointment.statusHistory.some((h) => /\d{4}-\d\d-\d\d/.test(h.note)), r.d);
    const soonId = r.d.appointment._id;
    r = await call('PATCH', `/appointments/${soonId}/status`, { status: 'Cancelled' }, s2.d.token); check('patient cannot cancel inside the 24-hour cutoff', r.s === 409 && r.d.code === 'CUTOFF_PASSED', r.d);
    r = await call('POST', `/appointments/${soonId}/reschedule-request`, { date: day(5), startTime: '10:00', reason: 'Work conflict' }, s2.d.token); check('patient cannot reschedule inside the cutoff', r.s === 409 && r.d.code === 'CUTOFF_PASSED', r.d);
    r = await call('PATCH', `/appointments/${soonId}/status`, { status: 'Cancelled' }, joy.token); check('staff cancel needs a reason', r.s === 400 && r.d.fieldErrors.reason, r.d);
    r = await call('PATCH', `/appointments/${soonId}/status`, { status: 'Cancelled', reason: 'Doctor unavailable today' }, joy.token); check('staff cancel works (override of cutoff)', r.s === 200 && r.d.appointment.status === 'Cancelled' && r.d.appointment.cancellation.by.firstName === 'Joy', r.d);
    r = await call('GET', '/notifications', null, s2.d.token); check('patient is told why it was cancelled', r.d.notifications.some((n) => n.message.includes('Doctor unavailable today')), r.d);
    r = await call('PATCH', `/appointments/${soonId}/status`, { status: 'Confirmed' }, joy.token); check('Cancelled is terminal', r.s === 409, r.d);
  } else console.log('  skip  cutoff tests (no doctor has a slot within the next 24 hours)');
  const mine = (await call('POST', '/appointments', { providerId: A.p._id, serviceId: followUp._id, date: A.date, startTime: A.s[7] || A.s[6], patientId: smoke2.d.user._id }, joy.token)).d.appointment;
  r = await call('PATCH', `/appointments/${mine._id}/status`, { status: 'Cancelled' }, smoke2.d.token); check('patient cancels own appointment before the cutoff', r.s === 200, r.d);
  r = await call('GET', '/notifications', null, joy.token); check('staff are told when a patient cancels', r.d.notifications.some((n) => n.title === 'Appointment cancelled by patient'), r.d.notifications && r.d.notifications.slice(0, 2));
  r = await call('GET', `/appointments/${apptA._id}`, null, ana.token); check('another patient cannot open it (403)', r.s === 403, r.d);

  section('Walk-in, consultation and completion');
  const todayProv = await (async () => { for (const p of providers) { const s = await slots(p, day(0), joy.token, '&walkIn=true'); if (s.length) return { p, t: s[s.length - 1] }; } })();
  if (todayProv) {
    r = await call('GET', `/providers/${todayProv.p._id}/slots?serviceId=${followUp._id}&date=${day(1)}&walkIn=true`, null, joy.token); const walkTomorrow = r.d.slots;
    check('walkIn=true only offers today', walkTomorrow.length === 0, walkTomorrow);
    r = await call('POST', '/appointments', { providerId: todayProv.p._id, serviceId: followUp._id, date: day(0), startTime: todayProv.t, patientId: smoke.user._id, isWalkIn: true }, joy.token);
    check('walk-in is created already Checked In', r.s === 201 && r.d.appointment.status === 'Checked In' && r.d.appointment.isWalkIn, r.d);
    const w = r.d.appointment, doc = await login(`${DOCTOR_EMAIL[todayProv.p.user.lastName]}@kalayaan.example`);
    r = await call('GET', '/notifications', null, doc.token); check('the doctor was told the patient checked in', r.d.notifications.some((n) => n.title === 'Patient checked in' && n.message.includes(w.referenceNo)), r.d.notifications && r.d.notifications.slice(0, 2));
    const wrongDoc = await login(providers.map((p) => p.user.lastName).filter((n) => n !== todayProv.p.user.lastName).map((n) => `${DOCTOR_EMAIL[n]}@kalayaan.example`)[0]);
    r = await call('PATCH', `/appointments/${w._id}/status`, { status: 'In Consultation' }, wrongDoc.token); check('another doctor cannot start it (403)', r.s === 403, r.d);
    r = await call('PATCH', `/appointments/${w._id}/status`, { status: 'In Consultation' }, joy.token); check('receptionist cannot start a consultation (403)', r.s === 403, r.d);
    r = await call('PATCH', `/appointments/${w._id}/status`, { status: 'In Consultation' }, doc.token); check('own doctor starts the consultation', r.s === 200 && r.d.appointment.status === 'In Consultation', r.d);
    r = await call('PATCH', `/appointments/${w._id}/status`, { status: 'Completed', summary: 'Too short' }, doc.token); check('summary under 10 characters is rejected', r.s === 400 && r.d.fieldErrors.summary, r.d);
    r = await call('PATCH', `/appointments/${w._id}/status`, { status: 'Completed', summary: 'Symptoms improved. No further treatment needed.' }, doc.token);
    check('doctor completes with a summary (recordedBy has a name)', r.s === 200 && r.d.appointment.status === 'Completed' && r.d.appointment.consultation.recordedBy.firstName, r.d);
    r = await call('PATCH', `/appointments/${w._id}/status`, { status: 'Cancelled', reason: 'Trying to undo it' }, joy.token); check('Completed cannot be cancelled', r.s === 409, r.d);
    r = await call('PATCH', `/appointments/${w._id}/archive`, { reason: 'Closed' }, joy.token); check('receptionist cannot archive (403)', r.s === 403, r.d);
    r = await call('PATCH', `/appointments/${w._id}/archive`, { reason: 'Closed after smoke test' }, paolo.token); check('admin cannot archive a finished appointment (403)', r.s === 403, r.d);
    r = await call('GET', `/appointments?patientId=${smoke.user._id}`, null, joy.token); check('the finished appointment stays in the list', r.d.appointments.some((x) => x._id === w._id), r.d.appointments.length);
    r = await call('GET', `/appointments?patientId=${smoke.user._id}`, null, doc.token); check('doctor may filter by patient (own appointments only)', r.s === 200 && r.d.appointments.length >= 1 && r.d.appointments.every((x) => x.providerId === todayProv.p._id || (x.provider && x.provider._id === todayProv.p._id)), r.d.appointments && r.d.appointments.length);
  } else console.log('  skip  walk-in and consultation tests (no doctor works today)');
  r = await call('PATCH', `/appointments/${apptA._id}/archive`, {}, paolo.token); check('an active appointment cannot be archived either (403)', r.s === 403, r.d);

  section('Reschedule');
  r = await call('POST', `/appointments/${apptA._id}/reschedule-request`, { date: A.date, startTime: A.s[1], reason: 'Work meeting' }, smoke.token); check('patient requests a reschedule; status stays Confirmed', r.s === 200 && r.d.appointment.status === 'Confirmed' && r.d.appointment.reschedulePending.startTime === A.s[1], r.d);
  r = await call('POST', `/appointments/${apptA._id}/reschedule-request`, { date: A.date, startTime: A.s[1], reason: 'Work meeting' }, smoke.token); check('a second request is refused', r.s === 409 && r.d.code === 'ALREADY_PENDING', r.d);
  r = await call('PUT', `/appointments/${apptA._id}`, { action: 'reject' }, joy.token); check('reject needs a reason', r.s === 400, r.d);
  r = await call('PUT', `/appointments/${apptA._id}`, { action: 'reject', reason: 'That time is kept for walk-ins' }, joy.token); check('reject clears the request', r.s === 200 && !(r.d.appointment.reschedulePending && r.d.appointment.reschedulePending.date), r.d);
  await call('POST', `/appointments/${apptA._id}/reschedule-request`, { date: A.date, startTime: A.s[1], reason: 'Work meeting' }, smoke.token);
  r = await call('PUT', `/appointments/${apptA._id}`, { action: 'apply' }, joy.token); check('apply moves the appointment', r.s === 200 && r.d.appointment.startTime === A.s[1] && !(r.d.appointment.reschedulePending && r.d.appointment.reschedulePending.date), r.d);
  r = await call('GET', '/notifications', null, smoke.token); const resNote = r.d.notifications.find((n) => n.title === 'Appointment rescheduled');
  check('notification and timeline show readable dates, not ISO strings', resNote && !/\d{4}-\d\d-\d\d/.test(resNote.message) && /[A-Z][a-z]+ \d{1,2}, \d{4} at \d{1,2}:\d\d [AP]M/.test(resNote.message), resNote);
  r = await call('PUT', `/appointments/${apptA._id}`, { action: 'reschedule', date: 'soon', startTime: '10:00' }, joy.token); check('direct reschedule validates the date', r.s === 400, r.d);
  if (ids[0]) { // moving a second appointment on top of the first one must be refused
    await call('PATCH', `/appointments/${ids[0]}/status`, { status: 'Confirmed' }, joy.token);
    r = await call('PUT', `/appointments/${ids[0]}`, { action: 'reschedule', date: A.date, startTime: A.s[1] }, joy.token); check('reschedule onto another slot of the same doctor is refused', r.s === 409, r.d);
  }

  section('Patient directory (new)');
  r = await call('GET', '/patients', null, ana.token); check('patient cannot list patients (403)', r.s === 403, r.d);
  r = await call('GET', '/patients?search=reyes', null, joy.token); check('receptionist searches patients; visits and lastVisit are included', r.s === 200 && r.d.patients.some((p) => p.lastName === 'Reyes' && p.visits >= 1 && /^\d{4}-\d\d-\d\d$/.test(p.lastVisit) && !p.passwordHash), r.d);
  r = await call('GET', '/patients?limit=2&page=1', null, joy.token); check('pagination works', r.s === 200 && r.d.patients.length === 2 && r.d.total >= 5, r.d.total);
  r = await call('GET', '/patients?limit=100', null, joy.token); check('archived patients are not listed', r.d.patients.length <= 50 && !r.d.patients.some((p) => p.lastName === 'Lacson'), r.d.total);
  r = await call('GET', `/patients?search=smoke3.${tag}`, null, joy.token); check('a patient whose only appointment was cancelled has 0 visits', r.s === 200 && r.d.patients.length === 1 && r.d.patients[0].visits === 0 && r.d.patients[0].lastVisit === null, r.d.patients);
  r = await call('GET', '/patients?search=Reyes', null, elena.token); check('...and Ana, whom Dr. Santos has treated, is listed', r.s === 200 && r.d.patients.some((p) => p.lastName === 'Reyes' && p.visits >= 1), r.d);
  r = await call('GET', '/patients', null, paolo.token); check('admin can list patients', r.s === 200 && r.d.total >= 5, r.d);
  const pEmail = `walkin.${tag}@email.com`;
  r = await call('POST', '/patients', { ...PROFILE({ firstName: 'Walkin' }), email: 'nope' }, paolo.token); check('admin cannot add patients here (403)', r.s === 403, r.d);
  r = await call('POST', '/patients', { firstName: 'W', email: 'nope' }, joy.token); check('adding a patient validates every field', r.s === 400 && r.d.fieldErrors.firstName && r.d.fieldErrors.email && r.d.fieldErrors.sex, r.d);
  r = await call('POST', '/patients', { ...PROFILE({ firstName: 'Walkin' }), email: pEmail }, joy.token); check('receptionist adds a patient (no password hash in the response)', r.s === 201 && r.d.patient.role === 'patient' && !JSON.stringify(r.d).includes('passwordHash'), r.d);
  const walkPatient = r.d.patient;
  r = await call('GET', `/patients?search=walkin.${tag}`, null, joy.token); check('receptionist finds the new patient', r.d.patients.length === 1 && r.d.patients[0].visits === 0, r.d);
  r = await call('GET', `/patients?search=walkin.${tag}`, null, elena.token); check('a doctor does not see a patient they have never had an appointment with', r.s === 200 && r.d.patients.length === 0, r.d);
  r = await call('POST', '/patients', { ...PROFILE({ firstName: 'Walkin' }), email: pEmail }, joy.token); check('duplicate email is refused', r.s === 409, r.d);
  r = await call('PUT', `/patients/${walkPatient._id}`, { contactNumber: '09171112233', email: 'changed@email.com', role: 'admin' }, joy.token); check('receptionist edits a patient; email and role are ignored', r.s === 200 && r.d.patient.contactNumber === '09171112233' && r.d.patient.email === pEmail && r.d.patient.role === 'patient', r.d);
  r = await call('PUT', `/patients/${walkPatient._id}`, { contactNumber: 'abc' }, joy.token); check('invalid edit gives field errors', r.s === 400 && r.d.fieldErrors.contactNumber, r.d);
  r = await call('PUT', `/patients/${paolo.user._id}`, { firstName: 'Hacker' }, joy.token); check('PUT /patients cannot touch a non-patient (404)', r.s === 404, r.d);
  r = await call('POST', '/auth/login', { email: pEmail, password: '' }); check('a staff-added patient cannot log in yet', r.s === 401, r.d);
  r = await call('POST', '/auth/forgot-password', { identifier: pEmail }); check('forgot password sends an email reset code', r.s === 200 && r.d.developmentCode, r.d);
  r = await call('POST', '/auth/reset-password', { identifier: pEmail, code: r.d.developmentCode, password: 'Walkin#2026' }); check('they set a password with the email reset code', r.s === 200, r.d);
  r = await call('POST', '/auth/login', { email: pEmail, password: 'Walkin#2026' }); check('...and can now log in', r.s === 200, r.d);

  section('Doctors edit their own title and bio (new)');
  const santos = providers.find((p) => p.user.lastName === 'Santos'), lim = providers.find((p) => p.user.lastName === 'Lim');
  r = await call('PUT', `/providers/${santos._id}`, { title: 'MD, FPAFP', bio: 'Family physician and vaccination lead.', specialization: 'Surgery', serviceIds: [] }, elena.token);
  check('doctor edits own title and bio only', r.s === 200 && r.d.provider.title === 'MD, FPAFP' && r.d.provider.specialization === 'General Medicine' && r.d.provider.serviceIds.length === santos.services.length, r.d);
  r = await call('PUT', `/providers/${lim._id}`, { bio: 'Not my profile' }, elena.token); check('a doctor cannot edit another doctor (403)', r.s === 403, r.d);
  r = await call('PUT', `/providers/${santos._id}`, { bio: 'x'.repeat(501) }, elena.token); check('bio over 500 characters is rejected', r.s === 400 && r.d.fieldErrors.bio, r.d);
  r = await call('PUT', `/providers/${santos._id}`, { bio: 'Hi' }, ana.token); check('a patient cannot edit a provider (403)', r.s === 403, r.d);
  r = await call('PUT', `/providers/${santos._id}`, { title: santos.title, bio: santos.bio }, paolo.token); check('admin can edit (and restores the original text)', r.s === 200 && r.d.provider.title === santos.title, r.d);

  section('Users, roles and archive');
  const newUser = { ...PROFILE({ firstName: 'Archive', lastName: 'Candidate' }), email: `candidate.${tag}@kalayaan.example`, role: 'patient', password: 'Candidate#2026' };
  r = await call('POST', '/users', { ...newUser, firstName: '' }, paolo.token); check('admin add-user validates', r.s === 400 && r.d.fieldErrors.firstName, r.d);
  r = await call('POST', '/users', newUser, paolo.token); check('admin adds a user without leaking the password hash', r.s === 201 && !JSON.stringify(r.d).includes('passwordHash'), r.d);
  const cand = r.d.user;
  r = await call('PATCH', `/users/${cand._id}/role`, { role: 'doctor' }, paolo.token); check('a role cannot be changed after the account is created (403)', r.s === 403 && r.d.code === 'ROLE_LOCKED', r.d);
  r = await call('PATCH', `/users/${cand._id}/archive`, { reason: 'Left the clinic' }, paolo.token); check('a user with no upcoming appointments can be archived', r.s === 200 && r.d.user.isArchived && r.d.user.accountStatus === 'active', r.d);
  r = await call('POST', '/auth/login', { email: newUser.email, password: newUser.password }); check('an archived account cannot log in', r.s === 403, r.d);
  r = await call('PATCH', `/users/${cand._id}/restore`, {}, paolo.token); check('restore works', r.s === 200 && !r.d.user.isArchived, r.d);
  r = await call('PATCH', `/users/${smoke.user._id}/archive`, {}, paolo.token); check('archiving a patient with upcoming appointments is blocked with a count', r.s === 409 && r.d.code === 'HAS_DEPENDENCIES' && r.d.count >= 1, r.d);
  r = await call('PATCH', `/providers/${santos._id}/archive`, {}, paolo.token); check('archiving a provider with upcoming appointments is blocked', r.s === 409 && r.d.code === 'HAS_DEPENDENCIES' && r.d.count >= 1, r.d);
  const svcName = `Smoke Screening ${tag}`;
  r = await call('POST', '/services', { name: svcName, category: 'Diagnostic', durationMinutes: 30, description: 'Temporary', requirements: 'None' }, paolo.token); check('admin adds a service', r.s === 201, r.d);
  const svc = r.d.service;
  r = await call('PATCH', `/services/${svc._id}/archive`, { reason: 'Test' }, paolo.token); check('a service with no upcoming appointments can be archived', r.s === 200, r.d);
  await call('POST', '/services', { name: svcName, category: 'Diagnostic', durationMinutes: 30 }, paolo.token);
  r = await call('PATCH', `/services/${svc._id}/restore`, {}, paolo.token); check('restore is refused when an active service has the same name', r.s === 409 && r.d.code === 'NAME_TAKEN', r.d);
  r = await call('PATCH', `/services/${followUp._id}/archive`, {}, paolo.token); check('archiving a service with upcoming appointments is blocked', r.s === 409 && r.d.code === 'HAS_DEPENDENCIES', r.d);
  r = await call('GET', '/archive', null, paolo.token); check('Archive page lists at least 6 rows (employees, patients, physicians, services) and no appointments', r.s === 200 && r.d.total >= 6 && ['user', 'provider', 'service'].every((t) => r.d.counts[t] >= 1) && !r.d.counts.appointment, r.d.counts);
  r = await call('GET', '/archive', null, joy.token); check('receptionist cannot open the Archive (403)', r.s === 403, r.d);

  section('Notifications');
  r = await call('GET', '/notifications', null, smoke.token); const n0 = r.d.notifications[0], unread = r.d.unread;
  r = await call('PATCH', `/notifications/${n0._id}/read`, {}, smoke.token); check('mark one as read', r.s === 200 && r.d.notification.isRead, r.d);
  r = await call('PATCH', `/notifications/${n0._id}/read`, {}, ana.token); check('cannot mark someone else\'s notification', r.s === 404, r.d);
  r = await call('PATCH', '/notifications/read-all', {}, smoke.token); r = await call('GET', '/notifications', null, smoke.token); check('mark all as read leaves 0 unread', r.d.unread === 0 && unread >= 1, r.d.unread);
  r = await call('DELETE', `/notifications/${n0._id}`, null, ana.token); check('cannot delete someone else\'s notification', r.s === 404, r.d);
  r = await call('DELETE', `/notifications/${n0._id}`, null, smoke.token); check('delete own notification', r.s === 200, r.d);

  section('Double booking (needs a database that supports partial unique indexes)');
  if (process.env.SKIP_INDEX_TEST) console.log('  skip  SKIP_INDEX_TEST is set');
  else {
    const B = await firstOpen(6, joy.token), t = B.s[B.s.length - 1];
    const rs = await Promise.all([book(smoke2.d.token, B.p, B.date, t), book(smoke2.d.token, B.p, B.date, t), book(s2.d.token, B.p, B.date, t)]);
    check('three requests for one slot at the same moment create exactly one appointment', rs.filter((x) => x.s === 201).length === 1 && rs.filter((x) => x.s === 409 && x.d.message === SLOT_GONE).length === 2, rs.map((x) => x.s + ' ' + (x.d.code || '')));
  }

  console.log(`\n${passed} passed, ${failed} failed.${failed ? '' : ' Run `npm run seed` again to restore the clean demo data.'}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('\nTest run crashed:', e.message); process.exit(2); });