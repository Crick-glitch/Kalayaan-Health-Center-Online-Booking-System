// check-email.js - tests your SMTP settings without starting the server.
require('dotenv').config();
const tls = require('tls');
const { verifyEmail, deliver, isConfigured, explainEmailError, emailConfig } = require('./messaging');

// Connects directly to the mail server and shows who issued the certificate Node actually receives.
function inspectCertificate(host, port) {
  return new Promise((resolve) => {
    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false, timeout: 8000 }, () => {
      const cert = socket.getPeerCertificate();
      const result = { issuer: (cert.issuer && (cert.issuer.O || cert.issuer.CN)) || 'unknown', trusted: socket.authorized, reason: socket.authorizationError };
      socket.end(); resolve(result);
    });
    socket.on('error', (e) => resolve({ error: e.message }));
    socket.on('timeout', () => { socket.destroy(); resolve({ error: 'timed out' }); });
  });
}

(async () => {
  let configured;
  try { configured = isConfigured(); } catch (e) { console.error('FAILED: ' + e.message); process.exit(1); }
  if (!configured) { console.error('FAILED: SMTP_HOST and SMTP_FROM (and SMTP_USER / SMTP_PASS) are not set in .env.'); process.exit(1); }
  const c = emailConfig();
  console.log(`Settings: host=${c.host} port=${c.port} secure=${c.secure} user=${c.auth ? c.auth.user : '(none)'} verifyCertificates=${c.tls.rejectUnauthorized !== false}`);

  const probePort = c.secure ? c.port : 465; // 465 is plain TLS, so the certificate can be read without the SMTP handshake
  const cert = await inspectCertificate(c.host, probePort);
  if (cert.error) console.log(`Certificate check skipped (port ${probePort}: ${cert.error}).`);
  else {
    console.log(`Certificate seen by Node: issued by "${cert.issuer}", trusted by Node: ${cert.trusted ? 'yes' : 'NO (' + cert.reason + ')'}`);
    if (!cert.trusted) console.log('  -> Node does not trust this certificate. If the issuer is NOT the mail provider (for Gmail: Google Trust Services),\n     something on your PC or network (antivirus, proxy, firewall) is intercepting the connection.');
  }

  try { await verifyEmail(); console.log('OK: connected to the SMTP server and logged in.'); }
  catch (e) { console.error('FAILED: ' + explainEmailError(e)); process.exit(1); }

  const to = process.argv[2];
  if (to) {
    try { await deliver(to, '123456', 'verify'); console.log(`OK: test email sent to ${to} (code 123456). Check the inbox and spam folder.`); }
    catch (e) { console.error('FAILED to send: ' + explainEmailError(e)); process.exit(1); }
  }
})();