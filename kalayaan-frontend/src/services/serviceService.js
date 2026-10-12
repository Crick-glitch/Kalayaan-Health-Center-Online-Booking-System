// serviceService.js - health-center services. list and get are public (archived services are never returned); the rest are admin only.
import api, { unwrap } from './api';

const serviceService = {
  list: () => unwrap(api.get('/services')).then((d) => d.services),
  get: (id) => unwrap(api.get(`/services/${id}`)).then((d) => d.service),
  create: (body) => unwrap(api.post('/services', body)).then((d) => d.service), // { name, category, durationMinutes, description, requirements }
  update: (id, body) => unwrap(api.put(`/services/${id}`, body)).then((d) => d.service),
  archive: (id, reason) => unwrap(api.patch(`/services/${id}/archive`, { reason })), // 409 HAS_DEPENDENCIES (with count) while upcoming appointments exist
  restore: (id) => unwrap(api.patch(`/services/${id}/restore`)), // 409 NAME_TAKEN if an active service has the same name
};
export default serviceService;
