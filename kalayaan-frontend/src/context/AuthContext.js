// AuthContext.js - the ONE React context. Holds the session and is the only file that touches browser storage.
// "Remember me" uses localStorage, otherwise sessionStorage. Sessions last 8 hours, then the user must log in again.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/authService';
import { setAuthToken, setUnauthorizedHandler } from '../services/api';

const KEY = 'kalayaan_session', EIGHT_HOURS = 8 * 60 * 60 * 1000;
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const readSession = () => {
  for (const store of [localStorage, sessionStorage]) { try { const s = JSON.parse(store.getItem(KEY)); if (s) return s; } catch { /* ignore bad data */ } }
  return null;
};
const clearSession = () => { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); };

function restore() { // runs once on page load
  const s = readSession();
  if (!s) return { session: null, expired: false };
  const expired = s.expiresAt <= Date.now();
  if (expired || !s.user || s.user.accountStatus !== 'active' || s.user.isArchived) { clearSession(); return { session: null, expired }; }
  setAuthToken(s.token);
  return { session: s, expired: false };
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(restore);
  const { session, expired } = state;

  const expire = useCallback(() => { clearSession(); setAuthToken(null); setState({ session: null, expired: true }); }, []);
  const logout = useCallback(() => { authService.logout().catch(() => {}); clearSession(); setAuthToken(null); setState({ session: null, expired: false }); }, []);
  const login = useCallback(async (email, password, remember) => {
    const { user, token } = await authService.login(email, password);
    const s = { user, token, expiresAt: Date.now() + EIGHT_HOURS };
    clearSession();
    (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(s));
    setAuthToken(token); setState({ session: s, expired: false });
    return user;
  }, []);
  const updateUser = useCallback((user) => { // after the user edits their profile
    setState((x) => { if (!x.session) return x; const s = { ...x.session, user }; (localStorage.getItem(KEY) ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(s)); return { ...x, session: s }; });
  }, []);

  useEffect(() => { setUnauthorizedHandler(expire); }, [expire]); // a 401 from the API logs the user out
  useEffect(() => { // auto-expire when the 8 hours are over
    if (!session) return undefined;
    const t = setTimeout(expire, Math.max(session.expiresAt - Date.now(), 0));
    return () => clearTimeout(t);
  }, [session, expire]);
  useEffect(() => { // on load, ask the API who we are (catches archived or suspended accounts)
    if (session) authService.me().then(({ user }) => updateUser(user)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({ user: session ? session.user : null, expired, login, logout, updateUser }), [session, expired, login, logout, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
