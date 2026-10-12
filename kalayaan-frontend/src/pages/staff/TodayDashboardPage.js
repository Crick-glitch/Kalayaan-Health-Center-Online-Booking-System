// TodayDashboardPage.js - the receptionist's and the doctor's dashboard: today's counters and today's queue with inline actions.
// variant="receptionist": Today, Pending, Confirmed, Checked in, Completed, Cancelled. variant="doctor": Today, Upcoming, Checked in, Completed today.
import { Alert, Button, Card, Col, Row, Space, Statistic, Table, Typography } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import appointmentService from '../../services/appointmentService';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import StatusBadge from '../../components/common/StatusBadge';
import AppointmentActions from '../../components/appointments/AppointmentActions';
import { ACTIVE_STATUSES } from '../../utils/appointmentRules';
import { formatLong, formatTime, todayString } from '../../utils/dateUtils';
import { apptDoctor, fullName } from '../../utils/formatters';
import { formatCount } from '../../utils/formatters';

export default function TodayDashboardPage({ variant }) {
  const { user } = useAuth(), navigate = useNavigate(), doctor = variant === 'doctor', today = todayString();
  const { data, loading, error, reload } = useFetch(() => appointmentService.list(doctor ? undefined : { date: today }), []);
  const all = data || [], todays = all.filter((a) => a.date === today).sort((x, y) => (x.startTime < y.startTime ? -1 : 1));
  const n = (s) => todays.filter((a) => a.status === s).length;
  const stats = doctor
    ? [['Today', todays.length], ['Upcoming', all.filter((a) => a.date > today && ACTIVE_STATUSES.includes(a.status)).length], ['Checked in', n('Checked In')], ['Completed today', n('Completed')]]
    : [['Today', todays.length], ['Pending', n('Pending')], ['Confirmed', n('Confirmed')], ['Checked in', n('Checked In')], ['Completed', n('Completed')], ['Cancelled', n('Cancelled')]];
  const current = todays.find((a) => a.status === 'In Consultation'), waiting = n('Checked In');
  const open = (a) => navigate(`/${doctor ? 'doctor' : 'staff'}/appointments/${a._id}`);
  const columns = [
    { title: 'Time', render: (_, a) => formatTime(a.startTime) }, { title: 'Patient', render: (_, a) => fullName(a.patient) },
    ...(doctor ? [] : [{ title: 'Provider', render: (_, a) => apptDoctor(a) }]), { title: 'Service', render: (_, a) => a.service && a.service.name },
    { title: 'Status', render: (_, a) => <StatusBadge status={a.status} /> },
    { title: 'Actions', align: 'right', render: (_, a) => <Space size={4} wrap style={{ justifyContent: 'flex-end' }}><Button type="link" size="small" onClick={() => open(a)}>View</Button><AppointmentActions compact appointment={a} onDone={reload} onOpen={open} /></Space> },
  ];
  return (
    <>
      <PageHeader title={doctor ? "Today's schedule" : 'Dashboard'} description={`${doctor ? `Dr. ${user.lastName} · ` : 'Today, '}${formatLong(today)}`}
        actions={doctor ? <><Link to="/doctor/schedule"><Button>My schedule</Button></Link><Link to="/doctor/appointments"><Button>Appointments</Button></Link></> : <><Link to="/staff/appointments"><Button>Appointments</Button></Link><Link to="/staff/appointments/create?walkIn=1"><Button>Walk-in</Button></Link><Link to="/staff/appointments/create"><Button type="primary">Create appointment</Button></Link></>} />
      <AsyncBoundary loading={loading} error={error} onRetry={reload} loadingText="Loading today's appointments...">
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>{stats.map(([label, v]) => <Col key={label} xs={12} md={doctor ? 6 : 8} xl={doctor ? 6 : 4}><Card size="small"><Statistic title={label} value={formatCount(v)} /></Card></Col>)}</Row>
        {doctor && waiting > 0 && <Alert type="info" showIcon style={{ marginBottom: 16 }} message={`${waiting} patient${waiting > 1 ? 's are' : ' is'} waiting.`} />}
        {doctor && <Card title="Current consultation" style={{ marginBottom: 16 }}>{current ? <><Typography.Text strong>{fullName(current.patient)}</Typography.Text> · {current.service && current.service.name}<div style={{ marginTop: 8 }}><Button type="primary" onClick={() => open(current)}>Continue consultation</Button></div></> : <Typography.Text type="secondary">No consultation in progress.</Typography.Text>}</Card>}
        <Typography.Title level={5} style={{ color: '#0B2545' }}>{doctor ? "Today's schedule" : "Today's queue"}</Typography.Title>
        <AsyncBoundary empty={!todays.length} emptyText="No appointments today." emptyHint="New bookings for today will appear here.">
          <Table rowKey="_id" columns={columns} dataSource={todays} scroll={{ x: 'max-content' }} pagination={false} />
        </AsyncBoundary>
      </AsyncBoundary>
    </>
  );
}
