/* ==========================================================================
   MONARCH — app controller (original, backed by the System Portal store)
   ========================================================================== */
(function () {
  'use strict';

  var P = window.SystemPortal;
  if (!P || !P.Store) return;
  var Store = P.Store;
  var state = Store.state;
  if (!state) return;

  var e = P.escapeHtml;
  var STAT_KEYS = ['str', 'agi', 'vit', 'int', 'per'];
  var STAT_DEFS = [
    { key: 'str', name: 'Strength', abbr: 'STR', desc: 'Carry heavier — reps at weight' },
    { key: 'agi', name: 'Agility', abbr: 'AGI', desc: 'Move faster — transitions and cadence' },
    { key: 'vit', name: 'Vitality', abbr: 'VIT', desc: 'Endure more — raises max HP' },
    { key: 'int', name: 'Intelligence', abbr: 'INT', desc: 'Focus harder — raises max MP' },
    { key: 'per', name: 'Perception', abbr: 'PER', desc: 'Form precision — fewer mistakes' }
  ];
  var AP_PER_LEVEL = 3;
  var RANKS = [
    { r: 'E', min: 1 }, { r: 'D', min: 5 }, { r: 'C', min: 10 },
    { r: 'B', min: 20 }, { r: 'A', min: 30 }, { r: 'S', min: 50 }
  ];

  function now() { return Date.now(); }
  function dayKey(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fmtInt(n) { return Math.round(Number(n) || 0).toLocaleString(); }
  function fmtVol(v) { return fmtInt(v) + ' kg'; }
  function derive() { return P.derive(); }
  function save() { return Store.save(); }
  function toast(title, body) { if (P.toast) P.toast(title, body); }

  /* ---------------- Sound engine (procedural, no assets) ---------------- */
  var AudioFX = (function () {
    var ctx = null;
    function ac() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(freq, type, dur, vol, delay, sweepTo) {
      var c = ac(); if (!c) return;
      var t0 = c.currentTime + (delay || 0);
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol || 0.18, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(c.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.05);
    }
    function play(name) {
      try {
        switch (name) {
          case 'click': tone(180, 'square', 0.06, 0.06); break;
          case 'gain': tone(620, 'sine', 0.14, 0.12); tone(880, 'sine', 0.2, 0.1, 0.09); break;
          case 'pr': tone(880, 'triangle', 0.3, 0.18, 0, 1320); tone(1320, 'triangle', 0.4, 0.12, 0.18); break;
          case 'level': tone(392, 'triangle', 0.34, 0.2, 0); tone(523.25, 'triangle', 0.34, 0.2, 0.18); tone(659.25, 'triangle', 0.55, 0.22, 0.36); break;
          case 'rank': tone(311.13, 'sawtooth', 0.5, 0.16, 0, 466.16); tone(466.16, 'sawtooth', 0.5, 0.14, 0.22, 622.25); tone(622.25, 'sawtooth', 0.7, 0.15, 0.44, 932.33); break;
          case 'error': tone(140, 'square', 0.16, 0.1); break;
          default: tone(660, 'sine', 0.1, 0.1);
        }
      } catch (err) { /* audio is a nicety */ }
    }
    return { play: play };
  })();

  /* ---------------- Elements ---------------- */
  var shell = document.getElementById('monarch-shell');
  var screens = {
    dashboard: document.getElementById('screen-dashboard'),
    workout: document.getElementById('screen-workout'),
    quests: document.getElementById('screen-quests'),
    stats: document.getElementById('screen-stats')
  };
  var navBtns = Array.prototype.slice.call(document.querySelectorAll('.monarch-nav-btn'));

  var el = {};
  ['gold-value', 'player-name', 'player-title', 'player-level', 'player-rank', 'xp-now', 'xp-max', 'xp-fill',
   'hp-value', 'hp-fill', 'mp-value', 'mp-fill', 'ap-pill', 'ap-value', 'streak-days',
   'dash-workouts-total', 'dash-workouts-week', 'dash-volume', 'dash-quests-done', 'dash-quests-active',
   'dash-quests', 'ex-groups', 'workout-items', 'session-abandon', 'session-finish', 'pr-hint',
   'wk-sessions', 'wk-prs', 'wk-streak', 'workout-history', 'quests-list', 'streak-grid',
   'ap-pool', 'stat-rows', 'derived-hp', 'derived-mp', 'rank-ladder', 'title-progress',
   'levelup-overlay', 'levelup-word', 'levelup-rank', 'levelup-sub', 'levelup-canvas', 'crest-wrap', 'crest-img'
  ].forEach(function (id) { el[id] = document.getElementById(id); });

  var xpAnchor = document.getElementById('xp-bar');

  /* ---------------- Floating XP + level/rank cinematics ---------------- */
  function floatXp(text, anchor) {
    try {
      var rect = (anchor || xpAnchor || shell).getBoundingClientRect();
      var span = document.createElement('span');
      span.className = 'float-xp';
      span.textContent = text;
      span.style.left = (rect.left + rect.width / 2 - 30) + 'px';
      span.style.top = (rect.top - 4) + 'px';
      span.style.position = 'fixed';
      document.body.appendChild(span);
      setTimeout(function () { span.remove(); }, 1150);
    } catch (e) {}
  }

  function resizeCanvas(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(2, Math.floor(canvas.clientWidth * dpr));
    canvas.height = Math.max(2, Math.floor(canvas.clientHeight * dpr));
  }

  function runParticles(canvas, palette) {
    if (!canvas) return;
    resizeCanvas(canvas);
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var parts = [];
    for (var i = 0; i < 90; i++) {
      parts.push({
        x: Math.random() * W, y: H + Math.random() * H * 0.45,
        vx: (Math.random() - 0.5) * 1.8,
        vy: -(1.6 + Math.random() * 4.6),
        r: (Math.random() * 5 + 2) * (W / 900 + 1),
        hue: palette[Math.floor(Math.random() * palette.length)],
        life: 1
      });
    }
    var running = true;
    canvas._stop = function () { running = false; };
    var t0 = performance.now();
    function frame(t) {
      if (!running) { ctx.clearRect(0, 0, W, H); return; }
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.035; p.life -= 0.0055;
        if (p.life <= 0) continue;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.hue;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (t - t0 < 4200) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    }
    requestAnimationFrame(frame);
  }

  function vibrate(pattern) {
    try {
      if (window.SystemAppBridge && typeof window.SystemAppBridge.vibrate === 'function') {
        (Array.isArray(pattern) ? pattern : [pattern]).forEach(function (ms) { window.SystemAppBridge.vibrate(ms); });
        return;
      }
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (e) {}
  }

  function showOverlay(kind) {
    var overlay = el['levelup-overlay'];
    if (!overlay) return;
    var d;
    if (kind === 'rank') {
      d = derive();
      el['levelup-word'].textContent = 'RANK UP';
      el['levelup-rank'].textContent = d.rank;
      el['levelup-sub'].textContent = 'RANK ' + d.rank + ' · the System acknowledges you';
      AudioFX.play('rank');
      vibrate([40, 60, 40, 60, 140]);
      runParticles(el['levelup-canvas'], ['#c4b5fd', '#8b5cf6', '#e6c36a', '#ffffff']);
    } else {
      el['levelup-word'].textContent = 'LEVEL UP';
      el['levelup-rank'].textContent = String(state.level);
      el['levelup-sub'].textContent = '+' + AP_PER_LEVEL + ' ability points';
      AudioFX.play('level');
      vibrate([30, 45, 30]);
      runParticles(el['levelup-canvas'], ['#a78bfa', '#8b5cf6', '#7dd3fc']);
    }
    overlay.classList.add('show');
    if (el['crest-wrap']) {
      el['crest-wrap'].classList.remove('is-ascending');
      void el['crest-wrap'].offsetWidth;
      el['crest-wrap'].classList.add('is-ascending');
    }
    setTimeout(function () { overlay.classList.remove('show'); }, 2400);
  }

  /* ---------------- Quest completion ---------------- */
  function rankBefore() { return derive().rank; }
  function maybeRankUp(before) {
    if (rankBefore() !== before) showOverlay('rank');
  }

  function completeQuest(id, anchor) {
    var quest = state.quests.find(function (q) { return q.id === id; });
    if (!quest || quest.status !== 'active') return;
    var before = rankBefore();
    quest.status = 'completed';
    quest.completedAt = now();
    state.gold += Math.max(0, quest.gold || 0);
    state.availableAp += Math.max(0, quest.ap || 0);
    state.fatigue = Math.min(100, (state.fatigue || 0) + 10);
    var levels = P.gainXP(quest.xp).levels;
    save();
    AudioFX.play('gain');
    floatXp('+' + quest.xp + ' XP', anchor);
    renderAll();
    if (levels > 0) showOverlay('level');
    maybeRankUp(before);
  }

  function renderQuests(target, limit) {
    var list = state.quests.filter(function (q) { return q.status === 'active'; })
      .sort(function (a, b) { return a.expiresAt - b.expiresAt; });
    if (limit) list = list.slice(0, limit);
    var wrap = target || el['quests-list'];
    if (!wrap) return;
    if (!list.length) {
      wrap.innerHTML = '<div class="empty-note">No active quests. Issue one from the Quests page — or train.</div>';
      return;
    }
    wrap.innerHTML = list.map(function (q) {
      var remaining = Math.max(0, Math.ceil((q.expiresAt - now()) / 1000));
      var mm = Math.floor(remaining / 60), ss = remaining % 60;
      return '<div class="quest-row" data-id="' + e(q.id) + '">' +
        '<div style="min-width:0"><div class="qt">' + e(q.title) + '</div>' +
        '<div class="qxp">+' + q.xp + ' XP · ' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0') + ' left</div></div>' +
        '<button class="btn btn-sm btn-secondary" type="button" data-complete="' + e(q.id) + '">Complete</button>' +
      '</div>';
    }).join('');
    wrap.querySelectorAll('[data-complete]').forEach(function (btn) {
      btn.addEventListener('click', function () { completeQuest(btn.getAttribute('data-complete'), btn); });
    });
  }

  /* ---------------- Helpers: workouts ---------------- */
  var user = (window.SystemAuth && window.SystemAuth.currentUser && window.SystemAuth.currentUser()) || { name: 'Hunter' };
  if (el['player-name']) el['player-name'].textContent = user.name || 'Hunter';

  function sessions() { return (state.workouts && state.workouts.sessions) || []; }
  function workoutDays() {
    var days = {};
    sessions().forEach(function (s) { if (s.at) days[dayKey(s.at)] = true; });
    return days;
  }
  function streakCount() {
    var days = workoutDays();
    var streak = 0, d = new Date();
    if (!days[dayKey(d.getTime())]) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
    for (;;) {
      var key = dayKey(d.getTime());
      if (days[key]) { streak++; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1); } else break;
    }
    return streak;
  }
  function sessionsThisWeek() {
    var d = new Date();
    var day = d.getDay() || 7;
    var monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (day - 1));
    return sessions().filter(function (s) { return s.at >= monday.getTime(); }).length;
  }
  function totalVolume() { return sessions().reduce(function (s, x) { return s + (Number(x.volume) || 0); }, 0); }
  function totalPRs() { return Object.keys((state.workouts && state.workouts.prHistory) || {}).length; }
  function workingSets() {
    return sessions().reduce(function (n, s) { return n + (s.sets ? s.sets.length : 0); }, 0);
  }

  function renderDashboard() {
    var d = derive();
    if (el['player-level']) el['player-level'].textContent = String(state.level);
    if (el['player-rank']) el['player-rank'].textContent = d.rank;
    if (el['player-title']) el['player-title'].textContent = d.title;
    if (el['xp-now']) el['xp-now'].textContent = fmtInt(state.exp);
    if (el['xp-max']) el['xp-max'].textContent = fmtInt(d.maxExp);
    if (el['xp-fill']) el['xp-fill'].style.width = Math.min(100, (state.exp / d.maxExp) * 100) + '%';
    var hp = 100 + state.stats.vit * 10 + state.level * 20;
    var mp = 50 + state.stats.int * 8 + state.level * 10;
    if (el['hp-value']) el['hp-value'].textContent = String(hp);
    if (el['hp-fill']) el['hp-fill'].style.width = '100%';
    if (el['mp-value']) el['mp-value'].textContent = String(mp);
    if (el['mp-fill']) el['mp-fill'].style.width = '100%';
    if (el['gold-value']) el['gold-value'].textContent = fmtInt(state.gold);
    if (el['dash-workouts-total']) el['dash-workouts-total'].textContent = fmtInt(sessions().length);
    if (el['dash-workouts-week']) el['dash-workouts-week'].textContent = String(sessionsThisWeek());
    if (el['dash-volume']) el['dash-volume'].textContent = fmtVol(totalVolume());
    var done = state.quests.filter(function (q) { return q.status === 'completed'; }).length;
    var act = state.quests.filter(function (q) { return q.status === 'active'; }).length;
    if (el['dash-quests-done']) el['dash-quests-done'].textContent = String(done);
    if (el['dash-quests-active']) el['dash-quests-active'].textContent = String(act);
    if (el['ap-value']) el['ap-value'].textContent = String(state.availableAp);
    if (el['ap-pill']) el['ap-pill'].style.display = state.availableAp > 0 ? 'inline-flex' : 'none';
    if (el['streak-days']) el['streak-days'].textContent = String(streakCount());
    renderQuests(el['dash-quests'] || null, 3);
  }

  /* ---------------- Workout logger ---------------- */
  var GROUPS = ['All', 'Push', 'Pull', 'Legs', 'Core', 'Cardio'];
  var LIBRARY = [
    { id: 'bench', name: 'Bench Press', group: 'Push' },
    { id: 'incline', name: 'Incline Press', group: 'Push' },
    { id: 'pushup', name: 'Push-Ups', group: 'Push' },
    { id: 'ohp', name: 'Overhead Press', group: 'Push' },
    { id: 'lateral', name: 'Lateral Raise', group: 'Push' },
    { id: 'dip', name: 'Triceps Dip', group: 'Push' },
    { id: 'pullup', name: 'Pull-Up', group: 'Pull' },
    { id: 'row', name: 'Barbell Row', group: 'Pull' },
    { id: 'dbrow', name: 'Dumbbell Row', group: 'Pull' },
    { id: 'lat', name: 'Lat Pulldown', group: 'Pull' },
    { id: 'curl', name: 'Biceps Curl', group: 'Pull' },
    { id: 'squat', name: 'Back Squat', group: 'Legs' },
    { id: 'deadlift', name: 'Deadlift', group: 'Legs' },
    { id: 'rdl', name: 'Romanian Deadlift', group: 'Legs' },
    { id: 'lunge', name: 'Dumbbell Lunge', group: 'Legs' },
    { id: 'legpress', name: 'Leg Press', group: 'Legs' },
    { id: 'plank', name: 'Plank (min)', group: 'Core' },
    { id: 'legraise', name: 'Leg Raise', group: 'Core' },
    { id: 'situp', name: 'Sit-Up', group: 'Core' },
    { id: 'mountain', name: 'Mountain Climbers', group: 'Core' },
    { id: 'run', name: 'Run (min)', group: 'Cardio' },
    { id: 'rope', name: 'Rope Skips', group: 'Cardio' },
    { id: 'burpee', name: 'Burpees', group: 'Cardio' }
  ];
  var PLANS = {
    push: ['bench', 'incline', 'ohp', 'lateral', 'dip'],
    pull: ['pullup', 'row', 'lat', 'dbrow', 'curl'],
    legs: ['squat', 'deadlift', 'rdl', 'lunge', 'legpress'],
    full: ['bench', 'row', 'squat', 'pullup', 'plank']
  };

  var session = { startedAt: now(), items: [] };

  function exerciseOf(id) { return LIBRARY.find(function (x) { return x.id === id; }) || LIBRARY[0]; }
  function itemOf(id) { return session.items.find(function (i) { return i.exerciseId === id; }); }
  function prHistory() { return (state.workouts && state.workouts.prHistory) || {}; }
  function blankSet() { return { weight: '', reps: '' }; }

  function renderLibrary(filter) {
    var wrap = el['ex-groups'];
    if (!wrap) return;
    var f = filter || 'All';
    wrap.innerHTML = GROUPS.map(function (g) {
      var count = g === 'All' ? LIBRARY.length : LIBRARY.filter(function (x) { return x.group === g; }).length;
      return '<button class="ex-chip' + (g === f ? ' active' : '') + '" type="button" data-group="' + e(g) + '">' + e(g) + ' · ' + count + '</button>';
    }).join('');
    var list = f === 'All' ? LIBRARY : LIBRARY.filter(function (x) { return x.group === f; });
    wrap.innerHTML += '<span style="flex:0 0 1px"></span>' + list.map(function (x) {
      var on = !!itemOf(x.id);
      return '<button class="ex-chip' + (on ? ' active' : '') + '" type="button" data-ex="' + e(x.id) + '">' + e(x.name) + '</button>';
    }).join('');
    wrap.querySelectorAll('[data-group]').forEach(function (btn) {
      btn.addEventListener('click', function () { renderLibrary(btn.getAttribute('data-group')); AudioFX.play('click'); });
    });
    wrap.querySelectorAll('[data-ex]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleExercise(btn.getAttribute('data-ex'));
        AudioFX.play('click');
      });
    });
  }

  function toggleExercise(id) {
    var existing = itemOf(id);
    if (existing) {
      session.items = session.items.filter(function (i) { return i.exerciseId !== id; });
    } else {
      session.items.push({
        exerciseId: id,
        sets: [blankSet(), blankSet(), blankSet()]
      });
    }
    renderWorkoutViews();
  }

  function renderWorkoutViews() {
    renderLibrary();
    renderItems();
    if (el['pr-hint']) {
      var sets = session.items.reduce(function (n, i) { return n + i.sets.length; }, 0);
      el['pr-hint'].textContent = session.items.length
        ? session.items.length + ' exercise(s) · ' + sets + ' set row(s) — tap Finish when all are logged.'
        : 'Tap a chip to add the exercise to your session.';
    }
  }

  function renderItems() {
    var wrap = el['workout-items'];
    if (!wrap) return;
    if (!session.items.length) {
      wrap.innerHTML = '<div class="empty-note">No exercises yet. Tap a chip above — or load a plan (Push / Pull / Legs / Full Body).</div>';
      return;
    }
    var hist = prHistory();
    wrap.innerHTML = session.items.map(function (item, idx) {
      var ex = exerciseOf(item.exerciseId);
      var best = Number(hist[item.exerciseId]) || 0;
      var hint = best > 0 ? 'best ' + fmtInt(best) + ' kg·reps' : 'new exercise';
      var rows = item.sets.map(function (s, si) {
        return '<div class="set-row">' +
          '<div class="set-index">' + (si + 1) + '</div>' +
          '<input type="number" inputmode="decimal" class="set-weight" data-item="' + idx + '" data-set="' + si + '" placeholder="0" value="' + e(String(s.weight)) + '" aria-label="Weight kg" />' +
          '<input type="number" inputmode="numeric" class="set-reps" data-item="' + idx + '" data-set="' + si + '" placeholder="0" value="' + e(String(s.reps)) + '" aria-label="Reps" />' +
          '<button class="set-remove" type="button" data-del-set="' + idx + ':' + si + '" aria-label="Delete set">×</button>' +
        '</div>';
      }).join('');
      return '<div class="workout-item" data-item-wrap="' + idx + '">' +
        '<div class="workout-item-head"><span class="workout-item-title">' + e(ex.name) + '</span>' +
          '<span class="workout-item-hint">' + e(hint) + '</span>' +
          '<button class="workout-item-remove" type="button" data-del-item="' + idx + '" aria-label="Remove exercise">×</button>' +
        '</div>' +
        '<div class="set-table-head" aria-hidden="true"><span>#</span><span>WEIGHT (kg)</span><span>REPS</span><span></span></div>' +
        rows +
        '<button class="btn btn-ghost btn-sm" style="width:100%;margin-top:4px" data-add-set="' + idx + '">+ Add set</button>' +
      '</div>';
    }).join('');

    wrap.querySelectorAll('[data-del-set]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parts = btn.getAttribute('data-del-set').split(':');
        var item = session.items[Number(parts[0])];
        if (item) { item.sets.splice(Number(parts[1]), 1); renderWorkoutViews(); }
      });
    });
    wrap.querySelectorAll('[data-del-item]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = Number(btn.getAttribute('data-del-item'));
        session.items.splice(idx, 1);
        renderWorkoutViews();
      });
    });
    wrap.querySelectorAll('[data-add-set]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = Number(btn.getAttribute('data-add-set'));
        if (session.items[idx]) session.items[idx].sets.push(blankSet());
        renderWorkoutViews();
      });
    });
    wrap.querySelectorAll('.set-weight, .set-reps').forEach(function (input) {
      input.addEventListener('input', function () {
        var idx = Number(input.getAttribute('data-item'));
        var si = Number(input.getAttribute('data-set'));
        var item = session.items[idx];
        if (!item || !item.sets[si]) return;
        if (input.classList.contains('set-weight')) item.sets[si].weight = input.value;
        else item.sets[si].reps = input.value;
      });
    });
  }

  function applyPlan(key) {
    var ids = PLANS[key];
    if (!ids) return;
    session.items = ids.map(function (id) {
      return { exerciseId: id, sets: [blankSet(), blankSet(), blankSet()] };
    });
    AudioFX.play('click');
    renderWorkoutViews();
  }

  function abandonSession() {
    session = { startedAt: now(), items: [] };
    AudioFX.play('click');
    renderWorkoutViews();
  }

  function collectSets() {
    var sets = [];
    session.items.forEach(function (item) {
      item.sets.forEach(function (s) {
        var w = parseFloat(s.weight), r = parseInt(s.reps, 10);
        if (!isFinite(w)) w = 0;
        if (!isFinite(r)) r = 0;
        if (w > 0 || r > 0) sets.push({ exercise: item.exerciseId, weight: w, reps: r });
      });
    });
    return sets;
  }

  function finishWorkout() {
    var done = collectSets();
    if (!done.length) { AudioFX.play('error'); toast('Nothing logged', 'Add at least one set with a weight or a rep count.'); return; }

    var volume = 0, hist = prHistory(), before = rankBefore(), prHit = false;
    done.forEach(function (s) { volume += s.weight * s.reps; });
    done.forEach(function (s) {
      if (s.weight > 0) {
        var top = s.weight * s.reps;
        if (top > (Number(hist[s.exercise]) || 0)) { hist[s.exercise] = Math.round(top); prHit = true; }
      }
    });

    var xp = done.length * 12 + 20 + (prHit ? 25 : 0);
    var gold = done.length * 2 + 10 + (prHit ? 15 : 0);

    var rec = {
      id: 'w_' + now(), at: now(), sets: done,
      volume: Math.round(volume), xp: xp, gold: gold, pr: prHit,
      durationSec: Math.round((now() - session.startedAt) / 1000)
    };
    state.workouts.sessions.unshift(rec);
    state.workouts.sessions = state.workouts.sessions.slice(0, 200);
    state.workouts.prHistory = hist;
    state.gold += gold;

    var levels = P.gainXP(xp).levels;
    save();

    session = { startedAt: now(), items: [] };
    AudioFX.play(prHit ? 'pr' : 'gain');
    floatXp('+' + xp + ' XP', el['session-finish']);
    renderAll();
    if (levels > 0) showOverlay('level');
    maybeRankUp(before);
    toast(prHit ? 'Record shattered' : 'Workout logged',
      '+' + xp + ' XP · +' + gold + ' gold · ' + done.length + ' sets · volume ' + fmtVol(volume));
  }

  function renderHistory() {
    if (!el['workout-history']) return;
    if (!sessions().length) {
      el['workout-history'].innerHTML = '<div class="empty-note">No workouts logged yet. This is the arena — begin.</div>';
    } else {
      el['workout-history'].innerHTML = sessions().slice(0, 6).map(function (s) {
        var d = new Date(s.at);
        var label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        var detail = s.sets.length + ' sets · ' + fmtVol(s.volume);
        return '<div class="history-item"><span class="h-date">' + e(label) + '</span><span class="h-body">' + e(detail) + (s.pr ? ' · <b style="color:#e6c36a">PR</b>' : '') + '</span><span class="h-xp">+' + fmtInt(s.xp) + ' XP</span></div>';
      }).join('');
    }
    if (el['wk-sessions']) el['wk-sessions'].textContent = String(sessions().length);
    if (el['wk-prs']) el['wk-prs'].textContent = String(totalPRs());
    if (el['wk-streak']) el['wk-streak'].textContent = String(streakCount());
  }

  /* ---------------- Quests + streaks ---------------- */
  function renderStreakGrid() {
    if (!el['streak-grid']) return;
    var days = workoutDays();
    var cells = [];
    var today = new Date();
    for (var i = 41; i >= 0; i--) {
      var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      var key = dayKey(d.getTime());
      var cls = 'streak-day' + (days[key] ? ' done' : '') + (i === 0 ? ' today' : '');
      cells.push('<div class="' + cls + '" title="' + e(key) + '"></div>');
    }
    el['streak-grid'].innerHTML = cells.join('');
  }

  /* ---------------- Stats tab ---------------- */
  function renderStatsTab() {
    if (el['ap-pool']) el['ap-pool'].textContent = String(state.availableAp);
    if (el['derived-hp']) el['derived-hp'].textContent = String(100 + state.stats.vit * 10 + state.level * 20);
    if (el['derived-mp']) el['derived-mp'].textContent = String(50 + state.stats.int * 8 + state.level * 10);
    var maxStat = Math.max(10, Math.max.apply(null, STAT_KEYS.map(function (k) { return state.stats[k]; })));
    if (el['stat-rows']) {
      el['stat-rows'].innerHTML = STAT_DEFS.map(function (def) {
        var v = state.stats[def.key];
        var pct = Math.min(100, (v / (maxStat + 5)) * 100);
        return '<div class="stat-row" data-stat="' + def.key + '">' +
          '<div class="stat-badge">' + def.abbr + '</div>' +
          '<div style="min-width:0"><div class="stat-name">' + def.name + '</div>' +
            '<div class="stat-track" style="margin:6px 0 2px"><div class="stat-fill" style="width:' + pct + '%"></div></div>' +
            '<div class="stat-value" style="color:#8b93b8;font-size:11px">' + e(def.desc) + '</div>' +
          '</div>' +
          '<div class="ap-stepper">' +
            '<button class="ap-btn" type="button" data-dec="' + def.key + '" ' + (v <= 10 ? 'disabled' : '') + ' aria-label="Decrease ' + def.name + '">−</button>' +
            '<div class="stat-badge" style="margin:0;width:44px">' + v + '</div>' +
            '<button class="ap-btn" type="button" data-inc="' + def.key + '" ' + (state.availableAp <= 0 ? 'disabled' : '') + ' aria-label="Increase ' + def.name + '">+</button>' +
          '</div>' +
        '</div>';
      }).join('');
      el['stat-rows'].querySelectorAll('[data-inc]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (state.availableAp <= 0) return;
          var k = btn.getAttribute('data-inc');
          state.stats[k] += 1; state.availableAp -= 1;
          save(); AudioFX.play('click'); renderAll();
        });
      });
      el['stat-rows'].querySelectorAll('[data-dec]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var k = btn.getAttribute('data-dec');
          if (state.stats[k] <= 10) return;
          state.stats[k] -= 1; state.availableAp += 1;
          save(); AudioFX.play('click'); renderAll();
        });
      });
    }
    var d = derive();
    var cur = RANKS.findIndex(function (x) { return d.rank === x.r; });
    if (el['rank-ladder']) {
      el['rank-ladder'].innerHTML = RANKS.map(function (x, i) {
        return '<div class="ladder-cell' + (i === cur ? ' current' : '') + '">' +
          '<div style="font-size:18px">' + x.r + '</div>' +
          '<div style="font-size:9px;margin-top:4px;color:inherit">LV ' + x.min + '+</div>' +
        '</div>';
      }).join('');
    }
    if (el['title-progress']) {
      var next = null;
      for (var i = 0; i < RANKS.length; i++) { if (state.level < RANKS[i].min) { next = RANKS[i]; break; } }
      el['title-progress'].textContent = next
        ? 'Next title at level ' + next.min + ' (' + Math.max(0, next.min - state.level) + ' levels away). Current rank: ' + d.rank + '.'
        : 'You stand at the summit — Shadow Monarch.';
    }
  }

  /* ---------------- Navigation ---------------- */
  function switchScreen(name) {
    Object.keys(screens).forEach(function (key) {
      if (screens[key]) screens[key].classList.toggle('active', key === name);
    });
    navBtns.forEach(function (btn) {
      var on = btn.getAttribute('data-screen') === name;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    AudioFX.play('click');
  }

  navBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { switchScreen(btn.getAttribute('data-screen')); });
  });

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest && event.target.closest('[data-switch]');
    if (trigger) {
      event.preventDefault();
      switchScreen(trigger.getAttribute('data-switch'));
    }
    var planTrigger = event.target.closest && event.target.closest('[data-plan]');
    if (planTrigger) {
      applyPlan(planTrigger.getAttribute('data-plan'));
    }
  });

  if (el['session-finish']) el['session-finish'].addEventListener('click', finishWorkout);
  if (el['session-abandon']) el['session-abandon'].addEventListener('click', abandonSession);

  function renderAll() {
    renderDashboard();
    renderHistory();
    renderStreakGrid();
    renderStatsTab();
    renderQuests(el['quests-list']);
  }

  renderAll();
})();
