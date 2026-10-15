// appointmentService.js - appointment calls to the API. The server decides who may see and do what.
import api, { unwrap } from './api';

const appointmentService = {
  list: (params) => unwrap(api.get('/appointments', { params })).then((d) => d.appointments),
  get: (id) => unwrap(api.get(`/appointments/${id}`)).then((d) => d.appointment),
  create: (body) => unwrap(api.post('/appointments', body)).then((d) => d.appointment),
  setStatus: (id, body) => unwrap(api.patch(`/appointments/${id}/status`, body)).then((d) => d.appointment), // { status, reason?, summary? }
  reschedule: (id, body) => unwrap(api.put(`/appointments/${id}`, body)).then((d) => d.appointment), // { action: apply | reject | reschedule, reason?, date?, startTime? }
  restore: (id) => unwrap(api.patch(`/appointments/${id}/restore`)).then((d) => d.appointment),
  requestReschedule: (id, body) => unwrap(api.post(`/appointments/${id}/reschedule-request`, body)).then((d) => d.appointment),
};
export default appointmentService;
