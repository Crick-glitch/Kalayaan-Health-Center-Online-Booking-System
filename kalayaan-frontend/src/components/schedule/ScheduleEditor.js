// ScheduleEditor.js - edit one doctor's weekly schedule. Used by the doctor (own schedule) and, later, the admin (any).
// Seven rows, Monday to Sunday: a Working switch, start and end time, and an optional break. All times are on 30-minute steps.
// The Slot preview shows the bookable start times for the schedule as it is being edited (a 30-minute visit). Changes apply to NEW bookings only.
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Row, Select, Space, Switch, Tag, TimePicker, Typography, message } from 'antd';
import dayjs from 'dayjs';
import providerService from '../../services/providerService';
import scheduleService from '../../services/scheduleService';
import useFetch from '../../hooks/useFetch';
import AsyncBoundary from '../common/AsyncBoundary';
import handleApiError from '../../utils/handleApiError';
import { baseSlots, mins } from '../../utils/slotUtils';
import { formatTime } from '../../utils/dateUtils';

const DAYS = [[1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday'], [6, 'Saturday'], [0, 'Sunday']]; // day numbers match JavaScript: 0 = Sunday
const OFF = { working: false, startTime: '09:00', endTime: '17:00', bStart: '12:00', bEnd: '13:00' }; // what a day gets when it is switched on
const toPicker = (t) => (t ? dayjs(`2000-01-01 ${t}`) : null), fromPicker = (d) => (d ? d.format('HH:mm') : '');

// The saved template (working days only) <-> one editable row per day.
const toRows = (tpl) => Object.fromEntries(DAYS.map(([n]) => {
  const d = tpl.find((x) => x.day === n);
  return [n, d ? { working: true, startTime: d.startTime, endTime: d.endTime, bStart: (d.break && d.break.startTime) || '', bEnd: (d.break && d.break.endTime) || '' } : { ...OFF }];
}));
const toTemplate = (rows) => DAYS.filter(([n]) => rows[n].working).map(([n]) => {
  const r = rows[n], day = { day: n, startTime: r.startTime, endTime: r.endTime };
  if (r.bStart && r.bEnd) day.break = { startTime: r.bStart, endTime: r.bEnd };
  return day;
});
// The same rules the API enforces, so a mistake is caught before saving.
const dayError = (r) => {
  if (!r.working) return '';
  if (!r.startTime || !r.endTime) return 'Choose a start and an end time.';
  if ([r.startTime, r.endTime, r.bStart, r.bEnd].filter(Boolean).some((t) => mins(t) % 30)) return 'Use 30-minute steps (for example 9:00 or 9:30).';
  if (mins(r.endTime) <= mins(r.startTime)) return 'End time must be after start time.';
  if (!r.bStart !== !r.bEnd) return 'Enter both break times, or clear both.';
  if (r.bStart && (mins(r.bEnd) <= mins(r.bStart) || mins(r.bStart) < mins(r.startTime) || mins(r.bEnd) > mins(r.endTime))) return 'Break must be inside working hours.';
  return '';
};

export default function ScheduleEditor({ providerId, readOnly }) {
  const { data, loading, error, reload } = useFetch(() => providerService.get(providerId), [providerId]);
  const [rows, setRows] = useState(null), [busy, setBusy] = useState(false), [serverError, setServerError] = useState(''), [previewDay, setPreviewDay] = useState(null);
  const saved = (data && data.schedule && data.schedule.weeklyTemplate) || [];
  useEffect(() => { if (data) { setRows(toRows(saved)); setServerError(''); } }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!rows) return <AsyncBoundary loading={loading} error={error} onRetry={reload} loadingText="Loading schedule..." empty={false} />;

  const edit = (n, patch) => { setServerError(''); setRows((r) => ({ ...r, [n]: { ...r[n], ...patch } })); };
  const template = toTemplate(rows), errors = Object.fromEntries(DAYS.map(([n]) => [n, dayError(rows[n])]));
  const dirty = JSON.stringify(template) !== JSON.stringify(toTemplate(toRows(saved))), invalid = Object.values(errors).some(Boolean);
  const first = (DAYS.find(([n]) => rows[n].working) || DAYS[0])[0], shown = previewDay === null ? first : previewDay;
  const chips = baseSlots({ weeklyTemplate: template }, dayjs().startOf('week').add(shown, 'day').format('YYYY-MM-DD'), 30); // any date with that weekday
  const save = async () => {
    setBusy(true); setServerError('');
    try { await scheduleService.save(providerId, template); message.success('Schedule saved.'); reload(); }
    catch (e) { if (e.fieldErrors && e.fieldErrors.weeklyTemplate) setServerError(e.fieldErrors.weeklyTemplate); else handleApiError(e); }
    setBusy(false);
  };
  const picker = (n, name, key, label, clear) => (
    <Col xs={12} md={4}>
      <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{label}</Typography.Text>
      <TimePicker aria-label={`${name} ${label.toLowerCase()}`} style={{ width: '100%' }} format="h:mm A" use12Hours minuteStep={30} showNow={false} needConfirm={false} allowClear={clear} disabled={readOnly}
        status={errors[n] ? 'error' : undefined} value={toPicker(rows[n][key])} onChange={(d) => edit(n, { [key]: fromPicker(d) })} />
    </Col>
  );
  return (
    <>
      <Alert type="info" showIcon style={{ marginBottom: 16 }} message="Changes apply to new bookings. Appointments that are already booked are not moved." />
      {serverError && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={serverError} />}
      <Card title="Weekly schedule" style={{ marginBottom: 16 }}>
        {DAYS.map(([n, name], i) => (
          <div key={n} style={{ padding: '12px 0', borderTop: i ? '1px solid #E3EAF0' : 'none' }}>
            <Row gutter={[16, 8]} align="bottom">
              <Col xs={24} md={6}>
                <Space><Switch aria-label={`${name} working`} checked={rows[n].working} disabled={readOnly} onChange={(v) => edit(n, { working: v })} />
                  <Typography.Text strong>{name}</Typography.Text><Typography.Text type="secondary">{rows[n].working ? 'Working' : 'Day off'}</Typography.Text></Space>
              </Col>
              {rows[n].working && <>{picker(n, name, 'startTime', 'Start')}{picker(n, name, 'endTime', 'End')}{picker(n, name, 'bStart', 'Break start', true)}{picker(n, name, 'bEnd', 'Break end', true)}</>}
            </Row>
            {errors[n] && <Typography.Text type="danger" role="alert" style={{ display: 'block', marginTop: 6 }}>{errors[n]}</Typography.Text>}
          </div>))}
      </Card>
      <Card title="Slot preview" style={{ marginBottom: 16 }}>
        <Space wrap style={{ marginBottom: 12 }}>
          <Select aria-label="Preview day" style={{ width: 180 }} value={shown} onChange={setPreviewDay} options={DAYS.map(([n, name]) => ({ value: n, label: name }))} />
          <Typography.Text type="secondary">Start times for a 30-minute visit. Longer services use fewer slots.</Typography.Text>
        </Space>
        <div>{chips.length ? <Space size={[8, 8]} wrap>{chips.map((t) => <Tag key={t} style={{ margin: 0 }}>{formatTime(t)}</Tag>)}</Space> : <Typography.Text type="secondary">{rows[shown].working ? 'No bookable times with these hours.' : 'This day is off, so nothing can be booked.'}</Typography.Text>}</div>
      </Card>
      {!readOnly && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        <Button disabled={!dirty || busy} onClick={() => { setRows(toRows(saved)); setServerError(''); }}>Cancel</Button>
        <Button type="primary" loading={busy} disabled={!dirty || invalid} onClick={save}>Save schedule</Button>
      </div>}
    </>
  );
}
