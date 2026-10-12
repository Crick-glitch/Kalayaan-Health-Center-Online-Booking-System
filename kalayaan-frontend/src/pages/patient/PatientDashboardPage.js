// PatientDashboardPage.js - next appointment first, then quick actions, recent history and latest notifications.
import { useState } from 'react';
import { Alert, Button, Card, Col, List, Row, Space, Typography } from 'antd';
import { CalendarOutlined, SwapOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import appointmentService from '../../services/appointmentService';
import notificationService from '../../services/notificationService';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import StatusBadge from '../../components/common/StatusBadge';
import RescheduleModal from '../../components/appointments/RescheduleModal';
import { ACTIVE_STATUSES, getAvailableActions } from '../../utils/appointmentRules';
import { formatDateTime, formatLong, formatTimeRange, isToday, isTomorrow, todayString } from '../../utils/dateUtils';
import { apptDoctor } from '../../utils/formatters';

export default function PatientDashboardPage() {
  const { user } = useAuth(), { data, loading, error, reload } = useFetch(() => Promise.all([appointmentService.list(), notificationService.list()]), []);
  const [resched, setResched] = useState(false);
  const appts = (data && data[0]) || [], notes = ((data && data[1] && data[1].notifications) || []).slice(0, 3);
  const key = (a) => `${a.date} ${a.startTime}`;
  const next = appts.filter((a) => ACTIVE_STATUSES.includes(a.status) && a.date >= todayString()).sort((x, y) => (key(x) < key(y) ? -1 : 1))[0];
  const recent = appts.filter((a) => a.status === 'Completed').sort((x, y) => (key(x) < key(y) ? 1 : -1)).slice(0, 3);
  const hour = dayjs().hour(), greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <>
      <PageHeader title={`${greeting}, ${user.firstName}`} description={formatLong(todayString())} />
      <AsyncBoundary loading={loading} error={error} onRetry={reload} loadingText="Loading your dashboard...">
        <Row gutter={[16, 16]}>
          <Col xs={24} xxl={16}>
            {next && (isToday(next.date) || isTomorrow(next.date)) && <Alert type="info" showIcon style={{ marginBottom: 16 }} message={`Reminder: your appointment is ${isToday(next.date) ? 'today' : 'tomorrow'}.`} description="This reminder appears in the app." />}
            <Card title="Next appointment" style={{ marginBottom: 16 }}>
              {next ? <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}><div><Typography.Text type="secondary">{next.referenceNo}</Typography.Text><br /><Typography.Text strong style={{ fontSize: 16 }}>{next.service && next.service.name}</Typography.Text></div><StatusBadge status={next.status} /></div>
                <Typography.Paragraph style={{ margin: '12px 0' }}>{apptDoctor(next)}<br />{formatLong(next.date)} · {formatTimeRange(next.startTime, next.endTime)}</Typography.Paragraph>
                <Space wrap><Link to={`/patient/appointments/${next._id}`}><Button type="primary">View details</Button></Link>
                  {getAvailableActions(next, user).includes('requestReschedule') && <Button icon={<SwapOutlined />} onClick={() => setResched(true)}>Request reschedule</Button>}</Space>
                <RescheduleModal appointment={next} open={resched} onClose={() => setResched(false)} onDone={() => { setResched(false); reload(); }} />
              </> : <div style={{ textAlign: 'center', padding: 16 }}><Typography.Text strong>No upcoming appointments.</Typography.Text><br /><Typography.Text type="secondary">Book an appointment to see it here.</Typography.Text><div style={{ marginTop: 12 }}><Link to="/patient/book-appointment"><Button type="primary" icon={<CalendarOutlined />}>Book Appointment</Button></Link></div></div>}
            </Card>
            <Card size="small" style={{ marginBottom: 16 }}><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Link to="/patient/book-appointment"><Button type="primary" icon={<CalendarOutlined />}>Book Appointment</Button></Link><Link to="/patient/appointments"><Button>My Appointments</Button></Link></div></Card>
            <Card title="Recent history" className="kh-recent-history"><List locale={{ emptyText: 'No completed visits yet.' }} dataSource={recent} renderItem={(a) => (
              <List.Item extra={<StatusBadge status={a.status} />}><List.Item.Meta title={a.service && a.service.name} description={`${formatLong(a.date)} · ${apptDoctor(a)}`} /></List.Item>)} /></Card>
          </Col>
          <Col xs={24} xxl={8}><Card title="Latest notifications" extra={<Link to="/patient/notifications">View all</Link>}>
            <List locale={{ emptyText: 'No notifications yet.' }} dataSource={notes} renderItem={(n) => (
              <List.Item><List.Item.Meta title={<span style={{ fontWeight: n.isRead ? 400 : 700 }}>{n.title}</span>} description={formatDateTime(n.createdAt)} /></List.Item>)} /></Card></Col>
        </Row>
      </AsyncBoundary>
    </>
  );
}
