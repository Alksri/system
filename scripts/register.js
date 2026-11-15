/* ==========================================================================
   System Portal — Registration (profile + choose auth method)
   ========================================================================== */
(function () {
  'use strict';

  var els = {
    form: document.getElementById('reg-form'),
    name: document.getElementById('reg-name'),
    gender: document.getElementById('reg-gender'),
    email: document.getElementById('reg-email'),
    dob: document.getElementById('reg-dob'),
    height: document.getElementById('reg-height'),
    weight: document.getElementById('reg-weight'),
    activity: document.getElementById('reg-activity'),
    goal: document.getElementById('reg-goal'),
    ageValue: document.getElementById('reg-age-value'),
    ageHint: document.getElementById('reg-age-hint'),
    error: document.getElementById('reg-error'),
    createEmail: document.getElementById('reg-create-email'),
    passwordSection: document.getElementById('reg-password-section'),
    password: document.getElementById('reg-password'),
    strength: document.getElementById('reg-strength-fill'),
    passMatch: document.getElementById('reg-pass-match'),
    create: document.getElementById('reg-create'),
    cancelPassword: document.getElementById('reg-cancel-password'),
    gsiRow: document.getElementById('gsi-button-row'),
    gsiButton: document.getElementById('gsi-button'),
    gsiNote: document.getElementById('gsi-note'),
    divider: document.getElementById('reg-divider'),
    success: document.getElementById('reg-success'),
    welcomeName: document.getElementById('reg-welcome-name'),
    enter: document.getElementById('reg-enter')
  };

  var next = SystemAuth.safeNext(new URLSearchParams(location.search).get('next'));
  if (SystemAuth.currentUser()) {
    location.replace(next);
    return;
  }

  var nativeApp = false;
  try {
    nativeApp = !!(window.SystemAppBridge && window.SystemAppBridge.isApp && window.SystemAppBridge.isApp());
  } catch (e) { nativeApp = false; }
  if (nativeApp) document.documentElement.classList.add('native-android');

  function computeAge(dobValue) {
    if (!dobValue) return null;
    var born = new Date(dobValue + 'T00:00:00Z');
    if (isNaN(born.getTime())) return null;
    var now = new Date();
    if (born > now) return null;
    return Math.floor((now - born) / (365.25 * 24 * 3600 * 1000));
  }

  function paintAge() {
    if (!els.dob || !els.ageHint) return;
    var age = computeAge(els.dob.value);
    if (age == null) { els.ageHint.hidden = true; return; }
    els.ageHint.hidden = false;
    if (els.ageValue) els.ageValue.textContent = String(age);
  }
  if (els.dob) els.dob.addEventListener('input', paintAge);
  paintAge();

  function showError(msg) {
    if (!els.error) return;
    els.error.textContent = msg || '';
    els.error.classList.toggle('visible', !!msg);
  }

  function collect() {
    var dob = (els.dob && els.dob.value) || '';
    var age = computeAge(dob);
    return {
      name: String((els.name && els.name.value) || '').trim().replace(/\s+/g, ' '),
      email: String((els.email && els.email.value) || '').trim().toLowerCase(),
      gender: String((els.gender && els.gender.value) || ''),
      dob: dob,
      age: age == null ? 0 : age,
      heightCm: Number((els.height && els.height.value) || 0),
      weightKg: Number((els.weight && els.weight.value) || 0),
      activity: String((els.activity && els.activity.value) || 'moderate'),
      goal: String((els.goal && els.goal.value) || 'maintain')
    };
  }

  function validate(p) {
    if (p.name.length < 2) return 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email)) return 'Enter a valid email address.';
    if (!p.gender) return 'Select your gender.';
    if (!p.dob) return 'Enter your date of birth.';
    if (p.age < 13 || p.age > 100) return 'You must be between 13 and 100 years old.';
    if (!(p.heightCm >= 100 && p.heightCm <= 250)) return 'Height must be between 100 and 250 cm.';
    if (!(p.weightKg >= 25 && p.weightKg <= 300)) return 'Weight must be between 25 and 300 kg.';
    return '';
  }

  function profileFor(p, provider) {
    return {
      name: p.name, email: p.email, gender: p.gender, dob: p.dob, age: p.age,
      heightCm: p.heightCm, weightKg: p.weightKg, activity: p.activity, goal: p.goal,
      provider: provider || 'local', createdAt: Date.now()
    };
  }

  function finish(profile) {
    var built = profileFor(profile, profile.provider);
    SystemAuth.saveProfile(built.email, built);
    if (els.welcomeName) {
      els.welcomeName.textContent = (built.name || 'Hunter').split(' ')[0];
    }
    if (els.form) els.form.hidden = true;
    if (els.success) els.success.hidden = false;
  }

  /* Password strength */
  function paintStrength() {
    var pw = String((els.password && els.password.value) || '');
    var score = [pw.length >= 8, /[a-zA-Z]/.test(pw), /[0-9]/.test(pw)].filter(Boolean).length;
    if (els.strength) {
      els.strength.style.width = (score / 3) * 100 + '%';
      els.strength.className = score === 3 ? 'ok' : (score === 2 ? 'mid' : 'low');
    }
  }
  if (els.password) els.password.addEventListener('input', paintStrength);

  /* ---------- Create with email (reveals password fields) ---------- */
  if (els.createEmail && els.passwordSection) {
    els.createEmail.addEventListener('click', function () {
      var p = collect();
      var err = validate(p);
      if (err) { showError(err); return; }
      showError('');
      els.passwordSection.hidden = false;
      els.createEmail.hidden = true;
      els.divider.hidden = true;
      els.gsiRow.hidden = true;
      if (els.password) els.password.focus();
    });
  }

  if (els.cancelPassword) {
    els.cancelPassword.addEventListener('click', function () {
      els.passwordSection.hidden = true;
      els.createEmail.hidden = false;
      els.divider.hidden = false;
      els.gsiRow.hidden = false;
      showError('');
    });
  }

  /* ---------- Submit: local account ---------- */
  if (els.form) {
    els.form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var p = collect();
      var err = validate(p);
      if (err) { showError(err); return; }
      var pw = String((els.password && els.password.value) || '');
      if (pw.length < 8) { showError('Use a password with at least 8 characters.'); return; }
      if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) { showError('Include letters and at least one number.'); return; }
      showError('');
      try {
        var result = await SystemAuth.signUpLocal({ name: p.name, email: p.email, password: pw });
        if (!result || !result.ok) {
          showError((result && result.error) || 'Could not create the account.');
          return;
        }
        finish(Object.assign(p, { provider: 'local' }));
      } catch (e2) {
        showError(e2 && e2.message ? e2.message : 'Something went wrong. Try again.');
      }
    });
  }

  /* ---------- Google sign-in ---------- */
  var gsiReady = false;
  function gsiConfigured() {
    var c = window.SYSTEM_CONFIG || {};
    return String(c.googleClientId || '').length > 20;
  }

  function loadGis() {
    return new Promise(function (resolve, reject) {
      if (window.google && window.google.accounts && window.google.accounts.id) return resolve();
      var existing = document.querySelector('script[data-gsi]');
      if (existing) {
        existing.addEventListener('load', resolve);
        existing.addEventListener('error', function () { reject(new Error('Google script failed to load.')); });
        return;
      }
      var script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.setAttribute('data-gsi', '1');
      script.onload = resolve;
      script.onerror = function () { reject(new Error('Google Identity Services could not be loaded. Check your connection or content blocker.')); };
      document.head.appendChild(script);
    });
  }

  if (gsiConfigured()) {
    loadGis().then(function () {
      gsiReady = true;
      window.google.accounts.id.initialize({
        client_id: window.SYSTEM_CONFIG.googleClientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: function (response) {
          var p = collect();
          var err = validate(p);
          if (err) { showError(err); return; }
          showError('');
          try {
            SystemAuth.signInWithGoogleCredential(response.credential);
            finish(Object.assign(p, { provider: 'google', email: p.email }));
          } catch (e3) {
            showError(e3 && e3.message ? e3.message : 'Google sign-in failed.');
          }
        }
      });
      if (els.gsiButton) {
        window.google.accounts.id.renderButton(els.gsiButton, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: Math.min(360, els.gsiButton.parentElement.clientWidth || 360)
        });
      }
    }, function () {
      gsiReady = false;
      if (els.gsiNote) els.gsiNote.hidden = false;
      if (els.gsiRow) els.gsiRow.hidden = true;
    });
  } else {
    if (els.gsiNote) els.gsiNote.hidden = false;
    if (els.gsiRow) els.gsiRow.hidden = true;
  }

  if (els.enter) {
    els.enter.addEventListener('click', function () { location.replace(next); });
  }
})();
