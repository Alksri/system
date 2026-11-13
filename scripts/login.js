/* ==========================================================================
   SYSTEM PORTAL — Login screen controller
   ========================================================================== */
(function () {
  'use strict';

  var mode = 'signin';
  var busy = false;

  var els = {
    title: document.getElementById('auth-title'),
    sub: document.getElementById('auth-sub'),
    tabIn: document.getElementById('tab-signin'),
    tabUp: document.getElementById('tab-signup'),
    nameField: document.getElementById('auth-name-field'),
    name: document.getElementById('auth-name'),
    email: document.getElementById('auth-email'),
    password: document.getElementById('auth-password'),
    passHint: document.getElementById('auth-pass-hint'),
    form: document.getElementById('auth-form'),
    submit: document.getElementById('auth-submit'),
    error: document.getElementById('auth-error'),
    success: document.getElementById('auth-success'),
    slot: document.getElementById('gsi-slot'),
    googleNote: document.getElementById('google-note'),
    divider: document.getElementById('auth-divider'),
    hours: document.getElementById('auth-hours')
  };

  var next = SystemAuth.safeNext(new URLSearchParams(location.search).get('next'));

  if (els.hours) els.hours.textContent = String(SystemAuth.sessionHours());

  // Show configured admin credentials (real, from config).
  var cfg = window.SYSTEM_CONFIG || {};
  var adminEmailEl = document.getElementById('admin-email');
  var adminPassEl = document.getElementById('admin-password');
  if (adminEmailEl && cfg.adminEmail) adminEmailEl.textContent = cfg.adminEmail;
  if (adminPassEl && cfg.adminPassword) adminPassEl.textContent = cfg.adminPassword;

  // Already signed in? Go straight through.
  if (SystemAuth.currentUser()) {
    location.replace(next);
    return;
  }

  /* ---- Visual animation (particles) ------------------------------------ */
  (function initAuthCanvas() {
    var canvas = document.getElementById('auth-canvas');
    if (!canvas) return;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var W = 0, H = 0;
    var particles = [];

    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      W = rect.width || window.innerWidth;
      H = rect.height || window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.min(70, Math.max(28, Math.round(W / 18)));
      particles = [];
      for (var i = 0; i < count; i++) particles.push(make(true));
    }

    function make(spawnAnywhere) {
      var cyan = Math.random() > 0.65;
      return {
        x: Math.random() * W,
        y: spawnAnywhere ? Math.random() * H : H + 20,
        r: Math.random() * 1.8 + 0.35,
        vx: (Math.random() - 0.5) * 0.22,
        vy: -(0.12 + Math.random() * 0.38),
        a: 0.12 + Math.random() * 0.5,
        tw: Math.random() * Math.PI * 2,
        ts: 0.006 + Math.random() * 0.014,
        hue: cyan ? '56,189,248' : '167,139,250'
      };
    }

    function draw() {
      requestAnimationFrame(draw);
      if (document.hidden) return;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx + Math.sin(p.tw) * 0.08;
        p.y += p.vy;
        p.tw += p.ts;
        var alpha = p.a * (0.5 + 0.5 * Math.sin(p.tw * 1.3));
        if (p.y < -24 || p.x < -24 || p.x > W + 24) {
          particles[i] = make(false);
          continue;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + p.hue + ',' + alpha.toFixed(3) + ')';
        ctx.fill();
        // soft glow
        if (p.r > 1.2) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + p.hue + ',' + (alpha * 0.12).toFixed(3) + ')';
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(draw);
  })();

  function showError(message) {
    if (!els.error) return;
    els.error.textContent = message;
    els.error.classList.add('show');
    if (els.success) els.success.classList.remove('show');
  }

  function clearMessage() {
    if (els.error) els.error.classList.remove('show');
    if (els.success) els.success.classList.remove('show');
  }

  function setBusy(value) {
    busy = value;
    if (els.submit) {
      els.submit.disabled = value;
      els.submit.classList.toggle('auth-busy', value);
      els.submit.textContent = value
        ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
        : (mode === 'signup' ? 'Create account' : 'Sign in');
    }
  }

  function setMode(value) {
    mode = value;
    var signup = value === 'signup';
    if (els.tabIn) {
      els.tabIn.classList.toggle('active', !signup);
      els.tabIn.setAttribute('aria-selected', String(!signup));
    }
    if (els.tabUp) {
      els.tabUp.classList.toggle('active', signup);
      els.tabUp.setAttribute('aria-selected', String(signup));
    }
    if (els.nameField) els.nameField.hidden = !signup;
    if (els.name) els.name.required = signup;
    if (els.title) els.title.textContent = signup ? 'Create your profile' : 'Welcome back';
    if (els.sub) {
      els.sub.textContent = signup
        ? 'A local account keeps your quests and stats separate from anyone else using this browser.'
        : 'Sign in with Google, or use a local account stored in this browser.';
    }
    if (els.password) {
      els.password.autocomplete = signup ? 'new-password' : 'current-password';
    }
    if (els.passHint) {
      els.passHint.textContent = signup
        ? 'At least 8 characters'
        : 'Hashed with PBKDF2-SHA-256';
    }
    if (els.submit) els.submit.textContent = signup ? 'Create account' : 'Sign in';
    clearMessage();
  }

  function finish() {
    location.replace(next);
  }

  if (els.tabIn) els.tabIn.addEventListener('click', function () { setMode('signin'); });
  if (els.tabUp) els.tabUp.addEventListener('click', function () { setMode('signup'); });

  if (els.form) {
    els.form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (busy) return;
      clearMessage();

      var payload = {
        name: (els.name && els.name.value) || '',
        email: (els.email && els.email.value) || '',
        password: (els.password && els.password.value) || ''
      };

      if (!payload.email.trim()) { showError('Enter your email address.'); return; }
      if (!payload.password) { showError('Enter your password.'); return; }

      setBusy(true);
      try {
        var result = mode === 'signup'
          ? await SystemAuth.signUpLocal(payload)
          : await SystemAuth.signInLocal(payload);

        if (!result.ok) {
          setBusy(false);
          showError(result.error);
          return;
        }
        finish();
      } catch (err) {
        setBusy(false);
        showError(err && err.message ? err.message : 'Sign-in failed. Try again.');
      }
    });
  }

  /* ---- Google Identity Services ---------------------------------------- */

  function loadGis() {
    return new Promise(function (resolve, reject) {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        resolve();
        return;
      }
      var existing = document.querySelector('script[data-gsi]');
      if (existing) {
        existing.addEventListener('load', function () { resolve(); });
        existing.addEventListener('error', function () { reject(new Error('Google script failed to load.')); });
        return;
      }
      var script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.setAttribute('data-gsi', '1');
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Google Identity Services could not be loaded. Check your connection or content blocker.')); };
      document.head.appendChild(script);
    });
  }

  function initGoogle() {
    if (!SystemAuth.googleConfigured()) {
      if (els.slot) els.slot.hidden = true;
      if (els.googleNote) els.googleNote.hidden = false;
      return;
    }

    loadGis().then(function () {
      window.google.accounts.id.initialize({
        client_id: SystemAuth.googleClientId(),
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: function (response) {
          clearMessage();
          try {
            SystemAuth.signInWithGoogleCredential(response.credential);
            finish();
          } catch (err) {
            showError(err && err.message ? err.message : 'Google sign-in failed.');
          }
        }
      });

      if (els.slot) {
        window.google.accounts.id.renderButton(els.slot, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: Math.min(360, (els.slot.clientWidth || 360))
        });
      }
      if (els.googleNote) els.googleNote.hidden = true;
    }).catch(function (err) {
      if (els.googleNote) els.googleNote.hidden = false;
      showError(err.message);
    });
  }

  setMode('signin');
  initGoogle();
})();
