// AppointmentsListPage.js - the appointments table for receptionist, admin and doctor (the API returns only what each role may see).
// Receptionist and admin get filters (status, date, service). The doctor gets Today / Upcoming / History tabs.
import { useState } from 'react';
import { Button, DatePicker, Input, Select, Space, Table, Tabs, Tag, Typography, Alert } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import appointmentService from '../../services/appointmentService';
import serviceService from '../../services/serviceService';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import StatusBadge from '../../components/common/StatusBadge';
import AppointmentActions from '../../components/appointments/AppointmentActions';
import { ACTIVE_STATUSES } from '../../utils/appointmentRules';
import { formatLong, formatTimeRange, parseDate, toDateString, todayString } from '../../utils/dateUtils';
import { apptDoctor, fullName } from '../../utils/formatters';
import { APPOINTMENT_STATUS } from '../../config/constants';

const DOCTOR_TABS = { today: ['Today', (a) => a.date === todayString()], upcoming: ['Upcoming', (a) => a.date > todayString() && ACTIVE_STATUSES.includes(a.status)], history: ['History', (a) => a.date < todayString() || ['Completed', 'Cancelled', 'No Show'].includes(a.status)] };

export default function AppointmentsListPage() {
  const { user } = useAuth(), { pathname } = useLocation(), navigate = useNavigate(), isDoctor = user.role === 'doctor';
  // Links such as "View these appointments" (Archive blocked) arrive with ?providerId=, ?patientId=, ?serviceId=, ?status= or ?date=.
  const [params, setParams] = useSearchParams(), fixed = { providerId: params.get('providerId') || undefined, patientId: params.get('patientId') || undefined };
  const [f, setF] = useState({ status: params.get('status') || undefined, date: params.get('date') || undefined, serviceId: params.get('serviceId') || undefined }), [q, setQ] = useState(''), [tab, setTab] = useState('today');
  const list = useFetch(() => appointmentService.list(isDoctor ? undefined : { ...f, ...fixed }), [f.status, f.date, f.serviceId, fixed.providerId, fixed.patientId]);
  const services = useFetch(() => serviceService.list(), []);
  const term = q.trim().toLowerCase();
  const rows = (list.data || []).filter((a) => (!isDoctor || DOCTOR_TABS[tab][1](a)) && (!term || [a.referenceNo, fullName(a.patient), a.service && a.service.name, apptDoctor(a)].join(' ').toLowerCase().includes(term)))
    .sort((x, y) => (`${x.date} ${x.startTime}` < `${y.date} ${y.startTime}` ? -1 : 1) * (isDoctor && tab === 'history' ? -1 : 1));
  const open = (a) => navigate(`${pathname.replace(/\/$/, '')}/${a._id}`);
  const columns = [
    { title: 'Reference', dataIndex: 'referenceNo' }, { title: 'Patient', render: (_, a) => fullName(a.patient) },
    ...(isDoctor ? [] : [{ title: 'Provider', render: (_, a) => apptDoctor(a) }]), { title: 'Service', render: (_, a) => a.service && a.service.name },
    { title: 'Date and time', render: (_, a) => <><div>{formatLong(a.date)}</div><Typography.Text type="secondary">{formatTimeRange(a.startTime, a.endTime)}</Typography.Text></> },
    { title: 'Status', render: (_, a) => <Space direction="vertical" size={4}><StatusBadge status={a.status} />{a.reschedulePending && a.reschedulePending.date && <Tag color="warning" style={{ margin: 0 }}>Reschedule requested</Tag>}</Space> },
    { title: 'Actions', align: 'right', render: (_, a) => <Space wrap size={4} style={{ justifyContent: 'flex-end' }}><Button type="link" size="small" onClick={() => open(a)}>View</Button><AppointmentActions compact appointment={a} onDone={list.reload} onOpen={open} /></Space> },
  ];
  return (
    <>
      <PageHeader title="Appointments" description="Manage and track all patient appointments." actions={user.role === 'receptionist' && <><Button onClick={() => setF({ ...f, date: todayString() })}>Today</Button><Link to="/staff/appointments/create"><Button type="primary">Create appointment</Button></Link></>} />
      {isDoctor && <Tabs activeKey={tab} onChange={setTab} items={Object.entries(DOCTOR_TABS).map(([k, [label, test]]) => ({ key: k, label: `${label} (${(list.data || []).filter(test).length})` }))} />}
      <Space wrap style={{ marginBottom: 16 }}>
        <Input allowClear prefix={<SearchOutlined />} placeholder="Search by reference, patient or service" aria-label="Search appointments" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 300 }} />
        {!isDoctor && <>
          <Select allowClear placeholder="Status" aria-label="Filter by status" style={{ width: 160 }} value={f.status} onChange={(v) => setF({ ...f, status: v })} options={Object.values(APPOINTMENT_STATUS).map((s) => ({ value: s, label: s }))} />
          <DatePicker placeholder="Date" aria-label="Filter by date" format="MMMM D, YYYY" value={f.date ? parseDate(f.date) : null} onChange={(d) => setF({ ...f, date: d ? toDateString(d) : undefined })} />
          <Select allowClear placeholder="Service" aria-label="Filter by service" style={{ width: 200 }} value={f.serviceId} onChange={(v) => setF({ ...f, serviceId: v })} options={(services.data || []).map((s) => ({ value: s._id, label: s.name }))} />
          {(f.status || f.date || f.serviceId || q || fixed.providerId || fixed.patientId) && <Button type="link" onClick={() => { setF({ status: undefined, date: undefined, serviceId: undefined }); setQ(''); setParams({}); }}>Clear filters</Button>}
        </>}
      </Space>
      {(fixed.providerId || fixed.patientId) && <Alert type="info" showIcon style={{ marginBottom: 16 }} message={`Showing appointments for one ${fixed.providerId ? 'provider' : 'patient'}.`} action={<Button size="small" onClick={() => setParams({})}>Show all</Button>} />}
      <AsyncBoundary loading={list.loading} error={list.error} onRetry={list.reload} loadingText="Loading appointments..." empty={!rows.length} emptyText="No appointments found." emptyHint="Try a different filter or search.">
        <Table rowKey="_id" columns={columns} dataSource={rows} scroll={{ x: 'max-content' }} pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }} />
      </AsyncBoundary>
    </>
  );
}
