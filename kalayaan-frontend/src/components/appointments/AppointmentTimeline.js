// AppointmentTimeline.js - the status history as a timeline: status, who did it, when, and any note.
import { Timeline, Typography } from 'antd';
import { statusLabel } from '../../config/constants';
import { formatDateTime } from '../../utils/dateUtils';
import { fullName } from '../../utils/formatters';

const COLOR = { Pending: '#D98E04', Confirmed: '#0E7C86', 'Checked In': '#0E7C86', 'In Consultation': '#0B2545', Completed: '#2E9E6B', Cancelled: '#C0392B', 'No Show': '#C0392B' };

export default function AppointmentTimeline({ history = [] }) {
  return <Timeline items={history.map((h) => ({ color: COLOR[h.status], children: (
    <>
      <Typography.Text strong>{statusLabel(h.status)}</Typography.Text><br />
      <Typography.Text type="secondary">{formatDateTime(h.at)}{h.by ? ` · by ${fullName(h.by)}` : ''}</Typography.Text>
      {h.note && <><br /><Typography.Text type="secondary">{h.note}</Typography.Text></>}
    </>) }))} />;
}
