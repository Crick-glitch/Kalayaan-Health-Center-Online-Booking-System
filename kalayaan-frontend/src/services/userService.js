// userService.js - user accounts (admin only). Status and archive each have their own call. A role is fixed when the account is created.
import api, { unwrap } from './api';

const userService = {
  list: (params) => unwrap(api.get('/users', { params })), // { role, status, search, archived, page, limit } -> { users, total, page }
  get: (id) => unwrap(api.get(`/users/${id}`)).then((d) => d.user),
  create: (body) => unwrap(api.post('/users', body)).then((d) => d.user), // needs role and password; a Doctor also gets an empty provider profile
  update: (id, body) => unwrap(api.put(`/users/${id}`, body)).then((d) => d.user), // name and contact details only
  setStatus: (id, accountStatus) => unwrap(api.patch(`/users/${id}/status`, { accountStatus })).then((d) => d.user), // active | inactive | suspended
  archive: (id, reason) => unwrap(api.patch(`/users/${id}/archive`, { reason })).then((d) => d.user),
  restore: (id) => unwrap(api.patch(`/users/${id}/restore`)).then((d) => d.user),
};
export default userService;
