// server.js - Express API: auth, slots, booking and the appointment lifecycle.
require('dotenv').config();
process.env.TZ = process.env.TZ || 'Asia/Manila'; // "today", lead time and cutoffs must follow the clinic's clock (UTC+8)
if (!process.env.MONGO_URI || !process.env.JWT_SECRET) { console.error('Missing MONGO_URI or JWT_SECRET. Copy .env.example to .env and fill them in.'); process.exit(1); }
const express = require('express'), cors = require('cors'), mongoose = require('mongoose');
const jwt = require('jsonwebtoken'), bcrypt = require('bcryptjs'), dayjs = require('dayjs');
const M = require('./models'), { R, ACTIVE, OCCUPY, statusLabel, mins, hhmm, baseSlots, allowed, when, requireEmailVerification } = require('./rules');
const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN }), express.json());

// Errors share one shape with the frontend mock: { status, code, message, fieldErrors? }
class E extends Error { constructor(s, c, m, f, x) { super(m); this.s = s; this.c = c; this.f = f; this.x = x; } }
const wrap = (fn) => (q, r, n) => fn(q, r, n).catch(n);
const FORBIDDEN = () => new E(403, 'FORBIDDEN', 'You do not have permission to do that.');

async function auth(q, r, n) { // verifies the JWT and loads a live, non-archived, active user
  try {
    const { id } = jwt.verify((q.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET);
    const u = await M.User.findOne({ _id: id, isArchived: false });
    if (!u || u.accountStatus !== 'active') throw 0;
    q.user = u; n();
  } catch { n(new E(401, 'UNAUTHORIZED', 'Please log in.')); }
}
const role = (...a) => (q, r, n) => (a.includes(q.user.role) ? n() : n(FORBIDDEN()));

// ---------- Auth ----------
const NAME = /^[A-Za-z\u00C0-\u00FF' -]{2,50}$/, PH = /^(09\d{9}|\+639\d{9})$/, PW = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
// Profile rules shared by registration, "edit my profile" and staff-added patients. strict = every profile field is required (patients).
// Other roles may leave date of birth, address and emergency contact empty, but whatever they enter must still be valid.
function profileErrors(b, strict) {
  const f = {}, e = b.emergencyContact || {}, dob = dayjs(b.dateOfBirth);
  if (!NAME.test(b.firstName || '')) f.firstName = 'Use 2 to 50 letters.';
  if (!NAME.test(b.lastName || '')) f.lastName = 'Use 2 to 50 letters.';
  if (b.middleName && !NAME.test(b.middleName)) f.middleName = 'Use 2 to 50 letters.';
  if ((strict || b.dateOfBirth) && (!b.dateOfBirth || !dob.isValid() || dob.isAfter(dayjs()) || dob.isBefore(dayjs().subtract(120, 'year')))) f.dateOfBirth = 'Enter a valid date of birth.';
  if ((strict && !b.sex) || (b.sex && !['Female', 'Male'].includes(b.sex))) f.sex = 'Select an option.';
  if ((strict || b.contactNumber) && !PH.test(b.contactNumber || '')) f.contactNumber = 'Use 09XXXXXXXXX or +639XXXXXXXXX.';
  if ((strict || b.address) && (b.address || '').trim().length < 10) f.address = 'Enter at least 10 characters.';
  if (strict || e.name || e.contactNumber) {
    if (!NAME.test(e.name || '')) f.emergencyName = 'Enter a name.';
    if (!PH.test(e.contactNumber || '') || e.contactNumber === b.contactNumber) f.emergencyNumber = 'Use a different valid mobile number.';
  }
  return f;
}
const fail = (f) => { if (Object.keys(f).length) throw new E(400, 'VALIDATION_ERROR', 'Please fix the highlighted fields.', f); };
function checkRegister(b) {
  const f = profileErrors(b, true);
  if (!/^\S+@\S+\.\S+$/.test(b.email || '')) f.email = 'Enter a valid email.';
  if (!PW.test(b.password || '')) f.password = 'At least 8 characters with upper and lower case letters and a number.';
  if (!b.agreement) f.agreement = 'You must agree to continue.';
  fail(f);
}
const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '8h' });
app.post('/api/auth/login', wrap(async (q, r) => {
  const u = await M.User.findOne({ email: String(q.body.email || '').toLowerCase() }).select('+passwordHash');
  if (!u || !(await bcrypt.compare(q.body.password || '', u.passwordHash || ''))) throw new E(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  if (u.isArchived) throw new E(403, 'ACCOUNT_UNAVAILABLE', 'Account unavailable. Contact the health center.');
  if (u.accountStatus !== 'active') throw new E(403, 'ACCOUNT_' + u.accountStatus.toUpperCase(), `Your account is ${u.accountStatus}. Contact the health center.`);
  if (!u.isVerified && requireEmailVerification()) throw new E(403, 'ACCOUNT_UNVERIFIED', 'Verify your email or mobile number before logging in.');
  u.lastLoginAt = new Date(); await u.save();
  r.json({ user: await M.User.findById(u._id), token: sign(u) });
}));
app.get('/api/auth/me', auth, (q, r) => r.json({ user: q.user }));

// Dates are "YYYY-MM-DD" and times "HH:mm". Anything else is rejected before it reaches the slot logic.
function checkWhen(date, time) {
  const f = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !dayjs(date).isValid() || dayjs(date).format('YYYY-MM-DD') !== date) f.date = 'Choose a valid date.';
  if (time !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) f.startTime = 'Choose a valid time.';
  fail(f);
}
// A patient cannot hold two overlapping active appointments. skipId lets a reschedule ignore the appointment being moved.
async function patientOverlap(patientId, date, start, end, skipId) {
  const same = await M.Appointment.find({ patientId, date, status: { $in: ACTIVE }, isArchived: false });
  if (same.some((x) => (!skipId || !x._id.equals(skipId)) && start < mins(x.endTime) && end > mins(x.startTime))) throw new E(409, 'PATIENT_CONFLICT', 'There is already an appointment for this patient at that time.');
}

// ---------- Slots ----------
async function slotsFor(prov, svc, date, walkIn, skipId) {
  const sc = await M.Schedule.findOne({ providerId: prov._id, isArchived: false });
  if (!sc) return [];
  const booked = await M.Appointment.find({ providerId: prov._id, date, status: { $in: OCCUPY } });
  const iv = booked.filter((a) => !skipId || !a._id.equals(skipId)).map((a) => [mins(a.startTime), mins(a.endTime)]);
  return baseSlots(sc.weeklyTemplate, date, svc.durationMinutes).filter((t) => {
    const s = mins(t), e = s + svc.durationMinutes;
    return !iv.some(([a, b]) => s < b && e > a) && allowed(date, t, walkIn);
  });
}
const SLOT_GONE = () => new E(409, 'SLOT_UNAVAILABLE', 'This appointment slot is no longer available. Please select another time.');
app.get('/api/providers/:id/slots', auth, wrap(async (q, r) => {
  const [prov, svc] = await Promise.all([M.Provider.findOne({ _id: q.params.id, isArchived: false }), M.Service.findOne({ _id: q.query.serviceId, isArchived: false })]);
  if (!prov || !svc || !prov.serviceIds.some((i) => i.equals(svc._id))) throw new E(400, 'VALIDATION_ERROR', 'Choose a service that this physician offers.');
  checkWhen(q.query.date);
  // appointmentId: a reschedule must not see the appointment's own slot as taken. walkIn=true (receptionist only): today's slots, no lead time.
  let skipId; if (q.query.appointmentId) { const x = await M.Appointment.findOne({ _id: q.query.appointmentId, isArchived: false }); if (x && (q.user.role !== 'patient' || x.patientId.equals(q.user._id))) skipId = x._id; }
  r.json({ slots: await slotsFor(prov, svc, q.query.date, q.user.role === 'receptionist' && q.query.walkIn === 'true', skipId) });
}));

// ---------- Appointments ----------
// Appointments come back with the patient, the provider (with the doctor's name), the service, and the names in the status history.
const populate = [{ path: 'provider', populate: { path: 'user', select: 'firstName lastName' } }, 'patient', 'service', { path: 'statusHistory.by', select: 'firstName lastName' }, { path: 'cancellation.by', select: 'firstName lastName' }, { path: 'consultation.recordedBy', select: 'firstName lastName' }];
const notify = (userId, type, title, message, appt) => M.Notification.create({ userId, type, title, message, relatedAppointmentId: appt._id });
const staffIds = async () => (await M.User.find({ role: { $in: ['receptionist', 'admin'] }, isArchived: false, accountStatus: 'active' })).map((u) => u._id);

app.post('/api/appointments', auth, role('patient', 'receptionist'), wrap(async (q, r) => {
  const b = q.body, staff = q.user.role === 'receptionist', walkIn = staff && !!b.isWalkIn;
  const [prov, svc] = await Promise.all([M.Provider.findOne({ _id: b.providerId, isArchived: false }), M.Service.findOne({ _id: b.serviceId, isArchived: false })]);
  if (!prov || !svc || !prov.serviceIds.some((i) => i.equals(svc._id))) throw new E(400, 'VALIDATION_ERROR', 'Choose a service and a physician that offers it.');
  checkWhen(b.date, b.startTime);
  const patient = await M.User.findOne({ _id: staff ? b.patientId : q.user._id, role: 'patient', isArchived: false, accountStatus: 'active' });
  if (!patient) throw new E(400, 'VALIDATION_ERROR', 'Select an active patient.');
  if (!staff && !(b.reason && b.reason.trim().length >= 5 && b.reason.length <= 300)) throw new E(400, 'VALIDATION_ERROR', 'Reason must be 5 to 300 characters.', { reason: 'Reason must be 5 to 300 characters.' });
  if (!(await slotsFor(prov, svc, b.date, walkIn)).includes(b.startTime)) throw SLOT_GONE();
  const start = mins(b.startTime), end = start + svc.durationMinutes;
  const mine = await M.Appointment.find({ patientId: patient._id, status: { $in: ACTIVE }, isArchived: false });
  if (!staff && mine.length >= R.MAX_ACTIVE) throw new E(409, 'LIMIT_REACHED', 'You already have 3 active appointments.');
  await patientOverlap(patient._id, b.date, start, end);
  const status = walkIn ? 'Checked In' : staff ? 'Confirmed' : 'Pending', now = new Date();
  let a;
  for (let tries = 0; !a; tries++) { // two bookings at the same moment can pick the same reference number: pick again
    try {
      a = await M.Appointment.create({
        referenceNo: `APT-${dayjs().year()}-${String((await M.Appointment.countDocuments()) + 1).padStart(5, '0')}`,
        patientId: patient._id, providerId: prov._id, serviceId: svc._id, date: b.date, startTime: b.startTime, endTime: hhmm(end),
        status, reason: b.reason || (walkIn ? 'Walk-in' : ''), notes: b.notes, isWalkIn: walkIn, createdBy: q.user._id,
        statusHistory: [{ status, at: now, by: q.user._id, note: staff ? 'Created by staff' : 'Booked online' }],
      });
    } catch (e) { if (e.code !== 11000) throw e; if (!(e.keyPattern && e.keyPattern.referenceNo) || tries >= 2) throw SLOT_GONE(); } // the DB index is the final guard against double booking
  }
  if (walkIn) await notify(prov.userId, 'checked_in', 'Patient arrived', `Walk-in. Reference ${a.referenceNo}.`, a); // the doctor must know someone is already waiting
  if (staff) await notify(patient._id, 'appointment_confirmed', 'Appointment confirmed', `${svc.name} on ${when(a.date, a.startTime)}.`, a);
  else for (const id of await staffIds()) await notify(id, 'new_request', 'New appointment request', `${patient.firstName} ${patient.lastName} requested ${svc.name}.`, a);
  r.status(201).json({ appointment: await M.Appointment.findById(a._id).populate(populate) });
}));

app.get('/api/appointments', auth, wrap(async (q, r) => {
  const f = { isArchived: false }, u = q.user;
  if (u.role === 'patient') f.patientId = u._id;
  else if (u.role === 'doctor') f.providerId = (await M.Provider.findOne({ userId: u._id }))?._id;
  for (const k of ['status', 'date', 'serviceId', 'providerId']) if (q.query[k] && u.role !== 'doctor') f[k] = q.query[k];
  if (q.query.patientId && ['receptionist', 'admin', 'doctor'].includes(u.role)) f.patientId = q.query.patientId; // a doctor is still limited to own appointments above
  r.json({ appointments: await M.Appointment.find(f).sort({ date: 1, startTime: 1 }).populate(populate) });
}));
app.get('/api/appointments/:id', auth, wrap(async (q, r) => {
  const a = await M.Appointment.findOne({ _id: q.params.id, isArchived: false }).populate(populate);
  if (!a) throw new E(404, 'NOT_FOUND', 'Appointment not found.');
  const u = q.user;
  if (u.role === 'patient' && !a.patientId.equals(u._id)) throw FORBIDDEN();
  if (u.role === 'doctor' && !a.provider?.userId.equals(u._id)) throw FORBIDDEN();
  r.json({ appointment: a });
}));

// Allowed transitions. The server re-validates all of them.
const FLOW = {
  Pending: { Confirmed: ['receptionist', 'admin'], Cancelled: ['patient', 'receptionist', 'admin'] },
  Confirmed: { Cancelled: ['patient', 'receptionist', 'admin'], 'Checked In': ['receptionist'], 'No Show': ['receptionist'] },
  'Checked In': { 'In Consultation': ['doctor'] }, 'In Consultation': { Completed: ['doctor'] },
};
async function guard(u, a, to, b) {
  const who = FLOW[a.status]?.[to];
  if (!who) throw new E(409, 'INVALID_TRANSITION', `Cannot change an appointment from ${statusLabel(a.status)} to ${statusLabel(to)}.`);
  if (!who.includes(u.role)) throw FORBIDDEN();
  if (u.role === 'patient' && !a.patientId.equals(u._id)) throw FORBIDDEN();
  if (u.role === 'doctor') { const p = await M.Provider.findOne({ userId: u._id }); if (!p || !a.providerId.equals(p._id)) throw FORBIDDEN(); }
  const start = dayjs(`${a.date} ${a.startTime}`);
  if (to === 'Cancelled') {
    if (u.role === 'patient') { if (start.diff(dayjs(), 'hour', true) < R.CUTOFF_H) throw new E(409, 'CUTOFF_PASSED', 'Appointments can be cancelled online up to 24 hours before the visit.'); }
    else if (!b.reason || b.reason.trim().length < 5) throw new E(400, 'VALIDATION_ERROR', 'A reason is required.', { reason: 'Enter at least 5 characters.' });
  }
  if (to === 'Checked In' && a.date !== dayjs().format('YYYY-MM-DD')) throw new E(409, 'INVALID_TRANSITION', 'Arrival can only be recorded on the appointment date.');
  if (to === 'No Show' && dayjs().isBefore(start.add(R.GRACE, 'minute'))) throw new E(409, 'INVALID_TRANSITION', 'No Show is available 15 minutes after the start time.');
  if (to === 'Completed' && !(b.summary && b.summary.length >= 10 && b.summary.length <= 1000)) throw new E(400, 'VALIDATION_ERROR', 'Summary must be 10 to 1000 characters.', { summary: 'Summary must be 10 to 1000 characters.' });
}
const TELL = { Confirmed: 'Your appointment has been confirmed.', 'In Consultation': 'Your consultation has started.', Completed: 'Your visit has been completed.', Cancelled: 'Your appointment was cancelled.', 'No Show': 'Your appointment was marked as a No Show.' };
app.patch('/api/appointments/:id/status', auth, wrap(async (q, r) => {
  const a = await M.Appointment.findOne({ _id: q.params.id, isArchived: false });
  if (!a) throw new E(404, 'NOT_FOUND', 'Appointment not found.');
  const to = q.body.status; await guard(q.user, a, to, q.body);
  a.status = to; a.statusHistory.push({ status: to, at: new Date(), by: q.user._id, note: q.body.reason || '' });
  if (to === 'Cancelled') a.cancellation = { by: q.user._id, reason: q.body.reason, at: new Date() };
  if (to === 'Completed') a.consultation = { summary: q.body.summary, recordedBy: q.user._id, recordedAt: new Date() };
  await a.save();
  const why = to === 'Cancelled' && q.user.role !== 'patient' ? ` Reason: ${q.body.reason}` : ''; // staff cancellations tell the patient why
  if (TELL[to]) await notify(a.patientId, 'status_' + to.toLowerCase().replace(' ', '_'), TELL[to], `Reference ${a.referenceNo}.${why}`, a); // Checked In notifies the doctor below, not the patient
  if (to === 'Cancelled' && q.user.role === 'patient') for (const id of await staffIds()) await notify(id, 'cancelled_by_patient', 'Appointment cancelled by patient', `Reference ${a.referenceNo}.`, a); // the freed slot matters to staff
  if (to === 'Checked In') { const p = await M.Provider.findById(a.providerId); await notify(p.userId, 'checked_in', 'Patient arrived', `Reference ${a.referenceNo}.`, a); }
  r.json({ appointment: await M.Appointment.findById(a._id).populate(populate) });
}));

require('./routes')(app, { E, wrap, auth, role, notify, FORBIDDEN, slotsFor, populate, staffIds, PW, profileErrors, fail, checkWhen, patientOverlap, checkRegister, sign });
app.get('/api/health', (q, r) => r.json({ ok: true }));
app.use((e, q, r, n) => { // one error handler for the whole API
  if (e instanceof E) return r.status(e.s).json({ status: e.s, code: e.c, message: e.message, fieldErrors: e.f, ...e.x });
  if (e.type === 'entity.parse.failed') return r.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'The request body is not valid JSON.' });
  if (e.name === 'CastError') return r.status(400).json({ status: 400, code: 'VALIDATION_ERROR', message: 'Invalid id.' });
  console.error(e); r.status(500).json({ status: 500, code: 'SERVER_ERROR', message: 'Something went wrong.' });
});
mongoose.connect(process.env.MONGO_URI).then(() => app.listen(process.env.PORT || 8000, () => console.log('API running on port ' + (process.env.PORT || 8000))))
  .catch((e) => { console.error('Cannot connect to MongoDB. Is it running, and is MONGO_URI correct?\n' + e.message); process.exit(1); });
