// loginLimiter.js - slows down password guessing, with no extra package.
// Failed logins are counted per IP + email (5 in 15 minutes) and per IP overall (20 in 15 minutes). After that the login
// answers 429 until the window ends. An email that does not exist counts exactly like a real one, so the answer never
// reveals which accounts exist. A successful login clears that IP + email counter.
// The counters live in memory: restarting the server clears them, which is fine for one server.
const WINDOW_MS = 15 * 60_000, PER_EMAIL = 5, PER_IP = 20;
const hits = new Map(); // key -> { n, resetAt }

const live = (key) => { const e = hits.get(key); if (e && e.resetAt <= Date.now()) { hits.delete(key); return null; } return e || null; };
const keys = (q) => {
  const ip = q.ip || 'unknown', email = String((q.body && q.body.email) || '').trim().toLowerCase().slice(0, 254);
  return [`${ip}|${email}`, ip];
};

// Seconds the caller must still wait, or 0 when the login may go ahead.
function waitSeconds(q) {
  const [byEmail, byIp] = keys(q), a = live(byEmail), b = live(byIp), left = [];
  if (a && a.n >= PER_EMAIL) left.push(a.resetAt - Date.now());
  if (b && b.n >= PER_IP) left.push(b.resetAt - Date.now());
  return left.length ? Math.ceil(Math.max(...left) / 1000) : 0;
}
function recordFailure(q) {
  for (const k of keys(q)) { const e = live(k); if (e) e.n += 1; else hits.set(k, { n: 1, resetAt: Date.now() + WINDOW_MS }); }
}
function clear(q) { hits.delete(keys(q)[0]); }

setInterval(() => { for (const [k, e] of hits) if (e.resetAt <= Date.now()) hits.delete(k); }, 5 * 60_000).unref(); // forget old entries
module.exports = { waitSeconds, recordFailure, clear };