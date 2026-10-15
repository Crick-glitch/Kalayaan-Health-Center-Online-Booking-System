// seed.js - fills MongoDB with the demo data. Run: npm run seed
// Dates are built relative to today, so the data is never stale. Passwords are hashed here.
require('dotenv').config();
process.env.TZ = process.env.TZ || 'Asia/Manila'; // "today" in the demo data follows the clinic's clock (UTC+8), same as server.js
const mongoose = require('mongoose'), bcrypt = require('bcryptjs'), dayjs = require('dayjs');
const M = require('./models'), { baseSlots, hhmm, mins } = require('./rules');
const PASSWORD = 'Kalayaan#2026';
const D = (x) => x.format('YYYY-MM-DD'), day = (n) => dayjs().add(n, 'day');
const AR = (reason) => ({ isArchived: true, archivedAt: new Date(), archiveReason: reason });

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all(Object.values(M).map((m) => m.deleteMany({})));
  await Promise.all(Object.values(M).map((m) => m.syncIndexes()));
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ---- 16 users: 12 loginable + 4 archived (patients and employees can be archived; appointments cannot) ----
  let n = 0;
  const PEOPLE = [ // [mobile, address, birth date, emergency contact, relationship, emergency mobile] in the same order as the users below
    ['09171230001', '12 Rizal Street, Barangay Kalayaan, Quezon City', '1982-06-21', 'Marites Cruz', 'Mother', '09189870001'],
    ['09171230002', '45 Mabini Street, Barangay Kalayaan, Quezon City', '1991-02-14', 'Ramon Mendoza', 'Father', '09189870002'],
    ['09171230003', '8 Bonifacio Avenue, Barangay Kalayaan, Quezon City', '1988-09-30', 'Lourdes Bautista', 'Mother', '09189870003'],
    ['09171230004', '27 Luna Street, Barangay Kalayaan, Quezon City', '1979-04-08', 'Carlos Santos', 'Husband', '09189870004'],
    ['09171230005', '3 Aguinaldo Road, Barangay Kalayaan, Quezon City', '1975-11-23', 'Teresa Lim', 'Wife', '09189870005'],
    ['09171230006', '19 Del Pilar Street, Barangay Kalayaan, Quezon City', '1983-07-17', 'Michael Tan', 'Husband', '09189870006'],
    ['09171230007', '61 Quezon Avenue, Barangay Kalayaan, Quezon City', '1980-01-29', 'Alberto Villanueva', 'Father', '09189870007'],
    ['09171230008', '24 Mabini Street, Barangay Kalayaan, Quezon City', '1994-03-12', 'Luis Reyes', 'Brother', '09189870008'],
    ['09171230009', '77 Burgos Street, Barangay Kalayaan, Quezon City', '1981-05-04', 'Nena Ocampo', 'Wife', '09189870009'],
    ['09171230010', '5 Sampaguita Lane, Barangay Kalayaan, Quezon City', '1984-11-19', 'Jun Diaz', 'Husband', '09189870010'],
    ['09171230011', '102 Katipunan Road, Barangay Kalayaan, Quezon City', '1990-02-02', 'Helen Uy', 'Mother', '09189870011'],
    ['09171230012', '33 Narra Street, Barangay Kalayaan, Quezon City', '1991-07-30', 'Daniel Park', 'Husband', '09189870012'],
    ['09171230013', '14 Acacia Street, Barangay Kalayaan, Quezon City', '1988-09-09', 'Mila Lacson', 'Mother', '09189870013'],
    ['09171230014', '9 Mahogany Street, Barangay Kalayaan, Quezon City', '1952-12-02', 'Cecilia Ramos', 'Wife', '09189870014'],
    ['09171230015', '48 Molave Street, Barangay Kalayaan, Quezon City', '1993-08-15', 'Rosa Castillo', 'Mother', '09189870015'],
    ['09171230016', '21 Ipil Street, Barangay Kalayaan, Quezon City', '1987-04-26', 'Eduardo Navarro', 'Father', '09189870016'],
  ];
  const U = (firstName, lastName, email, role, x = {}) => {
    const [contactNumber, address, dateOfBirth, ecName, ecRel, ecNumber] = PEOPLE[n++];
    return { firstName, lastName, email, role, passwordHash, accountStatus: 'active', sex: 'Female', dateOfBirth, contactNumber, address,
      emergencyContact: { name: ecName, relationship: ecRel, contactNumber: ecNumber }, lastLoginAt: new Date(), ...x };
  };
  const [admin, joy, raf, eS, mL, gT, rV, ana, ben, cora, dan, elp, jo, ramon, noel, lea] = await M.User.insertMany([
    U('Paolo', 'Cruz', 'paolo@kalayaan.example', 'admin', { sex: 'Male' }),
    U('Joy', 'Mendoza', 'joy@kalayaan.example', 'receptionist'), U('Rafael', 'Bautista', 'rafael@kalayaan.example', 'receptionist', { sex: 'Male' }),
    U('Elena', 'Santos', 'elena@kalayaan.example', 'doctor'), U('Marco', 'Lim', 'marco@kalayaan.example', 'doctor', { sex: 'Male' }),
    U('Grace', 'Tan', 'grace@kalayaan.example', 'doctor'), U('Rhea', 'Villanueva', 'rhea@kalayaan.example', 'doctor'),
    U('Ana', 'Reyes', 'ana.reyes@email.com', 'patient'),
    U('Ben', 'Ocampo', 'ben.ocampo@email.com', 'patient', { sex: 'Male' }),
    U('Cora', 'Diaz', 'cora.diaz@email.com', 'patient'),
    U('Dan', 'Uy', 'dan.uy@email.com', 'patient', { sex: 'Male' }),
    U('Elena', 'Park', 'elena.park@email.com', 'patient'),
    U('Jo', 'Lacson', 'jo.lacson@email.com', 'patient', { ...AR('Moved to another city') }),
    U('Ramon', 'Ramos', 'ramon@kalayaan.example', 'doctor', { sex: 'Male', ...AR('Retired from practice') }),
    U('Noel', 'Castillo', 'noel.castillo@email.com', 'patient', { sex: 'Male', ...AR('Account closed at the patient\'s request') }),
    U('Lea', 'Navarro', 'lea@kalayaan.example', 'receptionist', { ...AR('Resigned from the health center') }),
  ]);

  // ---- 9 active services + 2 archived ----
  const S = Object.fromEntries((await M.Service.insertMany([
    ['General Checkup', 'Consultation', 30, 'Routine consultation with a general practitioner.', 'Bring a valid ID.'],
    ['Dental Consultation', 'Consultation', 30, 'Check-up and advice for teeth and gums.', 'Bring earlier dental records, if any.'],
    ['Pediatric Checkup', 'Consultation', 30, 'Health check for infants and children.', "Bring the child's immunization record."],
    ["Women's Health Consultation", 'Consultation', 45, "Consultation for women's health concerns.", 'Bring a valid ID.'],
    ['Follow-up Consultation', 'Consultation', 15, 'Review of an earlier visit.', 'Bring your previous results.'],
    ['Vaccination', 'Preventive', 15, 'Routine immunizations.', 'Bring your vaccination record.'],
    ['Preventive Care Check-up', 'Preventive', 30, 'Routine screening and health advice.', 'Bring a valid ID.'],
    ['Health Screening', 'Diagnostic', 45, 'Basic screening for overall health.', 'Fasting for 8 hours.'],
    ['Diagnostic Consultation', 'Diagnostic', 30, 'Consultation to assess symptoms.', 'List your symptoms before the visit.'],
  ].map(([name, category, durationMinutes, description, requirements]) => ({ name, category, durationMinutes, description, requirements }))
    .concat([{ name: 'Legacy Screening Package', category: 'Diagnostic', durationMinutes: 45, description: 'Replaced by Health Screening.', requirements: 'None', ...AR('Replaced by Health Screening') },
      { name: 'Basic Wellness Package', category: 'Preventive', durationMinutes: 30, description: 'Basic wellness advice and measurements.', requirements: 'None', ...AR('No longer offered') }]))).map((s) => [s.name, s]));

  // ---- 4 active providers + 1 archived, each with a weekly schedule and one lunch break ----
  const OFFER = [['General Checkup', 'Follow-up Consultation', 'Vaccination', 'Preventive Care Check-up', 'Health Screening', 'Diagnostic Consultation'],
    ['Dental Consultation', 'Follow-up Consultation'], ['Pediatric Checkup', 'Vaccination', 'Follow-up Consultation'], ["Women's Health Consultation", 'Follow-up Consultation']];
  const P = await M.Provider.insertMany([
    ['MD', 'General Medicine', 'Family physician serving the community since 2012.'], ['DMD', 'Dentistry', 'Dentist for adults and children.'],
    ['MD, FPPS', 'Pediatrics', 'Pediatrician serving the community since 2014.'], ['MD, FPOGS', 'OB-GYN', "Obstetrician-gynecologist focused on women's health."],
  ].map(([title, specialization, bio], i) => ({ userId: [eS, mL, gT, rV][i]._id, title, specialization, bio, serviceIds: OFFER[i].map((s) => S[s]._id) }))
    .concat([{ userId: ramon._id, title: 'MD', specialization: 'Internal Medicine', bio: 'Retired.', serviceIds: [S['General Checkup']._id], ...AR('Retired from practice') }]));
  const tpl = (days, s, e) => days.map((d) => ({ day: d, startTime: s, endTime: e, break: { startTime: '12:00', endTime: '13:00' } }));
  const T = [tpl([1, 2, 4, 5], '09:00', '17:00'), tpl([1, 2, 3, 4, 5, 6], '09:00', '16:00'), tpl([2, 3, 4, 5, 6], '08:00', '15:00'), tpl([1, 2, 3, 4], '10:00', '16:00')];
  await M.Schedule.insertMany(T.map((weeklyTemplate, i) => ({ providerId: P[i]._id, weeklyTemplate })));

  // ---- 32 appointments, built so nobody is double-booked and everything fits working hours. None are archived: appointments cannot be archived in the app. ----
  const docs = [eS, mL, gT, rV], busy = {}; let ref = 0;
  const works = (pi, d) => baseSlots(T[pi], D(d), 15).length > 0;
  const back = (pi, d) => { while (!works(pi, d)) d = d.subtract(1, 'day'); return d; };
  const fwd = (pi, d) => { while (!works(pi, d)) d = d.add(1, 'day'); return d; };
  const free = (k, s, e) => !(busy[k] || []).some(([a, b]) => s < b && e > a);
  const WHYS = { // visit reasons and doctor summaries are matched to the service, two variants each
    'General Checkup': ['Persistent cough for a week', 'Routine health check-up'], 'Dental Consultation': ['Tooth sensitivity to cold drinks', 'Gum bleeding when brushing'],
    'Pediatric Checkup': ['Fever and cough for two days', 'Regular growth and development check'], "Women's Health Consultation": ['Routine women\'s health check-up', 'Irregular monthly cycle'],
    'Follow-up Consultation': ['Follow-up on previous visit', 'Review of recent test results'], Vaccination: ['Annual flu vaccination', 'Booster dose'],
    'Preventive Care Check-up': ['Yearly preventive check-up', 'Medical clearance for work'], 'Health Screening': ['Annual health screening', 'Screening before a job application'],
    'Diagnostic Consultation': ['Frequent headaches and tiredness', 'Back pain after lifting'] };
  const SUMS = {
    'General Checkup': ['Cough for a week. Chest is clear. Advised rest, fluids and a return visit if it lasts beyond another week.', 'Routine check-up done. Vital signs are normal. Advised regular exercise and a balanced diet.'],
    'Dental Consultation': ['Mild tooth sensitivity found. Advised a softer brush and a sensitivity toothpaste; review in six months.', 'Mild gum inflammation noted. Advised gentle brushing, flossing and a dental cleaning.'],
    'Pediatric Checkup': ['Fever and mild cough for two days. Lungs are clear. Advised fluids, rest and watching the temperature; return if fever lasts more than three days.', 'Weight and height are on track for age. Immunization record reviewed and updated.'],
    "Women's Health Consultation": ['Routine check-up completed with normal findings. Advised regular screening and a yearly visit.', 'Cycle history reviewed. Advised keeping a monthly record and returning in two months.'],
    'Follow-up Consultation': ['Symptoms have improved since the last visit. No further treatment needed at this time.', 'Recent results reviewed and explained. Continue current care and return if symptoms come back.'],
    Vaccination: ['Vaccine given in the left arm. No reaction after 15 minutes of observation.', 'Booster dose given. Advised to rest the arm and watch for fever in the next day.'],
    'Preventive Care Check-up': ['Preventive check-up done. Blood pressure and weight are normal. Advised yearly repeat.', 'Cleared for work. No health concerns found during the check-up.'],
    'Health Screening': ['Screening completed. Results are within the normal range. Advised an annual repeat.', 'Screening completed with no concerns. Advised a healthy diet and regular exercise.'],
    'Diagnostic Consultation': ['Headaches likely linked to lack of sleep. Advised a regular sleep schedule, hydration and a return if they continue.', 'Back strain after lifting. Advised rest, gentle stretching and safe lifting technique.'] };
  const flow = { Pending: ['Pending'], Confirmed: ['Pending', 'Confirmed'], 'Checked In': ['Pending', 'Confirmed', 'Checked In'],
    'In Consultation': ['Pending', 'Confirmed', 'Checked In', 'In Consultation'], Completed: ['Pending', 'Confirmed', 'Checked In', 'In Consultation', 'Completed'],
    Cancelled: ['Pending', 'Confirmed', 'Cancelled'], 'No Show': ['Pending', 'Confirmed', 'No Show'] };
  function appt(pi, date, svcName, pt, status, x = {}) {
    const svc = S[svcName], dur = svc.durationMinutes;
    let t;
    while (!t) { // first slot from x.pick onward that is free for the doctor and the patient
      t = baseSlots(T[pi], D(date), dur).find((s, i) => i >= (x.pick || 0) && free(`p${pi}${D(date)}`, mins(s), mins(s) + dur) && free(`u${pt._id}${D(date)}`, mins(s), mins(s) + dur));
      if (!t) date = (x.future ? fwd : back)(pi, x.future ? date.add(1, 'day') : date.subtract(1, 'day'));
    }
    const s = mins(t), e = s + dur;
    for (const k of [`p${pi}${D(date)}`, `u${pt._id}${D(date)}`]) (busy[k] = busy[k] || []).push([s, e]);
    const start = dayjs(`${D(date)} ${t}`), now = dayjs();
    const when = { Pending: start.subtract(4, 'day'), Confirmed: start.subtract(3, 'day'), 'Checked In': start.subtract(10, 'minute'), 'In Consultation': start,
      Completed: start.add(dur, 'minute'), Cancelled: start.subtract(1, 'day'), 'No Show': start.add(20, 'minute') };
    const clamp = (m) => (m.isAfter(now) ? now.subtract(2, 'hour') : m).toDate();
    const who = { Pending: pt, Confirmed: joy, 'Checked In': joy, 'In Consultation': docs[pi], Completed: docs[pi], Cancelled: x.by || pt, 'No Show': joy };
    const a = { referenceNo: `APT-${dayjs().year()}-${String(++ref).padStart(5, '0')}`, patientId: pt._id, providerId: P[pi]._id, serviceId: svc._id,
      date: D(date), startTime: t, endTime: hhmm(e), status, reason: WHYS[svcName][ref % 2], notes: '', isWalkIn: false, createdBy: pt._id,
      statusHistory: flow[status].map((st) => ({ status: st, at: clamp(when[st]), by: who[st]._id, note: '' })) };
    if (status === 'Completed') a.consultation = { summary: SUMS[svcName][ref % 2], recordedBy: docs[pi]._id, recordedAt: clamp(when.Completed) };
    if (status === 'Cancelled') a.cancellation = { by: (x.by || pt)._id, reason: 'Schedule conflict', at: clamp(when.Cancelled) };
    if (x.resched) a.reschedulePending = x.resched(date, pi);
    return a;
  }
  const pats = [ana, ben, cora, dan, elp], list = [];
  for (let i = 0; i < 22; i++) { // 22 Completed, spread over about 90 days, all 4 doctors
    const pi = i % 4, svc = OFFER[pi][Math.floor(i / 4) % OFFER[pi].length], pt = pi === 3 ? [ana, cora, elp][i % 3] : pats[i % 5];
    list.push(appt(pi, back(pi, day(-(2 + i * 4))), svc, pt, 'Completed', { pick: i % 3 }));
  }
  const tp = [1, 0, 2, 3].find((pi) => works(pi, day(0))) ?? 1, td = works(tp, day(0)) ? day(0) : back(tp, day(0)); // today (or the last working day)
  list.push(appt(tp, td, 'Follow-up Consultation', cora, 'In Consultation', { pick: 0 }), appt(tp, td, 'Follow-up Consultation', ben, 'Checked In', { pick: 2 }));
  const fut = { future: true };
  list.push(appt(0, fwd(0, day(2)), 'General Checkup', ana, 'Confirmed', fut), appt(1, fwd(1, day(1)), 'Dental Consultation', ben, 'Confirmed', fut),
    appt(1, fwd(1, day(4)), 'Dental Consultation', ana, 'Pending', { ...fut, pick: 2 }), appt(2, fwd(2, day(3)), 'Pediatric Checkup', cora, 'Pending', fut),
    appt(0, fwd(0, day(6)), 'Follow-up Consultation', elp, 'Confirmed', { ...fut, pick: 3, resched: (d, pi) => ({ date: D(fwd(pi, d.add(3, 'day'))), startTime: baseSlots(T[pi], D(fwd(pi, d.add(3, 'day'))), 15)[2], reason: 'Work meeting conflict', requestedAt: new Date() }) }));
  list.push(appt(1, back(1, day(-12)), 'Follow-up Consultation', dan, 'Cancelled'), appt(0, back(0, day(-20)), 'General Checkup', ben, 'Cancelled', { by: joy }),
    appt(2, back(2, day(-8)), 'Pediatric Checkup', cora, 'No Show'));
  const A = await M.Appointment.insertMany(list);

  // ---- notifications (some unread) ----
  const N = (u, type, title, message, a, isRead = false) => ({ userId: u._id, type, title, message, relatedAppointmentId: a._id, isRead });
  const byRef = (r) => A.find((a) => a.status === r.status && a.patientId.equals(r.p._id));
  const notes = [];
  A.filter((a) => a.status === 'Completed').slice(-6).forEach((a) => notes.push({ ...N({ _id: a.patientId }, 'status_completed', 'Your visit has been completed.', `Reference ${a.referenceNo}.`, a, true) }));
  A.filter((a) => ['Confirmed', 'Pending'].includes(a.status) && a.date > D(day(0))).forEach((a) => {
    notes.push(N({ _id: a.patientId }, a.status === 'Pending' ? 'appointment_submitted' : 'status_confirmed', a.status === 'Pending' ? 'Appointment request submitted.' : 'Your appointment has been confirmed.', `Reference ${a.referenceNo}.`, a));
    for (const s of [joy, raf]) notes.push(N(s, a.reschedulePending?.date ? 'reschedule_request' : 'new_request', a.reschedulePending?.date ? 'Reschedule requested' : 'New appointment request', `Reference ${a.referenceNo}.`, a, !!(a.status === 'Confirmed' && !a.reschedulePending?.date)));
  });
  const chk = A.find((a) => a.status === 'Checked In'); notes.push(N(docs[P.findIndex((p) => p._id.equals(chk.providerId))], 'checked_in', 'Patient arrived', `Reference ${chk.referenceNo}.`, chk));
  await M.Notification.insertMany(notes);
  await M.User.updateMany({ isArchived: true }, { archivedBy: admin._id });
  await M.Provider.updateMany({ isArchived: true }, { archivedBy: admin._id });
  await M.Service.updateMany({ isArchived: true }, { archivedBy: admin._id });
  // The Archive page starts with 6 rows: 2 patients, 2 employees (a receptionist and a physician with the profile), 2 services. No appointments.

  const c = (s) => A.filter((a) => a.status === s).length;
  console.log(`Seeded ${await M.User.countDocuments()} users, ${A.length} appointments (${c('Completed')} Completed), ${notes.length} notifications.`);
  console.log(`Demo logins (password for all: ${PASSWORD})\n  admin        paolo@kalayaan.example\n  receptionist joy@kalayaan.example\n  doctor       elena@kalayaan.example\n  patient      ana.reyes@email.com`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });