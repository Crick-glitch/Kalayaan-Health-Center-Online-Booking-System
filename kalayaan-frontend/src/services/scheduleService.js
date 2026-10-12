// scheduleService.js - save a doctor's weekly schedule. A doctor may save only their own; an admin any. Reading is providerService.get().
// weeklyTemplate: [{ day: 0-6 (0 = Sunday), startTime: "09:00", endTime: "17:00", break: { startTime, endTime } }] with working days only.
import api, { unwrap } from './api';

const scheduleService = {
  save: (providerId, weeklyTemplate) => unwrap(api.put(`/schedules/${providerId}`, { weeklyTemplate })).then((d) => d.schedule),
};
export default scheduleService;
