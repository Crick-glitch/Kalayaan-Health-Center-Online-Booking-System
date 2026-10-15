// AdminDashboardPage.js - the administrator's overview.
// Welcome strip, five KPI cards, appointments chart, status donut, "needs attention", physicians today,
// popular services, recent activity and newest accounts.
// Everything is calculated in the browser from the three calls that already exist (appointments, users, physicians),
// so no backend change is needed. The only new package is recharts (npm install recharts@2).
import { useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Card, Col, Empty, Grid, Progress, Row, Segmented, Tag, Timeline } from 'antd';
import {
  ArrowRightOutlined, CalendarOutlined, CheckCircleFilled, ClockCircleOutlined, ExclamationCircleOutlined, IdcardOutlined,
  MedicineBoxOutlined, ReloadOutlined, SwapOutlined, UserOutlined,
} from '@ant-design/icons';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Link } from 'react-router-dom';
import appointmentService from '../../services/appointmentService';
import providerService from '../../services/providerService';
import userService from '../../services/userService';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import { statusLabel } from '../../config/constants';
import { ACTIVE_STATUSES } from '../../utils/appointmentRules';
import { DATE_FMT, formatLong, formatTime, parseDate, todayString } from '../../utils/dateUtils';
import { apptDoctor, doctorName, formatCount, fullName, initials, roleLabel } from '../../utils/formatters';

dayjs.extend(relativeTime);

// ---------- Colors (same tokens as theme.js / StatusBadge.js) ----------
const TEAL = ['#0E7C86', '#E8F3FA'], AMBER = ['#D98E04', '#FDF3DC'], GREEN = ['#2E9E6B', '#E3F5EC'], NAVY = ['#0B2545', '#E6ECF4'], RED = ['#C0392B', '#FBE9E7'], BLUE = ['#3C6E9E', '#E8F0F8'];
const STATUS_COLOR = { Pending: '#D98E04', Confirmed: '#0E7C86', 'Checked In': '#5BB5BE', 'In Consultation': '#0B2545', Completed: '#2E9E6B', Cancelled: '#C0392B', 'No Show': '#E3857B' };
const STATUS_ORDER = ['Pending', 'Confirmed', 'Checked In', 'In Consultation', 'Completed', 'Cancelled', 'No Show'];
const VERB = { Pending: 'was requested', Confirmed: 'was confirmed', 'Checked In': 'was marked arrived', 'In Consultation': 'is now in consultation', Completed: 'was completed', Cancelled: 'was cancelled', 'No Show': 'was marked no-show' };

// The chart groups the seven statuses into four bars so it stays easy to read.
const GROUP = { Pending: 'Pending', Confirmed: 'Confirmed', 'Checked In': 'Confirmed', 'In Consultation': 'Confirmed', Completed: 'Completed', Cancelled: 'Cancelled', 'No Show': 'Cancelled' };
const SERIES = [['Completed', 'Completed', '#2E9E6B'], ['Confirmed', 'Confirmed or in progress', '#0E7C86'], ['Pending', 'Pending', '#D98E04'], ['Cancelled', 'Cancelled or no-show', '#C0392B']];
const RANGES = { 'Next 7 days': [0, 6], 'Past 7 days': [-6, 0], 'Past 30 days': [-29, 0] }; // [first day, last day] counted from today

const plural = (n, one, many = `${one}s`) => `${formatCount(n)} ${n === 1 ? one : many}`;

// Counts up from 0 to the number when the page opens. Skipped for people who prefer reduced motion.
function useCountUp(target, ms = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!window.requestAnimationFrame || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) { setValue(target); return undefined; }
    let frame, start;
    const tick = (now) => {
      start = start || now;
      const p = Math.min((now - start) / ms, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3)))); // ease-out
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

function KpiCard({ label, value, sub, icon, tone, to, index }) {
  const shown = useCountUp(value);
  return (
    <Link to={to} className="ad-kpi ad-rise" style={{ '--tone': tone[0], '--tone-bg': tone[1], '--i': index }} aria-label={`${label}: ${value}. ${sub}`}>
      <div className="ad-kpi-top"><span className="ad-kpi-label">{label}</span><span className="ad-kpi-icon" aria-hidden="true">{icon}</span></div>
      <div className="ad-kpi-value">{formatCount(shown)}</div>
      <div className="ad-kpi-sub"><span>{sub}</span><ArrowRightOutlined className="ad-kpi-go" aria-hidden="true" /></div>
    </Link>
  );
}

// ---------- Calculations (plain functions, easy to explain) ----------
function summarize(appts, users, providers, today) {
  const isActive = (a) => ACTIVE_STATUSES.includes(a.status);
  const count = (list, status) => list.filter((a) => a.status === status).length;
  const month = today.slice(0, 7), lastMonth = dayjs().subtract(1, 'month').format('YYYY-MM');
  const todays = appts.filter((a) => a.date === today);
  const patients = users.filter((u) => u.role === 'patient'), staff = users.filter((u) => u.role !== 'patient');
  const pending = appts.filter((a) => a.status === 'Pending');
  const reschedules = appts.filter((a) => isActive(a) && a.reschedulePending && a.reschedulePending.date);
  const stale = appts.filter((a) => isActive(a) && a.date < today); // past appointments nobody closed
  const noServices = providers.filter((p) => !(p.services || []).length); // cannot be booked
  const inactiveStaff = staff.filter((u) => u.accountStatus !== 'active');
  const staffCount = (role) => staff.filter((u) => u.role === role).length;

  // Recent activity: every status change of every appointment, newest first.
  const events = [];
  appts.forEach((a) => (a.statusHistory || []).forEach((h) => events.push({ a, status: h.status, at: h.at, by: h.by })));
  events.sort((x, y) => dayjs(y.at).valueOf() - dayjs(x.at).valueOf());

  // Appointments per service (cancelled and no-show do not count as demand).
  const perService = {};
  appts.filter((a) => a.status !== 'Cancelled' && a.status !== 'No Show' && a.service).forEach((a) => { perService[a.service.name] = (perService[a.service.name] || 0) + 1; });

  // One row per physician for today.
  const doctors = providers.map((p) => {
    const mine = todays.filter((a) => String((a.provider && a.provider._id) || a.providerId) === String(p._id)).sort((x, y) => (x.startTime < y.startTime ? -1 : 1));
    return { p, total: mine.length, done: count(mine, 'Completed'), next: mine.find(isActive) };
  }).sort((x, y) => y.total - x.total);

  return {
    todays, pending, patients, staff, reschedules, stale, doctors, events: events.slice(0, 8), todayDone: count(todays, 'Completed'), todayLeft: todays.filter(isActive).length,
    doneMonth: appts.filter((a) => a.status === 'Completed' && a.date.startsWith(month)).length, doneLastMonth: appts.filter((a) => a.status === 'Completed' && a.date.startsWith(lastMonth)).length,
    newPatients: patients.filter((u) => dayjs(u.createdAt).isSame(dayjs(), 'month')).length,
    staffLine: `${plural(staffCount('doctor'), 'physician')} · ${plural(staffCount('receptionist'), 'receptionist')} · ${staffCount('admin')} admin`,
    services: Object.entries(perService).sort((x, y) => y[1] - x[1]).slice(0, 5),
    newest: [...users].sort((x, y) => dayjs(y.createdAt).valueOf() - dayjs(x.createdAt).valueOf()).slice(0, 5),
    byStatus: STATUS_ORDER.map((st) => ({ key: st, name: statusLabel(st), value: count(appts, st) })).filter((x) => x.value > 0),
    attention: [
      { n: pending.length, icon: <ClockCircleOutlined />, tone: AMBER, to: '/admin/appointments?status=Pending', title: `${plural(pending.length, 'appointment request')} waiting`, text: 'Pending requests need to be confirmed or cancelled.' },
      { n: reschedules.length, icon: <SwapOutlined />, tone: TEAL, to: '/admin/appointments', title: `${plural(reschedules.length, 'reschedule request')}`, text: 'Patients asked for a new date or time.' },
      { n: stale.length, icon: <ExclamationCircleOutlined />, tone: RED, to: '/admin/appointments', title: `${plural(stale.length, 'past appointment')} still open`, text: 'The date has passed but the status was never closed.' },
      { n: noServices.length, icon: <MedicineBoxOutlined />, tone: BLUE, to: '/admin/employees?role=doctor', title: `${plural(noServices.length, 'physician')} without services`, text: 'Patients cannot book a physician who offers no service.' },
      { n: inactiveStaff.length, icon: <IdcardOutlined />, tone: NAVY, to: '/admin/employees', title: `${plural(inactiveStaff.length, 'employee account')} not active`, text: 'Inactive or suspended employees cannot log in.' },
    ].filter((x) => x.n > 0),
  };
}

function dailySeries(appts, [from, to], today) {
  const rows = [];
  for (let i = from; i <= to; i += 1) {
    const date = dayjs().add(i, 'day').format(DATE_FMT);
    rows.push({ date, label: parseDate(date).format(to - from > 7 ? 'MMM D' : 'ddd D'), Completed: 0, Confirmed: 0, Pending: 0, Cancelled: 0 });
  }
  const byDate = Object.fromEntries(rows.map((r) => [r.date, r]));
  appts.forEach((a) => { if (byDate[a.date]) byDate[a.date][GROUP[a.status]] += 1; });
  const total = rows.reduce((sum, r) => sum + r.Completed + r.Confirmed + r.Pending + r.Cancelled, 0);
  const todayRow = rows.find((r) => r.date === today);
  return { rows, total, todayLabel: todayRow && todayRow.label };
}

// ---------- The page ----------
export default function AdminDashboardPage() {
  const { user } = useAuth(), today = todayString();
  const { data, loading, error, reload } = useFetch(() => Promise.all([appointmentService.list(), userService.list({ limit: 500 }), providerService.list()]), []);
  const hour = dayjs().hour(), greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const [updated, setUpdated] = useState(null);
  useEffect(() => { if (data) setUpdated(dayjs()); }, [data]);

  return (
    <>
      <PageHeader title={`${greeting}, ${user.firstName}`} description={`${formatLong(today)}${updated ? ` · Updated ${updated.format('h:mm A')}` : ''}`}
        actions={<Button icon={<ReloadOutlined />} loading={loading && !!data} onClick={reload}>Refresh</Button>} />
      <AsyncBoundary loading={loading && !data} error={error} onRetry={reload} loadingText="Loading the overview...">
        {data && <Dashboard appts={data[0]} users={data[1].users} providers={data[2]} today={today} firstName={user.firstName} />}
      </AsyncBoundary>
    </>
  );
}

function Dashboard({ appts, users, providers, today, firstName }) {
  const [range, setRange] = useState('Next 7 days'), bp = Grid.useBreakpoint();
  const s = useMemo(() => summarize(appts, users, providers, today), [appts, users, providers, today]);
  const chart = useMemo(() => dailySeries(appts, RANGES[range], today), [appts, range, today]);
  const diff = s.doneMonth - s.doneLastMonth, maxService = s.services.length ? s.services[0][1] : 1;
  const kpis = [
    { label: "Today's appointments", value: s.todays.length, sub: `${s.todayDone} done · ${s.todayLeft} to go`, icon: <CalendarOutlined />, tone: TEAL, to: `/admin/appointments?date=${today}` },
    { label: 'Pending requests', value: s.pending.length, sub: s.pending.length ? 'Waiting for confirmation' : 'All caught up', icon: <ClockCircleOutlined />, tone: AMBER, to: '/admin/appointments?status=Pending' },
    { label: 'Completed this month', value: s.doneMonth, sub: diff === 0 ? 'Same as last month' : `${diff > 0 ? '+' : ''}${diff} vs last month`, icon: <CheckCircleFilled />, tone: GREEN, to: '/admin/appointments?status=Completed' },
    { label: 'Patients', value: s.patients.length, sub: `${s.newPatients} new this month`, icon: <UserOutlined />, tone: NAVY, to: '/admin/patients' },
    { label: 'Employees', value: s.staff.length, sub: s.staffLine, icon: <IdcardOutlined />, tone: BLUE, to: '/admin/employees' },
  ];

  return (
    <>

      <div className="ad-kpis">{kpis.map((k, i) => <KpiCard key={k.label} {...k} index={i + 1} />)}</div>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card className="ad-card ad-rise" style={{ '--i': 3 }} title="Appointments">
            <Segmented size="small" block={!bp.sm} options={Object.keys(RANGES)} value={range} onChange={setRange} style={{ marginBottom: 12 }} />
            {chart.total === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No appointments in this period." /> : (
              <div role="img" aria-label={`${chart.total} appointments, ${range.toLowerCase()}, grouped by status per day.`}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chart.rows} margin={{ top: 22, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#EEF2F6" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#5B6B7B' }} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#5B6B7B' }} />
                    <Tooltip cursor={{ fill: '#F5F7FA' }} labelFormatter={(_, p) => (p && p[0] ? formatLong(p[0].payload.date) : '')} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    {chart.todayLabel && <ReferenceLine x={chart.todayLabel} stroke="#0B2545" strokeDasharray="4 3" label={{ value: 'Today', position: 'top', fontSize: 11, fill: '#0B2545' }} />}
                    {SERIES.map(([key, name, color]) => <Bar key={key} dataKey={key} name={name} stackId="a" fill={color} maxBarSize={36} />)}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="ad-card ad-rise" style={{ '--i': 4 }} title="Status breakdown" extra={<Link to="/admin/appointments">All appointments</Link>}>
            {s.byStatus.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No appointments yet." /> : (
              <>
                <div className="ad-donut" role="img" aria-label={`${appts.length} appointments by status: ${s.byStatus.map((x) => `${x.value} ${x.name}`).join(', ')}.`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={s.byStatus} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="none">
                        {s.byStatus.map((x) => <Cell key={x.key} fill={STATUS_COLOR[x.key]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="ad-donut-center"><span className="ad-donut-total">{formatCount(appts.length)}</span><span className="ad-donut-caption">appointments</span></div>
                </div>
                <ul className="ad-legend">{s.byStatus.map((x) => <li key={x.key}><span className="ad-legend-dot" style={{ background: STATUS_COLOR[x.key] }} /><span className="ad-legend-name">{x.name}</span><span className="ad-legend-count">{x.value}</span></li>)}</ul>
              </>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card className="ad-card ad-rise" style={{ '--i': 5 }} title="Needs attention">
            {s.attention.length === 0
              ? <div className="ad-clear"><CheckCircleFilled aria-hidden="true" /><strong>All clear</strong><span>Nothing needs your attention right now.</span></div>
              : s.attention.map((x) => (
                <Link key={x.title} to={x.to} className="ad-attn" style={{ '--tone': x.tone[0], '--tone-bg': x.tone[1] }}>
                  <span className="ad-attn-icon" aria-hidden="true">{x.icon}</span>
                  <span className="ad-attn-text"><strong>{x.title}</strong><span>{x.text}</span></span>
                  <ArrowRightOutlined className="ad-attn-go" aria-hidden="true" />
                </Link>
              ))}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="ad-card ad-rise" style={{ '--i': 6 }} title="Physicians today" extra={<Link to="/admin/employees?role=doctor">All physicians</Link>}>
            {s.doctors.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No physicians yet." /> : s.doctors.slice(0, 6).map(({ p, total, done, next }) => (
              <div className="ad-doc" key={p._id}>
                <Avatar style={{ background: '#0E7C86', flex: '0 0 auto' }}>{initials(p.user)}</Avatar>
                <div className="ad-doc-body">
                  <div className="ad-doc-name">{doctorName(p)}</div>
                  <div className="ad-doc-meta"><span>{p.specialization || 'Physician'}</span><span>{total ? `${done}/${total} done${next ? ` · next ${formatTime(next.startTime)}` : ''}` : 'No appointments'}</span></div>
                  <Progress percent={total ? Math.round((done / total) * 100) : 0} showInfo={false} size="small" strokeColor="#2E9E6B" trailColor="#E3EAF0" aria-label={`${doctorName(p)}: ${done} of ${total} appointments done today`} />
                </div>
              </div>
            ))}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="ad-card ad-rise" style={{ '--i': 7 }} title="Popular services" extra={<Link to="/admin/services">Manage services</Link>}>
            {s.services.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No bookings yet." /> : s.services.map(([name, n]) => (
              <div className="ad-bar-row" key={name}>
                <div className="ad-bar-head"><span>{name}</span><span>{n}</span></div>
                <Progress percent={Math.round((n / maxService) * 100)} showInfo={false} strokeColor="#0E7C86" trailColor="#E3EAF0" aria-label={`${name}: ${n} appointments`} />
              </div>
            ))}
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card className="ad-card ad-rise" style={{ '--i': 8 }} title="Recent activity">
            {s.events.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No activity yet." /> : (
              <Timeline className="ad-feed" items={s.events.map((e) => ({
                color: STATUS_COLOR[e.status],
                children: (
                  <>
                    <div className="ad-feed-line">
                      <Link to={`/admin/appointments/${e.a._id}`}><strong>{e.a.referenceNo}</strong></Link> {VERB[e.status] || 'was updated'}
                      {e.a.patient ? <span className="ad-muted"> · {fullName(e.a.patient)}</span> : null}
                      {e.a.provider ? <span className="ad-muted"> · {apptDoctor(e.a)}</span> : null}
                    </div>
                    <div className="ad-feed-time" title={dayjs(e.at).format('MMMM D, YYYY h:mm A')}>{dayjs(e.at).fromNow()}{e.by ? ` · by ${fullName(e.by)}` : ''}</div>
                  </>
                ),
              }))} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card className="ad-card ad-rise" style={{ '--i': 9 }} title="Newest accounts" extra={<><Link to="/admin/patients">Patients</Link> · <Link to="/admin/employees">Employees</Link></>}>
            {s.newest.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No accounts yet." /> : s.newest.map((u) => (
              <div className="ad-person" key={u._id}>
                <Avatar style={{ background: u.role === 'patient' ? '#0B2545' : '#0E7C86', flex: '0 0 auto' }}>{initials(u)}</Avatar>
                <div className="ad-person-body"><div className="ad-person-name">{fullName(u)}</div><div className="ad-person-meta">Joined {dayjs(u.createdAt).format('MMM D, YYYY')}</div></div>
                <Tag bordered={false} color={u.role === 'patient' ? 'default' : 'cyan'} style={{ margin: 0 }}>{roleLabel(u.role)}</Tag>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </>
  );
}