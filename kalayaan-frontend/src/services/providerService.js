// providerService.js - doctors and the services they offer (public). get() also returns the weekly schedule. Physician accounts and profiles are added and archived through userService.
import api, { unwrap } from './api';

const providerService = {
  list: () => unwrap(api.get('/providers')).then((d) => d.providers),
  get: (id) => unwrap(api.get(`/providers/${id}`)), // -> { provider, schedule }
  // Open start times. extra: { appointmentId } (a reschedule ignores its own slot) or { walkIn: true } (receptionist: today only).
  slots: (id, serviceId, date, extra) => unwrap(api.get(`/providers/${id}/slots`, { params: { serviceId, date, ...extra } })).then((d) => d.slots),
  restore: (id) => unwrap(api.patch(`/providers/${id}/restore`)),
  update: (id, body) => unwrap(api.put(`/providers/${id}`, body)).then((d) => d.provider), // a doctor may send only title and bio for their own profile
};
export default providerService;
