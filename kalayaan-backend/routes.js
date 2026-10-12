// routes.js - API routes for users, providers, services, schedules, rescheduling and archive,
// notifications and the password flows. Every rule here is enforced on the server.
const bcrypt = require('bcryptjs'), dayjs = require('dayjs');
const { createHmac, randomInt, timingSafeEqual } = require('crypto');
const { sendCode } = require('./messaging');
const M = require('./models'), { R, ACTIVE, mins, hhmm, when, requireEmailVerification } = require('./rules');
const NAME = /^[A-Za-z\u00C0-\u00FF' -]{2,50}$/, PH = /^(09\d{9}|\+639\d{9})$/;
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = (app, H) => {
  const { E, wrap, auth, role, notify, FORBIDDEN, slotsFor, populate, staffIds, PW, profileErrors, fail, checkWhen, patientOverlap, checkRegister, sign } = H;
  const admin = [auth, role('admin')], today = () => dayjs().format('YYYY-MM-DD');
  const GONE = () => new E(409, 'SLOT_UNAVAILABLE', 'This appointment slot is no longer available. Please select another time.');
  const find = async (Model, id, extra = {}) => { const d = await Model.findOne({ _id: id, ...extra }); if (!d) throw new E(404, 'NOT_FOUND', 'Record not found.'); return d; };
  const stamp = (d, u, reason) => Object.assign(d, { isArchived: true, archivedAt: new Date(), archivedBy: u._id, archiveReason: reason || '' });
  const unstamp = (d) => Object.assign(d, { isArchived: false, archivedAt: null, archivedBy: null, archiveReason: null });
  const upcoming = (f) => M.Appointment.countDocuments({ ...f, status: { $in: ACTIVE }, date: { $gte: today() }, isArchived: false });
  // Dependency rule: block, never silently break. The frontend shows "Archive blocked" with the count.
  const blocked = (n, what) => { if (n) throw new E(409, 'HAS_DEPENDENCIES', `This ${what} has ${n} upcoming appointment${n > 1 ? 's' : ''}.`, undefined, { count: n }); };
  const lastAdmin = async (u) => {
    if (u.role === 'admin' && u.accountStatus === 'active' && !(await M.User.exists({ role: 'admin', accountStatus: 'active', isArchived: false, _id: { $ne: u._id } })))
      throw new E(409, 'LAST_ADMIN', 'At least one active admin must remain.');
  };
  const notSelf = (q) => { if (q.params.id === String(q.user._id)) throw new E(403, 'SELF_PROTECTION', 'You cannot change your own role, status or archive state.'); };
  const userUpcoming = async (u) => {
    const p = u.role === 'doctor' && (await M.Provider.findOne({ userId: u._id }));
    return (u.role === 'patient' ? await upcoming({ patientId: u._id }) : 0) + (p ? await upcoming({ providerId: p._id }) : 0);
  };
  const checkUser = (b, needPw) => {
    const f = {};
    if (!NAME.test(b.firstName || '')) f.firstName = 'Use 2 to 50 letters.';
    if (!NAME.test(b.lastName || '')) f.lastName = 'Use 2 to 50 letters.';
    if (!/^\S+@\S+\.\S+$/.test(b.email || '')) f.email = 'Enter a valid email.';
    if (b.contactNumber && !PH.test(b.contactNumber)) f.contactNumber = 'Use 09XXXXXXXXX or +639XXXXXXXXX.';
    if (needPw && !PW.test(b.password || '')) f.password = 'At least 8 characters with upper and lower case letters and a number.';
    if (Object.keys(f).length) throw new E(400, 'VALIDATION_ERROR', 'Please fix the highlighted fields.', f);
  };
  // Profile fields a person may edit about themselves (email, role, status and archive state are never editable here).
  const PROFILE = ['firstName', 'middleName', 'lastName', 'contactNumber', 'dateOfBirth', 'sex', 'address', 'emergencyContact'];
  const pick = (b) => Object.fromEntries(PROFILE.filter((k) => k in b).map((k) => [k, b[k]]));
  const check = (b, strict, extra = {}) => fail({ ...profileErrors(b, strict), ...extra }); // one response lists every wrong field
  const sendAppt = async (r, a) => r.json({ appointment: await M.Appointment.findById(a._id).populate(populate) });

  const codeHash = (code) => createHmac('sha256', process.env.JWT_SECRET).update(String(code)).digest('hex');
  const codeMatches = (code, hash) => {
    if (!hash || !/^\d{6}$/.test(String(code || ''))) return false;
    const received = Buffer.from(codeHash(code), 'hex'), expected = Buffer.from(hash, 'hex');
    return received.length === expected.length && timingSafeEqual(received, expected);
  };
  const challengeFields = (purpose) => purpose === 'verify'
    ? ['verificationCodeHash', 'verificationExpiresAt', 'verificationSentAt', 'verificationAttempts']
    : ['resetCodeHash', 'resetExpiresAt', 'resetSentAt', 'resetAttempts'];
  const issueCode = async (user, purpose) => {
    const [hashField, expiresField, sentField, attemptsField] = challengeFields(purpose);
    const destination = user.email;
    if (user[sentField] && Date.now() - user[sentField].getTime() < 60_000) throw new E(429, 'TOO_MANY_REQUESTS', 'Wait one minute before requesting another code.');
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    let delivery;
    try { delivery = await sendCode(destination, code, purpose); }
    catch (error) { throw new E(503, 'DELIVERY_UNAVAILABLE', error.message); }
    user[hashField] = codeHash(code);
    user[expiresField] = new Date(Date.now() + 10 * 60_000); user[sentField] = new Date(); user[attemptsField] = 0;
    await user.save();
    return delivery;
  };
  const verifyCode = async (user, code, purpose) => {
    const [hashField, expiresField, sentField, attemptsField] = challengeFields(purpose);
    if (!user[hashField] || !user[expiresField]) throw new E(400, 'INVALID_CODE', 'Request a new code to continue.');
    if (user[expiresField] < new Date()) throw new E(400, 'CODE_EXPIRED', 'This code has expired. Request a new one.');
    if (user[attemptsField] >= 5) throw new E(429, 'TOO_MANY_ATTEMPTS', 'Too many incorrect codes. Request a new one.');
    if (!codeMatches(code, user[hashField])) {
      user[attemptsField] += 1; await user.save();
      throw new E(400, 'INVALID_CODE', 'That code is incorrect.');
    }
    for (const field of [hashField, expiresField, sentField]) user[field] = undefined;
    user[attemptsField] = 0;
  };
  const findAccount = (identifier) => {
    const value = String(identifier || '').trim();
    const normalized = value.includes('@') ? value.toLowerCase() : value;
    return M.User.findOne({ isArchived: false, email: normalized })
      .select('+verificationCodeHash +verificationExpiresAt +verificationSentAt +verificationAttempts +resetCodeHash +resetExpiresAt +resetSentAt +resetAttempts');
  };

  // ---------- Password flows ----------
  app.post('/api/auth/register', wrap(async (q, r) => {
    const b = q.body; checkRegister(b);
    if (await M.User.exists({ email: b.email.toLowerCase() })) throw new E(409, 'EMAIL_TAKEN', 'An account with this email already exists.', { email: 'An account with this email already exists.' });
      const verify = requireEmailVerification(); // false = the patient can log in right away
      const user = await M.User.create({ ...b, isVerified: !verify, accountStatus: 'active', role: 'patient', passwordHash: await bcrypt.hash(b.password, 10) });
    if (!verify) return r.status(201).json({ message: 'Account created. You can log in now.', identifier: user.email, verified: true });
    try {
      const delivery = await issueCode(user, 'verify');
      r.status(201).json({ message: 'Enter the verification code sent to your email.', identifier: user.email, ...(delivery.developmentCode ? { developmentCode: delivery.developmentCode } : {}) });
    } catch (error) {
      await M.User.deleteOne({ _id: user._id });
      throw error;
    }
  }));
  app.post('/api/auth/logout', auth, (q, r) => r.json({ ok: true })); // tokens are stateless; the client discards its token
  app.post('/api/auth/verify-registration', wrap(async (q, r) => {
    const u = await findAccount(q.body.identifier);
    if (!u || u.isVerified) throw new E(400, 'INVALID_CODE', 'This verification request is unavailable.');
    await verifyCode(u, q.body.code, 'verify');
    u.isVerified = true; await u.save(); r.json({ ok: true });
  }));
  app.post('/api/auth/resend-verification', wrap(async (q, r) => {
    const u = await findAccount(q.body.identifier);
    const out = { message: 'If an unverified account exists, a new code has been sent.' };
    if (u && !u.isVerified) {
      const delivery = await issueCode(u, 'verify');
      if (delivery.developmentCode) out.developmentCode = delivery.developmentCode;
    }
    r.json(out);
  }));
  app.post('/api/auth/forgot-password', wrap(async (q, r) => {
    const u = await findAccount(q.body.identifier || q.body.email);
    const out = { message: 'If an active account exists for that email, a reset code has been sent.' };
    if (u) {
      const delivery = await issueCode(u, 'reset');
      if (delivery.developmentCode) out.developmentCode = delivery.developmentCode;
    }
    r.json(out);
  }));
  app.post('/api/auth/reset-password', wrap(async (q, r) => {
    const u = await findAccount(q.body.identifier || q.body.email);
    if (!u) throw new E(400, 'INVALID_CODE', 'That code is invalid or expired.');
    await verifyCode(u, q.body.code, 'reset');
    if (!PW.test(q.body.password || '')) throw new E(400, 'VALIDATION_ERROR', 'Password is too weak.', { password: 'At least 8 characters with upper and lower case letters and a number.' });
    u.passwordHash = await bcrypt.hash(q.body.password, 10); u.isVerified = true; await u.save(); r.json({ ok: true });
  }));
  app.patch('/api/auth/change-password', auth, wrap(async (q, r) => {
    const u = await M.User.findById(q.user._id).select('+passwordHash'), b = q.body;
    if (!(await bcrypt.compare(b.currentPassword || '', u.passwordHash))) throw new E(400, 'VALIDATION_ERROR', 'Current password is incorrect.', { currentPassword: 'Current password is incorrect.' });
    if (!PW.test(b.newPassword || '')) throw new E(400, 'VALIDATION_ERROR', 'Password is too weak.', { newPassword: 'At least 8 characters with upper and lower case letters and a number.' });
    if (b.newPassword === b.currentPassword) throw new E(400, 'VALIDATION_ERROR', 'Choose a different password.', { newPassword: 'Choose a different password.' });
    u.passwordHash = await bcrypt.hash(b.newPassword, 10); await u.save(); r.json({ ok: true });
  }));

  // Edit my own profile (every role). Patients must keep every profile field filled; other roles may leave some empty.
  app.put('/api/auth/me', auth, wrap(async (q, r) => {
    const u = q.user, edits = pick(q.body);
    check({ ...u.toObject(), ...edits }, u.role === 'patient');
    Object.assign(u, edits); await u.save(); r.json({ user: u });
  }));

  // ---------- Users (admin) ----------
  app.get('/api/users', ...admin, wrap(async (q, r) => {
    const { role: ro, status, search, archived, page = 1, limit = 10 } = q.query, f = { isArchived: archived === 'true' };
    if (ro) f.role = ro; if (status) f.accountStatus = status;
    if (search) { const x = new RegExp(esc(search), 'i'); f.$or = [{ firstName: x }, { lastName: x }, { email: x }]; }
    const [users, total] = await Promise.all([M.User.find(f).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit), M.User.countDocuments(f)]);
    r.json({ users, total, page: +page });
  }));
  app.get('/api/users/:id', ...admin, wrap(async (q, r) => r.json({ user: await find(M.User, q.params.id) })));
  app.post('/api/users', ...admin, wrap(async (q, r) => {
    const b = q.body; checkUser(b, true);
    if (!['patient', 'doctor', 'receptionist', 'admin'].includes(b.role)) throw new E(400, 'VALIDATION_ERROR', 'Choose a role.', { role: 'Choose a role.' });
    if (await M.User.exists({ email: b.email.toLowerCase() })) throw new E(409, 'EMAIL_TAKEN', 'An account with this email already exists.', { email: 'An account with this email already exists.' });
    const u = await M.User.create({ ...b, isVerified: true, accountStatus: 'active', isArchived: false, passwordHash: await bcrypt.hash(b.password, 10) });
    if (u.role === 'doctor') { const p = await M.Provider.create({ userId: u._id, serviceIds: [] }); await M.Schedule.create({ providerId: p._id, weeklyTemplate: [] }); }
    r.status(201).json({ user: u });
  }));
  app.put('/api/users/:id', ...admin, wrap(async (q, r) => {
    const u = await find(M.User, q.params.id, { isArchived: false }); checkUser({ ...u.toObject(), ...q.body });
    for (const k of ['firstName', 'middleName', 'lastName', 'contactNumber', 'dateOfBirth', 'sex', 'address', 'emergencyContact']) if (k in q.body) u[k] = q.body[k]; // role, status and archive have their own endpoints
    await u.save(); r.json({ user: u });
  }));
  app.patch('/api/users/:id/status', ...admin, wrap(async (q, r) => {
    notSelf(q); const u = await find(M.User, q.params.id, { isArchived: false }), s = q.body.accountStatus;
    if (!['active', 'inactive', 'suspended'].includes(s)) throw new E(400, 'VALIDATION_ERROR', 'Invalid status.');
    if (s !== 'active') await lastAdmin(u);
    u.accountStatus = s; await u.save(); r.json({ user: u });
  }));
  app.patch('/api/users/:id/role', ...admin, wrap(async (q, r) => {
    notSelf(q); const u = await find(M.User, q.params.id, { isArchived: false }), to = q.body.role;
    if (!['patient', 'doctor', 'receptionist', 'admin'].includes(to) || to === u.role) throw new E(400, 'VALIDATION_ERROR', 'Choose a different role.');
    await lastAdmin(u); blocked(await userUpcoming(u), 'user'); // as patient or as provider
    const old = await M.Provider.findOne({ userId: u._id, isArchived: false });
    if (u.role === 'doctor' && old) { stamp(old, q.user, 'Role changed'); await old.save(); } // changing away from doctor archives the profile
    if (to === 'doctor') { const p = await M.Provider.create({ userId: u._id, serviceIds: [] }); await M.Schedule.create({ providerId: p._id, weeklyTemplate: [] }); }
    u.role = to; await u.save(); r.json({ user: u });
  }));
  app.patch('/api/users/:id/archive', ...admin, wrap(async (q, r) => {
    notSelf(q); const u = await find(M.User, q.params.id, { isArchived: false });
    await lastAdmin(u); blocked(await userUpcoming(u), 'user');
    stamp(u, q.user, q.body.reason); await u.save(); // accountStatus is NOT changed
    const p = await M.Provider.findOne({ userId: u._id, isArchived: false }); if (p) { stamp(p, q.user, q.body.reason); await p.save(); }
    r.json({ user: u });
  }));
  app.patch('/api/users/:id/restore', ...admin, wrap(async (q, r) => {
    const u = await find(M.User, q.params.id, { isArchived: true }); unstamp(u); await u.save();
    const p = await M.Provider.findOne({ userId: u._id, isArchived: true }); if (p) { unstamp(p); await p.save(); }
    r.json({ user: u });
  }));

  // ---------- Services ----------
  const checkService = async (b, id) => {
    const f = {};
    if (!b.name || b.name.trim().length < 2 || b.name.length > 80) f.name = 'Enter a name of 2 to 80 characters.';
    else if (await M.Service.exists({ name: new RegExp('^' + esc(b.name.trim()) + '$', 'i'), isArchived: false, _id: { $ne: id } })) f.name = 'A service with this name already exists.';
    if (!['Consultation', 'Preventive', 'Diagnostic'].includes(b.category)) f.category = 'Choose a category.';
    if (![15, 30, 45].includes(Number(b.durationMinutes))) f.durationMinutes = 'Choose 15, 30 or 45 minutes.';
    if (Object.keys(f).length) throw new E(400, 'VALIDATION_ERROR', 'Please fix the highlighted fields.', f);
  };
  app.get('/api/services', wrap(async (q, r) => r.json({ services: await M.Service.find({ isArchived: false }).sort({ category: 1, name: 1 }) })));
  app.get('/api/services/:id', wrap(async (q, r) => r.json({ service: await find(M.Service, q.params.id, { isArchived: false }) })));
  app.post('/api/services', ...admin, wrap(async (q, r) => { await checkService(q.body); r.status(201).json({ service: await M.Service.create({ ...q.body, isArchived: false }) }); }));
  app.put('/api/services/:id', ...admin, wrap(async (q, r) => {
    const s = await find(M.Service, q.params.id, { isArchived: false }); await checkService(q.body, s._id);
    for (const k of ['name', 'category', 'description', 'durationMinutes', 'requirements']) if (k in q.body) s[k] = q.body[k];
    await s.save(); r.json({ service: s });
  }));
  app.patch('/api/services/:id/archive', ...admin, wrap(async (q, r) => {
    const s = await find(M.Service, q.params.id, { isArchived: false }); blocked(await upcoming({ serviceId: s._id }), 'service');
    stamp(s, q.user, q.body.reason); await s.save(); r.json({ service: s });
  }));
  app.patch('/api/services/:id/restore', ...admin, wrap(async (q, r) => {
    const s = await find(M.Service, q.params.id, { isArchived: true });
    if (await M.Service.exists({ name: new RegExp('^' + esc(s.name) + '$', 'i'), isArchived: false })) throw new E(409, 'NAME_TAKEN', 'Cannot restore: an active service already has this name.');
    unstamp(s); await s.save(); r.json({ service: s });
  }));

  // ---------- Providers ----------
  const withInfo = (qry) => qry.populate({ path: 'user', select: 'firstName lastName' }).populate({ path: 'services', select: 'name category durationMinutes description requirements' });
  const checkServices = async (ids) => { if (ids && (await M.Service.countDocuments({ _id: { $in: ids }, isArchived: false })) !== ids.length) throw new E(400, 'VALIDATION_ERROR', 'Choose active services only.', { serviceIds: 'Choose active services only.' }); };
  app.get('/api/providers', wrap(async (q, r) => r.json({ providers: await withInfo(M.Provider.find({ isArchived: false })) })));
  app.get('/api/providers/:id', wrap(async (q, r) => {
    const p = await withInfo(M.Provider.findOne({ _id: q.params.id, isArchived: false })); if (!p) throw new E(404, 'NOT_FOUND', 'Provider not found.');
    r.json({ provider: p, schedule: await M.Schedule.findOne({ providerId: p._id }) });
  }));
  app.post('/api/providers', ...admin, wrap(async (q, r) => {
    const b = q.body, u = await M.User.findOne({ _id: b.userId, role: 'doctor', isArchived: false, accountStatus: 'active' });
    if (!u) throw new E(400, 'VALIDATION_ERROR', 'Choose an active doctor account.', { userId: 'Choose an active doctor account.' });
    if (await M.Provider.exists({ userId: u._id, isArchived: false })) throw new E(409, 'ALREADY_EXISTS', 'This doctor already has a provider profile.');
    await checkServices(b.serviceIds);
    const p = await M.Provider.create({ userId: u._id, title: b.title, specialization: b.specialization, bio: b.bio, serviceIds: b.serviceIds || [] });
    await M.Schedule.create({ providerId: p._id, weeklyTemplate: [] }); r.status(201).json({ provider: p });
  }));
  // Admin edits everything. A doctor edits only their OWN title and bio (specialization and services stay with the admin).
  app.put('/api/providers/:id', auth, role('admin', 'doctor'), wrap(async (q, r) => {
    const p = await find(M.Provider, q.params.id, { isArchived: false }), own = q.user.role === 'doctor', b = q.body, f = {};
    if (own && !p.userId.equals(q.user._id)) throw FORBIDDEN();
    if (!own) await checkServices(b.serviceIds);
    if (b.title && String(b.title).length > 40) f.title = 'Use up to 40 characters.';
    if (b.bio && String(b.bio).length > 500) f.bio = 'Use up to 500 characters.';
    fail(f);
    for (const k of own ? ['title', 'bio'] : ['title', 'specialization', 'bio', 'serviceIds']) if (k in b) p[k] = b[k];
    await p.save(); r.json({ provider: p });
  }));
  app.patch('/api/providers/:id/archive', ...admin, wrap(async (q, r) => {
    const p = await find(M.Provider, q.params.id, { isArchived: false }); blocked(await upcoming({ providerId: p._id }), 'provider');
    stamp(p, q.user, q.body.reason); await p.save(); // one action archives the provider and the linked doctor account
    const u = await M.User.findOne({ _id: p.userId, isArchived: false }); if (u) { stamp(u, q.user, q.body.reason); await u.save(); }
    r.json({ provider: p });
  }));
  app.patch('/api/providers/:id/restore', ...admin, wrap(async (q, r) => {
    const p = await find(M.Provider, q.params.id, { isArchived: true }); unstamp(p); await p.save();
    const u = await M.User.findById(p.userId); if (u && u.isArchived) { unstamp(u); await u.save(); }
    r.json({ provider: p });
  }));

  // ---------- Schedules ----------
  const checkTemplate = (t) => {
    const bad = (m) => new E(400, 'VALIDATION_ERROR', m, { weeklyTemplate: m }), TIME = /^([01]\d|2[0-3]):(00|30)$/, seen = new Set();
    if (!Array.isArray(t)) throw bad('Send a weekly template.');
    for (const d of t) {
      if (!Number.isInteger(d.day) || d.day < 0 || d.day > 6 || seen.has(d.day)) throw bad('Each day can appear once (0 to 6).'); seen.add(d.day);
      if (!TIME.test(d.startTime || '') || !TIME.test(d.endTime || '') || mins(d.endTime) <= mins(d.startTime)) throw bad('End time must be after start time, on 30-minute steps.');
      const b = d.break; if (b && (b.startTime || b.endTime)) {
        if (!TIME.test(b.startTime || '') || !TIME.test(b.endTime || '') || mins(b.endTime) <= mins(b.startTime) || mins(b.startTime) < mins(d.startTime) || mins(b.endTime) > mins(d.endTime)) throw bad('Break must be inside working hours.');
      }
    }
  };
  app.get('/api/schedules/:providerId', auth, wrap(async (q, r) => {
    const p = await find(M.Provider, q.params.providerId, { isArchived: false });
    if (q.user.role === 'patient' || (q.user.role === 'doctor' && !p.userId.equals(q.user._id))) throw FORBIDDEN();
    r.json({ schedule: await M.Schedule.findOne({ providerId: p._id }) });
  }));
  app.put('/api/schedules/:providerId', auth, role('admin', 'doctor'), wrap(async (q, r) => {
    const p = await find(M.Provider, q.params.providerId, { isArchived: false });
    if (q.user.role === 'doctor' && !p.userId.equals(q.user._id)) throw FORBIDDEN(); // doctors edit only their own
    checkTemplate(q.body.weeklyTemplate);
    r.json({ schedule: await M.Schedule.findOneAndUpdate({ providerId: p._id }, { weeklyTemplate: q.body.weeklyTemplate }, { new: true, upsert: true }) });
  }));

  // ---------- Reschedule ----------
  app.post('/api/appointments/:id/reschedule-request', auth, role('patient'), wrap(async (q, r) => {
    const a = await find(M.Appointment, q.params.id, { isArchived: false }), { date, startTime, reason } = q.body;
    if (!a.patientId.equals(q.user._id)) throw FORBIDDEN();
    if (a.status !== 'Confirmed') throw new E(409, 'INVALID_TRANSITION', 'Only a Confirmed appointment can be rescheduled.');
    if (dayjs(`${a.date} ${a.startTime}`).diff(dayjs(), 'hour', true) < R.CUTOFF_H) throw new E(409, 'CUTOFF_PASSED', 'Rescheduling online is possible up to 24 hours before the visit.');
    if (a.reschedulePending && a.reschedulePending.date) throw new E(409, 'ALREADY_PENDING', 'A reschedule request is already pending.');
    if (!reason || reason.trim().length < 5) throw new E(400, 'VALIDATION_ERROR', 'Reason must be at least 5 characters.', { reason: 'Reason must be at least 5 characters.' });
    checkWhen(date, startTime);
    const [prov, svc] = await Promise.all([M.Provider.findById(a.providerId), M.Service.findById(a.serviceId)]);
    if (!(await slotsFor(prov, svc, date, false, a._id)).includes(startTime)) throw GONE();
    await patientOverlap(a.patientId, date, mins(startTime), mins(startTime) + svc.durationMinutes, a._id);
    a.reschedulePending = { date, startTime, reason, requestedAt: new Date() }; // the status stays Confirmed
    a.statusHistory.push({ status: 'Confirmed', at: new Date(), by: q.user._id, note: `Reschedule requested for ${when(date, startTime)}` });
    await a.save(); for (const id of await staffIds()) await notify(id, 'reschedule_request', 'Reschedule requested', `Reference ${a.referenceNo}.`, a);
    await sendAppt(r, a);
  }));
  // body.action: "apply" (use the pending request), "reject" (reason required) or "reschedule" (staff picks a new time)
  app.put('/api/appointments/:id', auth, role('receptionist', 'admin'), wrap(async (q, r) => {
    const a = await find(M.Appointment, q.params.id, { isArchived: false }), { action, reason } = q.body;
    if (a.status !== 'Confirmed') throw new E(409, 'INVALID_TRANSITION', 'Only a Confirmed appointment can be rescheduled.');
    const pending = a.reschedulePending && a.reschedulePending.date ? a.reschedulePending : null;
    if (action === 'reject') {
      if (!pending) throw new E(409, 'INVALID_TRANSITION', 'There is no pending reschedule request.');
      if (!reason || reason.trim().length < 5) throw new E(400, 'VALIDATION_ERROR', 'A reason is required.', { reason: 'Enter at least 5 characters.' });
      a.reschedulePending = undefined; a.statusHistory.push({ status: 'Confirmed', at: new Date(), by: q.user._id, note: `Reschedule rejected: ${reason}` });
      await a.save(); await notify(a.patientId, 'reschedule_rejected', 'Reschedule request declined', reason, a); return sendAppt(r, a);
    }
    const t = action === 'apply' ? pending : action === 'reschedule' ? q.body : null;
    if (!t || !t.date || !t.startTime) throw new E(400, 'VALIDATION_ERROR', 'Choose a new date and time.');
    checkWhen(t.date, t.startTime);
    const [prov, svc] = await Promise.all([M.Provider.findById(a.providerId), M.Service.findById(a.serviceId)]);
    if (!(await slotsFor(prov, svc, t.date, false, a._id)).includes(t.startTime)) throw GONE();
    await patientOverlap(a.patientId, t.date, mins(t.startTime), mins(t.startTime) + svc.durationMinutes, a._id);
    a.date = t.date; a.startTime = t.startTime; a.endTime = hhmm(mins(t.startTime) + svc.durationMinutes); a.reschedulePending = undefined;
    a.statusHistory.push({ status: 'Confirmed', at: new Date(), by: q.user._id, note: `Rescheduled to ${when(t.date, t.startTime)}` });
    try { await a.save(); } catch (e) { if (e.code === 11000) throw GONE(); throw e; }
    await notify(a.patientId, 'rescheduled', 'Appointment rescheduled', `Now on ${when(a.date, a.startTime)}.`, a); await sendAppt(r, a);
  }));
  for (const act of ['archive', 'restore']) app.patch(`/api/appointments/:id/${act}`, ...admin, wrap(async (q, r) => {
    const a = await find(M.Appointment, q.params.id, { isArchived: act === 'restore' });
    if (act === 'archive') { if (!['Completed', 'Cancelled', 'No Show'].includes(a.status)) throw new E(409, 'INVALID_TRANSITION', 'Only finished appointments can be archived.'); stamp(a, q.user, q.body.reason); } else unstamp(a);
    await a.save(); await sendAppt(r, a);
  }));

  // ---------- Patients (directory for staff) ----------
  // GET: receptionist and admin see every active patient, a doctor only patients of their own appointments.
  // visits and lastVisit count Completed appointments (for a doctor: only their own). Archiving a patient is an admin action on /api/users.
  app.get('/api/patients', auth, role('receptionist', 'admin', 'doctor'), wrap(async (q, r) => {
    const { search, status } = q.query, page = Math.max(+q.query.page || 1, 1), limit = Math.min(Math.max(+q.query.limit || 10, 1), 50);
    const f = { role: 'patient', isArchived: false }, own = {};
    if (status) f.accountStatus = status;
    if (q.user.role === 'doctor') {
      const p = await M.Provider.findOne({ userId: q.user._id }); own.providerId = p ? p._id : null;
      f._id = { $in: p ? await M.Appointment.distinct('patientId', own) : [] };
    }
    if (search) { const x = new RegExp(esc(search), 'i'); f.$or = [{ firstName: x }, { lastName: x }, { email: x }, { contactNumber: x }]; }
    const [list, total] = await Promise.all([M.User.find(f).sort({ lastName: 1, firstName: 1 }).skip((page - 1) * limit).limit(limit), M.User.countDocuments(f)]);
    const done = await M.Appointment.find({ ...own, status: 'Completed', patientId: { $in: list.map((u) => u._id) } }).select('patientId date'); // plain find: easy to explain
    const by = {}; for (const x of done) { const k = String(x.patientId), v = by[k] || { visits: 0, lastVisit: null }; by[k] = { visits: v.visits + 1, lastVisit: v.lastVisit && v.lastVisit > x.date ? v.lastVisit : x.date }; }
    r.json({ patients: list.map((u) => ({ ...u.toJSON(), ...(by[String(u._id)] || { visits: 0, lastVisit: null }) })), total, page });
  }));
  // The receptionist adds a patient (for example a walk-in). No password is set: the patient chooses one later with "Forgot password".
  app.post('/api/patients', auth, role('receptionist'), wrap(async (q, r) => {
    const b = q.body, email = String(b.email || '').trim().toLowerCase();
    check(b, true, /^\S+@\S+\.\S+$/.test(email) ? {} : { email: 'Enter a valid email.' });
    if (await M.User.exists({ email })) throw new E(409, 'EMAIL_TAKEN', 'An account with this email already exists.', { email: 'An account with this email already exists.' });
    r.status(201).json({ patient: await M.User.create({ ...pick(b), email, role: 'patient', accountStatus: 'active' }) });
  }));
  app.put('/api/patients/:id', auth, role('receptionist'), wrap(async (q, r) => {
    const u = await find(M.User, q.params.id, { role: 'patient', isArchived: false }), edits = pick(q.body);
    check({ ...u.toObject(), ...edits }, true);
    Object.assign(u, edits); await u.save(); r.json({ patient: u });
  }));

  // ---------- Notifications (own only) ----------
  app.get('/api/notifications', auth, wrap(async (q, r) => {
    const f = { userId: q.user._id }; if (q.query.read) f.isRead = q.query.read === 'true';
    r.json({ notifications: await M.Notification.find(f).sort({ createdAt: -1 }).limit(100), unread: await M.Notification.countDocuments({ userId: q.user._id, isRead: false }) });
  }));
  app.patch('/api/notifications/read-all', auth, wrap(async (q, r) => { await M.Notification.updateMany({ userId: q.user._id, isRead: false }, { isRead: true }); r.json({ ok: true }); }));
  app.patch('/api/notifications/:id/read', auth, wrap(async (q, r) => {
    const n = await M.Notification.findOneAndUpdate({ _id: q.params.id, userId: q.user._id }, { isRead: true }, { new: true });
    if (!n) throw new E(404, 'NOT_FOUND', 'Notification not found.'); r.json({ notification: n });
  }));
  app.delete('/api/notifications/:id', auth, wrap(async (q, r) => { // notifications are the only records that can be deleted for good
    const x = await M.Notification.deleteOne({ _id: q.params.id, userId: q.user._id }); if (!x.deletedCount) throw new E(404, 'NOT_FOUND', 'Notification not found.'); r.json({ ok: true });
  }));

  // ---------- Archive page: only archived records ----------
  app.get('/api/archive', ...admin, wrap(async (q, r) => {
    const by = { path: 'archivedBy', select: 'firstName lastName' };
    const [users, provs, svcs, appts] = await Promise.all([M.User.find({ isArchived: true }).populate(by),
      M.Provider.find({ isArchived: true }).populate(by).populate({ path: 'user', select: 'firstName lastName' }), M.Service.find({ isArchived: true }).populate(by),
      M.Appointment.find({ isArchived: true }).populate(by).populate({ path: 'patient', select: 'firstName lastName' }).populate({ path: 'service', select: 'name' })]);
    const hidden = new Set(provs.map((p) => String(p.userId))); // a provider and its doctor account share one row
    const row = (type, d, name) => ({ type, _id: d._id, name, archivedAt: d.archivedAt, archivedBy: d.archivedBy ? `${d.archivedBy.firstName} ${d.archivedBy.lastName}` : '', reason: d.archiveReason, record: d });
    let rows = [...users.filter((u) => !hidden.has(String(u._id))).map((u) => row('user', u, `${u.firstName} ${u.lastName}`)),
      ...provs.map((p) => row('provider', p, p.user ? `Dr. ${p.user.firstName} ${p.user.lastName}` : 'Provider')), ...svcs.map((s) => row('service', s, s.name)),
      ...appts.map((a) => row('appointment', a, `${a.referenceNo} · ${a.patient ? a.patient.firstName + ' ' + a.patient.lastName : ''} · ${a.service ? a.service.name : ''}`))];
    const counts = rows.reduce((c, x) => ((c[x.type] = (c[x.type] || 0) + 1), c), {}), total = rows.length;
    if (q.query.type) rows = rows.filter((x) => x.type === q.query.type);
    if (q.query.search) rows = rows.filter((x) => x.name.toLowerCase().includes(String(q.query.search).toLowerCase()));
    r.json({ rows: rows.sort((a, b) => b.archivedAt - a.archivedAt), counts, total });
  }));
};
