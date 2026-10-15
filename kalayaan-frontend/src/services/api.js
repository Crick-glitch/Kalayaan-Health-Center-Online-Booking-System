// api.js - the Axios instance for the backend API.
import axios from 'axios';
import { API_URL } from '../config/constants';

let token = null, onUnauthorized = () => {};
export const setAuthToken = (t) => { token = t; }; // AuthContext sets this, so this file never touches browser storage
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((cfg) => { if (token) cfg.headers.Authorization = `Bearer ${token}`; return cfg; });
api.interceptors.response.use((r) => r, (err) => {
  const body = (err.response && err.response.data) || {};
  const status = err.response ? err.response.status : 0;
  if (status === 401 && token) onUnauthorized(); // logs out and the route guards send the user to login
  return Promise.reject(Object.assign(new Error(body.message || 'Unable to reach the server. Please try again.'), { status, code: body.code || 'NETWORK_ERROR', fieldErrors: body.fieldErrors, count: body.count }));
});
export default api;
export const unwrap = (promise) => promise.then((r) => r.data); // every service returns response.data
