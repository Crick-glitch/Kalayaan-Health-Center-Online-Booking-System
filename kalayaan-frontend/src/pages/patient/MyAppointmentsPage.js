// MyAppointmentsPage.js - the patient's appointments in tabs (Upcoming, Pending, Completed, Cancelled, All) with search and cancel.
import { useState } from 'react';
import { Button, Input, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import { CalendarOutlined, CloseOutlined, SearchOutlined, SwapOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import appointmentService from '../../services/appointmentService';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import { tablePager } from '../../components/common/AppPagination';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import RescheduleModal from '../../components/appointments/RescheduleModal';
import handleApiError from '../../utils/handleApiError';
import { getAvailableActions } from '../../utils/appointmentRules';
import { formatLong, formatTimeRange } from '../../utils/dateUtils';
import { apptDoctor } from '../../utils/formatters';

const TABS = [['upcoming', 'Upcoming'], ['pending', 'Pending'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['all', 'All']];
const inTab = (a, t) => t === 'all' || (t === 'upcoming' && ['Confirmed', 'Checked In', 'In Consultation'].includes(a.status)) || (t === 'pending' && a.status === 'Pending') || (t === 'completed' && a.status === 'Completed') || (t === 'cancelled' && ['Cancelled', 'No Show'].includes(a.status));

export default function MyAppointmentsPage() {
  const { user } = useAuth(), navigate = useNavigate(), { data, loading, error, reload } = useFetch(() => appointmentService.list(), []);
  const [tab, setTab] = useState('upcoming'), [q, setQ] = useState(''), [cancelFor, setCancelFor] = useState(null), [reschedFor, setReschedFor] = useState(null);
  const all = data || [], term = q.trim().toLowerCase();
  const rows = all.filter((a) => inTab(a, tab) && (!term || [a.referenceNo, a.service && a.service.name, apptDoctor(a)].join(' ').toLowerCase().includes(term)))
    .sort((a, b) => (`${a.date} ${a.startTime}` < `${b.date} ${b.startTime}` ? -1 : 1) * (tab === 'upcoming' || tab === 'pending' ? 1 : -1));
  const doCancel = async (reason) => {
    try { await appointmentService.setStatus(cancelFor._id, { status: 'Cancelled', reason }); message.success('Appointment cancelled.'); } catch (e) { handleApiError(e); }
    setCancelFor(null); reload();
  };
  const columns = [
    { title: 'Reference', dataIndex: 'referenceNo' }, { title: 'Physician', render: (_, a) => apptDoctor(a) }, { title: 'Service', render: (_, a) => a.service && a.service.name },
    { title: 'Date and time', render: (_, a) => <><div>{formatLong(a.date)}</div><Typography.Text type="secondary">{formatTimeRange(a.startTime, a.endTime)}</Typography.Text></> },
    { title: 'Status', render: (_, a) => <Space size={4} wrap><StatusBadge status={a.status} />{a.reschedulePending && a.reschedulePending.date && <Tag color="warning" style={{ margin: 0 }}>Reschedule requested</Tag>}</Space> },
    { title: 'Actions', align: 'right', render: (_, a) => <Space><Button type="link" onClick={() => navigate(`/patient/appointments/${a._id}`)}>View</Button>
      {getAvailableActions(a, user).includes('requestReschedule') && <Button type="link" icon={<SwapOutlined />} onClick={() => setReschedFor(a)}>Reschedule</Button>}
      {getAvailableActions(a, user).includes('cancel') && <Button type="link" danger icon={<CloseOutlined />} onClick={() => setCancelFor(a)}>Cancel</Button>}</Space> },
  ];
  return (
    <>
      <PageHeader title="My Appointments" description="Track and manage your bookings." actions={<><Link to="/patient/services"><Button>View services</Button></Link><Link to="/patient/book-appointment"><Button type="primary" icon={<CalendarOutlined />}>Book Appointment</Button></Link></>} />
      <Tabs activeKey={tab} onChange={setTab} items={TABS.map(([k, l]) => ({ key: k, label: `${l} (${all.filter((a) => inTab(a, k)).length})` }))} />
      <Input allowClear prefix={<SearchOutlined />} placeholder="Search by reference, service or physician" aria-label="Search appointments" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320, marginBottom: 16 }} />
      <AsyncBoundary loading={loading} error={error} onRetry={reload} loadingText="Loading appointments..." empty={!rows.length}
        emptyText={q ? 'No appointments match your search.' : `No ${tab === 'all' ? '' : TABS.find((t) => t[0] === tab)[1].toLowerCase() + ' '}appointments.`} emptyHint={tab === 'upcoming' ? 'Book an appointment to see it here.' : undefined}
        emptyAction={tab === 'upcoming' && !q ? <Link to="/patient/book-appointment"><Button type="primary">Book Appointment</Button></Link> : undefined}>
        <Table rowKey="_id" columns={columns} dataSource={rows} scroll={{ x: 'max-content' }} pagination={tablePager(rows.length)} />
      </AsyncBoundary>
      <RescheduleModal appointment={reschedFor} open={!!reschedFor} onClose={() => setReschedFor(null)} onDone={() => { setReschedFor(null); reload(); }} />
      <ConfirmModal open={!!cancelFor} title="Cancel this appointment?" okText="Cancel appointment" danger requireReason onConfirm={doCancel} onCancel={() => setCancelFor(null)}>
        {cancelFor && <Typography.Text>{cancelFor.service && cancelFor.service.name} · {formatLong(cancelFor.date)} · {formatTimeRange(cancelFor.startTime, cancelFor.endTime)}</Typography.Text>}
      </ConfirmModal>
    </>
  );
}
