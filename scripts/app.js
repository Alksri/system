/* ==========================================================================
   SYSTEM PORTAL — Shared Application Layer
   - Renders the shared header/footer shell on every page
   - Stores one real progression profile per signed-in email
   - Derives levels, ranks, HP/MP, streaks and unlocks from actual activity
   - Provides the autoplaying frame player and the motion layer
   ========================================================================== */
(function () {
  'use strict';

  var TOTAL_FRAMES = 270;
  var FRAME_PREFIX = 'ezgif-frame-';
  var FRAME_PAD = 3;
  var FRAME_EXT = '.jpg';
  var STATE_VERSION = 3;
  var STATE_PREFIX = 'system_portal_state_v3_';

  function framePath(i) {
    return FRAME_PREFIX + String(i).padStart(FRAME_PAD, '0') + FRAME_EXT;
  }

  /* ----------------------------------------------------------------------
     Signed-in identity
     ---------------------------------------------------------------------- */
  function currentUser() {
    return (window.SystemAuth && window.SystemAuth.currentUser)
      ? window.SystemAuth.currentUser()
      : null;
  }

  function userKey() {
    var user = currentUser();
    return user && user.email ? user.email.toLowerCase() : 'anon';
  }

  /* ----------------------------------------------------------------------
     Progression rules — every number below is computed, never seeded
     ---------------------------------------------------------------------- */
  var RANK_MULT = { E: 1, D: 1.25, C: 1.5, B: 2, A: 2.5, S: 3 };
  var STAT_KEYS = ['str', 'agi', 'vit', 'int', 'per'];
  var AP_PER_LEVEL = 3;

  // XP required to advance from `level` to `level + 1`.
  function expForLevel(level) {
    return 100 + (Math.max(1, Math.floor(level)) - 1) * 50;
  }

  function rankForLevel(level) {
    if (level >= 50) return 'S';
    if (level >= 30) return 'A';
    if (level >= 20) return 'B';
    if (level >= 10) return 'C';
    if (level >= 5) return 'D';
    return 'E';
  }

  function titleForLevel(level) {
    if (level >= 50) return 'Shadow Monarch';
    if (level >= 30) return 'Sovereign';
    if (level >= 20) return 'Shadow Lord';
    if (level >= 10) return 'Elite Hunter';
    if (level >= 5) return 'Awakened Hunter';
    return 'E-Rank Hunter';
  }

  // Rewards are a function of duration and rank — documented on the quest page.
  function questRewards(minutes, rank) {
    var safeMinutes = Math.max(1, Math.min(1440, Math.round(Number(minutes) || 0)));
    var mult = RANK_MULT[rank] || 1;
    return {
      minutes: safeMinutes,
      xp: Math.round(safeMinutes * 2 * mult),
      gold: Math.round(safeMinutes * 5 * mult),
      ap: 1
    };
  }

  function createDefaultState() {
    var now = Date.now();
    return {
      version: STATE_VERSION,
      level: 1,
      exp: 0,
      gold: 0,
      availableAp: 0,
      fatigue: 0,
      fatigueAt: now,
      stats: { str: 10, agi: 10, vit: 10, int: 10, per: 10 },
      quests: [],
      reminders: [],
      checkIns: [],
      transformations: [],
      createdAt: now,
      lastActiveAt: now
    };
  }

  function normaliseState(raw) {
    var defaults = createDefaultState();
    if (!raw || typeof raw !== 'object') return defaults;

    raw.version = STATE_VERSION;
    ['level', 'exp', 'gold', 'availableAp', 'fatigue'].forEach(function (key) {
      if (typeof raw[key] !== 'number' || !isFinite(raw[key])) raw[key] = defaults[key];
    });
    raw.level = Math.max(1, Math.floor(raw.level));
    raw.exp = Math.max(0, Math.floor(raw.exp));
    raw.gold = Math.max(0, Math.floor(raw.gold));
    raw.availableAp = Math.max(0, Math.floor(raw.availableAp));
    raw.fatigue = Math.max(0, Math.min(100, Math.round(raw.fatigue)));

    raw.stats = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
    STAT_KEYS.forEach(function (key) {
      var value = Number(raw.stats[key]);
      raw.stats[key] = isFinite(value) && value >= 1 ? Math.floor(value) : defaults.stats[key];
    });

    ['quests', 'reminders', 'checkIns', 'transformations'].forEach(function (key) {
      if (!Array.isArray(raw[key])) raw[key] = [];
    });

    if (typeof raw.createdAt !== 'number') raw.createdAt = defaults.createdAt;
    if (typeof raw.fatigueAt !== 'number') raw.fatigueAt = Date.now();
    if (typeof raw.lastActiveAt !== 'number') raw.lastActiveAt = Date.now();

    // Reminders written by older builds used a countdown; convert honestly.
    raw.reminders.forEach(function (reminder) {
      if (typeof reminder.dueAt !== 'number') {
        reminder.dueAt = Date.now() + Math.max(0, Number(reminder.remaining) || 0) * 1000;
        delete reminder.remaining;
      }
    });

    return raw;
  }

  function dayKey(timestamp) {
    var d = new Date(timestamp);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function computeStreaks(quests) {
    var days = {};
    quests.forEach(function (q) {
      if (q.status === 'completed' && typeof q.completedAt === 'number') {
        days[dayKey(q.completedAt)] = true;
      }
    });

    var keys = Object.keys(days).sort();
    var best = 0;
    var run = 0;
    var previous = null;

    keys.forEach(function (key) {
      var stamp = new Date(key + 'T00:00:00').getTime();
      run = (previous !== null && stamp - previous === 86400000) ? run + 1 : 1;
      if (run > best) best = run;
      previous = stamp;
    });

    var cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if (!days[dayKey(cursor.getTime())]) cursor.setDate(cursor.getDate() - 1);
    var current = 0;
    while (days[dayKey(cursor.getTime())]) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return { current: current, best: best };
  }

  function derive(state) {
    var streak = computeStreaks(state.quests);
    var completed = state.quests.filter(function (q) { return q.status === 'completed'; });
    var active = state.quests.filter(function (q) { return q.status === 'active'; });
    var expired = state.quests.filter(function (q) { return q.status === 'expired'; });

    return {
      rank: rankForLevel(state.level),
      title: titleForLevel(state.level),
      maxExp: expForLevel(state.level),
      maxHp: 100 + state.stats.vit * 10 + state.level * 20,
      maxMp: 50 + state.stats.int * 8 + state.level * 10,
      completedCount: completed.length,
      activeCount: active.length,
      expiredCount: expired.length,
      currentStreak: streak.current,
      bestStreak: streak.best,
      memberSince: state.createdAt
    };
  }

  function addExp(state, amount) {
    state.exp += Math.max(0, Math.floor(amount));
    var levels = 0;
    var guard = 0;
    while (state.exp >= expForLevel(state.level) && guard < 200) {
      state.exp -= expForLevel(state.level);
      state.level++;
      state.availableAp += AP_PER_LEVEL;
      levels++;
      guard++;
    }
    return levels;
  }

  /* ----------------------------------------------------------------------
     Store — one profile per signed-in email
     ---------------------------------------------------------------------- */
  var Store = {
    state: null,

    key: function () {
      return STATE_PREFIX + userKey();
    },

    load: function () {
      var raw = null;
      try { raw = localStorage.getItem(this.key()); } catch (e) {}

      var parsed = null;
      if (raw) {
        try { parsed = JSON.parse(raw); } catch (e) {}
      }

      // Never import the fabricated v2 profile: a real account starts at 1.
      this.state = (parsed && parsed.version === STATE_VERSION)
        ? normaliseState(parsed)
        : createDefaultState();

      if (this.reconcile()) this.save();
      return this.state;
    },

    save: function () {
      try {
        localStorage.setItem(this.key(), JSON.stringify(this.state));
        return true;
      } catch (e) {
        return false;
      }
    },

    reset: function () {
      this.state = createDefaultState();
      this.save();
    },

    // Expire overdue quests and let fatigue recover in real time.
    reconcile: function () {
      var state = this.state;
      var changed = false;
      var now = Date.now();

      if (!state) return false;

      state.quests.forEach(function (quest) {
        if (quest.status !== 'active') return;
        if (now < quest.expiresAt) return;

        quest.status = 'expired';
        quest.expiredAt = quest.expiresAt;
        changed = true;

        if (state.level > 1) {
          state.level -= 1;
          state.exp = 0;
          state.fatigue = Math.min(100, state.fatigue + 20);
        } else {
          state.fatigue = Math.min(100, state.fatigue + 40);
        }
      });

      // 1 fatigue point recovers per 10 real minutes (6 per hour).
      var minutes = Math.floor((now - state.fatigueAt) / 60000);
      if (minutes >= 10) {
        var recovered = Math.floor(minutes / 10);
        if (state.fatigue > 0) {
          state.fatigue = Math.max(0, state.fatigue - recovered);
          changed = true;
        }
        state.fatigueAt = now;
      }

      state.lastActiveAt = now;
      return changed;
    }
  };

  Store.load();

  /* ----------------------------------------------------------------------
     Small utilities
     ---------------------------------------------------------------------- */
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    return [h, m, s].map(function (n) { return String(n).padStart(2, '0'); }).join(':');
  }

  function fmtDate(timestamp) {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  function fmtDateTime(timestamp) {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setWidth(id, percent) {
    var el = document.getElementById(id);
    if (el) el.style.width = Math.max(0, Math.min(100, percent)) + '%';
  }

  function initials(name) {
    var parts = String(name || 'Hunter').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'H';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function shortName(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'Hunter';
    if (parts.length === 1) return parts[0];
    return parts[0] + ' ' + parts[parts.length - 1][0] + '.';
  }

  function toast(title, body) {
    var hub = document.getElementById('toast-hub');
    if (!hub) return;
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<div class="toast-head">' + escapeHtml(title) + '</div>' +
      '<div class="toast-body">' + escapeHtml(body) + '</div>';
    hub.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-6px)';
      setTimeout(function () { el.remove(); }, 240);
    }, 4200);
  }

  function emptyState(mark, title, copy, actionHtml) {
    return '<div class="empty-state">' +
      '<div class="empty-mark">' + mark + '</div>' +
      '<div class="empty-title">' + escapeHtml(title) + '</div>' +
      '<p class="empty-copy">' + escapeHtml(copy) + '</p>' +
      (actionHtml || '') +
    '</div>';
  }

  /* ----------------------------------------------------------------------
     Shell — header + footer, rendered on every page
     ---------------------------------------------------------------------- */
  var NAV = [
    { label: 'Home', href: 'index.html', page: 'home' },
    { label: 'Chapters', dropdown: [
      { label: 'Awakening', href: 'awakening.html', page: 'awakening' },
      { label: 'Extraction', href: 'extraction.html', page: 'extraction' },
      { label: 'Arise', href: 'arise.html', page: 'arise' },
      { label: 'Army', href: 'army.html', page: 'army' }
    ] },
    { label: 'Dashboard', dropdown: [
      { label: 'Status', href: 'status.html', page: 'status' },
      { label: 'Quests', href: 'quests.html', page: 'quests' },
      { label: 'Vision', href: 'vision.html', page: 'vision' },
      { label: 'Advisor', href: 'advisor.html', page: 'advisor' },
      { label: 'Progress', href: 'progress.html', page: 'progress' },
      { label: 'Inventory', href: 'inventory.html', page: 'inventory' }
    ] }
  ];

  var BRAND_SVG =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M12 3 4.5 7v10L12 21l7.5-4V7L12 3Z" stroke="url(#bg1)" stroke-width="1.4"/>' +
      '<path d="M12 7.2v9.6M8.4 10.1 12 7.2l3.6 2.9" stroke="#e9d5ff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M8.4 13.9 12 16.8l3.6-2.9" stroke="#7dd3fc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<defs><linearGradient id="bg1" x1="4" y1="3" x2="20" y2="21"><stop stop-color="#a78bfa"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs>' +
    '</svg>';

  function brandHtml() {
    return '<a class="brand" href="index.html">' +
      '<span class="brand-mark">' + BRAND_SVG + '</span>' +
      '<span class="brand-name"><span class="brand-word">System</span><span class="brand-word alt">Portal</span></span>' +
    '</a>';
  }

  function userMenuHtml(user) {
    if (!user) {
      return '<a class="nav-cta" href="login.html">Sign in</a>';
    }

    var avatar = user.picture
      ? '<img class="user-avatar" src="' + escapeHtml(user.picture) + '" alt="" referrerpolicy="no-referrer" />'
      : '<span class="user-avatar">' + escapeHtml(initials(user.name || user.email)) + '</span>';

    return '<div class="nav-dropdown user-menu">' +
      '<button type="button" class="user-trigger" aria-label="Account menu">' +
        avatar +
        '<span class="user-name">' + escapeHtml(shortName(user.name || user.email)) + '</span>' +
        '<span class="user-caret">▾</span>' +
      '</button>' +
      '<div class="nav-dropdown-menu user-dropdown">' +
        '<div class="user-meta">' +
          '<div class="user-meta-name">' + escapeHtml(user.name || 'Hunter') + '</div>' +
          '<div class="user-meta-email">' + escapeHtml(user.email) + '</div>' +
          '<div class="user-provider">' + (user.provider === 'google' ? 'Google account' : (user.isAdmin ? 'Admin account' : 'Local account')) + '</div>' +
        '</div>' +
        '<a class="nav-dropdown-item" href="status.html"><span class="dot"></span>Status window</a>' +
        '<a class="nav-dropdown-item" href="quests.html"><span class="dot"></span>Quest log</a>' +
        '<button class="nav-dropdown-item" type="button" id="auth-signout"><span class="dot dot-danger"></span>Sign out</button>' +
      '</div>' +
    '</div>';
  }

  function renderShell() {
    var page = document.body.getAttribute('data-page') || 'home';
    var header = document.getElementById('site-header');
    var footer = document.getElementById('site-footer');
    var user = currentUser();
    var derived = derive(Store.state);

    function navLinks() {
      return NAV.map(function (item) {
        if (item.dropdown) {
          var children = item.dropdown.map(function (child) {
            return '<a class="nav-dropdown-item" href="' + child.href + '"><span class="dot"></span>' + child.label + '</a>';
          }).join('');
          var isActive = item.dropdown.some(function (child) { return child.page === page; });
          return '<div class="nav-dropdown">' +
            '<button class="nav-link' + (isActive ? ' active' : '') + '" type="button">' + item.label + ' ▾</button>' +
            '<div class="nav-dropdown-menu">' + children + '</div></div>';
        }
        return '<a class="nav-link' + (item.page === page ? ' active' : '') + '" href="' + item.href + '">' + item.label + '</a>';
      }).join('');
    }

    if (header) {
      header.className = 'site-header';
      header.innerHTML =
        '<div class="container nav-inner">' +
          brandHtml() +
          '<nav class="nav-links" id="nav-links">' + navLinks() + '</nav>' +
          '<div class="nav-right">' +
            '<span class="nav-status"><span class="pulse-dot"></span>' +
              '<span id="nav-status-text">LV ' + Store.state.level + ' · ' + derived.rank + '</span></span>' +
            userMenuHtml(user) +
            '<button class="nav-toggle" id="nav-toggle" aria-label="Menu"><span></span></button>' +
          '</div>' +
        '</div>';
    }

    if (footer) {
      footer.className = 'site-footer';
      footer.innerHTML =
        '<div class="container">' +
          '<div class="footer-grid">' +
            '<div class="footer-col">' +
              '<div style="margin-bottom:12px">' + brandHtml() + '</div>' +
              '<p class="body-sm" style="max-width:280px">A local-first progression dashboard. Timed quests, derived stats, real check-ins, and one private profile per account.</p>' +
            '</div>' +
            '<div class="footer-col"><h4>Chapters</h4>' +
              '<a href="awakening.html">Awakening</a><a href="extraction.html">Extraction</a>' +
              '<a href="arise.html">Arise</a><a href="army.html">Army</a></div>' +
            '<div class="footer-col"><h4>Dashboard</h4>' +
              '<a href="status.html">Status</a><a href="quests.html">Quests</a>' +
              '<a href="vision.html">Vision</a><a href="advisor.html">Advisor</a></div>' +
            '<div class="footer-col"><h4>More</h4>' +
              '<a href="progress.html">Progress</a><a href="inventory.html">Inventory</a>' +
              '<a href="index.html">Home</a></div>' +
          '</div>' +
          '<div class="footer-bottom">' +
            '<span>Fan-made productivity prototype. Solo Leveling is owned by Chugong &amp; Redice Studio.</span>' +
            '<span class="mono tiny">v3.0 · real data · authenticated</span>' +
          '</div>' +
        '</div>';
    }

    var signout = document.getElementById('auth-signout');
    if (signout) {
      signout.addEventListener('click', function () {
        if (window.SystemAuth) window.SystemAuth.signOut();
      });
    }

    var toggle = document.getElementById('nav-toggle');
    var links = document.getElementById('nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', function () { links.classList.toggle('open'); });
    }

    return derived;
  }

  function initNavStatus() {
    var el = document.getElementById('nav-status-text');
    if (!el) return;
    function paint() {
      var derived = derive(Store.state);
      el.textContent = 'LV ' + Store.state.level + ' · ' + derived.rank;
    }
    paint();
    setInterval(paint, 30000);
  }

  /* ----------------------------------------------------------------------
     Frame sequence player
     ---------------------------------------------------------------------- */
  var REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function createFramePlayer(canvas, startFrame, endFrame, opts) {
    opts = opts || {};
    var stage = canvas.closest('[data-chapter-track]') ||
                canvas.closest('.hero') || canvas.parentElement;
    var ctx = canvas.getContext('2d', { alpha: false });
    var total = endFrame - startFrame + 1;
    var images = new Array(total);
    var loaded = 0;
    var index = 0;
    var acc = 0;
    var last = 0;
    var playing = !REDUCED;
    var inView = true;
    var fps = opts.fps || 24;
    var cropBottom = typeof opts.cropBottom === 'number' ? opts.cropBottom : 0.06;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cw = 0, ch = 0;
    var fillEl = null, labelEl = null, btnEl = null;
    var rafId = 0;

    function frameAt(i) {
      return images[Math.max(0, Math.min(total - 1, i))];
    }

    function resize() {
      var w = canvas.clientWidth || stage.clientWidth;
      var h = canvas.clientHeight || stage.clientHeight;
      if (!w || !h) return;
      cw = w; ch = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      draw();
    }

    function draw() {
      var img = frameAt(index);
      if (!img || !img.complete || !img.naturalWidth || !cw || !ch) return;
      var iw = img.naturalWidth;
      var ih = img.naturalHeight;
      var sh = ih * (1 - cropBottom);
      var ir = iw / sh;
      var cr = cw / ch;
      var dw, dh, dx, dy;
      if (cr > ir) { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
      else { dh = ch; dw = ch * ir; dx = (cw - dw) / 2; dy = 0; }
      ctx.drawImage(img, 0, 0, iw, sh, dx, dy, dw, dh);
    }

    function updateUI() {
      if (fillEl) fillEl.style.width = ((index + 1) / total * 100).toFixed(2) + '%';
      if (labelEl) {
        labelEl.textContent = 'SEQ ' + String(index + 1).padStart(3, '0') +
          ' / ' + total + ' · ' + fps + ' FPS';
      }
    }

    function tick(ts) {
      rafId = requestAnimationFrame(tick);
      if (!last) last = ts;
      var dt = Math.min(120, ts - last);
      last = ts;
      if (!playing || !inView || loaded < 2) return;
      acc += dt;
      var frameMs = 1000 / fps;
      if (acc < frameMs) return;
      var steps = Math.max(1, Math.floor(acc / frameMs));
      acc -= steps * frameMs;
      index = (index + steps) % total;
      draw();
      updateUI();
    }

    function loadAt(i) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        loaded++;
        if (i === 0) resize();
        if (opts.onProgress) opts.onProgress(loaded, total);
        if (loaded === total && opts.onReady) opts.onReady();
      };
      img.onerror = function () {
        loaded++;
        if (loaded === total && opts.onReady) opts.onReady();
      };
      img.src = framePath(startFrame + i);
      images[i] = img;
    }

    loadAt(0);
    for (var i = 1; i < total; i++) loadAt(i);

    if (opts.controls) {
      var bar = document.createElement('div');
      bar.className = 'chapter-controls';
      bar.innerHTML =
        '<button class="player-btn" type="button" aria-label="Pause sequence">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>' +
        '</button>' +
        '<div class="player-track"><div class="player-fill"></div></div>' +
        '<span class="player-label">SEQ 001 / ' + total + ' · ' + fps + ' FPS</span>';
      stage.appendChild(bar);
      btnEl = bar.querySelector('.player-btn');
      fillEl = bar.querySelector('.player-fill');
      labelEl = bar.querySelector('.player-label');

      btnEl.addEventListener('click', function () {
        playing = !playing;
        btnEl.setAttribute('aria-label', playing ? 'Pause sequence' : 'Play sequence');
        btnEl.innerHTML = playing
          ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>';
      });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
      }, { threshold: 0.05 }).observe(stage);
    }

    if ('ResizeObserver' in window) {
      new ResizeObserver(resize).observe(canvas);
    }
    window.addEventListener('resize', resize);

    resize();
    updateUI();
    rafId = requestAnimationFrame(tick);

    return {
      get index() { return index; },
      play: function () { playing = true; },
      pause: function () { playing = false; },
      stop: function () { cancelAnimationFrame(rafId); }
    };
  }

  /* ----------------------------------------------------------------------
     Global FX — ambient motes, reveals, counters, reading progress
     ---------------------------------------------------------------------- */
  function initAmbient() {
    if (REDUCED) return;
    var canvas = document.createElement('canvas');
    canvas.id = 'fx-ambient';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var W = 0, H = 0;
    var motes = [];

    function makeMote(spawnAnywhere) {
      return {
        x: Math.random() * W,
        y: spawnAnywhere ? Math.random() * H : H + 10,
        r: Math.random() * 1.7 + 0.4,
        vy: -(0.10 + Math.random() * 0.34),
        vx: (Math.random() - 0.5) * 0.14,
        a: 0.12 + Math.random() * 0.45,
        tw: Math.random() * Math.PI * 2,
        ts: 0.004 + Math.random() * 0.012,
        hue: Math.random() > 0.7 ? '56,189,248' : '167,139,250'
      };
    }

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.min(64, Math.max(24, Math.round(W / 24)));
      motes = [];
      for (var i = 0; i < count; i++) motes.push(makeMote(true));
    }

    function frame() {
      requestAnimationFrame(frame);
      if (document.hidden) return;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        m.x += m.vx;
        m.y += m.vy;
        m.tw += m.ts;
        var alpha = m.a * (0.55 + 0.45 * Math.sin(m.tw));
        if (m.y < -12) { motes[i] = makeMote(false); continue; }
        if (m.x < -12) m.x = W + 12;
        if (m.x > W + 12) m.x = -12;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + m.hue + ',' + alpha.toFixed(3) + ')';
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
  }

  function initReveals() {
    var els = document.querySelectorAll(
      '.feature, .module, .chapter-stat, .stat, .quest-item, .skill, .trans-card, ' +
      '.dash-head, .system-notice, .chapter-lead, .chapter-nav, .section .headline-lg'
    );
    if (!els.length) return;
    if (REDUCED || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('reveal', 'in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    els.forEach(function (el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = (Math.min(i % 6, 5) * 55) + 'ms';
      io.observe(el);
    });

    setTimeout(function () {
      els.forEach(function (el) { el.classList.add('in'); });
    }, 1600);
  }

  function initCounters() {
    if (REDUCED) return;
    document.querySelectorAll('.hero-meta-item .num').forEach(function (el) {
      if (el.getAttribute('data-counted') === '1') return;
      el.setAttribute('data-counted', '1');
      var target = parseInt(el.textContent, 10);
      if (isNaN(target)) return;
      var start = performance.now();
      var dur = 1400;
      function step(now) {
        var t = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = target;
      }
      el.textContent = '0';
      requestAnimationFrame(step);
    });
  }

  function initReadingProgress() {
    var bar = document.createElement('div');
    bar.className = 'page-progress';
    document.body.appendChild(bar);
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ----------------------------------------------------------------------
     Boot sequence (home only, once per session)
     ---------------------------------------------------------------------- */
  function createBoot() {
    var noop = { set: function () {}, finish: function () {}, onDone: function () {} };
    if (REDUCED) return noop;

    var key = 'system_portal_boot_v1';
    try { if (sessionStorage.getItem(key)) return noop; } catch (e) {}

    var el = document.createElement('div');
    el.className = 'boot';
    el.innerHTML =
      '<div class="boot-inner">' +
        '<div class="boot-mark"><span>◈</span></div>' +
        '<div class="boot-title">SYSTEM</div>' +
        '<div class="boot-sub">Initializing the hunter interface</div>' +
        '<div class="boot-bar"><div class="boot-fill"></div></div>' +
        '<div class="boot-meta"><span id="boot-log">LINKING FRAMES</span><span id="boot-pct">0%</span></div>' +
      '</div>';
    document.body.appendChild(el);
    document.documentElement.style.overflow = 'hidden';

    var fill = el.querySelector('.boot-fill');
    var pctEl = el.querySelector('#boot-pct');
    var logEl = el.querySelector('#boot-log');
    var started = performance.now();
    var finished = false;
    var doneCb = null;

    function finish() {
      if (finished) return;
      finished = true;
      fill.style.width = '100%';
      pctEl.textContent = '100%';
      logEl.textContent = 'SYSTEM ONLINE';
      try { sessionStorage.setItem(key, '1'); } catch (e) {}
      setTimeout(function () {
        el.classList.add('done');
        document.documentElement.style.overflow = '';
        if (doneCb) doneCb();
        setTimeout(function () { el.remove(); }, 900);
      }, 420);
    }

    setTimeout(finish, 5000);

    return {
      set: function (done, total) {
        var pct = Math.round((done / total) * 100);
        fill.style.width = pct + '%';
        pctEl.textContent = pct + '%';
        logEl.textContent = done < total ? 'CACHING FRAME ' + String(done).padStart(3, '0') : 'SYSTEM ONLINE';
        if (done >= total) setTimeout(finish, Math.max(0, 1250 - (performance.now() - started)));
      },
      finish: finish,
      onDone: function (cb) { doneCb = cb; }
    };
  }

  function initChapterScroll(canvasId, startFrame, endFrame) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    return createFramePlayer(canvas, startFrame, endFrame, { fps: 15, controls: true });
  }

  /* ----------------------------------------------------------------------
     Page initializers
     ---------------------------------------------------------------------- */
  var Pages = {};

  /* ---------------------------- Home ------------------------------------ */
  function homeSignals(state, derived) {
    var signals = [];
    var active = state.quests
      .filter(function (q) { return q.status === 'active'; })
      .sort(function (a, b) { return a.expiresAt - b.expiresAt; });

    if (active.length) {
      var next = active[0];
      signals.push('NEXT QUEST · ' + next.title.toUpperCase() + ' · ' + fmtTime((next.expiresAt - Date.now()) / 1000) + ' LEFT');
    } else {
      signals.push('NO ACTIVE QUESTS · ISSUE ONE TO BEGIN');
    }
    signals.push('LEVEL ' + state.level + ' · ' + derived.title.toUpperCase() + ' · RANK ' + derived.rank);
    signals.push('XP ' + state.exp + ' / ' + derived.maxExp + ' · ' + state.availableAp + ' ABILITY POINTS');
    signals.push('STREAK ' + derived.currentStreak + ' DAY' + (derived.currentStreak === 1 ? '' : 'S') + ' · ' + derived.completedCount + ' QUESTS COMPLETED');
    return signals;
  }

  function initSignal(state, derived) {
    var el = document.getElementById('hero-signal-text');
    if (!el || REDUCED) return;
    var signals = homeSignals(state, derived);
    var i = 0;
    el.style.transition = 'opacity 260ms ease';
    el.textContent = signals[0];
    setInterval(function () {
      var fresh = homeSignals(Store.state, derive(Store.state));
      i = (i + 1) % fresh.length;
      el.style.opacity = '0';
      setTimeout(function () {
        el.textContent = fresh[i];
        el.style.opacity = '1';
      }, 260);
    }, 3800);
  }

  function renderHomeTicker(state, derived) {
    var track = document.getElementById('home-ticker');
    if (!track) return;
    var user = currentUser();
    var items = [
      ['Level', state.level + ' · ' + derived.title],
      ['Rank', derived.rank + ' · ' + (derived.maxExp - state.exp) + ' XP to next'],
      ['Quests', derived.activeCount + ' active · ' + derived.completedCount + ' completed'],
      ['Streak', derived.currentStreak + ' day' + (derived.currentStreak === 1 ? '' : 's')],
      ['Gold', state.gold.toLocaleString()],
      ['Frames', TOTAL_FRAMES + ' on disk'],
      ['Account', user ? user.email : 'not signed in']
    ];
    var html = items.map(function (pair) {
      return '<span><b>' + escapeHtml(pair[0]) + '</b> ' + escapeHtml(pair[1]) + '</span>';
    }).join('');
    track.innerHTML = html + html;
  }

  function updateHomeCountdown() {
    var el = document.getElementById('home-notice-countdown');
    if (!el) return;
    var state = Store.state;
    var active = state.quests
      .filter(function (q) { return q.status === 'active'; })
      .sort(function (a, b) { return a.expiresAt - b.expiresAt; });
    if (!active.length) return;
    el.textContent = fmtTime((active[0].expiresAt - Date.now()) / 1000) + ' remaining';
  }

  function renderHomeNotice(state) {
    var labelEl = document.getElementById('home-notice-label');
    var titleEl = document.getElementById('home-notice-title');
    var bodyEl = document.getElementById('home-notice-body');
    var rewardEl = document.getElementById('home-notice-rewards');
    if (!titleEl || !bodyEl || !rewardEl) return;

    var active = state.quests
      .filter(function (q) { return q.status === 'active'; })
      .sort(function (a, b) { return a.expiresAt - b.expiresAt; });

    if (!active.length) {
      if (labelEl) labelEl.textContent = 'Notification';
      titleEl.textContent = 'No active quests';
      bodyEl.textContent = 'The System has nothing to track yet. Issue your first timed objective and it will appear here with a real countdown and real rewards.';
      rewardEl.innerHTML = '<a class="btn-link" href="quests.html">Issue your first quest →</a>';
      return;
    }

    var quest = active[0];
    if (labelEl) labelEl.textContent = 'Quest · Rank ' + quest.rank;
    titleEl.textContent = quest.title;
    bodyEl.innerHTML = 'Due ' + escapeHtml(fmtDateTime(quest.expiresAt)) + ' · ' +
      '<span id="home-notice-countdown">' + escapeHtml(fmtTime((quest.expiresAt - Date.now()) / 1000)) + ' remaining</span>' +
      '. Rank ' + escapeHtml(quest.rank) + ' · ' + quest.minutes + ' minutes.';
    rewardEl.innerHTML =
      '<span>+' + quest.xp + ' XP</span>' +
      '<span>+' + quest.gold.toLocaleString() + ' GOLD</span>' +
      '<span>+' + quest.ap + ' AP</span>';
  }

  function renderHomeStatus(state, derived) {
    setText('home-level', 'LV ' + state.level);
    setText('home-hp', derived.maxHp.toLocaleString() + ' / ' + derived.maxHp.toLocaleString());
    setText('home-mp', derived.maxMp.toLocaleString() + ' / ' + derived.maxMp.toLocaleString());
    setText('home-exp', state.exp + ' / ' + derived.maxExp);
    setWidth('home-hp-bar', 100);
    setWidth('home-mp-bar', 100);
    setWidth('home-exp-bar', derived.maxExp > 0 ? (state.exp / derived.maxExp) * 100 : 0);

    var rankChip = document.getElementById('home-rank-chip');
    if (rankChip) rankChip.textContent = 'Rank ' + derived.rank + ' · Level ' + state.level;
  }

  Pages.home = function () {
    var canvas = document.getElementById('hero-canvas');
    var state = Store.state;
    var derived = derive(state);

    renderHomeNotice(state);
    renderHomeStatus(state, derived);
    renderHomeTicker(state, derived);

    setInterval(updateHomeCountdown, 1000);

    if (canvas) {
      var boot = createBoot();
      boot.onDone(initCounters);
      setTimeout(initCounters, 400);
      createFramePlayer(canvas, 1, 90, {
        fps: 20,
        onProgress: boot.set,
        onReady: boot.finish
      });
    }
    initSignal(state, derived);
  };

  /* ---------------------------- Chapters -------------------------------- */
  function chapterPage(start, end) {
    return function () { initChapterScroll('chapter-canvas', start, end); };
  }
  Pages.awakening = chapterPage(1, 65);
  Pages.extraction = chapterPage(66, 130);
  Pages.arise = chapterPage(131, 190);
  Pages.army = chapterPage(191, 270);

  /* ---------------------------- Status ---------------------------------- */
  Pages.status = function () {
    var state = Store.state;
    var user = currentUser();

    function render() {
      Store.reconcile();
      var derived = derive(state);

      setText('st-name', user ? user.name : 'Hunter');
      setText('st-title', derived.title);
      setText('st-avatar', initials(user ? (user.name || user.email) : 'Hunter'));
      setText('st-rank', 'Rank ' + derived.rank);
      setText('st-gold', state.gold.toLocaleString());
      setText('st-fatigue', state.fatigue + '%');
      setText('st-ap', state.availableAp);
      setText('st-level', state.level);

      setText('st-hp', derived.maxHp.toLocaleString() + ' / ' + derived.maxHp.toLocaleString());
      setText('st-mp', derived.maxMp.toLocaleString() + ' / ' + derived.maxMp.toLocaleString());
      setWidth('st-hpbar', 100);
      setWidth('st-mpbar', 100);

      var expPct = derived.maxExp > 0 ? Math.min(100, (state.exp / derived.maxExp) * 100) : 0;
      setText('st-exp', state.exp + ' / ' + derived.maxExp + ' (' + Math.floor(expPct) + '%)');
      setWidth('st-expbar', expPct);

      STAT_KEYS.forEach(function (key) { setText('stat-' + key, state.stats[key]); });

      setText('st-completed', derived.completedCount);
      setText('st-streak', derived.currentStreak);
      setText('st-best', derived.bestStreak);
      setText('st-next', Math.max(0, derived.maxExp - state.exp) + ' XP');
      setText('st-since', fmtDate(derived.memberSince));

      document.querySelectorAll('.ap-plus-btn').forEach(function (btn) {
        btn.disabled = state.availableAp <= 0;
      });

      Store.save();
    }

    document.querySelectorAll('.ap-plus-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-stat');
        if (state.availableAp <= 0 || state.stats[key] === undefined) return;
        state.stats[key]++;
        state.availableAp--;
        render();
        toast('Ability point allocated', '+1 ' + key.toUpperCase() + ' · ' + state.availableAp + ' AP remaining');
      });
    });

    var resetBtn = document.getElementById('st-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (!confirm('Reset this account’s level, stats, gold, quests and history? This cannot be undone.')) return;
        Store.reset();
        state = Store.state;
        render();
        toast('Progress reset', 'This account is back at level 1 with 10 in every stat.');
      });
    }

    render();
  };

  /* ---------------------------- Quests ---------------------------------- */
  Pages.quests = function () {
    var state = Store.state;
    var container = document.getElementById('quests-container');
    var historyEl = document.getElementById('quest-history');
    var rewardEl = document.getElementById('reward-scale');

    function renderRewardScale() {
      if (!rewardEl) return;
      rewardEl.innerHTML = ['E', 'D', 'C', 'B', 'A', 'S'].map(function (rank) {
        var r = questRewards(30, rank);
        return '<div class="history-item">' +
          '<span class="history-name">Rank ' + rank + '</span>' +
          '<span class="history-meta">30 min → ' + r.xp + ' XP · ' + r.gold.toLocaleString() + ' gold · ' + r.ap + ' AP</span>' +
        '</div>';
      }).join('');
    }

    function render() {
      if (!container) return;
      var active = state.quests
        .filter(function (q) { return q.status === 'active'; })
        .sort(function (a, b) { return a.expiresAt - b.expiresAt; });

      if (!active.length) {
        container.innerHTML = emptyState(
          '◈',
          'No active quests',
          'Nothing is being tracked right now. Create a timed objective on the right — the countdown starts the moment you issue it.'
        );
      } else {
        container.innerHTML = active.map(function (q) {
          var remaining = Math.max(0, Math.ceil((q.expiresAt - Date.now()) / 1000));
          return '<div class="quest-item" data-id="' + q.id + '">' +
            '<div class="quest-main">' +
              '<div class="quest-rank">Rank ' + escapeHtml(q.rank) + ' · ' + q.minutes + ' min</div>' +
              '<div class="quest-title">' + escapeHtml(q.title) + '</div>' +
              '<div class="quest-reqs">Issued ' + escapeHtml(fmtDateTime(q.createdAt)) + ' · expires ' + escapeHtml(fmtDateTime(q.expiresAt)) + '</div>' +
              '<div class="quest-reward mono tiny">+' + q.xp + ' XP · +' + q.gold.toLocaleString() + ' gold · +' + q.ap + ' AP</div>' +
            '</div>' +
            '<div class="quest-side">' +
              '<span class="quest-timer mono' + (remaining < 300 ? ' text-error' : '') + '" data-timer="' + q.id + '">' + fmtTime(remaining) + '</span>' +
              '<button class="btn btn-secondary btn-sm complete-btn" type="button" data-id="' + q.id + '">Complete</button>' +
            '</div>' +
          '</div>';
        }).join('');
      }

      container.querySelectorAll('.complete-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { complete(btn.getAttribute('data-id')); });
      });

      if (historyEl) {
        var finished = state.quests
          .filter(function (q) { return q.status !== 'active'; })
          .sort(function (a, b) {
            return (b.completedAt || b.expiredAt || 0) - (a.completedAt || a.expiredAt || 0);
          })
          .slice(0, 10);

        historyEl.innerHTML = finished.length
          ? finished.map(function (q) {
              var ok = q.status === 'completed';
              return '<div class="history-item">' +
                '<span class="history-name">' + escapeHtml(q.title) + ' · ' + escapeHtml(q.rank) + '</span>' +
                '<span class="history-meta ' + (ok ? 'ok' : 'bad') + '">' +
                  (ok ? 'Completed ' + escapeHtml(fmtDate(q.completedAt)) : 'Expired ' + escapeHtml(fmtDate(q.expiredAt))) +
                '</span>' +
              '</div>';
            }).join('')
          : '<p class="body-sm">No finished quests yet.</p>';
      }
    }

    function complete(id) {
      var quest = state.quests.find(function (q) { return q.id === id; });
      if (!quest || quest.status !== 'active') return;

      quest.status = 'completed';
      quest.completedAt = Date.now();
      state.gold += quest.gold;
      state.availableAp += quest.ap;
      state.fatigue = Math.min(100, state.fatigue + 10);
      var levels = addExp(state, quest.xp);

      Store.save();
      render();
      toast('Quest complete', quest.title + ' · +' + quest.xp + ' XP, +' + quest.gold.toLocaleString() + ' gold, +' + quest.ap + ' AP');
      if (levels > 0) {
        toast('Level up', 'You are now level ' + state.level + '. +' + (levels * AP_PER_LEVEL) + ' ability points.');
      }
    }

    renderRewardScale();

    var addBtn = document.getElementById('add-quest');
    var titleEl = document.getElementById('quest-title');
    var rankEl = document.getElementById('quest-rank');
    var minutesEl = document.getElementById('quest-minutes');
    var previewEl = document.getElementById('quest-preview');

    function updatePreview() {
      if (!previewEl) return;
      var minutes = parseInt((minutesEl || {}).value, 10);
      var rank = (rankEl || {}).value || 'E';
      if (!minutes || minutes < 1) {
        previewEl.textContent = 'Rewards are calculated from duration × rank once you enter the minutes.';
        return;
      }
      var r = questRewards(minutes, rank);
      previewEl.textContent = minutes + ' min at rank ' + rank + ' → +' + r.xp + ' XP · +' + r.gold.toLocaleString() + ' gold · +' + r.ap + ' AP';
    }

    if (minutesEl) minutesEl.addEventListener('input', updatePreview);
    if (rankEl) rankEl.addEventListener('change', updatePreview);
    updatePreview();

    if (addBtn) {
      addBtn.addEventListener('click', function () {
        var title = String((titleEl || {}).value || '').trim();
        var rank = (rankEl || {}).value || 'E';
        var minutes = parseInt((minutesEl || {}).value, 10);

        if (!title) { toast('Missing title', 'Enter a quest title first.'); return; }
        if (!minutes || minutes < 1 || minutes > 1440) {
          toast('Invalid duration', 'Set a duration between 1 and 1,440 minutes.');
          return;
        }

        var rewards = questRewards(minutes, rank);
        state.quests.push({
          id: 'q_' + Date.now(),
          title: title,
          rank: rank,
          minutes: rewards.minutes,
          xp: rewards.xp,
          gold: rewards.gold,
          ap: rewards.ap,
          createdAt: Date.now(),
          expiresAt: Date.now() + rewards.minutes * 60000,
          status: 'active'
        });

        Store.save();
        render();
        if (titleEl) titleEl.value = '';
        if (minutesEl) minutesEl.value = '';
        updatePreview();
        toast('Quest issued', title + ' · due in ' + minutes + ' minutes.');
      });
    }

    setInterval(function () {
      var now = Date.now();
      var needsRender = false;

      state.quests.forEach(function (q) {
        if (q.status === 'active' && now >= q.expiresAt) needsRender = true;
      });

      if (needsRender) {
        Store.reconcile();
        Store.save();
        render();
        toast('Penalty applied', 'A quest expired. Level and fatigue were adjusted.');
        return;
      }

      state.quests.forEach(function (q) {
        if (q.status !== 'active') return;
        var el = container && container.querySelector('[data-timer="' + q.id + '"]');
        if (!el) return;
        var remaining = Math.max(0, Math.ceil((q.expiresAt - now) / 1000));
        el.textContent = fmtTime(remaining);
        el.classList.toggle('text-error', remaining < 300);
      });
    }, 1000);

    render();
  };

  /* ---------------------------- Vision ---------------------------------- */
  Pages.vision = function () {
    var state = Store.state;
    var user = currentUser();
    var video = document.getElementById('camera-video');
    var canvas = document.getElementById('camera-canvas');
    var startBtn = document.getElementById('cam-start');
    var captureBtn = document.getElementById('cam-capture');
    var stopBtn = document.getElementById('cam-stop');
    var statusEl = document.getElementById('cam-status');
    var out = document.getElementById('assessment-out');
    var gallery = document.getElementById('checkin-gallery');
    var clearBtn = document.getElementById('checkin-clear');
    var stream = null;

    function renderCheckIns() {
      if (!gallery) return;
      if (!state.checkIns.length) {
        gallery.innerHTML = emptyState(
          '◉',
          'No check-ins yet',
          'Start the camera and capture a frame. Snapshots are downscaled and kept in this browser only — nothing is uploaded or analysed.'
        );
        return;
      }
      gallery.innerHTML = state.checkIns.map(function (item) {
        return '<figure class="checkin">' +
          '<img src="' + item.thumb + '" alt="Camera check-in from ' + escapeHtml(fmtDateTime(item.at)) + '" />' +
          '<figcaption>' + escapeHtml(fmtDateTime(item.at)) + '</figcaption>' +
        '</figure>';
      }).join('');
    }

    function showCaptureMeta(width, height) {
      if (!out) return;
      out.innerHTML =
        '<div class="mono" style="font-size:12px;line-height:1.9">' +
          '<div class="flex justify-between"><span>Last capture</span><span>' + width + ' × ' + height + ' px</span></div>' +
          '<div class="flex justify-between"><span>Stored at</span><span>' + escapeHtml(fmtDateTime(Date.now())) + '</span></div>' +
          '<div class="flex justify-between"><span>Check-ins kept</span><span>' + state.checkIns.length + ' of 6</span></div>' +
          '<div class="flex justify-between"><span>Analysis</span><span>None — snapshot only</span></div>' +
        '</div>';
    }

    function start() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (statusEl) statusEl.textContent = 'Camera unsupported';
        toast('Camera unsupported', 'This browser does not expose getUserMedia.');
        return;
      }
      if (statusEl) statusEl.textContent = 'Connecting…';
      navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      }).then(function (mediaStream) {
        stream = mediaStream;
        if (video) video.srcObject = mediaStream;
        if (startBtn) startBtn.disabled = true;
        if (captureBtn) captureBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = false;
        if (statusEl) statusEl.textContent = 'Camera active';
      }).catch(function () {
        if (statusEl) statusEl.textContent = 'Camera unavailable';
        toast('Camera blocked', 'Permission was denied or no camera is available. Reminders still work.');
      });
    }

    function stop() {
      if (stream) {
        stream.getTracks().forEach(function (track) { track.stop(); });
        stream = null;
      }
      if (video) video.srcObject = null;
      if (startBtn) startBtn.disabled = false;
      if (captureBtn) captureBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = true;
      if (statusEl) statusEl.textContent = 'Camera offline';
    }

    function capture() {
      if (!video || !canvas) return;
      var width = video.videoWidth;
      var height = video.videoHeight;
      if (!width || !height) {
        toast('Camera not ready', 'Wait for the live preview, then capture.');
        return;
      }
      var scale = Math.min(1, 480 / width);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

      state.checkIns.unshift({
        id: Date.now(),
        at: Date.now(),
        width: canvas.width,
        height: canvas.height,
        thumb: canvas.toDataURL('image/jpeg', 0.62)
      });
      state.checkIns = state.checkIns.slice(0, 6);

      if (!Store.save()) {
        toast('Storage full', 'The check-in could not be saved. Delete older check-ins or transformation posts.');
      }
      renderCheckIns();
      showCaptureMeta(canvas.width, canvas.height);
      toast('Check-in captured', 'Stored in this browser at ' + fmtDateTime(Date.now()) + '.');
    }

    if (startBtn) startBtn.addEventListener('click', start);
    if (stopBtn) stopBtn.addEventListener('click', stop);
    if (captureBtn) captureBtn.addEventListener('click', capture);

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (!state.checkIns.length) return;
        if (!confirm('Delete all ' + state.checkIns.length + ' saved check-ins?')) return;
        state.checkIns = [];
        Store.save();
        renderCheckIns();
        if (out) out.textContent = 'Start the camera and capture a frame to store a check-in.';
        toast('Check-ins cleared', 'All stored snapshots were removed from this browser.');
      });
    }

    /* Reminders with real due timestamps */
    var reminderList = document.getElementById('reminder-list');

    function renderReminders() {
      if (!reminderList) return;
      if (!state.reminders.length) {
        reminderList.innerHTML = '<p class="body-sm">No reminders scheduled. Reminders are saved and survive a reload.</p>';
        return;
      }
      reminderList.innerHTML = state.reminders
        .sort(function (a, b) { return a.dueAt - b.dueAt; })
        .map(function (reminder) {
          var remaining = Math.max(0, Math.ceil((reminder.dueAt - Date.now()) / 1000));
          return '<div class="history-item">' +
            '<span class="history-name">' + escapeHtml(reminder.text) + '</span>' +
            '<span class="history-meta" data-reminder="' + reminder.id + '">' + fmtTime(remaining) + '</span>' +
          '</div>';
        }).join('');
    }

    var reminderBtn = document.getElementById('reminder-add');
    if (reminderBtn) {
      reminderBtn.addEventListener('click', function () {
        var textEl = document.getElementById('reminder-text');
        var minutesEl = document.getElementById('reminder-minutes');
        var text = String((textEl && textEl.value) || '').trim();
        var minutes = parseInt((minutesEl && minutesEl.value), 10);

        if (!text) { toast('Missing message', 'Write a reminder first.'); return; }
        if (!minutes || minutes < 1 || minutes > 1440) {
          toast('Invalid time', 'Set a reminder between 1 and 1,440 minutes from now.');
          return;
        }

        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }

        state.reminders.push({
          id: 'r_' + Date.now(),
          text: text,
          dueAt: Date.now() + minutes * 60000
        });
        Store.save();
        renderReminders();
        if (textEl) textEl.value = '';
        toast('Reminder set', text + ' · ' + fmtDateTime(Date.now() + minutes * 60000));
      });
    }

    setInterval(function () {
      var now = Date.now();
      var due = state.reminders.filter(function (r) { return r.dueAt <= now; });

      if (due.length) {
        due.forEach(function (reminder) {
          toast('Reminder', reminder.text);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('System Portal reminder', { body: reminder.text });
          }
        });
        state.reminders = state.reminders.filter(function (r) { return r.dueAt > now; });
        Store.save();
        renderReminders();
        return;
      }

      state.reminders.forEach(function (reminder) {
        var el = reminderList && reminderList.querySelector('[data-reminder="' + reminder.id + '"]');
        if (el) el.textContent = fmtTime((reminder.dueAt - now) / 1000);
      });
    }, 1000);

    renderCheckIns();
    renderReminders();
    if (statusEl) statusEl.textContent = 'Camera offline';
  };

  /* ---------------------------- Advisor --------------------------------- */
  Pages.advisor = function () {
    var state = Store.state;
    var form = document.getElementById('chat-form');
    var input = document.getElementById('chat-input');
    var messages = document.getElementById('chat-messages');

    function answer(text) {
      var derived = derive(state);
      var lower = text.toLowerCase();

      function has() {
        return Array.prototype.some.call(arguments, function (word) { return lower.indexOf(word) !== -1; });
      }

      if (has('level', 'xp', 'next', 'rank up')) {
        return 'You are level ' + state.level + ' (' + derived.title + ', rank ' + derived.rank + '). ' +
          'You need ' + Math.max(0, derived.maxExp - state.exp) + ' more XP for level ' + (state.level + 1) + '. ' +
          'Rank ' + derived.rank + ' lasts until level ' + ({ E: 5, D: 10, C: 20, B: 30, A: 50, S: 999 }[derived.rank]) +
          '. XP comes only from completed quests.';
      }
      if (has('quest', 'today', 'active', 'due', 'overdue')) {
        if (!derived.activeCount) {
          return 'You have no active quests right now. Issue one from the quest log with a real duration; rewards are duration × rank, and the countdown starts immediately.';
        }
        var next = state.quests
          .filter(function (q) { return q.status === 'active'; })
          .sort(function (a, b) { return a.expiresAt - b.expiresAt; })[0];
        return 'You have ' + derived.activeCount + ' active quest' + (derived.activeCount === 1 ? '' : 's') + '. ' +
          'The next deadline is "' + next.title + '" at ' + fmtDateTime(next.expiresAt) + ' (' +
          fmtTime((next.expiresAt - Date.now()) / 1000) + ' remaining).';
      }
      if (has('stat', 'build', 'strength', 'ap', 'allocate', 'vitality', 'intelligence')) {
        return 'Your stats are STR ' + state.stats.str + ', AGI ' + state.stats.agi + ', VIT ' + state.stats.vit +
          ', INT ' + state.stats.int + ', PER ' + state.stats.per + '. You have ' + state.availableAp +
          ' unspent ability point' + (state.availableAp === 1 ? '' : 's') + '. ' +
          'Each point raises one stat by 1; every level grants ' + AP_PER_LEVEL + '. VIT raises max HP, INT raises max MP.';
      }
      if (has('streak', 'consistent', 'days')) {
        return 'Your current streak is ' + derived.currentStreak + ' day' + (derived.currentStreak === 1 ? '' : 's') +
          ' and your best is ' + derived.bestStreak + '. A day counts once you complete at least one quest on it. ' +
          'You have completed ' + derived.completedCount + ' quests in total.';
      }
      if (has('penalty', 'fail', 'expired', 'punish', 'expire')) {
        return 'When a quest passes its deadline it is marked expired: you lose 1 level and reset current XP, plus 20 fatigue. ' +
          'At level 1 there is no level to lose, so fatigue rises by 40 instead. Fatigue recovers 6 points per real hour.';
      }
      if (has('workout', 'pushup', 'push-up', 'squat', 'run', 'exercise', 'training')) {
        return 'This build does not prescribe a workout. Create a quest that matches what you actually plan to do, ' +
          'set a honest duration, and complete it when finished. The System only records what you report.';
      }
      if (has('shadow', 'arise', 'army', 'extract', 'monarch')) {
        return 'Shadow extraction is narrative flavour here. The real record is your quest history: ' +
          derived.completedCount + ' completed and ' + derived.expiredCount + ' expired. ' +
          'Your level and rank are derived from that history, not from a story flag.';
      }
      if (has('fatigue', 'tired', 'recover', 'rest')) {
        return 'Fatigue is ' + state.fatigue + '%. It rises by 10 when you complete a quest and by 20–40 on expiry, ' +
          'and recovers 1 point every 10 real minutes (6 per hour) whether the site is open or not.';
      }
      if (has('gold', 'reward', 'economy')) {
        return 'You have ' + state.gold.toLocaleString() + ' gold. Gold is earned per completed quest at 5 × minutes × rank multiplier. ' +
          'Rewards are shown before you issue a quest, so there are no hidden numbers.';
      }
      return 'I answer from your real state, locally. Ask about your level, XP, stats, active quests, streak, penalty rules, fatigue or gold. ' +
        'Right now: level ' + state.level + ', rank ' + derived.rank + ', ' + derived.activeCount + ' active quests.';
    }

    function append(author, text, isUser) {
      if (!messages) return;
      var el = document.createElement('div');
      el.className = 'chat-msg ' + (isUser ? 'user' : 'system');
      el.innerHTML =
        '<div class="msg-avatar">' + (isUser ? escapeHtml(initials(currentUser() ? currentUser().name : 'You')) : '◈') + '</div>' +
        '<div class="msg-bubble"><span class="msg-author">' + escapeHtml(author) + '</span><p>' +
        escapeHtml(text).replace(/\n/g, '<br>') + '</p></div>';
      messages.appendChild(el);
      messages.scrollTop = messages.scrollHeight;
    }

    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var text = String((input && input.value) || '').trim();
        if (!text) return;
        append('You', text, true);
        if (input) input.value = '';
        setTimeout(function () { append('System advisor', answer(text), false); }, 380);
      });
    }

    document.querySelectorAll('.quick-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (!input) return;
        input.value = chip.getAttribute('data-query') || chip.textContent;
        if (form) form.dispatchEvent(new Event('submit'));
      });
    });
  };

  /* ---------------------------- Progress -------------------------------- */
  function readPhoto(file, maxWidth, quality) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, maxWidth / img.naturalWidth);
        var width = Math.max(1, Math.round(img.naturalWidth * scale));
        var height = Math.max(1, Math.round(img.naturalHeight * scale));
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        try {
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (err) {
          reject(new Error('That image cannot be read in this browser.'));
        }
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read that image file.'));
      };
      img.src = url;
    });
  }

  Pages.progress = function () {
    var state = Store.state;
    var user = currentUser();
    var grid = document.getElementById('trans-grid');
    var modal = document.getElementById('trans-modal');
    var openBtn = document.getElementById('trans-open');
    var closeBtn = document.getElementById('trans-close');
    var cancelBtn = document.getElementById('trans-cancel');
    var form = document.getElementById('trans-form');

    function render() {
      if (!grid) return;
      if (!state.transformations.length) {
        grid.innerHTML = emptyState(
          '◈',
          'Your progression feed is empty',
          'Post a before photo and a current photo. Images are resized and stored in this browser only — they are never uploaded, and you can delete any post.',
          '<button class="btn btn-sm" type="button" id="trans-empty-open">Post your first update</button>'
        );
        var emptyOpen = document.getElementById('trans-empty-open');
        if (emptyOpen) emptyOpen.addEventListener('click', openModal);
        return;
      }

      grid.innerHTML = state.transformations.map(function (item) {
        return '<article class="trans-card">' +
          '<div class="trans-body">' +
            '<div class="trans-author">' +
              '<div><div class="trans-rank mono">Level ' + item.level + ' · Rank ' + escapeHtml(item.rank) + '</div>' +
              '<div class="trans-name">' + escapeHtml(item.author) + '</div></div>' +
              '<div class="trans-time mono">' + escapeHtml(fmtDate(item.at)) + '</div>' +
            '</div>' +
            '<div class="trans-compare">' +
              '<div class="trans-pane"><div class="trans-pane-tag mono">Before</div><div class="trans-pane-img" style="background-image:url(\'' + item.beforeImg + '\')"></div></div>' +
              '<div class="trans-vs mono">VS</div>' +
              '<div class="trans-pane"><div class="trans-pane-tag mono">Current</div><div class="trans-pane-img" style="background-image:url(\'' + item.afterImg + '\')"></div></div>' +
            '</div>' +
            '<p class="trans-caption">“' + escapeHtml(item.caption) + '”</p>' +
            '<div class="trans-actions">' +
              '<button class="btn btn-ghost btn-sm trans-del" type="button" data-id="' + item.id + '">Delete</button>' +
              '<span class="mono tiny">Stored locally · ' + escapeHtml(fmtDateTime(item.at)) + '</span>' +
            '</div>' +
          '</div>' +
        '</article>';
      }).join('');

      grid.querySelectorAll('.trans-del').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = Number(btn.getAttribute('data-id'));
          if (!confirm('Delete this progression post from this browser?')) return;
          state.transformations = state.transformations.filter(function (item) { return item.id !== id; });
          Store.save();
          render();
          toast('Post deleted', 'The photos were removed from this browser.');
        });
      });
    }

    function openModal() {
      if (!modal) return;
      var authorEl = document.getElementById('trans-author');
      if (authorEl && !authorEl.value) authorEl.value = user ? user.name : '';
      modal.classList.add('open');
    }
    function closeModal() { if (modal) modal.classList.remove('open'); }

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', function (event) { if (event.target === modal) closeModal(); });

    if (form) {
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        var author = String((document.getElementById('trans-author') || {}).value || '').trim();
        var beforeInput = document.getElementById('trans-before');
        var afterInput = document.getElementById('trans-after');
        var caption = String((document.getElementById('trans-caption') || {}).value || '').trim();
        var permission = document.getElementById('trans-perm');

        if (!permission || !permission.checked) {
          toast('Permission required', 'Confirm the storage checkbox first.');
          return;
        }
        if (!author) { toast('Missing name', 'Add the name to show on the post.'); return; }
        if (!beforeInput || !beforeInput.files[0] || !afterInput || !afterInput.files[0]) {
          toast('Missing photos', 'Select both a before and a current photo.');
          return;
        }
        if (!caption) { toast('Missing notes', 'Describe what changed.'); return; }

        var submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Processing…'; }

        try {
          var beforeImg = await readPhoto(beforeInput.files[0], 720, 0.72);
          var afterImg = await readPhoto(afterInput.files[0], 720, 0.72);
          var derived = derive(state);

          state.transformations.unshift({
            id: Date.now(),
            author: author,
            email: user ? user.email : '',
            level: state.level,
            rank: derived.rank,
            beforeImg: beforeImg,
            afterImg: afterImg,
            caption: caption,
            at: Date.now()
          });
          state.transformations = state.transformations.slice(0, 8);

          if (!Store.save()) {
            state.transformations.shift();
            toast('Storage full', 'These photos exceed the browser quota. Try smaller images or delete an older post.');
            return;
          }

          closeModal();
          form.reset();
          render();
          toast('Update posted', 'Stored in this browser at ' + fmtDateTime(Date.now()) + '.');
        } catch (err) {
          toast('Photo error', err && err.message ? err.message : 'Could not process those images.');
        } finally {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit update'; }
        }
      });
    }

    render();
  };

  /* ---------------------------- Inventory -------------------------------- */
  var ITEMS = [
    { id: 'license', name: 'Hunter License', rank: 'E', icon: 'shield', desc: 'Your registration record.', unlock: { type: 'always', label: 'Issued on sign-up' } },
    { id: 'blade', name: 'Training Blade', rank: 'E', icon: 'blade', desc: 'Recorded after your first completed quest.', unlock: { quests: 1, label: '1 completed quest' } },
    { id: 'charm', name: 'Focus Charm', rank: 'D', icon: 'charm', desc: 'Recorded after ten completed quests.', unlock: { quests: 10, label: '10 completed quests' } },
    { id: 'ring', name: 'Vitality Ring', rank: 'C', icon: 'ring', desc: 'Recorded after a three-day streak.', unlock: { streak: 3, label: '3-day streak' } },
    { id: 'dagger', name: 'Shadow Dagger', rank: 'B', icon: 'blade', desc: 'Recorded when you reach level 5.', unlock: { level: 5, label: 'Level 5' } },
    { id: 'seal', name: 'Monarch Seal', rank: 'A', icon: 'seal', desc: 'Recorded when you reach level 20.', unlock: { level: 20, label: 'Level 20' } },
    { id: 'crown', name: 'Shadow Crown', rank: 'S', icon: 'crown', desc: 'Recorded when you reach level 50.', unlock: { level: 50, label: 'Level 50' } }
  ];

  var SKILLS = [
    { name: 'Sprint', desc: 'Milestone record for reaching level 5.', unlock: { level: 5, label: 'Level 5' } },
    { name: 'Stealth', desc: 'Milestone record for reaching level 10.', unlock: { level: 10, label: 'Level 10' } },
    { name: "Ruler's Authority", desc: 'Milestone record for completing 10 quests.', unlock: { quests: 10, label: '10 completed quests' } },
    { name: 'Shadow Extraction', desc: 'Milestone record for reaching level 20.', unlock: { level: 20, label: 'Level 20' } }
  ];

  function itemIcon(kind) {
    var icons = {
      shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
      blade: '<path d="M14 3l7 7-4 4-7-7zM9 10l-6 6 2 2 6-6M3 21l3-3"/>',
      charm: '<path d="M12 3a6 6 0 016 6c0 4-6 12-6 12S6 13 6 9a6 6 0 016-6z"/><circle cx="12" cy="9" r="2"/>',
      ring: '<circle cx="12" cy="14" r="6"/><path d="M9 5h6l-1.5 3h-3z"/>',
      seal: '<path d="M12 2l2.6 6.2L21 9l-4.5 4.4L17.6 20 12 16.7 6.4 20l1.1-6.6L3 9l6.4-.8z"/>',
      crown: '<path d="M3 7l4 4 5-7 5 7 4-4-2 12H5z"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">' +
      (icons[kind] || icons.seal) + '</svg>';
  }

  function unlocked(entry, state, derived) {
    var rule = entry.unlock;
    if (!rule || rule.type === 'always') return true;
    if (typeof rule.level === 'number') return state.level >= rule.level;
    if (typeof rule.quests === 'number') return derived.completedCount >= rule.quests;
    if (typeof rule.streak === 'number') return derived.bestStreak >= rule.streak;
    return false;
  }

  Pages.inventory = function () {
    var state = Store.state;
    var derived = derive(state);
    var grid = document.getElementById('inv-grid');
    var skillList = document.getElementById('skill-list');
    var countEl = document.getElementById('inv-count');

    if (grid) {
      var slots = ITEMS.map(function (entry) {
        var isOpen = unlocked(entry, state, derived);
        return '<button class="inv-slot' + (isOpen ? '' : ' locked') + '" type="button" data-item="' + entry.id + '">' +
          '<span class="inv-icon">' + itemIcon(entry.icon) + '</span>' +
          '<span class="inv-name">' + escapeHtml(isOpen ? entry.name : 'Locked') + '</span>' +
          '<span class="inv-rank">Rank ' + entry.rank + '</span>' +
          (isOpen ? '' : '<span class="inv-req">' + escapeHtml(entry.unlock.label) + '</span>') +
        '</button>';
      }).join('');

      var emptyCount = Math.max(0, 8 - ITEMS.length);
      for (var i = 0; i < emptyCount; i++) {
        slots += '<div class="inv-slot empty"><span>Empty</span></div>';
      }
      grid.innerHTML = slots;

      grid.querySelectorAll('[data-item]').forEach(function (slot) {
        slot.addEventListener('click', function () {
          var entry = ITEMS.find(function (item) { return item.id === slot.getAttribute('data-item'); });
          if (!entry) return;
          if (unlocked(entry, Store.state, derive(Store.state))) {
            toast(entry.name, entry.desc + ' No stat effect — this is a real progress record, not a buff.');
          } else {
            toast(entry.name + ' locked', 'Unlocks at: ' + entry.unlock.label + '.');
          }
        });
      });
    }

    if (skillList) {
      skillList.innerHTML = SKILLS.map(function (skill) {
        var isOpen = unlocked(skill, state, derived);
        return '<div class="skill' + (isOpen ? '' : ' locked') + '">' +
          '<div class="skill-icon">' + itemIcon('seal') + '</div>' +
          '<div class="skill-body">' +
            '<div class="skill-top"><span class="skill-name">' + escapeHtml(skill.name) + '</span>' +
            '<span class="skill-lvl mono">' + (isOpen ? 'Unlocked' : skill.unlock.label) + '</span></div>' +
            '<div class="skill-desc">' + escapeHtml(skill.desc) + '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    var openCount = ITEMS.filter(function (entry) { return unlocked(entry, state, derived); }).length;
    if (countEl) countEl.textContent = openCount + ' of ' + ITEMS.length + ' records';
  };

  /* ----------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    renderShell();
    initNavStatus();
    initAmbient();
    initReveals();
    initReadingProgress();

    var page = document.body.getAttribute('data-page');
    if (page && Pages[page]) {
      try { Pages[page](); } catch (err) { console.warn('Page init failed:', err); }
    }
  });

  window.SystemPortal = {
    Store: Store,
    toast: toast,
    framePath: framePath,
    derive: function () { return derive(Store.state); }
  };
})();
