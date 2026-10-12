// patientService.js - the patient directory for staff. Receptionist and admin see all active patients, a doctor only their own.
// list() returns { patients, total, page }; each patient also has visits and lastVisit (Completed appointments).
import api, { unwrap } from './api';

const patientService = {
  list: (params) => unwrap(api.get('/patients', { params })), // { search, status, page, limit }
  create: (body) => unwrap(api.post('/patients', body)).then((d) => d.patient), // receptionist only
  update: (id, body) => unwrap(api.put(`/patients/${id}`, body)).then((d) => d.patient), // receptionist only
};
export default patientService;
