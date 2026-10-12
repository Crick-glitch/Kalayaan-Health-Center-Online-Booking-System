// TimeSlotPicker.js - the day's slots as buttons. Taken or too-soon slots are visibly disabled (struck through).
import { Button, Empty, Typography } from 'antd';
import { formatTime } from '../../utils/dateUtils';

export default function TimeSlotPicker({ slots, available, value, onChange }) {
  if (!slots.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="The doctor does not work on this day." />;
  if (!available.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<><strong>No available slots on this date.</strong><div>Choose another date.</div></>} />;
  return (
    <>
      <div role="group" aria-label="Available times" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 8 }}>
        {slots.map((t) => { const ok = available.includes(t); return (
          <Button key={t} className="slot-btn" style={{ height: 40 }} type={value === t ? 'primary' : 'default'} disabled={!ok} aria-pressed={value === t} aria-label={ok ? formatTime(t) : `${formatTime(t)}, unavailable`} onClick={() => onChange(t)}>{formatTime(t)}</Button>); })}
      </div>
      <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>Struck-through times are taken or too soon.</Typography.Text>
    </>
  );
}
