// SchedulesPage.js - read-only day view for the receptionist: pick a physician and a date, see the whole day as a timeline.
// Every 30-minute slot is "Available", part of a booked patient's visit (merged into one block, with its status), or the break.
// Cancelled and No Show visits do not occupy a slot. (The admin edits schedules on the admin Schedules page.)
import { useState } from 'react';
import { Avatar, Button, Card, Col, DatePicker, Empty, Row, Select, Space, Statistic, Tag, Typography } from 'antd';
import { LeftOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import appointmentService from '../../services/appointmentService';
import providerService from '../../services/providerService';
import useFetch from '../../hooks/useFetch';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import StatusBadge from '../../components/common/StatusBadge';
import { OCCUPYING_STATUSES } from '../../utils/appointmentRules';
import { addMinutes, mins } from '../../utils/slotUtils';
import { formatLong, formatTime, formatTimeRange, parseDate, toDateString, todayString } from '../../utils/dateUtils';
import { doctorName, fullName, initials } from '../../utils/formatters';

// Left border of a booked block, the same colors as the status history timeline.
const EDGE = { Pending: '#D98E04', Confirmed: '#0E7C86', 'Checked In': '#0E7C86', 'In Consultation': '#0B2545', Completed: '#2E9E6B' };

export default function SchedulesPage() {
  const [providerId, setProviderId] = useState(null), [date, setDate] = useState(todayString());
  const providers = useFetch(() => providerService.list(), []);
  const pid = providerId || (providers.data && providers.data[0] && providers.data[0]._id), current = (providers.data || []).find((p) => p._id === pid);
  const day = useFetch(() => (pid ? Promise.all([providerService.get(pid), appointmentService.list({ providerId: pid, date })]) : Promise.resolve(null)), [pid, date]);
  const tpl = day.data && day.data[0].schedule && day.data[0].schedule.weeklyTemplate.find((d) => d.day === parseDate(date).day());
  const booked = ((day.data && day.data[1]) || []).filter((a) => OCCUPYING_STATUSES.includes(a.status));

  // One row per 30 minutes, then neighbouring rows of the same visit (or the same break) are merged into one block.
  const rows = [];
  if (tpl) for (let m = mins(tpl.startTime); m < mins(tpl.endTime); m += 30) {
    const br = tpl.break && tpl.break.startTime && m >= mins(tpl.break.startTime) && m < mins(tpl.break.endTime);
    rows.push({ m, t: addMinutes('00:00', m), isBreak: !!br, appt: br ? null : booked.find((x) => m >= mins(x.startTime) && m < mins(x.endTime)) });
  }
  const blocks = [];
  for (const r of rows) {
    const last = blocks[blocks.length - 1];
    if (last && ((r.appt && last.appt && last.appt._id === r.appt._id) || (r.isBreak && last.isBreak))) last.rows.push(r);
    else blocks.push({ rows: [r], appt: r.appt, isBreak: r.isBreak });
  }
  const now = dayjs().hour() * 60 + dayjs().minute(), isToday = date === todayString();
  const open = rows.filter((r) => !r.appt && !r.isBreak).length, n = (s) => booked.filter((a) => a.status === s).length;
  const stats = [['Booked', booked.length], ['Open slots', open], ['Arrived', n('Checked In')], ['Completed', n('Completed')]];
  const go = (d) => setDate(toDateString(parseDate(date).add(d, 'day')));

  return (
    <>
      <PageHeader title="Schedules" description="See each physician's day at a glance." actions={<Link to="/staff/appointments/create"><Button type="primary" icon={<PlusOutlined />}>Create appointment</Button></Link>} />
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size={[16, 12]}>
          <Select aria-label="Physician" style={{ width: 280 }} value={pid} loading={providers.loading} onChange={setProviderId} options={(providers.data || []).map((p) => ({ value: p._id, label: `${doctorName(p)} · ${p.specialization}` }))} />
          <Space.Compact>
            <Button aria-label="Previous day" icon={<LeftOutlined />} onClick={() => go(-1)} />
            <DatePicker aria-label="Date" allowClear={false} format="MMMM D, YYYY" value={parseDate(date)} onChange={(d) => setDate(d ? toDateString(d) : todayString())} />
            <Button aria-label="Next day" icon={<RightOutlined />} onClick={() => go(1)} />
          </Space.Compact>
          <Button onClick={() => setDate(todayString())} disabled={isToday}>Today</Button>
        </Space>
      </Card>
      <AsyncBoundary loading={providers.loading || day.loading} error={providers.error || day.error} onRetry={() => { providers.reload(); day.reload(); }} loadingText="Loading schedule...">
        {tpl && <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>{stats.map(([label, v]) => <Col key={label} xs={12} md={6}><Card size="small"><Statistic title={label} value={v} /></Card></Col>)}</Row>}
        <Card styles={{ body: { padding: 16 } }} title={<Space>{current && <Avatar size={28} style={{ background: '#0E7C86' }}>{initials(current.user)}</Avatar>}<span>{formatLong(date)}</span>{isToday && <Tag color="blue" style={{ margin: 0 }}>Today</Tag>}</Space>}
          extra={tpl && <Space size={4} wrap><Tag color="success" style={{ margin: 0 }}>Available</Tag><Tag style={{ margin: 0 }}>Break</Tag></Space>}>
          {tpl ? blocks.map((b) => {
            const first = b.rows[0], last = b.rows[b.rows.length - 1], end = addMinutes('00:00', last.m + 30), h = 56 * b.rows.length + 8 * (b.rows.length - 1), here = isToday && now >= first.m && now < last.m + 30;
            const cls = b.appt ? 'is-booked' : b.isBreak ? 'is-break' : 'is-open';
            return (
              <div className="sched-row" key={first.t}>
                <div className="sched-time">{formatTime(first.t)}</div>
                <div className={`sched-slot ${cls}${here ? ' is-now' : ''}`} style={{ minHeight: h, ...(b.appt ? { borderLeftColor: EDGE[b.appt.status] } : {}) }}>
                  {b.appt ? <>
                    <div className="sched-main">
                      <Link to={`/staff/appointments/${b.appt._id}`}><Typography.Text strong>{fullName(b.appt.patient)}</Typography.Text></Link>
                      <Typography.Text type="secondary">{b.appt.service && b.appt.service.name} · {formatTimeRange(b.appt.startTime, b.appt.endTime)}</Typography.Text>
                    </div>
                    <Space size={8}>{here && <Tag color="blue" style={{ margin: 0 }}>Now</Tag>}<StatusBadge status={b.appt.status} /></Space>
                  </> : <>
                    <Typography.Text strong style={{ color: 'inherit' }}>{b.isBreak ? 'Break' : 'Available'}</Typography.Text>
                    <Space size={8}>{here && <Tag color="blue" style={{ margin: 0 }}>Now</Tag>}<Typography.Text style={{ color: 'inherit' }}>{formatTimeRange(first.t, end)}</Typography.Text></Space>
                  </>}
                </div>
              </div>);
          }) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="This physician does not work on this day." style={{ padding: 24 }} />}
        </Card>
      </AsyncBoundary>
    </>
  );
}