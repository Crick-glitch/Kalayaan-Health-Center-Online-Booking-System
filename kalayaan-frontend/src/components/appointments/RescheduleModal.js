// RescheduleModal.js - move a Confirmed appointment. Same date and time pickers as booking step 2.
// Patient (default): sends a REQUEST with a reason; the appointment stays as it is until staff apply it.
// Staff (direct): moves the appointment now, no reason needed, and the patient is notified.
// The API offers the appointment's own time again (appointmentId) and refuses a time that is taken or overlaps another visit.
import { useEffect, useState } from 'react';
import { Alert, DatePicker, Input, Modal, Typography, message } from 'antd';
import dayjs from 'dayjs';
import appointmentService from '../../services/appointmentService';
import providerService from '../../services/providerService';
import useFetch from '../../hooks/useFetch';
import AsyncBoundary from '../common/AsyncBoundary';
import TimeSlotPicker from './TimeSlotPicker';
import handleApiError from '../../utils/handleApiError';
import { baseSlots } from '../../utils/slotUtils';
import { LIMITS } from '../../utils/appointmentRules';
import { textProblem } from '../../utils/validators';
import { formatLong, formatTimeRange, parseDate, toDateString } from '../../utils/dateUtils';
import { fullName } from '../../utils/formatters';

const STALE = ['CUTOFF_PASSED', 'ALREADY_PENDING', 'INVALID_TRANSITION']; // the appointment changed meanwhile: close and refresh
const FRESH = { date: null, time: null, reason: '', errors: {}, banner: '' };

export default function RescheduleModal({ appointment: a, open, onClose, onDone, direct }) {
  const [s, setS] = useState(FRESH), [busy, setBusy] = useState(false), set = (patch) => setS((x) => ({ ...x, ...patch }));
  useEffect(() => { if (open) setS(FRESH); }, [open]);
  const sched = useFetch(() => (open && a ? providerService.get(a.providerId) : Promise.resolve(null)), [open, a && a.providerId]);
  const slots = useFetch(() => (open && a && s.date ? providerService.slots(a.providerId, a.serviceId, s.date, { appointmentId: a._id }) : Promise.resolve(null)), [open, s.date]);
  const reasonProblem = s.errors.reason || textProblem(s.reason, 5, 300, s.reason.length > 0); // checked while typing
  const tpl = (sched.data && sched.data.schedule && sched.data.schedule.weeklyTemplate) || [];
  const all = a && s.date ? baseSlots({ weeklyTemplate: tpl }, s.date, a.service.durationMinutes) : [];

  const submit = async () => {
    const errors = {};
    if (!s.date) errors.date = 'Select a date.'; else if (!s.time) errors.time = 'Select a time slot.';
    if (!direct && !(s.reason.trim().length >= 5 && s.reason.length <= 300)) errors.reason = 'Reason must be 5 to 300 characters.';
    if (Object.keys(errors).length) { set({ errors }); return; }
    setBusy(true);
    try {
      if (direct) await appointmentService.reschedule(a._id, { action: 'reschedule', date: s.date, startTime: s.time });
      else await appointmentService.requestReschedule(a._id, { date: s.date, startTime: s.time, reason: s.reason.trim() });
      message.success(direct ? 'Appointment rescheduled. The patient was notified.' : 'Reschedule request sent. Staff will review it.'); onDone();
    } catch (e) {
      if (e.code === 'SLOT_UNAVAILABLE' || e.code === 'PATIENT_CONFLICT') { set({ banner: e.message, time: null }); slots.reload(); }
      else if (STALE.includes(e.code)) { handleApiError(e); onDone(); }
      else if (e.fieldErrors) set({ errors: { date: e.fieldErrors.date, time: e.fieldErrors.startTime, reason: e.fieldErrors.reason } });
      else handleApiError(e);
    }
    setBusy(false);
  };
  return (
    <Modal open={open} title={direct ? 'Reschedule appointment' : 'Request a reschedule'} okText={direct ? 'Reschedule' : 'Send request'} confirmLoading={busy} width={520} maskClosable={false} onOk={submit} onCancel={busy ? undefined : onClose}>
      {a && <>
        <Typography.Paragraph>{direct && <>{fullName(a.patient)} · </>}Current visit: <strong>{a.service.name}</strong> · {formatLong(a.date)} · {formatTimeRange(a.startTime, a.endTime)}</Typography.Paragraph>
        <Alert type="info" showIcon style={{ marginBottom: 16 }} message={direct ? (a.reschedulePending && a.reschedulePending.date ? 'This replaces the patient\'s pending request. The patient is notified of the new time.' : 'The patient is notified of the new time.') : 'Your current time stays until the health center approves the new one.'} />
        {s.banner && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={s.banner} />}
        <label htmlFor="resched-date"><span style={{ color: '#C0392B' }}>* </span>New date</label>
        <DatePicker id="resched-date" style={{ width: '100%', maxWidth: 320, display: 'block', marginBottom: 4 }} format="MMMM D, YYYY" status={s.errors.date ? 'error' : undefined}
          value={s.date ? parseDate(s.date) : null} onChange={(d) => set({ date: d ? toDateString(d) : null, time: null, banner: '', errors: {} })}
          disabledDate={(d) => d.isBefore(dayjs().startOf('day')) || d.isAfter(dayjs().add(LIMITS.WINDOW_DAYS, 'day').endOf('day')) || !tpl.some((x) => x.day === d.day())} />
        {s.errors.date && <Typography.Text type="danger">{s.errors.date}</Typography.Text>}
        {s.date && <div style={{ marginTop: 12 }}>
          <AsyncBoundary loading={slots.loading || sched.loading} error={slots.error} onRetry={slots.reload} loadingText="Loading times...">
            <TimeSlotPicker slots={all} available={slots.data || []} value={s.time} onChange={(t) => set({ time: t, banner: '', errors: { ...s.errors, time: undefined } })} />
          </AsyncBoundary>
          {s.errors.time && <Typography.Text type="danger">{s.errors.time}</Typography.Text>}
        </div>}
        {!direct && <div style={{ marginTop: 16 }}>
          <label htmlFor="resched-reason"><span style={{ color: '#C0392B' }}>* </span>Reason for the change</label>
          <Input.TextArea id="resched-reason" rows={3} showCount maxLength={300} value={s.reason} status={reasonProblem ? 'error' : undefined} onChange={(e) => set({ reason: e.target.value, errors: { ...s.errors, reason: undefined } })} />
          {reasonProblem && <Typography.Text type="danger">{reasonProblem}</Typography.Text>}
        </div>}
      </>}
    </Modal>
  );
}
