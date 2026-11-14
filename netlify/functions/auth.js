/* ==========================================================================
   System Portal — auth + OTP API (Netlify Function)
   --------------------------------------------------------------------------
   Real, email-verified account registration:

     action = send-otp     → validate profile, store pending registration,
                             email a 6-digit code via Brevo.
     action = verify-otp   → check the code (expiry, attempts, hash).
     action = complete     → requires verified OTP, set password, create user.
     action = login        → verify email + password against stored hash.
     action = ping         → deploy sanity check.

   Storage: Netlify Blobs (built into Netlify, no database to manage).
   Email:   Brevo transactional API (needs BREVO_API_KEY + a verified sender).

   Environment variables (set in the Netlify project):
     BREVO_API_KEY   required — from https://app.brevo.com → SMTP & API → API keys
     SENDER_EMAIL    required — the Brevo-verified sender email (e.g. your Gmail)
     SENDER_NAME     optional — default "System Portal"
     OTP_SECRET      optional — defaults to a key derived from BREVO_API_KEY
   ========================================================================== */

const crypto = require('crypto');
const { getStore, connectLambda } = require('@netlify/blobs');

const PBKDF2_ITERATIONS = 210000;
const OTP_TTL_MS = 10 * 60 * 1000;
const SEND_COOLDOWN_MS = 45 * 1000;
const MAX_SENDS_PER_WINDOW = 3;
const SEND_WINDOW_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
    body: JSON.stringify(body),
  };
}

function otpSecret() {
  return process.env.OTP_SECRET ||
    crypto.createHash('sha256').update(String(process.env.BREVO_API_KEY || 'otp-not-configured')).digest('hex');
}

function codeHash(code, email) {
  return crypto.createHmac('sha256', otpSecret())
    .update(email.toLowerCase() + ':' + code)
    .digest('hex');
}

function pbkdf2Hex(password, salt, iterations) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations || PBKDF2_ITERATIONS, 32, 'sha256', (err, derived) => {
      if (err) reject(err);
      else resolve(derived.toString('hex'));
    });
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GENDERS = new Set(['male', 'female', 'other']);
const ACTIVITIES = new Set(['sedentary', 'light', 'moderate', 'active', 'very']);
const GOALS = new Set(['lose', 'maintain', 'gain']);

function cleanName(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  return name.length >= 2 && name.length <= 60 ? name : null;
}

function cleanProfile(input) {
  const body = input || {};
  const name = cleanName(body.name);
  const email = String(body.email || '').trim().toLowerCase();
  const gender = String(body.gender || '').trim().toLowerCase();
  const dob = String(body.dob || '').trim();
  const heightCm = Number(body.heightCm);
  const weightKg = Number(body.weightKg);
  const activity = String(body.activity || 'moderate').trim().toLowerCase();
  const goal = String(body.goal || 'maintain').trim().toLowerCase();

  if (!name) return { error: 'Enter a full name (at least 2 characters).' };
  if (!EMAIL_RE.test(email) || email.length > 120) return { error: 'Enter a valid email address.' };
  if (!GENDERS.has(gender)) return { error: 'Select your gender.' };

  let age = Number(body.age);
  if (dob) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
    if (!match) return { error: 'Date of birth must be YYYY-MM-DD.' };
    const born = new Date(dob + 'T00:00:00Z');
    const now = new Date();
    if (isNaN(born.getTime()) || born > now) return { error: 'Date of birth cannot be in the future.' };
    age = Math.floor((now - born) / (365.25 * 24 * 3600 * 1000));
  }
  if (!Number.isFinite(age) || age < 13 || age > 100) return { error: 'You must be between 13 and 100 years old.' };
  if (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250) return { error: 'Height must be between 100 and 250 cm.' };
  if (!Number.isFinite(weightKg) || weightKg < 25 || weightKg > 300) return { error: 'Weight must be between 25 and 300 kg.' };
  if (!ACTIVITIES.has(activity)) return { error: 'Choose a valid activity level.' };
  if (!GOALS.has(goal)) return { error: 'Choose a valid goal.' };

  return {
    profile: {
      name, email, gender, dob: dob || null, age,
      heightCm: Math.round(heightCm * 10) / 10,
      weightKg: Math.round(weightKg * 10) / 10,
      activity, goal,
      createdAt: Date.now(),
    },
  };
}

function otpStore() {
  return getStore('system-portal-otp');
}

function userStore() {
  return getStore('system-portal-users');
}

async function sendOtpEmail(to, name, code) {
  const key = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL;
  if (!key || !senderEmail) {
    return { ok: false, error: 'Email delivery is not configured yet. Set BREVO_API_KEY and SENDER_EMAIL in the Netlify project.' };
  }
  const subject = 'System Portal — ' + code + ' is your verification code';
  const html = `
  <div style="background:#05060c;padding:32px 16px;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#e9edfb">
    <div style="max-width:480px;margin:0 auto;background:#0d1020;border:1px solid #232744;border-radius:16px;overflow:hidden">
      <div style="padding:18px 24px;border-bottom:3px solid #8b5cf6;background:#120a24">
        <span style="font-size:12px;letter-spacing:3px;color:#a78bfa;text-transform:uppercase">System Portal</span>
      </div>
      <div style="padding:28px 24px">
        <p style="margin:0 0 14px;font-size:16px">Hunter <b>${escapeHtml(name)}</b>,</p>
        <p style="margin:0 0 18px;font-size:14px;color:#b9c2dc">Someone (hopefully you) is registering a hunter profile. Your one-time verification code is:</p>
        <div style="text-align:center;margin:18px 0">
          <span style="display:inline-block;font-size:38px;letter-spacing:14px;font-weight:800;color:#c4b5fd;background:#160f2e;border:1px solid #3a2c63;padding:14px 18px 14px 28px;border-radius:14px">${code}</span>
        </div>
        <p style="margin:0 0 10px;font-size:13px;color:#b9c2dc">This code expires in 10 minutes. Never share it with anyone — System Portal will never ask for it.</p>
        <p style="margin:0;font-size:12px;color:#7a849f">Ignore this email if you did not request it.</p>
      </div>
    </div>
  </div>`;
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'accept': 'application/json', 'api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { name: process.env.SENDER_NAME || 'System Portal', email: senderEmail },
      to: [{ email: to, name }],
      subject,
      htmlContent: html,
    }),
  });
  if (!resp.ok) {
    let detail = '';
    try { detail = (await resp.text()).slice(0, 300); } catch (_) { detail = ''; }
    return { ok: false, error: 'Brevo rejected the request (HTTP ' + resp.status + '). ' + detail };
  }
  return { ok: true };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' }, body: '' };
  }
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'POST only.' });

  // Connect the function to its Blobs context (siteID + token from the platform).
  try { connectLambda(event); } catch (err) {
    console.error('blobs connectLambda failed:', err && err.message ? err.message : err);
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (_) { return json(400, { ok: false, error: 'Malformed JSON body.' }); }
  const action = String(body.action || '').trim();

  try {
    if (action === 'ping') return json(200, { ok: true, version: 1 });

    if (action === 'send-otp') {
      const cleaned = cleanProfile(body.profile || body);
      if (cleaned.error) return json(400, { ok: false, error: cleaned.error });
      const profile = cleaned.profile;
      const key = profile.email;

      const otp = await otpStore().get(key, { type: 'json' });
      const now = Date.now();
      if (otp) {
        if (now - (otp.lastSentAt || 0) < SEND_COOLDOWN_MS) {
          return json(429, { ok: false, error: 'A code was just sent. Wait a moment and check your inbox (and spam folder).' });
        }
        const recent = (otp.sends || []).filter((t) => now - t < SEND_WINDOW_MS);
        if (recent.length >= MAX_SENDS_PER_WINDOW) {
          return json(429, { ok: false, error: 'Too many codes requested. Wait 30 minutes and try again.' });
        }
      }

      const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      const record = {
        ...profile,
        sends: (otp && (otp.sends || []).filter((t) => now - t < SEND_WINDOW_MS) || []).concat([now]),
        lastSentAt: now,
        codeHash: codeHash(code, key),
        expiresAt: now + OTP_TTL_MS,
        attempts: 0,
        verified: false,
      };
      await otpStore().setJSON(key, record);

      const sent = await sendOtpEmail(key, profile.name, code);
      if (!sent.ok) return json(502, { ok: false, error: sent.error });
      return json(200, { ok: true, expiresAt: record.expiresAt });
    }

    if (action === 'verify-otp') {
      const email = String(body.email || '').trim().toLowerCase();
      const code = String(body.code || '').trim();
      if (!EMAIL_RE.test(email)) return json(400, { ok: false, error: 'Enter the email you used.' });
      if (!/^\d{6}$/.test(code)) return json(400, { ok: false, error: 'The code is 6 digits.' });

      const record = await otpStore().get(email, { type: 'json' });
      if (!record) return json(400, { ok: false, error: 'No pending registration for that email. Request a new code.' });
      if (Date.now() > record.expiresAt) return json(400, { ok: false, error: 'That code has expired. Request a new one.' });
      if ((record.attempts || 0) >= MAX_ATTEMPTS) return json(429, { ok: false, error: 'Too many wrong attempts. Request a new code.' });

      if (codeHash(code, email) !== record.codeHash) {
        record.attempts = (record.attempts || 0) + 1;
        await otpStore().setJSON(email, record);
        const left = Math.max(0, MAX_ATTEMPTS - record.attempts);
        return json(400, { ok: false, error: 'Wrong code. ' + (left ? left + ' attempt(s) left.' : 'Request a new code.') });
      }
      record.verified = true;
      record.verifiedAt = Date.now();
      record.attempts = 0;
      await otpStore().setJSON(email, record);
      return json(200, { ok: true });
    }

    if (action === 'complete') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!EMAIL_RE.test(email)) return json(400, { ok: false, error: 'Enter the email you registered.' });
      if (password.length < 8) return json(400, { ok: false, error: 'Use a password with at least 8 characters.' });
      if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        return json(400, { ok: false, error: 'Use letters and numbers in your password.' });
      }

      const record = await otpStore().get(email, { type: 'json' });
      if (!record || !record.verified) {
        return json(400, { ok: false, error: 'Verify the emailed code before setting a password.' });
      }
      if (Date.now() - (record.verifiedAt || 0) > OTP_TTL_MS) {
        return json(400, { ok: false, error: 'Verification expired. Request a new code and try again.' });
      }

      const existing = await userStore().get(email, { type: 'json' });
      if (existing) return json(409, { ok: false, error: 'An account already exists for that email. Sign in instead.' });

      const salt = crypto.randomBytes(16).toString('hex');
      const hash = await pbkdf2Hex(password, salt, PBKDF2_ITERATIONS);
      const user = {
        name: record.name, email, gender: record.gender, dob: record.dob, age: record.age,
        heightCm: record.heightCm, weightKg: record.weightKg,
        activity: record.activity, goal: record.goal,
        role: 'member', salt, hash, iterations: PBKDF2_ITERATIONS,
        createdAt: record.createdAt || Date.now(),
      };
      await userStore().setJSON(email, user);
      await otpStore().delete(email);
      return json(200, {
        ok: true,
        user: {
          name: user.name, email: user.email, gender: user.gender, dob: user.dob, age: user.age,
          heightCm: user.heightCm, weightKg: user.weightKg, activity: user.activity,
          goal: user.goal, role: user.role, provider: 'online', createdAt: user.createdAt,
        },
      });
    }

    if (action === 'login') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!EMAIL_RE.test(email) || !password) return json(400, { ok: false, error: 'Enter your email and password.' });

      const user = await userStore().get(email, { type: 'json' });
      if (!user || !user.hash) return json(401, { ok: false, error: 'No account found for that email. Register first.' });
      const candidate = await pbkdf2Hex(password, user.salt, user.iterations || PBKDF2_ITERATIONS);
      const a = Buffer.from(candidate, 'hex');
      const b = Buffer.from(user.hash, 'hex');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return json(401, { ok: false, error: 'Wrong password.' });
      }
      return json(200, {
        ok: true,
        user: {
          name: user.name, email: user.email, gender: user.gender, dob: user.dob, age: user.age,
          heightCm: user.heightCm, weightKg: user.weightKg, activity: user.activity,
          goal: user.goal, role: user.role, provider: 'online', createdAt: user.createdAt,
        },
      });
    }

    if (action === 'sync') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!EMAIL_RE.test(email) || !password) return json(400, { ok: false, error: 'Enter your email and password.' });
      const user = await userStore().get(email, { type: 'json' });
      if (!user) return json(401, { ok: false, error: 'No account found.' });
      const candidate = await pbkdf2Hex(password, user.salt, user.iterations || PBKDF2_ITERATIONS);
      if (Buffer.from(candidate, 'hex').length !== Buffer.from(user.hash, 'hex').length ||
          !crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(user.hash, 'hex'))) {
        return json(401, { ok: false, error: 'Wrong password.' });
      }
      return json(200, { ok: true, user });
    }

    return json(400, { ok: false, error: 'Unknown action.' });
  } catch (err) {
    console.error('auth function error:', err);
    return json(500, { ok: false, error: 'Server error: ' + (err && err.message ? err.message : 'unknown') });
  }
};
