// BookAppointmentPage.js - the 5-step booking wizard. ONE useState object holds every choice.
// Patient: Service & Physician, Date & Time, Details, Review, Confirmation. ?serviceId= and ?providerId= preselect.
// Staff (staff prop, "Create appointment"): Select Patient (avatar cards, 10 per page), Service & Physician, Date & Time, Review, Confirmation. A Walk-in switch
// books today's free slot and creates the appointment already Arrived (stored as "Checked In"). Staff-created appointments are Confirmed immediately.
import { useEffect, useState } from 'react';
import { Alert, Button, Card, DatePicker, Descriptions, Form, Grid, Input, Progress, Radio, Result, Select, Steps, Switch, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import serviceService from '../../services/serviceService';
import providerService from '../../services/providerService';
import appointmentService from '../../services/appointmentService';
import patientService from '../../services/patientService';
import useFetch from '../../hooks/useFetch';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import AppPagination, { PAGE_SIZE } from '../../components/common/AppPagination';
import PatientCard from '../../components/patients/PatientCard';
import StatusBadge from '../../components/common/StatusBadge';
import TimeSlotPicker from '../../components/appointments/TimeSlotPicker';
import handleApiError from '../../utils/handleApiError';
import { baseSlots, addMinutes } from '../../utils/slotUtils';
import { LIMITS } from '../../utils/appointmentRules';
import { textProblem } from '../../utils/validators';
import { formatLong, formatTimeRange, parseDate, toDateString, todayString } from '../../utils/dateUtils';
import { fullName } from '../../utils/formatters';

const KEYS = { patient: ['service', 'time', 'details', 'review', 'done'], staff: ['patient', 'service', 'time', 'review', 'done'] };
const TEXT = {
  patient: ['Select Patient', 'Search for the patient, then say whether they are walking in.'], service: ['Service & Physician', 'Pick a service, then a physician.'],
  time: ['Date & Time', 'Pick a day, then an available time.'], details: ['Details', 'Tell us why you are coming.'], review: ['Review', 'Check everything before you submit.'], done: ['Confirmation', ''],
};
const FRESH = { step: 0, patientId: null, patient: null, walkIn: false, serviceId: null, providerId: null, date: null, startTime: null, reason: '', notes: '', done: null };
const SLOT_ERRORS = ['SLOT_UNAVAILABLE', 'PATIENT_CONFLICT']; // the chosen time no longer works: back to the time step

export default function BookAppointmentPage({ staff }) {
  const [params] = useSearchParams(), navigate = useNavigate(), wide = !!Grid.useBreakpoint().sm, keys = KEYS[staff ? 'staff' : 'patient'];
  const walkInStart = !!staff && params.get('walkIn') === '1';
  const [sel, setSel] = useState({ ...FRESH, serviceId: params.get('serviceId'), providerId: params.get('providerId'), walkIn: walkInStart, date: walkInStart ? todayString() : null });
  const [busy, setBusy] = useState(false), [problem, setProblem] = useState(''), [slotError, setSlotError] = useState(''), [query, setQuery] = useState(''), [term, setTerm] = useState(''), [pPage, setPPage] = useState(1);
  const set = (patch) => setSel((s) => ({ ...s, ...patch }));
  const key = keys[sel.step];
  const reasonProblem = key === 'details' && problem ? problem : textProblem(sel.reason, 5, 300, sel.reason.length > 0); // the reason is checked while typing
  useEffect(() => { const t = setTimeout(() => { setTerm(query.trim()); setPPage(1); }, 300); return () => clearTimeout(t); }, [query]); // search as you type, from page 1

  const lists = useFetch(() => Promise.all([serviceService.list(), providerService.list()]), []);
  const found = useFetch(() => (staff ? patientService.list({ search: term || undefined, status: 'active', page: pPage, limit: PAGE_SIZE }) : Promise.resolve(null)), [term, pPage]);
  const services = (lists.data && lists.data[0]) || [], providers = (lists.data && lists.data[1]) || [];
  const service = services.find((s) => s._id === sel.serviceId), provider = providers.find((p) => p._id === sel.providerId);
  const offering = providers.filter((p) => (p.services || []).some((s) => s._id === sel.serviceId));
  const sched = useFetch(() => (sel.providerId ? providerService.get(sel.providerId) : Promise.resolve(null)), [sel.providerId]);
  const open = useFetch(() => (provider && service && sel.date ? providerService.slots(provider._id, service._id, sel.date, sel.walkIn ? { walkIn: true } : undefined) : Promise.resolve(null)), [sel.providerId, sel.serviceId, sel.date, sel.walkIn]);
  const tpl = (sched.data && sched.data.schedule && sched.data.schedule.weeklyTemplate) || [];
  const allSlots = sel.date && service ? baseSlots({ weeklyTemplate: tpl }, sel.date, service.durationMinutes) : [];

  const next = () => {
    let msg = '';
    if (key === 'patient' && !sel.patientId) msg = 'Select a patient.';
    if (key === 'service' && (!sel.serviceId || !sel.providerId)) msg = !sel.serviceId ? 'Select a service.' : 'Select a physician.';
    if (key === 'time' && !sel.date) msg = 'Select a date.';
    else if (key === 'time' && !sel.startTime) msg = 'Select a time slot.';
    if (key === 'details' && !(sel.reason.trim().length >= 5 && sel.reason.length <= 300)) msg = 'Reason must be 5 to 300 characters.';
    setProblem(msg); if (!msg) { setSlotError(''); set({ step: sel.step + 1 }); }
  };
  const back = () => { setProblem(''); set({ step: sel.step - 1 }); };
  const confirm = async () => {
    setBusy(true);
    try {
      const body = { providerId: sel.providerId, serviceId: sel.serviceId, date: sel.date, startTime: sel.startTime, reason: sel.reason.trim(), notes: sel.notes.trim(), ...(staff ? { patientId: sel.patientId, isWalkIn: sel.walkIn } : {}) };
      set({ done: await appointmentService.create(body), step: keys.indexOf('done') });
    } catch (e) {
      if (SLOT_ERRORS.includes(e.code)) { setSlotError(e.message); set({ step: keys.indexOf('time'), startTime: null }); open.reload(); } // someone else took it: back to the time step
      else handleApiError(e);
    }
    setBusy(false);
  };
  const toggleWalkIn = (on) => { setProblem(''); setSlotError(''); set({ walkIn: on, date: on ? todayString() : null, startTime: null }); };
  const summary = (
    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" items={[
      ...(staff ? [{ label: 'Patient', children: sel.patient && fullName(sel.patient) }, { label: 'Visit type', children: sel.walkIn ? 'Walk-in (today)' : 'Scheduled' }] : []),
      { label: 'Service', children: service && `${service.name} (${service.durationMinutes} min)` }, { label: 'Physician', children: provider && `Dr. ${provider.user.firstName} ${provider.user.lastName}` },
      { label: 'Date', children: sel.date && formatLong(sel.date) }, { label: 'Time', children: sel.startTime && formatTimeRange(sel.startTime, addMinutes(sel.startTime, service.durationMinutes)) },
      { label: 'Reason', span: 2, children: sel.reason || '—' }, { label: 'Notes', span: 2, children: sel.notes || '—' }]} />
  );
  const a = sel.done;
  return (
    <>
      <PageHeader title={staff ? 'Create Appointment' : 'Book Appointment'} description={staff ? 'Book for a patient, or register a walk-in.' : 'Request an appointment in five simple steps.'} />
      <AsyncBoundary loading={lists.loading} error={lists.error} onRetry={lists.reload} loadingText="Loading services and physicians...">
        {wide ? <Steps current={sel.step} items={keys.map((k) => ({ title: TEXT[k][0] }))} style={{ marginBottom: 24 }} />
          : <div style={{ marginBottom: 16 }}><Typography.Text strong>Step {sel.step + 1} of 5: {TEXT[key][0]}</Typography.Text><Progress steps={5} percent={(sel.step + 1) * 20} showInfo={false} /></div>}
        <Card>
          {key !== 'done' && <><Typography.Title level={5} style={{ marginTop: 0 }}>{TEXT[key][0]}</Typography.Title><Typography.Paragraph type="secondary">{TEXT[key][1]}</Typography.Paragraph></>}

          {key === 'patient' && <>
            <Input allowClear prefix={<SearchOutlined />} placeholder="Search by name, email or phone" aria-label="Search patients" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 450, marginBottom: 16 }} />
            <AsyncBoundary loading={found.loading} error={found.error} onRetry={found.reload} loadingText="Searching patients..." empty={!(found.data && found.data.patients.length)} emptyText="No patients found." emptyHint="Try another name, or add the patient first.">
              <div className="patient-grid" role="radiogroup" aria-label="Patients">
                {((found.data && found.data.patients) || []).map((p) => (
                  <PatientCard key={p._id} patient={p} selected={sel.patientId === p._id} onSelect={(x) => { setProblem(''); set({ patientId: x._id, patient: x }); }} />))}
              </div>
              <AppPagination total={found.data ? found.data.total : 0} page={pPage} onChange={setPPage} />
            </AsyncBoundary>
            {sel.patient && <Typography.Text style={{ display: 'block', marginTop: 4 }}>Selected: <strong>{fullName(sel.patient)}</strong></Typography.Text>}
            {problem === 'Select a patient.' && <Typography.Text type="danger" style={{ display: 'block', marginTop: 8 }}>{problem}</Typography.Text>}
            <Typography.Paragraph style={{ marginTop: 12 }}>Patient not listed? <Link to="/staff/patients?add=1">Add a patient</Link> first.</Typography.Paragraph>
            <div style={{ marginTop: 8 }}>
              <Switch id="walk-in" checked={sel.walkIn} onChange={toggleWalkIn} /> <label htmlFor="walk-in" style={{ marginLeft: 8 }}>Walk-in patient, today only</label>
              <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4 }}>The patient is here now. The appointment is created as Arrived.</Typography.Text>
            </div>
          </>}

          {key === 'service' && <>
            <Form layout="vertical"><Form.Item label="Service" required validateStatus={problem === 'Select a service.' ? 'error' : undefined} help={problem === 'Select a service.' ? problem : undefined}>
              <Select showSearch optionFilterProp="label" placeholder="Choose a service" value={sel.serviceId} onChange={(v) => set({ serviceId: v, providerId: providers.some((p) => p._id === sel.providerId && (p.services || []).some((s) => s._id === v)) ? sel.providerId : null, date: sel.walkIn ? sel.date : null, startTime: null })}
                options={services.map((s) => ({ value: s._id, label: `${s.name} · ${s.category} · ${s.durationMinutes} min` }))} /></Form.Item></Form>
            <Typography.Text strong>Physician</Typography.Text>
            {!sel.serviceId ? <Typography.Paragraph type="secondary">Select a service first. Only physicians who offer it are shown.</Typography.Paragraph> : (
              <Radio.Group value={sel.providerId} onChange={(e) => set({ providerId: e.target.value, date: sel.walkIn ? sel.date : null, startTime: null })} style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {offering.map((p) => <Radio key={p._id} value={p._id} style={{ border: '1px solid #E3EAF0', borderRadius: 6, padding: 12 }}>Dr. {p.user.firstName} {p.user.lastName} <Typography.Text type="secondary">· {p.specialization}</Typography.Text></Radio>)}
              </Radio.Group>)}
            {problem === 'Select a physician.' && <Typography.Text type="danger">{problem}</Typography.Text>}
          </>}

          {key === 'time' && <>
            {slotError && <Alert type="error" showIcon message={slotError} style={{ marginBottom: 16 }} />}
            {sel.walkIn ? <Alert type="info" showIcon style={{ marginBottom: 16 }} message={`Walk-in: today, ${formatLong(sel.date)}`} description="All of today's free times for this physician are shown." />
              : <Form layout="vertical"><Form.Item label="Date" required help={`Appointments can be booked up to ${LIMITS.WINDOW_DAYS} days ahead and at least 1 hour in advance.`} validateStatus={problem === 'Select a date.' ? 'error' : undefined}>
                <DatePicker style={{ width: '100%', maxWidth: 320 }} format="MMMM D, YYYY" value={sel.date ? parseDate(sel.date) : null} onChange={(d) => { setSlotError(''); setProblem(''); set({ date: d ? toDateString(d) : null, startTime: null }); }}
                  disabledDate={(d) => d.isBefore(dayjs().startOf('day')) || d.isAfter(dayjs().add(LIMITS.WINDOW_DAYS, 'day').endOf('day')) || !tpl.some((x) => x.day === d.day())} /></Form.Item></Form>}
            {sel.date && <AsyncBoundary loading={open.loading || sched.loading} error={open.error} onRetry={open.reload} loadingText="Loading times...">
              <TimeSlotPicker slots={allSlots} available={open.data || []} value={sel.startTime} onChange={(t) => { setProblem(''); set({ startTime: t }); }} /></AsyncBoundary>}
            {problem && problem !== 'Select a service.' && problem !== 'Select a patient.' && key === 'time' && <Typography.Text type="danger" style={{ display: 'block', marginTop: 8 }}>{problem}</Typography.Text>}
          </>}

          {key === 'details' && <Form layout="vertical">
            <Form.Item label="Reason for your visit" required validateStatus={reasonProblem ? 'error' : undefined} help={reasonProblem || undefined}><Input.TextArea rows={4} showCount maxLength={300} value={sel.reason} onChange={(e) => { setProblem(''); set({ reason: e.target.value }); }} /></Form.Item>
            <Form.Item label="Notes (optional)"><Input.TextArea rows={3} showCount maxLength={300} value={sel.notes} onChange={(e) => set({ notes: e.target.value })} /></Form.Item></Form>}

          {key === 'review' && <>
            {slotError && <Alert type="error" showIcon message={slotError} style={{ marginBottom: 16 }} />}
            {staff && <Form layout="vertical" style={{ marginBottom: 8 }}>
              <Form.Item label="Reason (optional)"><Input.TextArea rows={2} showCount maxLength={300} value={sel.reason} onChange={(e) => set({ reason: e.target.value })} /></Form.Item>
              <Form.Item label="Notes (optional)"><Input.TextArea rows={2} showCount maxLength={300} value={sel.notes} onChange={(e) => set({ notes: e.target.value })} /></Form.Item></Form>}
            {summary}
            <Alert style={{ marginTop: 16 }} type="info" showIcon message={!staff ? 'Your request stays Pending until the health center confirms it.' : sel.walkIn ? 'The appointment is created as Arrived and the physician is notified.' : 'The appointment is Confirmed immediately and the patient is notified.'} />
          </>}

          {key === 'done' && a && <Result status="success" title={staff ? 'Appointment created' : 'Appointment request submitted'} subTitle={`${staff ? 'The' : 'Your'} reference number is ${a.referenceNo}`}
            extra={[<Button key="v" type="primary" onClick={() => navigate(`/${staff ? 'staff' : 'patient'}/appointments/${a._id}`)}>View Appointment</Button>, <Button key="n" onClick={() => setSel({ ...FRESH })}>{staff ? 'Create Another' : 'Book Another'}</Button>]}>
            {summary}<div style={{ margin: '16px 0 8px' }}><Typography.Text strong>Status: </Typography.Text><StatusBadge status={a.status} /></div>
            <Typography.Text strong>What happens next</Typography.Text>
            {!staff ? <ul style={{ marginTop: 4 }}><li>Staff will review and confirm your request.</li><li>You will see the update in Notifications.</li><li>Arrive 10 minutes early and bring a valid ID.</li><li>You can cancel online up to 24 hours before your visit.</li></ul>
              : a.isWalkIn ? <ul style={{ marginTop: 4 }}><li>The patient is marked as Arrived and the physician has been notified.</li><li>Open the appointment to follow its progress.</li></ul>
              : <ul style={{ marginTop: 4 }}><li>The patient was notified in their Notifications.</li><li>Remind the patient to arrive 10 minutes early with a valid ID.</li></ul>}</Result>}

          {key !== 'done' && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginTop: 24, paddingTop: 16, borderTop: '1px solid #E3EAF0' }}>
            {sel.step > 0 ? <Button onClick={back} disabled={busy}>{key === 'review' ? 'Go Back to Edit' : 'Back'}</Button> : <span />}
            {key !== 'review' ? <Button type="primary" onClick={next}>Next</Button> : <Button type="primary" loading={busy} disabled={busy} onClick={confirm}>{staff ? 'Create Appointment' : 'Confirm Appointment'}</Button>}
          </div>}
        </Card>
      </AsyncBoundary>
    </>
  );
}