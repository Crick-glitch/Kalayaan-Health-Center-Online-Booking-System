// AppointmentDetailsPage.js - ONE details page for every role (mounted at /patient, /staff, /doctor and /admin).
// Buttons come from AppointmentActions. Staff, doctors and admins also see the patient. The doctor completes the visit here.
import { useState } from 'react';
import { Alert, Button, Card, Col, Descriptions, Input, Row, Steps, Tag, Typography, message } from 'antd';
import { useParams } from 'react-router-dom';
import appointmentService from '../../services/appointmentService';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import StatusBadge from '../../components/common/StatusBadge';
import AppointmentTimeline from '../../components/appointments/AppointmentTimeline';
import AppointmentActions from '../../components/appointments/AppointmentActions';
import handleApiError from '../../utils/handleApiError';
import { getAvailableActions } from '../../utils/appointmentRules';
import { formatDateTime, formatLong, formatTime, formatTimeRange } from '../../utils/dateUtils';
import { apptDoctor, fullName } from '../../utils/formatters';
import { ROLE_PREFIX } from '../../config/constants';

const STRIP = ['Checked In', 'In Consultation', 'Completed']; // the doctor's three-step strip

export default function AppointmentDetailsPage() {
  const { id } = useParams(), { user } = useAuth(), isPatient = user.role === 'patient';
  const { data: a, loading, error, reload } = useFetch(() => appointmentService.get(id), [id]);
  const [summary, setSummary] = useState(''), [sumError, setSumError] = useState(''), [busy, setBusy] = useState(false);
  const actions = a ? getAvailableActions(a, user) : [], pending = a && a.reschedulePending && a.reschedulePending.date, p = a && a.patient;
  const complete = async () => {
    if (summary.trim().length < 10 || summary.length > 1000) { setSumError('Summary must be 10 to 1000 characters.'); return; }
    setBusy(true);
    try { await appointmentService.setStatus(a._id, { status: 'Completed', summary: summary.trim() }); message.success('Consultation completed.'); reload(); }
    catch (e) { if (e.fieldErrors && e.fieldErrors.summary) setSumError(e.fieldErrors.summary); else handleApiError(e); }
    setBusy(false);
  };
  return (
    <AsyncBoundary loading={loading} error={error} onRetry={reload} loadingText="Loading appointment..." empty={!a} emptyText="Appointment not found.">
      {a && <>
        <PageHeader breadcrumb={[{ label: isPatient ? 'My Appointments' : 'Appointments', to: `${ROLE_PREFIX[user.role]}/appointments` }, { label: a.referenceNo }]}
          title={<>{a.referenceNo} <StatusBadge status={a.status} />{pending && <Tag color="warning" style={{ marginLeft: 8 }}>Reschedule requested</Tag>}</>}
          description={`${a.service && a.service.name} with ${apptDoctor(a)}`} actions={<AppointmentActions appointment={a} onDone={reload} hide={['complete']} />} />
        {user.role === 'doctor' && STRIP.includes(a.status) && <Steps size="small" current={a.status === 'Completed' ? STRIP.length : STRIP.indexOf(a.status)} items={STRIP.map((s) => ({ title: s }))} style={{ marginBottom: 16 }} />}
        {pending && <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="Reschedule requested" description={`${isPatient ? 'You asked' : `${fullName(p)} asked`} to move this visit to ${formatLong(a.reschedulePending.date)} · ${formatTime(a.reschedulePending.startTime)}. ${a.reschedulePending.reason || ''}`} />}
        {isPatient && ['Pending', 'Confirmed'].includes(a.status) && !actions.includes('cancel') && <Alert type="info" showIcon style={{ marginBottom: 16 }} message="Appointments can be cancelled online up to 24 hours before the visit. Please contact the health center." />}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card title="Appointment" style={{ marginBottom: 16 }}><Descriptions column={{ xs: 1, sm: 2 }} items={[
              { label: 'Service', children: a.service && a.service.name }, { label: 'Provider', children: apptDoctor(a) }, { label: 'Date', children: formatLong(a.date) },
              { label: 'Time', children: formatTimeRange(a.startTime, a.endTime) }, { label: 'Duration', children: a.service && `${a.service.durationMinutes} min` }, { label: 'Type', children: a.isWalkIn ? 'Walk-in' : 'Online booking' }]} /></Card>
            {!isPatient && p && <Card title="Patient" style={{ marginBottom: 16 }}><Descriptions column={{ xs: 1, sm: 2 }} items={[
              { label: 'Name', children: fullName(p) }, { label: 'Date of birth', children: formatLong(p.dateOfBirth) }, { label: 'Sex', children: p.sex }, { label: 'Contact', children: p.contactNumber },
              { label: 'Email', children: p.email }, { label: 'Address', children: p.address }, { label: 'Emergency contact', span: 2, children: p.emergencyContact && `${p.emergencyContact.name} (${p.emergencyContact.relationship}) · ${p.emergencyContact.contactNumber}` }]} /></Card>}
            <Card title="Reason and notes" style={{ marginBottom: 16 }}><Descriptions column={{ xs: 1, sm: 2 }} items={[{ label: 'Reason', children: a.reason || '—' }, { label: 'Notes', children: a.notes || '—' }]} /></Card>
            {actions.includes('complete') && <Card title="Consultation summary" style={{ marginBottom: 16 }}>
              <label htmlFor="summary"><span style={{ color: '#C0392B' }}>* </span>Summary (10 to 1000 characters)</label>
              <Input.TextArea id="summary" rows={6} showCount maxLength={1000} value={summary} status={sumError ? 'error' : undefined} onChange={(e) => { setSummary(e.target.value); setSumError(''); }} />
              {sumError && <Typography.Text type="danger">{sumError}</Typography.Text>}
              <div style={{ textAlign: 'right', marginTop: 12 }}><Button type="primary" loading={busy} disabled={busy} onClick={complete}>Complete Consultation</Button></div></Card>}
            {a.status === 'Completed' && a.consultation && <Card title="Consultation summary"><Typography.Paragraph>{a.consultation.summary}</Typography.Paragraph><Typography.Text type="secondary">Recorded {formatDateTime(a.consultation.recordedAt)}</Typography.Text></Card>}
          </Col>
          <Col xs={24} lg={8}><Card title="Status history"><AppointmentTimeline history={a.statusHistory} /></Card></Col>
        </Row>
      </>}
    </AsyncBoundary>
  );
}
