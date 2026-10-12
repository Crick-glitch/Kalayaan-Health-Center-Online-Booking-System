// archiveService.js - everything that was archived (admin only). One list for all four kinds.
// -> { rows: [{ type: user|provider|service|appointment, _id, name, archivedAt, archivedBy, reason, record }], counts, total }
import api, { unwrap } from './api';

const archiveService = { list: () => unwrap(api.get('/archive')) };
export default archiveService;
