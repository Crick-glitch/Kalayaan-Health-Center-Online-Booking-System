// NotificationsPage.js - the full notification list. ONE page for every role (mounted at /patient, /doctor, /staff and /admin).
// Filter All / Unread / Read, mark one or all as read, delete one (asks first). Opening a notification marks it read and goes to its appointment.
import { useState } from 'react';
import { Button, Card, Segmented, message } from 'antd';
import AppPagination, { PAGE_SIZE } from '../../components/common/AppPagination';
import { useNavigate } from 'react-router-dom';
import notificationService from '../../services/notificationService';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import AsyncBoundary from '../../components/common/AsyncBoundary';
import ConfirmModal from '../../components/common/ConfirmModal';
import NotificationItem from '../../components/notifications/NotificationItem';
import handleApiError from '../../utils/handleApiError';
import { ROLE_PREFIX } from '../../config/constants';

const EMPTY = { all: ['No notifications yet.', 'You will see updates about your appointments here.'], unread: ['You are all caught up.', 'There are no unread notifications.'], read: ['No read notifications.', ''] };

export default function NotificationsPage() {
  const { user } = useAuth(), navigate = useNavigate(), { data, loading, error, reload } = useFetch(() => notificationService.list(), []);
  const [filter, setFilter] = useState('all'), [page, setPage] = useState(1), [del, setDel] = useState(null);
  const all = (data && data.notifications) || [], unread = data ? data.unread : 0;
  const rows = all.filter((n) => filter === 'all' || (filter === 'unread' ? !n.isRead : n.isRead));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const run = async (fn, ok) => { try { await fn(); if (ok) message.success(ok); } catch (e) { handleApiError(e); } reload(); };
  const open = async (n) => {
    if (!n.isRead) await notificationService.markRead(n._id).catch(() => {});
    navigate(`${ROLE_PREFIX[user.role]}/appointments/${n.relatedAppointmentId}`);
  };
  const remove = async () => { await run(() => notificationService.remove(del._id), 'Notification deleted.'); setDel(null); };
  return (
    <>
      <PageHeader title="Notifications" description={unread ? `You have ${unread} unread.` : 'Updates about your appointments.'}
        actions={<Button disabled={!unread} onClick={() => run(() => notificationService.markAllRead(), 'All notifications marked as read.')}>Mark all as read</Button>} />
      <Segmented value={filter} onChange={(v) => { setFilter(v); setPage(1); }} style={{ marginBottom: 16 }}
        options={[{ value: 'all', label: 'All' }, { value: 'unread', label: `Unread${unread ? ` (${unread})` : ''}` }, { value: 'read', label: 'Read' }]} />
      <AsyncBoundary loading={loading} error={error} onRetry={reload} loadingText="Loading notifications..." empty={!rows.length} emptyText={EMPTY[filter][0]} emptyHint={EMPTY[filter][1]}>
        <Card styles={{ body: { padding: 0 } }}>
          {shown.map((n) => <NotificationItem key={n._id} notification={n} onOpen={open} onRead={(x) => run(() => notificationService.markRead(x._id))} onDelete={setDel} />)}
        </Card>
        {rows.length > PAGE_SIZE && ( <AppPagination total={rows.length} page={page} onChange={setPage} />)}
      </AsyncBoundary>
      <ConfirmModal open={!!del} danger title="Delete this notification?" okText="Delete" onConfirm={remove} onCancel={() => setDel(null)}>
        {del && <><strong>{del.title}</strong><div>This cannot be undone.</div></>}
      </ConfirmModal>
    </>
  );
}
