// models.js - one Mongoose schema per collection.
// Every schema uses timestamps. Archivable records carry the soft-delete fields.
const { Schema, model } = require('mongoose');
const ref = (to) => ({ type: Schema.Types.ObjectId, ref: to });
const archive = { isArchived: { type: Boolean, default: false }, archivedAt: Date, archivedBy: ref('User'), archiveReason: String };
// Never send a password hash to the client, even right after a document is created (select:false does not cover that).
const opts = { timestamps: true, toJSON: { virtuals: true, transform: (doc, ret) => { delete ret.passwordHash; return ret; } } };
const STATUS = ['Pending', 'Confirmed', 'Checked In', 'In Consultation', 'Completed', 'Cancelled', 'No Show'];

const User = model('User', new Schema({
  firstName: { type: String, required: true, trim: true }, middleName: String, lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, select: false },
  isVerified: { type: Boolean, default: true },
  verificationCodeHash: { type: String, select: false },
  verificationExpiresAt: { type: Date, select: false }, verificationSentAt: { type: Date, select: false },
  verificationAttempts: { type: Number, default: 0, select: false },
  resetCodeHash: { type: String, select: false },
  resetExpiresAt: { type: Date, select: false }, resetSentAt: { type: Date, select: false },
  resetAttempts: { type: Number, default: 0, select: false },
  role: { type: String, enum: ['patient', 'doctor', 'receptionist', 'admin'], required: true },
  accountStatus: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  contactNumber: String, dateOfBirth: String, sex: String, address: String,
  emergencyContact: { name: String, relationship: String, contactNumber: String },
  lastLoginAt: Date, ...archive,
}, opts));

const Service = model('Service', new Schema({
  name: { type: String, required: true }, category: { type: String, enum: ['Consultation', 'Preventive', 'Diagnostic'], required: true },
  description: String, durationMinutes: { type: Number, required: true }, requirements: String, ...archive,
}, opts));

const providerSchema = new Schema({
  userId: { ...ref('User'), required: true }, title: String, specialization: String, bio: String,
  serviceIds: [ref('Service')], ...archive, // serviceIds is the single source of truth for who offers what
}, opts);
providerSchema.virtual('user', { ref: 'User', localField: 'userId', foreignField: '_id', justOne: true });
providerSchema.virtual('services', { ref: 'Service', localField: 'serviceIds', foreignField: '_id' });
const Provider = model('Provider', providerSchema);

const Schedule = model('Schedule', new Schema({
  providerId: { ...ref('Provider'), required: true, unique: true },
  weeklyTemplate: [{ _id: false, day: Number, startTime: String, endTime: String, break: { startTime: String, endTime: String } }], ...archive,
}, opts));

const apptSchema = new Schema({
  referenceNo: { type: String, unique: true },
  patientId: { ...ref('User'), required: true }, providerId: { ...ref('Provider'), required: true }, serviceId: { ...ref('Service'), required: true },
  date: { type: String, required: true }, startTime: { type: String, required: true }, endTime: String, // "YYYY-MM-DD" and "HH:mm"
  status: { type: String, enum: STATUS, default: 'Pending' }, reason: String, notes: String,
  isWalkIn: { type: Boolean, default: false }, createdBy: ref('User'),
  cancellation: { by: ref('User'), reason: String, at: Date },
  reschedulePending: { date: String, startTime: String, reason: String, requestedAt: Date },
  statusHistory: [{ _id: false, status: String, at: Date, by: ref('User'), note: String }], // append-only
  consultation: { summary: String, recordedBy: ref('User'), recordedAt: Date }, ...archive,
}, opts);
// Populated objects like Mongoose .populate() would give.
apptSchema.virtual('patient', { ref: 'User', localField: 'patientId', foreignField: '_id', justOne: true });
apptSchema.virtual('provider', { ref: 'Provider', localField: 'providerId', foreignField: '_id', justOne: true });
apptSchema.virtual('service', { ref: 'Service', localField: 'serviceId', foreignField: '_id', justOne: true });
// DB-level protection against double booking: Cancelled and No Show do not occupy a slot.
apptSchema.index({ providerId: 1, date: 1, startTime: 1 }, { unique: true,
  partialFilterExpression: { status: { $in: ['Pending', 'Confirmed', 'Checked In', 'In Consultation', 'Completed'] } } });
const Appointment = model('Appointment', apptSchema);

const Notification = model('Notification', new Schema({
  userId: { ...ref('User'), required: true }, type: String, title: String, message: String,
  relatedAppointmentId: ref('Appointment'), isRead: { type: Boolean, default: false },
}, opts));

module.exports = { User, Service, Provider, Schedule, Appointment, Notification };
