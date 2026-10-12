// SchedulesPage.js - read-only day view for the receptionist: pick a provider and a date, see every 30-minute slot
// as "Available", a booked patient with a StatusBadge, or the break. Cancelled and No Show visits do not occupy a slot.
// (The admin edits schedules in the ScheduleEditor in a later phase.)
import { useState } from 'react';
import { Button, Card, DatePicker, Empty, Select, Space, Table, Typography } from 'antd';
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
import { doctorName, fullName } from '../../utils/formatters';

export default function SchedulesPage() {
  const [providerId, setProviderId] = useState(null), [date, setDate] = useState(todayString());
  const providers = useFetch(() => providerService.list(), []);
  const pid = providerId || (providers.data && providers.data[0] && providers.data[0]._id);
  const day = useFetch(() => (pid ? Promise.all([providerService.get(pid), appointmentService.list({ providerId: pid, date })]) : Promise.resolve(null)), [pid, date]);
  const tpl = day.data && day.data[0].schedule && day.data[0].schedule.weeklyTemplate.find((d) => d.day === parseDate(date).day());
  const booked = ((day.data && day.data[1]) || []).filter((a) => OCCUPYING_STATUSES.includes(a.status));
  const rows = [];
  if (tpl) for (let m = mins(tpl.startTime); m < mins(tpl.endTime); m += 30) {
    const t = addMinutes('00:00', m), br = tpl.break && tpl.break.startTime && m >= mins(tpl.break.startTime) && m < mins(tpl.break.endTime);
    const a = br ? null : booked.find((x) => m >= mins(x.startTime) && m < mins(x.endTime));
    rows.push({ key: t, time: t, isBreak: !!br, appt: a, first: !!a && a.startTime === t });
  }
  const columns = [
    { title: 'Time', width: 190, render: (_, r) => formatTimeRange(r.time, addMinutes(r.time, 30)) },
    { title: 'Booking', render: (_, r) => r.isBreak ? <Typography.Text type="secondary">Break</Typography.Text>
      : r.appt ? <Space wrap><Link to={`/staff/appointments/${r.appt._id}`}>{fullName(r.appt.patient)}</Link>{r.first ? <><StatusBadge status={r.appt.status} /><Typography.Text type="secondary">{r.appt.service && r.appt.service.name} · {formatTime(r.appt.startTime)}</Typography.Text></> : <Typography.Text type="secondary">continued</Typography.Text>}</Space>
      : <Typography.Text type="success">Available</Typography.Text> },
  ];
  return (
    <>
      <PageHeader title="Schedules" description="See each doctor's day at a glance." />
      <Space wrap style={{ marginBottom: 16 }}>
        <Select aria-label="Provider" style={{ width: 260 }} value={pid} loading={providers.loading} onChange={setProviderId} options={(providers.data || []).map((p) => ({ value: p._id, label: `${doctorName(p)} · ${p.specialization}` }))} />
        <DatePicker aria-label="Date" allowClear={false} format="MMMM D, YYYY" value={parseDate(date)} onChange={(d) => setDate(d ? toDateString(d) : todayString())} />
        <Button onClick={() => setDate(todayString())} disabled={date === todayString()}>Today</Button>
      </Space>
      <AsyncBoundary loading={providers.loading || day.loading} error={providers.error || day.error} onRetry={() => { providers.reload(); day.reload(); }} loadingText="Loading schedule...">
        <Card title={formatLong(date)} styles={{ body: { padding: 0 } }}>
          {tpl ? <Table size="middle" rowKey="key" columns={columns} dataSource={rows} pagination={false} scroll={{ x: 'max-content' }} rowClassName={(r) => (r.isBreak ? 'row-break' : '')} />
            : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Provider does not work on this day." style={{ padding: 24 }} />}
        </Card>
      </AsyncBoundary>
    </>
  );
}
