// messaging.js - sends one-time codes (OTP) by email through SMTP.
// Used by routes.js for: account verification, password reset / account recovery.
// To add another OTP purpose (for example 'login' or 'email-change'), add one line to PURPOSES below.
const nodemailer = require('nodemailer');

const CLINIC = process.env.CLINIC_NAME || 'Kalayaan Health Center';
const EXPIRY_MINUTES = 10; // keep in sync with the 10-minute expiry in routes.js

const PURPOSES = {
  verify: { subject: `Verify your ${CLINIC} account`, title: 'Verify your email', intro: 'Use this code to finish creating your account.' },
  reset: { subject: `Your ${CLINIC} password reset code`, title: 'Reset your password', intro: 'Use this code to choose a new password for your account.' },
};
const GENERIC = { subject: `Your ${CLINIC} verification code`, title: 'Your verification code', intro: 'Use this code to continue.' };

const flag = (name) => String(process.env[name] || '').trim().toLowerCase() === 'true';
const isProduction = () => process.env.NODE_ENV === 'production';
const isLocalHost = (host) => /^(localhost|127\.0\.0\.1|::1)$/.test(String(host || ''));

// Gmail shows App Passwords as "abcd efgh ijkl mnop". The spaces are not part of the password.
const smtpPass = () => {
  const pass = String(process.env.SMTP_PASS || '').trim();
  return /gmail\.com$/i.test(String(process.env.SMTP_HOST || '').trim()) ? pass.replace(/\s+/g, '') : pass;
};

let warnedSelfSigned = false;
const emailConfig = () => {
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true'; // true for port 465, false for port 587 (STARTTLS)
  const config = {
    host, port, secure,
    requireTLS: !secure && !isLocalHost(host), // never send the login or the code unencrypted
    auth: process.env.SMTP_USER ? { user: String(process.env.SMTP_USER).trim(), pass: smtpPass() } : undefined,
    connectionTimeout: 15_000, greetingTimeout: 15_000, socketTimeout: 30_000, // fail fast instead of hanging for minutes
    tls: { minVersion: 'TLSv1.2' },
  };
  if (flag('SMTP_ALLOW_SELF_SIGNED')) {
    if (isProduction()) {
      if (!warnedSelfSigned) { warnedSelfSigned = true; console.warn('[email] SMTP_ALLOW_SELF_SIGNED is ignored when NODE_ENV=production.'); }
    } else {
      config.tls.rejectUnauthorized = false; // LOCAL DEVELOPMENT ONLY: skips certificate checks
      if (!warnedSelfSigned) { warnedSelfSigned = true; console.warn('[email] SMTP_ALLOW_SELF_SIGNED=true: TLS certificates are NOT being verified. Use this on your own computer only.'); }
    }
  }
  return config;
};

let transporter;
const getTransporter = () => transporter || (transporter = nodemailer.createTransport(emailConfig()));

function required(values, label) {
  const configured = values.filter(Boolean).length;
  if (configured && configured !== values.length) throw new Error(`${label} delivery is only partially configured.`);
  return configured === values.length;
}
// true when SMTP is fully configured, false when it is not configured at all, throws when only half is filled in.
function isConfigured() {
  if (String(process.env.SMTP_ENABLED || '').trim().toLowerCase() === 'false') return false; // email switched off, SMTP settings stay in .env
  required([process.env.SMTP_USER, process.env.SMTP_PASS], 'SMTP authentication');
  return required([process.env.SMTP_HOST, process.env.SMTP_FROM], 'Email');
}

// Turns a raw nodemailer/TLS error into a hint for the developer. This goes to the server console, never to the user.
function explainEmailError(error) {
  const text = `${error && error.code ? error.code + ' ' : ''}${(error && error.message) || error}`;
  if (/self[- ]signed|unable to (get|verify)|certificate|CERT_/i.test(text)) {
    return `${text}\n  -> The computer could not trust the SMTP server's TLS certificate. Something between this PC and the mail server\n     (antivirus email/SSL scanning, a school or office proxy, or a firewall) is replacing the certificate.\n     Run "npm run check-email" to confirm. Fixes: turn off the antivirus "scan encrypted/SSL connections" option,\n     try another network (phone hotspot), or for local development only set SMTP_ALLOW_SELF_SIGNED=true in .env.`;
  }
  if (/EAUTH|535|Invalid login|Username and Password not accepted|Application-specific password/i.test(text)) {
    return `${text}\n  -> The SMTP login was rejected. For Gmail, turn on 2-Step Verification and use a 16-character App Password in SMTP_PASS\n     (not your normal password). SMTP_USER must be the same Gmail address as the one in SMTP_FROM.`;
  }
  if (/ETIMEDOUT|ECONNREFUSED|ECONNECTION|ENOTFOUND|EAI_AGAIN|ESOCKET|EDNS/i.test(text)) {
    return `${text}\n  -> Could not reach the SMTP server. Check your internet, SMTP_HOST and SMTP_PORT, and that your network or firewall allows port 587 or 465.`;
  }
  return text;
}

const render = (purpose, code) => {
  const p = PURPOSES[purpose] || GENERIC;
  const text = `${p.title}\n\n${p.intro}\n\nYour code: ${code}\n\nThis code expires in ${EXPIRY_MINUTES} minutes. Never share it with anyone. If you did not request it, you can ignore this email.\n\n${CLINIC}`;
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#F5F7FA;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#0B2545;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border:1px solid #E3EAF0;border-radius:12px;">
<tr><td style="padding:28px 32px 4px;font-size:16px;font-weight:700;color:#0E7C86;">${CLINIC}</td></tr>
<tr><td style="padding:12px 32px 0;font-size:22px;font-weight:700;">${p.title}</td></tr>
<tr><td style="padding:8px 32px 0;font-size:14px;line-height:22px;color:#5B6B7B;">${p.intro}</td></tr>
<tr><td align="center" style="padding:24px 32px;"><div style="display:inline-block;padding:14px 28px;background:#E8F3FA;border-radius:8px;font-family:Consolas,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#0B2545;">${code}</div></td></tr>
<tr><td style="padding:0 32px 28px;font-size:13px;line-height:20px;color:#5B6B7B;">This code expires in ${EXPIRY_MINUTES} minutes. Never share it with anyone. If you did not request it, you can ignore this email.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: p.subject, text, html };
};

// Sends the email and throws the RAW error on failure (used by sendCode and by check-email.js).
async function deliver(destination, code, purpose) {
  const { subject, text, html } = render(purpose, code);
  await getTransporter().sendMail({ from: process.env.SMTP_FROM, to: destination, subject, text, html });
}

// Checks the SMTP connection and login without sending anything. Used by check-email.js.
const verifyEmail = () => getTransporter().verify();

async function sendCode(destination, code, purpose) {
  if (!isConfigured()) {
    if (!isProduction() && flag('DEV_SHOW_AUTH_CODES')) return { delivered: false, developmentCode: code };
    throw new Error('Email delivery is not configured.');
  }
  try {
    await deliver(destination, code, purpose);
    return { delivered: true };
  } catch (error) {
    console.error('[email] Could not send the code:\n  ' + explainEmailError(error));
    if (!isProduction() && flag('DEV_SHOW_AUTH_CODES')) return { delivered: false, developmentCode: code }; // lets you keep testing locally
    throw new Error('We could not send the email right now. Please try again in a few minutes.'); // the user never sees technical details
  }
}

module.exports = { sendCode, deliver, verifyEmail, isConfigured, explainEmailError, emailConfig };