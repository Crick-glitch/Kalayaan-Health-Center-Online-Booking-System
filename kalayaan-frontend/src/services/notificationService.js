// notificationService.js - the signed-in user's own notifications.
// After any change it fires a "notifications-changed" event, so the header bell refreshes its count by itself.
import api, { unwrap } from './api';

const changed = (promise) => promise.then((r) => { window.dispatchEvent(new Event('notifications-changed')); return r; });

const notificationService = {
  list: (params) => unwrap(api.get('/notifications', { params })), // -> { notifications, unread }
  markRead: (id) => changed(unwrap(api.patch(`/notifications/${id}/read`))),
  markAllRead: () => changed(unwrap(api.patch('/notifications/read-all'))),
  remove: (id) => changed(unwrap(api.delete(`/notifications/${id}`))),
};
export default notificationService;
