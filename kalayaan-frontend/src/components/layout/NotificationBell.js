// NotificationBell.js - header bell for every role. Shows the unread count and the latest 5 notifications in a popover, with a link to the full page.
// It refreshes when opened, every minute, and whenever notificationService changes something (the "notifications-changed" event).
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Popover, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import notificationService from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import { ROLE_PREFIX } from '../../config/constants';
import NotificationItem from '../notifications/NotificationItem';

export default function NotificationBell() {
  const { user } = useAuth(), navigate = useNavigate(), prefix = ROLE_PREFIX[user.role];
  const [state, setState] = useState({ items: [], unread: 0 }), [open, setOpen] = useState(false);
  const load = useCallback(() => notificationService.list().then((d) => setState({ items: d.notifications.slice(0, 5), unread: d.unread })).catch(() => {}), []);
  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    window.addEventListener('notifications-changed', load);
    return () => { clearInterval(timer); window.removeEventListener('notifications-changed', load); };
  }, [load]);
  const openItem = async (n) => {
    setOpen(false);
    if (!n.isRead) await notificationService.markRead(n._id).catch(() => {});
    if (n.relatedAppointmentId) navigate(`${prefix}/appointments/${n.relatedAppointmentId}`);
  };
  const content = (
    <div style={{ width: 340, maxWidth: '80vw' }}>
      {state.items.length === 0 ? <Typography.Text type="secondary">No notifications yet.</Typography.Text>
        : state.items.map((n) => <NotificationItem key={n._id} notification={n} onOpen={openItem} compact />)}
      <div style={{ textAlign: 'center', paddingTop: 10 }}><Link to={`${prefix}/notifications`} onClick={() => setOpen(false)}>View all notifications</Link></div>
    </div>
  );
  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) load(); }} trigger="click" placement="bottomRight" arrow={false} title={`Notifications${state.unread ? ` (${state.unread} unread)` : ''}`} content={content}>
      <Badge count={state.unread} size="small" overflowCount={99}>
        <Button type="text" shape="circle" icon={<BellOutlined />} aria-label={`Notifications, ${state.unread} unread`} />
      </Badge>
    </Popover>
  );
}
