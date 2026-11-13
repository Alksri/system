/* ==========================================================================
   SYSTEM PORTAL — Authentication (client-side, static build)
   --------------------------------------------------------------------------
   Two real sign-in methods:
     • Google Identity Services (when a real OAuth client ID is configured)
     • Local accounts, hashed with PBKDF2-SHA-256 (210,000 iterations) via
       the Web Crypto API and a random 16-byte salt per account.

   Honest limits of a static site:
     • Accounts and sessions live in this browser's localStorage only.
     • There is no server, so a Google ID token's signature cannot be
       verified. The token's audience and expiry are checked, and the profile
       is read from the token payload. Do not treat this as bank-grade auth.
   ========================================================================== */
(function () {
  'use strict';

  var SESSION_KEY = 'system_portal_session_v1';
  var USERS_KEY = 'system_portal_users_v1';
  var PBKDF2_ITERATIONS = 210000;

  function config() {
    return window.SYSTEM_CONFIG || {};
  }

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function getUsers() {
    var users = readJSON(USERS_KEY, {});
    return users && typeof users === 'object' ? users : {};
  }

  function saveUsers(users) {
    return writeJSON(USERS_KEY, users);
  }

  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  function isExpired(session) {
    return !session ||
      !session.email ||
      typeof session.expiresAt !== 'number' ||
      Date.now() >= session.expiresAt;
  }

  function currentUser() {
    var session = readJSON(SESSION_KEY, null);
    return isExpired(session) ? null : session;
  }

  function sessionHours() {
    var hours = Number(config().sessionHours);
    return hours > 0 && hours <= 24 * 30 ? hours : 12;
  }

  function startSession(profile) {
    var session = {
      email: String(profile.email || '').toLowerCase(),
      name: profile.name || profile.email,
      picture: profile.picture || '',
      provider: profile.provider || 'local',
      issuedAt: Date.now(),
      expiresAt: Date.now() + sessionHours() * 3600 * 1000
    };
    writeJSON(SESSION_KEY, session);
    return session;
  }

  function signOut() {
    clearSession();
    location.replace('login.html');
  }

  /* ---- redirects ------------------------------------------------------- */

  function safeNext(next) {
    if (!next) return 'index.html';
    if (/^[a-z][a-z0-9+.-]*:/i.test(next)) return 'index.html';
    if (next.indexOf('//') === 0) return 'index.html';
    if (next.indexOf('\\\\') === 0) return 'index.html';
    return next;
  }

  function loginUrl() {
    var page = location.pathname.split('/').pop() || 'index.html';
    var next = page + location.search + location.hash;
    return 'login.html?next=' + encodeURIComponent(next);
  }

  // Called from a <script> in the <head> of every protected page, before
  // the body is parsed, so no protected content ever paints.
  function requireAuth() {
    var session = readJSON(SESSION_KEY, null);
    if (isExpired(session)) {
      clearSession();
      location.replace(loginUrl());
      return null;
    }
    return session;
  }

  /* ---- crypto ---------------------------------------------------------- */

  function bytesToB64(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function b64ToBytes(b64) {
    var binary = atob(b64);
    var out = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }

  function randomSalt() {
    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return bytesToB64(bytes);
  }

  function hasWebCrypto() {
    return !!(window.crypto && window.crypto.subtle && window.crypto.getRandomValues);
  }

  async function derive(password, saltB64) {
    var encoder = new TextEncoder();
    var key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    var bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: b64ToBytes(saltB64),
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      key,
      256
    );
    return bytesToB64(new Uint8Array(bits));
  }

  function normaliseEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  function hasLocalAccount(email) {
    var users = getUsers();
    var record = users[normaliseEmail(email)];
    return !!(record && record.provider === 'local');
  }

  async function signUpLocal(input) {
    if (!hasWebCrypto()) {
      return { ok: false, error: 'This browser cannot hash passwords (Web Crypto unavailable). Open the site over http://localhost, not a file path.' };
    }
    var name = String((input && input.name) || '').trim();
    var email = normaliseEmail(input && input.email);
    var password = String((input && input.password) || '');

    if (name.length < 2) return { ok: false, error: 'Enter a name with at least 2 characters.' };
    if (!validEmail(email)) return { ok: false, error: 'Enter a valid email address.' };
    if (password.length < 8) return { ok: false, error: 'Use a password with at least 8 characters.' };

    var users = getUsers();
    if (users[email]) {
      return { ok: false, error: 'An account with this email already exists. Sign in instead.' };
    }

    var salt = randomSalt();
    var hash = await derive(password, salt);
    users[email] = {
      email: email,
      name: name,
      provider: 'local',
      salt: salt,
      hash: hash,
      iterations: PBKDF2_ITERATIONS,
      createdAt: Date.now()
    };
    if (!saveUsers(users)) {
      return { ok: false, error: 'Browser storage is full or blocked, so the account could not be saved.' };
    }
    return { ok: true, session: startSession(users[email]) };
  }

  async function ensureAdminAccount() {
    var cfg = config();
    var email = normaliseEmail(cfg.adminEmail);
    var password = String(cfg.adminPassword || '');
    if (!email || !validEmail(email) || password.length < 8) return null;
    if (!hasWebCrypto()) return null;

    var users = getUsers();
    if (users[email] && users[email].provider === 'local' && users[email].isAdmin) {
      return users[email];
    }

    var salt = randomSalt();
    var hash = await derive(password, salt);
    users[email] = {
      email: email,
      name: String(cfg.adminName || 'System Admin'),
      provider: 'local',
      salt: salt,
      hash: hash,
      iterations: PBKDF2_ITERATIONS,
      createdAt: (users[email] && users[email].createdAt) || Date.now(),
      isAdmin: true
    };
    saveUsers(users);
    return users[email];
  }

  async function signInLocal(input) {
    if (!hasWebCrypto()) {
      return { ok: false, error: 'This browser cannot hash passwords. Open the site over http://localhost.' };
    }
    var email = normaliseEmail(input && input.email);
    var password = String((input && input.password) || '');
    var cfg = config();

    // Ensure the configured admin account exists before checking credentials.
    if (email && email === normaliseEmail(cfg.adminEmail)) {
      await ensureAdminAccount();
    }

    var users = getUsers();
    var record = users[email];

    if (!record) {
      return { ok: false, error: 'No account found for that email. Create one first.' };
    }
    if (record.provider !== 'local') {
      return { ok: false, error: 'That account uses Google Sign-In. Use the Google button above.' };
    }

    var hash = await derive(password, record.salt);
    if (hash !== record.hash) {
      return { ok: false, error: 'Incorrect password. Try again.' };
    }
    return { ok: true, session: startSession(record) };
  }

  /* ---- Google Identity Services ---------------------------------------- */

  function googleClientId() {
    return String(config().googleClientId || '').trim();
  }

  function googleConfigured() {
    var id = googleClientId();
    return id.length > 20 && id.indexOf('YOUR_') !== 0 && /\.apps\.googleusercontent\.com$/.test(id);
  }

  function decodeJwtPayload(token) {
    var parts = String(token || '').split('.');
    if (parts.length !== 3) throw new Error('Malformed Google credential.');
    var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var bytes = b64ToBytes(b64);
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  // The credential callback from Google Identity Services.
  function signInWithGoogleCredential(token) {
    var clientId = googleClientId();
    if (!googleConfigured()) {
      throw new Error('Google Sign-In is not configured. Add a client ID in scripts/config.js.');
    }
    var payload = decodeJwtPayload(token);

    if (payload.aud !== clientId) {
      throw new Error('This Google credential was issued for a different application.');
    }
    if (!payload.exp || payload.exp * 1000 <= Date.now()) {
      throw new Error('The Google credential has expired. Try again.');
    }
    if (!payload.email) {
      throw new Error('Google did not return an email address for this account.');
    }
    if (payload.email_verified === false) {
      throw new Error('Google reports this email address is not verified.');
    }

    var users = getUsers();
    var email = normaliseEmail(payload.email);
    var existing = users[email] || {};
    users[email] = {
      email: email,
      name: payload.name || existing.name || email,
      provider: 'google',
      picture: payload.picture || existing.picture || '',
      googleSub: payload.sub || existing.googleSub || '',
      updatedAt: Date.now(),
      // Recorded honestly: a static app cannot verify the token signature.
      signatureVerified: false
    };
    saveUsers(users);
    return startSession(users[email]);
  }

  /* ---- session sync across tabs ---------------------------------------- */

  window.addEventListener('storage', function (event) {
    if (event.key !== SESSION_KEY) return;
    if (!event.newValue) {
      var page = location.pathname.split('/').pop() || 'index.html';
      if (page !== 'login.html') location.replace('login.html');
    }
  });

  // Best-effort: seed the configured admin account when crypto is ready.
  if (typeof ensureAdminAccount === 'function') {
    try { ensureAdminAccount(); } catch (e) {}
  }

  window.SystemAuth = {
    requireAuth: requireAuth,
    currentUser: currentUser,
    signOut: signOut,
    safeNext: safeNext,
    signUpLocal: signUpLocal,
    signInLocal: signInLocal,
    signInWithGoogleCredential: signInWithGoogleCredential,
    googleConfigured: googleConfigured,
    googleClientId: googleClientId,
    hasLocalAccount: hasLocalAccount,
    hasWebCrypto: hasWebCrypto,
    ensureAdminAccount: ensureAdminAccount,
    sessionHours: sessionHours,
    iterations: PBKDF2_ITERATIONS
  };
})();
