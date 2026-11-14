/* ==========================================================================
   System Portal — Registration wizard (three steps)
   ========================================================================== */
(function () {
  'use strict';

  var els = {
    title: document.getElementById('reg-title'),
    progress: document.getElementById('reg-progress-fill'),
    steps: [
      document.getElementById('reg-step-1'),
      document.getElementById('reg-step-2'),
      document.getElementById('reg-step-3')
    ],
    indicators: [
      document.getElementById('reg-indicator-1'),
      document.getElementById('reg-indicator-2'),
      document.getElementById('reg-indicator-3')
    ],
    // Step 1
    name: document.getElementById('reg-name'),
    gender: document.getElementById('reg-gender'),
    email: document.getElementById('reg-email'),
    dob: document.getElementById('reg-dob'),
    height: document.getElementById('reg-height'),
    weight: document.getElementById('reg-weight'),
    activity: document.getElementById('reg-activity'),
    goal: document.getElementById('reg-goal'),
    error1: document.getElementById('reg-error-1'),
    sendOtp: document.getElementById('reg-send-otp'),
    ageValue: document.getElementById('reg-age-value'),
    ageHint: document.getElementById('reg-age-hint'),
    // Step 2
    otpBox: document.getElementById('reg-otp'),
    otpEmail: document.getElementById('reg-otp-email'),
    error2: document.getElementById('reg-error-2'),
    verify: document.getElementById('reg-verify'),
    resend: document.getElementById('reg-resend'),
    changeEmail: document.getElementById('reg-change-email'),
    // Step 3
    password: document.getElementById('reg-password'),
    confirm: document.getElementById('reg-confirm'),
    strength: document.getElementById('reg-strength-fill'),
    rules: document.getElementById('reg-rules'),
    error3: document.getElementById('reg-error-3'),
    finish: document.getElementById('reg-finish'),
    lockEmail: document.getElementById('reg-lock-email'),
    // Success
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

  var state = {
    step: 1,
    sending: false,
    verifying: false,
    finishing: false,
    email: '',
    resendAt: 0
  };

  function computeAge(dobValue) {
    if (!dobValue) return null;
    var born = new Date(dobValue + 'T00:00:00Z');
    if (isNaN(born.getTime())) return null;
    var now = new Date();
    if (born > now) return null;
    return Math.floor((now - born) / (365.25 * 24 * 3600 * 1000));
  }

  function showError(el, message) {
    if (!el) return;
    if (!message) { el.textContent = ''; el.classList.remove('visible'); return; }
    el.textContent = message;
    el.classList.add('visible');
  }

  function clearErrors() {
    [els.error1, els.error2, els.error3].forEach(function (el) { showError(el, ''); });
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    button.disabled = busy;
    if (busy && label) {
      button.dataset.label = button.textContent;
      button.textContent = label;
    } else if (button.dataset.label) {
      button.textContent = button.dataset.label;
    }
  }

  function setStep(step) {
    state.step = step;
    els.steps.forEach(function (form, index) {
      if (form) form.hidden = (index + 1) !== step;
    });
    els.indicators.forEach(function (el, index) {
      if (!el) return;
      el.classList.toggle('active', index + 1 === step);
      el.classList.toggle('done', index + 1 < step);
    });
    if (els.progress) els.progress.style.width = (step / 3) * 100 + '%';
    clearErrors();
    if (step === 2 && els.otpBox) {
      var first = els.otpBox.querySelector('.otp-digit');
      if (first) first.focus();
    }
    if (step === 3 && els.password) els.password.focus();
  }

  function otpDigits() {
    return Array.prototype.slice.call(els.otpBox ? els.otpBox.querySelectorAll('.otp-digit') : []);
  }

  function otpValue() {
    return otpDigits().map(function (input) { return input.value.trim(); }).join('');
  }

  function fillOtp(value) {
    var digits = otpDigits();
    String(value || '').replace(/\D/g, '').slice(0, 6).split('').forEach(function (ch, i) {
      if (digits[i]) digits[i].value = ch;
    });
  }

  function setResendCooldown(seconds) {
    state.resendAt = Date.now() + seconds * 1000;
    paintResend();
    if (state.resendTimer) clearInterval(state.resendTimer);
    state.resendTimer = setInterval(paintResend, 500);
  }

  function paintResend() {
    var left = Math.max(0, Math.ceil((state.resendAt - Date.now()) / 1000));
    if (left > 0) {
      els.resend.disabled = true;
      els.resend.textContent = 'Resend code (' + left + 's)';
    } else {
      els.resend.disabled = false;
      els.resend.textContent = 'Resend code';
      if (state.resendTimer) { clearInterval(state.resendTimer); state.resendTimer = null; }
    }
  }

  function collectProfile() {
    var dob = (els.dob && els.dob.value) || '';
    var age = computeAge(dob);
    return {
      name: String((els.name && els.name.value) || '').trim().replace(/\s+/g, ' '),
      email: String((els.email && els.email.value) || '').trim().toLowerCase(),
      gender: String((els.gender && els.gender.value) || ''),
      dob: dob,
      age: age == null ? NaN : age,
      heightCm: Number((els.height && els.height.value) || 0),
      weightKg: Number((els.weight && els.weight.value) || 0),
      activity: String((els.activity && els.activity.value) || 'moderate'),
      goal: String((els.goal && els.goal.value) || 'maintain')
    };
  }

  function gmailOk(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && /@gmail\.com$/i.test(email);
  }

  function validateProfile() {
    var p = collectProfile();
    if (p.name.length < 2) return { error: 'Enter your full name (at least 2 characters).' };
    if (!gmailOk(p.email)) return { error: 'Use your Gmail address — e.g. you@gmail.com' };
    if (!p.gender) return { error: 'Select your gender.' };
    if (!p.dob) return { error: 'Enter your date of birth.' };
    if (p.age == null || p.age < 13 || p.age > 100) return { error: 'You must be between 13 and 100 years old.' };
    if (!(p.heightCm >= 100 && p.heightCm <= 250)) return { error: 'Height must be between 100 and 250 cm.' };
    if (!(p.weightKg >= 25 && p.weightKg <= 300)) return { error: 'Weight must be between 25 and 300 kg.' };
    return { profile: p };
  }

  // Date of birth → live age hint
  function paintAge() {
    if (!els.dob || !els.ageHint) return;
    var age = computeAge(els.dob.value);
    if (age == null) { els.ageHint.hidden = true; return; }
    els.ageHint.hidden = false;
    if (els.ageValue) els.ageValue.textContent = String(age);
  }
  if (els.dob) els.dob.addEventListener('input', paintAge);
  paintAge();

  /* ---------------- Step 1: profile + send OTP --------------------------- */

  if (els.steps[0]) {
    els.steps[0].addEventListener('submit', async function (event) {
      event.preventDefault();
      if (state.sending) return;
      clearErrors();

      var checked = validateProfile();
      if (checked.error) { showError(els.error1, checked.error); return; }
      var profile = checked.profile;

      state.sending = true;
      setBusy(els.sendOtp, true, 'Sending code…');
      try {
        var result = await SystemAuth.sendOtp(profile);
        if (!result || !result.ok) {
          showError(els.error1, (result && result.error) || 'Could not send the code. Try again.');
          setBusy(els.sendOtp, false);
          state.sending = false;
          return;
        }
        state.email = profile.email;
        if (els.otpEmail) els.otpEmail.textContent = profile.email;
        if (els.lockEmail) els.lockEmail.textContent = profile.email;
        setStep(2);
        fillOtp('');
        setResendCooldown(45);
      } catch (err) {
        showError(els.error1, err && err.message ? err.message : 'Something went wrong sending the code.');
      }
      setBusy(els.sendOtp, false);
      state.sending = false;
    });
  }

  /* ---------------- Step 2: verify OTP ----------------------------------- */

  function submitVerify() {
    var code = otpValue();
    if (!/^\d{6}$/.test(code)) { showError(els.error2, 'Enter the 6-digit code.'); return; }
    if (state.verifying) return;
    state.verifying = true;
    setBusy(els.verify, true, 'Verifying…');
    SystemAuth.verifyOtp(state.email, code).then(function (result) {
      if (!result || !result.ok) {
        showError(els.error2, (result && result.error) || 'Incorrect code.');
        setBusy(els.verify, false);
        state.verifying = false;
        return;
      }
      setStep(3);
      setBusy(els.verify, false);
      state.verifying = false;
    }, function () {
      showError(els.error2, 'Verification failed. Try again.');
      setBusy(els.verify, false);
      state.verifying = false;
    });
  }

  if (els.steps[1]) {
    els.steps[1].addEventListener('submit', function (event) {
      event.preventDefault();
      submitVerify();
    });
  }

  if (els.otpBox) {
    els.otpBox.addEventListener('input', function (event) {
      var target = event.target;
      if (!target.classList || !target.classList.contains('otp-digit')) return;
      target.value = target.value.replace(/\D/g, '').slice(-1);
      var digits = otpDigits();
      var index = digits.indexOf(target);
      if (target.value && digits[index + 1]) digits[index + 1].focus();
      if (otpValue().length === 6) submitVerify();
    });
    els.otpBox.addEventListener('keydown', function (event) {
      var target = event.target;
      if (!target.classList || !target.classList.contains('otp-digit')) return;
      if (event.key === 'Backspace' && !target.value) {
        var digits = otpDigits();
        var index = digits.indexOf(target);
        if (index > 0 && digits[index - 1]) digits[index - 1].focus();
      }
    });
    els.otpBox.addEventListener('paste', function (event) {
      event.preventDefault();
      var data = (event.clipboardData || window.clipboardData).getData('text');
      fillOtp(data);
      var digits = otpDigits();
      digits[Math.min(otpValue().length, digits.length - 1)].focus();
      if (otpValue().length === 6) submitVerify();
    });
  }

  if (els.resend) {
    els.resend.addEventListener('click', async function () {
      if (Date.now() < state.resendAt || state.sending) return;
      state.sending = true;
      els.resend.disabled = true;
      clearErrors();
      var p = collectProfile();
      p.age = p.age == null ? computeAge(p.dob) : p.age;
      var result = await SystemAuth.sendOtp(p);
      state.sending = false;
      if (!result || !result.ok) {
        showError(els.error2, (result && result.error) || 'Could not resend. Try again in a moment.');
        els.resend.disabled = false;
        return;
      }
      fillOtp('');
      setResendCooldown(45);
    });
  }

  if (els.changeEmail) {
    els.changeEmail.addEventListener('click', function () {
      setStep(1);
    });
  }

  /* ---------------- Step 3: password ------------------------------------- */

  function passwordChecks(password) {
    return {
      length: password.length >= 8,
      letter: /[a-zA-Z]/.test(password),
      number: /[0-9]/.test(password)
    };
  }

  function paintStrength() {
    var password = String((els.password && els.password.value) || '');
    var checks = passwordChecks(password);
    var score = Object.keys(checks).filter(function (k) { return checks[k]; }).length;
    if (els.strength) {
      els.strength.style.width = (score / 3) * 100 + '%';
      els.strength.className = score === 3 ? 'ok' : (score === 2 ? 'mid' : 'low');
    }
    if (els.rules) {
      Array.prototype.forEach.call(els.rules.querySelectorAll('li'), function (li) {
        var rule = li.getAttribute('data-rule');
        li.classList.toggle('met', !!checks[rule]);
      });
    }
    return checks;
  }

  if (els.password) {
    els.password.addEventListener('input', paintStrength);
    paintStrength();
  }

  if (els.steps[2]) {
    els.steps[2].addEventListener('submit', async function (event) {
      event.preventDefault();
      if (state.finishing) return;
      clearErrors();

      var password = String(els.password.value || '');
      var confirm = String(els.confirm.value || '');
      var checks = passwordChecks(password);
      if (!checks.length) { showError(els.error3, 'Use at least 8 characters.'); return; }
      if (!checks.letter || !checks.number) { showError(els.error3, 'Include letters and at least one number.'); return; }
      if (password !== confirm) { showError(els.error3, 'Passwords do not match.'); return; }

      state.finishing = true;
      setBusy(els.finish, true, 'Creating your profile…');
      try {
        var result = await SystemAuth.completeRegistration({ email: state.email, password: password });
        if (!result || !result.ok) {
          showError(els.error3, (result && result.error) || 'Could not complete registration.');
          setBusy(els.finish, false);
          state.finishing = false;
          return;
        }
        els.steps.forEach(function (form) { if (form) form.hidden = true; });
        if (els.success) {
          els.success.hidden = false;
          if (els.welcomeName) {
            els.welcomeName.textContent = (result.user && result.user.name) ? result.user.name.split(' ')[0] : 'Hunter';
          }
        }
        if (els.progress) els.progress.style.width = '100%';
      } catch (err) {
        showError(els.error3, err && err.message ? err.message : 'Something went wrong. Try again.');
        setBusy(els.finish, false);
        state.finishing = false;
      }
    });
  }

  if (els.enter) {
    els.enter.addEventListener('click', function () {
      location.replace(next);
    });
  }

  setStep(1);
})();
