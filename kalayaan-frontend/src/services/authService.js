// authService.js - account calls to the Express API. Components and AuthContext call this, never axios directly.
import api, { unwrap } from './api';

const authService = {
  login: (email, password) => unwrap(api.post('/auth/login', { email, password })), // -> { user, token }
  register: (body) => unwrap(api.post('/auth/register', body)),
  verifyRegistration: (identifier, code) => unwrap(api.post('/auth/verify-registration', { identifier, code })),
  resendVerification: (identifier) => unwrap(api.post('/auth/resend-verification', { identifier })),
  logout: () => unwrap(api.post('/auth/logout')),
  me: () => unwrap(api.get('/auth/me')),
  updateProfile: (body) => unwrap(api.put('/auth/me', body)), // -> { user }; email, role and status cannot be changed here
  forgotPassword: (email) => unwrap(api.post('/auth/forgot-password', { email })),
  resetPassword: (email, code, password) => unwrap(api.post('/auth/reset-password', { email, code, password })),
  changePassword: (currentPassword, newPassword) => unwrap(api.patch('/auth/change-password', { currentPassword, newPassword })),
};
export default authService;
