// NotificationItem.js - one notification row: teal dot when unread (hollow when read), bold title, message, date and time.
// onOpen opens the related appointment, onRead and onDelete are optional (the header bell shows the compact version without them).
import { Button, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { formatDateTime } from '../../utils/dateUtils';

export default function NotificationItem({ notification: n, onOpen, onRead, onDelete, compact }) {
  const unread = !n.isRead, canOpen = !!(onOpen && n.relatedAppointmentId);
  const title = canOpen
    ? <Button type="link" onClick={() => onOpen(n)} style={{ padding: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'left', fontWeight: unread ? 700 : 400 }}>{n.title}</Button>
    : <Typography.Text strong={unread}>{n.title}</Typography.Text>;
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: compact ? '10px 0' : '14px 16px', borderBottom: '1px solid #E3EAF0' }}>
      <span aria-hidden="true" style={{ flex: 'none', width: 8, height: 8, marginTop: 8, borderRadius: '50%', border: '1.5px solid #0E7C86', background: unread ? '#0E7C86' : 'transparent' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {unread && <span className="sr-only">Unread. </span>}
        {title}
        <Typography.Text type="secondary" style={{ display: 'block' }}>{n.message}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{formatDateTime(n.createdAt)}</Typography.Text>
      </div>
      {!compact && <div style={{ flex: 'none', display: 'flex', gap: 4, alignItems: 'center' }}>
        {unread && onRead && <Button size="small" type="link" onClick={() => onRead(n)}>Mark as read</Button>}
        {onDelete && <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label={`Delete notification: ${n.title}`} onClick={() => onDelete(n)} />}
      </div>}
    </div>
  );
}
