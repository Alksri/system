/**
 * SOLO LEVELING // SYSTEM PORTAL & PROGRESSION PLATFORM
 * Complete Application Engine: Scroll Animator, Stats RPG Engine,
 * Timed Quests & Penalty Zone, Camera Vision, AI Architect Chatbot, and Transformation Feed.
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. CONFIGURATION & STATE INITIALIZATION
  // =========================================================================
  const TOTAL_FRAMES = 270;
  const FRAME_PREFIX = 'ezgif-frame-';
  const FRAME_PAD = 3;
  const FRAME_EXT = '.jpg';
  const PLAYBACK_FPS = 30;

  function getFramePath(index) {
    const padded = String(index).padStart(FRAME_PAD, '0');
    return `${FRAME_PREFIX}${padded}${FRAME_EXT}`;
  }

  // Animation Hero State
  const images = new Array(TOTAL_FRAMES);
  let loadedCount = 0;
  let isSystemReady = false;
  let currentFrame = 1;
  let lastDrawnFrame = -1;
  let isPlaying = false;
  let playDirection = 1;
  let lastFrameTimestamp = 0;

  // Player RPG State (Loaded from LocalStorage with defaults)
  const defaultPlayerState = {
    level: 18,
    title: 'THE SHADOW MONARCH',
    job: 'SHADOW LORD (NECROMANCER)',
    rank: 'S',
    gold: 45800,
    fatigue: 12,
    availableAp: 5,
    exp: 680,
    maxExp: 1000,
    stats: {
      str: 124,
      agi: 118,
      vit: 95,
      int: 165,
      per: 88
    },
    quests: [
      { id: 'q1', title: 'PHYSICAL CONDITIONING PROTOCOL', reqs: 'Push-ups: 100 | Sit-ups: 100 | Squats: 100 | Running: 10km', rank: 'D', xp: 300, gold: 5000, ap: 3, totalSeconds: 9918, remainingSeconds: 9918, completed: false, expired: false },
      { id: 'q2', title: 'DEEP FOCUS // CODE & STUDY DUNGEON', reqs: 'Maintain 90 minutes of undistracted focus without breaking concentration.', rank: 'C', xp: 250, gold: 4000, ap: 2, totalSeconds: 4360, remainingSeconds: 4360, completed: false, expired: false },
      { id: 'q3', title: 'MANA & HYDRATION PURIFICATION', reqs: 'Drink 3.0 Liters of water and take 15 minutes of recovery breathing.', rank: 'E', xp: 150, gold: 2000, ap: 1, totalSeconds: 2062, remainingSeconds: 2062, completed: false, expired: false }
    ],
    reminders: [],
    transformations: []
  };

  let player = JSON.parse(localStorage.getItem('solo_leveling_player_state')) || defaultPlayerState;

  function savePlayerState() {
    localStorage.setItem('solo_leveling_player_state', JSON.stringify(player));
  }

  // =========================================================================
  // 2. AUDIO SYNTHESIZER (WEB AUDIO API)
  // =========================================================================
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type) {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      if (type === 'levelup') {
        // Glorious monarch fanfare
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.6);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.8);
      } else if (type === 'quest_done') {
        // Satisfying high ping
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'penalty') {
        // Alarm buzzer
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.setValueAtTime(120, now + 0.2);
        osc.frequency.setValueAtTime(100, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.7);
      } else if (type === 'click') {
        // UI tick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (e) {
      console.warn('Audio synthesis error:', e);
    }
  }

  // =========================================================================
  // 3. TOAST NOTIFICATION HUB
  // =========================================================================
  const notificationHub = document.getElementById('systemNotificationHub');

  function showSystemToast(title, body, type = 'info') {
    if (!notificationHub) return;

    const toast = document.createElement('div');
    toast.className = `system-toast ${type === 'levelup' ? 'toast-levelup' : type === 'penalty' ? 'toast-penalty' : ''}`;
    
    toast.innerHTML = `
      <div class="toast-header">
        <span>${type === 'levelup' ? '⚡ LEVEL UP' : type === 'penalty' ? '⚠ PENALTY WARNING' : '◈ SYSTEM NOTIFICATION'}</span>
      </div>
      <div class="toast-body">
        <strong>${title}</strong><br/>
        <span>${body}</span>
      </div>
    `;

    notificationHub.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 350);
    }, 4500);
  }

  // Audio SFX State
  let sfxEnabled = true;

  function toggleSfx() {
    sfxEnabled = !sfxEnabled;
    const sfxBtn = document.getElementById('sfxToggleBtn');
    const sfxIcon = document.getElementById('sfxIcon');
    if (sfxBtn) {
      if (sfxEnabled) {
        sfxBtn.classList.add('active');
        sfxBtn.classList.remove('muted');
        if (sfxIcon) sfxIcon.textContent = '🔊';
        playSound('click');
        showSystemToast('AUDIO PROTOCOL', 'System audio sound effects ENABLED.');
      } else {
        sfxBtn.classList.remove('active');
        sfxBtn.classList.add('muted');
        if (sfxIcon) sfxIcon.textContent = '🔇';
        showSystemToast('AUDIO PROTOCOL', 'System audio sound effects MUTED.');
      }
    }
  }

  // =========================================================================
  // 4. IMAGE PRELOADER & HERO SCROLL ANIMATOR
  // =========================================================================
  const preloader = document.getElementById('preloader');
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const progressFrames = document.getElementById('progressFrames');

  const animCanvas = document.getElementById('animCanvas');
  const animCtx = animCanvas ? animCanvas.getContext('2d', { alpha: false }) : null;
  const particlesCanvas = document.getElementById('particlesCanvas');
  const particlesCtx = particlesCanvas ? particlesCanvas.getContext('2d') : null;
  const heroContainer = document.getElementById('heroCanvasContainer');
  const heroFooter = document.getElementById('heroFooter');

  const currentFrameDisplay = document.getElementById('currentFrameDisplay');
  const chapterDisplay = document.getElementById('chapterDisplay');
  const scrollPercentDisplay = document.getElementById('scrollPercentDisplay');
  const scrubberTrack = document.getElementById('scrubberTrack');
  const scrubberProgress = document.getElementById('scrubberProgress');
  const scrubberHandle = document.getElementById('scrubberHandle');
  const storyChapters = document.querySelectorAll('.story-chapter');
  const promptBadge = document.querySelector('.scroll-prompt-text');

  const playPauseBtn = document.getElementById('playPauseBtn');
  const playPauseIcon = document.getElementById('playPauseIcon');
  const playPauseText = document.getElementById('playPauseText');
  const replayBtn = document.getElementById('replayBtn');
  const speedBtns = document.querySelectorAll('.speed-btn');
  const jumpPills = document.querySelectorAll('.jump-pill[data-frame]');
  const sfxToggleBtn = document.getElementById('sfxToggleBtn');

  // Animation State
  let targetFrame = 1;
  let playbackSpeed = 1;
  let isDraggingScrubber = false;

  function preloadImages() {
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const path = getFramePath(i);
      img.src = path;
      img.onload = () => onImageLoad(i, img);
      img.onerror = () => onImageError(i, path);
      images[i - 1] = img;
    }
  }

  function onImageLoad(index, img) {
    loadedCount++;
    const percent = Math.min(100, Math.floor((loadedCount / TOTAL_FRAMES) * 100));
    
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressPercent) progressPercent.textContent = `${percent}%`;
    if (progressFrames) progressFrames.textContent = `${loadedCount} / ${TOTAL_FRAMES} FRAMES`;

    if (loadedCount === 1) {
      resizeCanvas();
      drawFrame(1);
    }

    if (loadedCount === TOTAL_FRAMES) {
      onAllImagesLoaded();
    }
  }

  function onImageError(index, path) {
    console.warn(`Frame error: ${path}`);
    loadedCount++;
    if (loadedCount === TOTAL_FRAMES) onAllImagesLoaded();
  }

  function onAllImagesLoaded() {
    if (progressFrames) {
      progressFrames.textContent = `SYSTEM READY: ALL ${TOTAL_FRAMES} FRAMES CACHED`;
      progressFrames.style.color = '#38bdf8';
    }
    setTimeout(() => {
      isSystemReady = true;
      if (preloader) preloader.classList.add('fade-out');
      document.body.classList.remove('loading-state');
      resizeCanvas();
      drawFrame(1);
      updateHeroHUD(1);
      requestAnimationFrame(renderLoop);
      requestAnimationFrame(particleLoop);
    }, 400);
  }

  let canvasWidth = 0;
  let canvasHeight = 0;
  let dpr = window.devicePixelRatio || 1;

  function resizeCanvas() {
    if (!animCanvas || !particlesCanvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    animCanvas.width = canvasWidth * dpr;
    animCanvas.height = canvasHeight * dpr;
    animCanvas.style.width = `${canvasWidth}px`;
    animCanvas.style.height = `${canvasHeight}px`;
    if (animCtx) {
      animCtx.imageSmoothingEnabled = true;
      animCtx.imageSmoothingQuality = 'high';
      animCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    particlesCanvas.width = canvasWidth * dpr;
    particlesCanvas.height = canvasHeight * dpr;
    particlesCanvas.style.width = `${canvasWidth}px`;
    particlesCanvas.style.height = `${canvasHeight}px`;
    if (particlesCtx) {
      particlesCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    lastDrawnFrame = -1;
    drawFrame(Math.round(currentFrame));
  }

  window.addEventListener('resize', resizeCanvas);

  function drawFrame(frameNumber) {
    if (!animCtx) return;
    const frameIdx = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(frameNumber)));
    const img = images[frameIdx - 1];

    if (!img || !img.complete || img.naturalWidth === 0) return;
    if (frameIdx === lastDrawnFrame) return;

    lastDrawnFrame = frameIdx;

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawW, drawH, drawX, drawY;

    if (canvasRatio > imgRatio) {
      drawW = canvasWidth;
      drawH = canvasWidth / imgRatio;
      drawX = 0;
      drawY = (canvasHeight - drawH) / 2;
    } else {
      drawH = canvasHeight;
      drawW = canvasHeight * imgRatio;
      drawX = (canvasWidth - drawW) / 2;
      drawY = 0;
    }

    animCtx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, drawX, drawY, drawW, drawH);
  }

  // --- Smooth Scroll-to-Frame Sync ---
  function updateTargetFrameFromScroll() {
    if (isDraggingScrubber) return;
    const scrollTrack = document.getElementById('scrollTrack');
    if (!scrollTrack) return;
    const maxScroll = scrollTrack.offsetHeight - window.innerHeight;
    const scrollY = window.pageYOffset || window.scrollY || 0;

    if (maxScroll > 0) {
      const scrollFrac = Math.max(0, Math.min(1, scrollY / maxScroll));
      targetFrame = 1 + scrollFrac * (TOTAL_FRAMES - 1);
    }
  }

  window.addEventListener('scroll', () => {
    if (!isPlaying) {
      updateTargetFrameFromScroll();
    }
  }, { passive: true });

  // --- Interactive Playback Deck Controls ---
  function togglePlayPause() {
    if (!isSystemReady) return;
    if (isPlaying) {
      pauseAnimation();
    } else {
      if (currentFrame >= TOTAL_FRAMES - 1) {
        currentFrame = 1;
        targetFrame = 1;
      }
      playAnimation();
    }
  }

  function playAnimation() {
    isPlaying = true;
    playDirection = 1;
    lastFrameTimestamp = 0;
    if (playPauseBtn) playPauseBtn.classList.add('is-playing');
    if (playPauseIcon) playPauseIcon.textContent = '⏸';
    if (playPauseText) playPauseText.textContent = 'PAUSE';
    if (promptBadge) promptBadge.textContent = 'SYSTEM ACTIVE // PLAYING...';
    playSound('click');
  }

  function pauseAnimation() {
    isPlaying = false;
    if (playPauseBtn) playPauseBtn.classList.remove('is-playing');
    if (playPauseIcon) playPauseIcon.textContent = '▶';
    if (playPauseText) playPauseText.textContent = 'PLAY';
    if (promptBadge) {
      promptBadge.textContent = currentFrame >= TOTAL_FRAMES ? 'PORTAL UNLOCKED // SCROLL DOWN' : 'SCROLL TO ANIMATE';
    }
    playSound('click');
  }

  function replayAnimation() {
    currentFrame = 1;
    targetFrame = 1;
    lastDrawnFrame = -1;
    drawFrame(1);
    updateHeroHUD(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    playAnimation();
  }

  if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
  if (replayBtn) replayBtn.addEventListener('click', replayAnimation);
  if (sfxToggleBtn) sfxToggleBtn.addEventListener('click', toggleSfx);

  // Speed Buttons
  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      playbackSpeed = parseFloat(btn.getAttribute('data-speed')) || 1;
      playSound('click');
    });
  });

  // Chapter Jump Pills
  jumpPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const fNum = parseInt(pill.getAttribute('data-frame'), 10) || 1;
      seekToFrame(fNum);
      playSound('click');
    });
  });

  function seekToFrame(frameIndex) {
    pauseAnimation();
    const clamped = Math.max(1, Math.min(TOTAL_FRAMES, frameIndex));
    targetFrame = clamped;
    currentFrame = clamped;
    
    const scrollTrack = document.getElementById('scrollTrack');
    if (scrollTrack) {
      const maxScroll = scrollTrack.offsetHeight - window.innerHeight;
      const frac = (clamped - 1) / (TOTAL_FRAMES - 1);
      window.scrollTo({ top: frac * maxScroll, behavior: 'smooth' });
    }
    drawFrame(clamped);
    updateHeroHUD(clamped);
  }

  // --- Interactive Scrubber Drag & Click ---
  function handleScrubberInput(clientX) {
    if (!scrubberTrack) return;
    const rect = scrubberTrack.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newFrame = Math.round(1 + frac * (TOTAL_FRAMES - 1));

    targetFrame = newFrame;
    currentFrame = newFrame;

    const scrollTrack = document.getElementById('scrollTrack');
    if (scrollTrack) {
      const maxScroll = scrollTrack.offsetHeight - window.innerHeight;
      window.scrollTo({ top: frac * maxScroll, behavior: 'instant' });
    }

    drawFrame(newFrame);
    updateHeroHUD(newFrame);
  }

  if (scrubberTrack) {
    scrubberTrack.addEventListener('mousedown', (e) => {
      isDraggingScrubber = true;
      pauseAnimation();
      handleScrubberInput(e.clientX);
    });

    scrubberTrack.addEventListener('touchstart', (e) => {
      isDraggingScrubber = true;
      pauseAnimation();
      handleScrubberInput(e.touches[0].clientX);
    }, { passive: true });
  }

  window.addEventListener('mousemove', (e) => {
    if (isDraggingScrubber) {
      handleScrubberInput(e.clientX);
    }
  });

  window.addEventListener('touchmove', (e) => {
    if (isDraggingScrubber) {
      handleScrubberInput(e.touches[0].clientX);
    }
  }, { passive: true });

  window.addEventListener('mouseup', () => {
    isDraggingScrubber = false;
  });

  window.addEventListener('touchend', () => {
    isDraggingScrubber = false;
  });

  // --- Keyboard Navigation ---
  window.addEventListener('keydown', (e) => {
    // Ignore when typing inside input or textarea
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      seekToFrame(currentFrame + step);
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      seekToFrame(currentFrame - step);
    } else if (e.key === 'r' || e.key === 'R') {
      replayAnimation();
    } else if (e.key === 'm' || e.key === 'M') {
      toggleSfx();
    } else if (e.code === 'Home') {
      seekToFrame(1);
    } else if (e.code === 'End') {
      seekToFrame(TOTAL_FRAMES);
    }
  });

  // Main 60 FPS Render Loop with Smooth Lerp Physics
  function renderLoop(timestamp) {
    if (isSystemReady) {
      if (isPlaying) {
        if (!lastFrameTimestamp) lastFrameTimestamp = timestamp;
        const elapsed = timestamp - lastFrameTimestamp;
        const baseInterval = 1000 / PLAYBACK_FPS;

        if (elapsed >= (baseInterval / playbackSpeed)) {
          const framesToAdvance = Math.max(1, Math.floor(elapsed / (baseInterval / playbackSpeed)));
          lastFrameTimestamp = timestamp;

          currentFrame += framesToAdvance * playDirection;

          if (playDirection === 1 && currentFrame >= TOTAL_FRAMES) {
            currentFrame = TOTAL_FRAMES;
            targetFrame = TOTAL_FRAMES;
            pauseAnimation();
          } else if (playDirection === -1 && currentFrame <= 1) {
            currentFrame = 1;
            targetFrame = 1;
            pauseAnimation();
          } else {
            targetFrame = currentFrame;
          }

          // Smoothly advance hero track scroll position in sync with frames
          const scrollTrack = document.getElementById('scrollTrack');
          if (scrollTrack) {
            const trackMax = scrollTrack.offsetHeight - window.innerHeight;
            const scrollFrac = (currentFrame - 1) / (TOTAL_FRAMES - 1);
            window.scrollTo({ top: scrollFrac * trackMax, behavior: 'instant' });
          }
        }
      } else {
        // Silky smooth lerp interpolation towards target frame
        const diff = targetFrame - currentFrame;
        if (Math.abs(diff) > 0.02) {
          currentFrame += diff * 0.18;
        } else {
          currentFrame = targetFrame;
        }
      }

      drawFrame(currentFrame);
      updateHeroHUD(currentFrame);
    }
    requestAnimationFrame(renderLoop);
  }

  function updateHeroHUD(frameVal) {
    const frameInt = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(frameVal)));
    const percent = Math.min(100, Math.max(0, Math.round(((frameInt - 1) / (TOTAL_FRAMES - 1)) * 100)));

    if (currentFrameDisplay) currentFrameDisplay.textContent = `FRAME: ${String(frameInt).padStart(3, '0')} / ${TOTAL_FRAMES}`;
    if (scrollPercentDisplay) scrollPercentDisplay.textContent = `${percent}%`;
    if (scrubberProgress) scrubberProgress.style.width = `${percent}%`;
    if (scrubberHandle) scrubberHandle.style.left = `${percent}%`;

    let chapterName = 'CHAPTER: 01 - THE AWAKENING';
    if (frameInt > 65 && frameInt <= 130) chapterName = 'CHAPTER: 02 - SHADOW EXTRACTION';
    else if (frameInt > 130 && frameInt <= 190) chapterName = 'CHAPTER: 03 - SYSTEM: ARISE';
    else if (frameInt > 190) chapterName = 'CHAPTER: 04 - THE SHADOW ARMY';

    if (chapterDisplay) chapterDisplay.textContent = chapterName;

    // Update active jump pill
    jumpPills.forEach(pill => {
      const pFrame = parseInt(pill.getAttribute('data-frame'), 10);
      if (
        (pFrame === 1 && frameInt <= 65) ||
        (pFrame === 70 && frameInt > 65 && frameInt <= 130) ||
        (pFrame === 140 && frameInt > 130 && frameInt <= 190) ||
        (pFrame === 210 && frameInt > 190)
      ) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    // Fade in/out story cards
    const scrollFrac = (frameInt - 1) / (TOTAL_FRAMES - 1);
    storyChapters.forEach(chap => {
      const cNum = parseInt(chap.getAttribute('data-chapter'), 10);
      let targetOpacity = 0;
      let targetTransform = 'translateY(20px)';

      if (cNum === 1 && scrollFrac < 0.22) {
        targetOpacity = 1 - (scrollFrac / 0.22);
        targetTransform = 'translateY(0)';
      } else if (cNum === 2 && scrollFrac >= 0.22 && scrollFrac < 0.48) {
        const local = (scrollFrac - 0.22) / 0.26;
        targetOpacity = local < 0.5 ? local * 2 : (1 - local) * 2;
        targetTransform = 'translateY(0)';
      } else if (cNum === 3 && scrollFrac >= 0.48 && scrollFrac < 0.72) {
        const local = (scrollFrac - 0.48) / 0.24;
        targetOpacity = local < 0.5 ? local * 2 : (1 - local) * 2;
        targetTransform = 'translateY(0)';
      } else if (cNum === 4 && scrollFrac >= 0.72) {
        const local = Math.min(1, (scrollFrac - 0.72) / 0.28);
        targetOpacity = local;
        targetTransform = 'translateY(0)';
      }

      chap.style.opacity = Math.max(0, Math.min(1, targetOpacity));
      chap.style.transform = targetTransform;
    });

    // Dim canvas background and hide hero footer once user enters main platform
    const scrollY = window.pageYOffset || 0;
    const scrollTrack = document.getElementById('scrollTrack');
    if (scrollTrack && heroContainer) {
      if (scrollY > scrollTrack.offsetHeight - 200) {
        heroContainer.classList.add('dimmed');
        if (heroFooter) heroFooter.classList.add('hidden-footer');
      } else {
        heroContainer.classList.remove('dimmed');
        if (heroFooter) heroFooter.classList.remove('hidden-footer');
      }
    }
  }

  // Ambient Particles
  const particles = [];
  class Particle {
    constructor() { this.reset(true); }
    reset(initial = false) {
      this.x = Math.random() * canvasWidth;
      this.y = initial ? Math.random() * canvasHeight : canvasHeight + 10;
      this.size = Math.random() * 2.5 + 0.8;
      this.speedY = Math.random() * 0.8 + 0.3;
      this.speedX = (Math.random() - 0.5) * 0.4;
      this.opacity = Math.random() * 0.7 + 0.2;
      this.color = Math.random() > 0.4 ? '#38bdf8' : '#a855f7';
    }
    update() {
      this.y -= this.speedY;
      this.x += this.speedX;
      if (this.y < -10 || this.x < -10 || this.x > canvasWidth + 10) this.reset();
    }
    draw(ctx) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.opacity;
      ctx.fill();
    }
  }
  for (let i = 0; i < 35; i++) particles.push(new Particle());

  function particleLoop() {
    if (particlesCtx) {
      particlesCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      particles.forEach(p => { p.update(); p.draw(particlesCtx); });
    }
    requestAnimationFrame(particleLoop);
  }


  // =========================================================================
  // 5. PLAYER STATUS & RPG LEVELING ENGINE
  // =========================================================================
  function renderPlayerHUD() {
    const lvlDisplay = document.getElementById('playerLevelDisplay');
    const navLvl = document.getElementById('navPlayerLvl');
    const apDisplay = document.getElementById('availableApDisplay');
    const goldDisplay = document.getElementById('playerGoldDisplay');
    const fatigueDisplay = document.getElementById('playerFatigue');
    const rankPill = document.getElementById('playerRankPill');
    const navRank = document.getElementById('navPlayerRank');

    if (lvlDisplay) lvlDisplay.textContent = player.level;
    if (navLvl) navLvl.textContent = player.level;
    if (apDisplay) apDisplay.textContent = player.availableAp;
    if (goldDisplay) goldDisplay.textContent = `${player.gold.toLocaleString()} G`;
    if (fatigueDisplay) fatigueDisplay.textContent = `${player.fatigue}%`;

    // Dynamic Rank Determination
    let currentRank = 'E';
    if (player.level >= 50) currentRank = 'S (MONARCH)';
    else if (player.level >= 35) currentRank = 'A';
    else if (player.level >= 25) currentRank = 'B';
    else if (player.level >= 15) currentRank = 'C';
    else if (player.level >= 5) currentRank = 'D';

    player.rank = currentRank;
    if (rankPill) rankPill.textContent = `RANK: ${currentRank.charAt(0)}`;
    if (navRank) navRank.textContent = `RANK: ${currentRank}`;

    // Calculated Max HP & MP based on VIT and INT
    const maxHp = 5000 + (player.stats.vit * 35) + (player.level * 150);
    const maxMp = 8000 + (player.stats.int * 40) + (player.level * 200);

    const hpText = document.getElementById('hpText');
    const mpText = document.getElementById('mpText');
    const expText = document.getElementById('expText');
    const expBar = document.getElementById('expBar');

    if (hpText) hpText.textContent = `${maxHp.toLocaleString()} / ${maxHp.toLocaleString()}`;
    if (mpText) mpText.textContent = `${maxMp.toLocaleString()} / ${maxMp.toLocaleString()}`;

    const expPercent = Math.min(100, Math.floor((player.exp / player.maxExp) * 100));
    if (expText) expText.textContent = `${player.exp} / ${player.maxExp} (${expPercent}%)`;
    if (expBar) expBar.style.width = `${expPercent}%`;

    // Stats
    const strEl = document.getElementById('statStr');
    const agiEl = document.getElementById('statAgi');
    const vitEl = document.getElementById('statVit');
    const intEl = document.getElementById('statInt');
    const perEl = document.getElementById('statPer');

    if (strEl) strEl.textContent = player.stats.str;
    if (agiEl) agiEl.textContent = player.stats.agi;
    if (vitEl) vitEl.textContent = player.stats.vit;
    if (intEl) intEl.textContent = player.stats.int;
    if (perEl) perEl.textContent = player.stats.per;

    // Enable/Disable AP buttons
    document.querySelectorAll('.ap-plus-btn').forEach(btn => {
      btn.disabled = player.availableAp <= 0;
    });

    savePlayerState();
  }

  function addPlayerExp(amount) {
    player.exp += amount;
    while (player.exp >= player.maxExp) {
      player.exp -= player.maxExp;
      player.level += 1;
      player.availableAp += 3;
      player.maxExp = Math.floor(player.maxExp * 1.3);
      
      playSound('levelup');
      showSystemToast(
        `LEVEL UP! YOU ARE NOW LEVEL ${player.level}!`,
        `Received +3 Unallocated Ability Points (AP), full HP/MP restoration, and stat potential growth!`,
        'levelup'
      );
    }
    renderPlayerHUD();
  }

  function applyLevelPenalty() {
    if (player.level > 1) {
      player.level -= 1;
      player.fatigue = Math.min(100, player.fatigue + 25);
      playSound('penalty');
      showSystemToast(
        `PENALTY EXECUTED: LEVEL DECREASED TO ${player.level}!`,
        `Quest timer expired without verification. 4-Hour Survival Penalty activated. Fatigue increased by +25%.`,
        'penalty'
      );
    } else {
      playSound('penalty');
      showSystemToast(
        `PENALTY EXECUTED: MAXIMUM FATIGUE!`,
        `Quest failed! You have incurred severe bodily fatigue (+50%). Rest immediately or face death in the Penalty Zone!`,
        'penalty'
      );
    }
    renderPlayerHUD();
  }

  // AP Allocation Listener
  document.querySelectorAll('.ap-plus-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const statKey = btn.getAttribute('data-stat');
      if (player.availableAp > 0 && player.stats[statKey] !== undefined) {
        player.stats[statKey] += 1;
        player.availableAp -= 1;
        playSound('click');
        renderPlayerHUD();
      }
    });
  });


  // =========================================================================
  // 6. DAILY QUESTS & TIMERS ENGINE
  // =========================================================================
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function renderQuestList() {
    const container = document.getElementById('questsContainer');
    if (!container) return;

    container.innerHTML = '';

    player.quests.forEach(q => {
      const item = document.createElement('div');
      item.className = `quest-item ${q.completed ? 'completed' : ''} ${q.expired ? 'expired' : ''}`;
      item.setAttribute('data-quest-id', q.id);

      const rankClass = `rank-${q.rank.toLowerCase()}`;

      item.innerHTML = `
        <div class="quest-item-left">
          <div class="quest-rank-badge ${rankClass}">RANK ${q.rank}</div>
          <div class="quest-info">
            <h4 class="quest-name">${q.title}</h4>
            <p class="quest-reqs">${q.reqs}</p>
            <div class="quest-reward-preview">REWARD: +${q.xp} EXP | +${q.gold.toLocaleString()} GOLD | +${q.ap || 2} AP</div>
          </div>
        </div>
        <div class="quest-item-right">
          <div class="quest-timer-box">
            <span class="timer-label">TIME REMAINING:</span>
            <span class="countdown-digits ${q.remainingSeconds < 300 && !q.completed ? 'urgent' : ''}" id="timer_${q.id}">
              ${q.completed ? 'COMPLETED' : q.expired ? 'PENALTY' : formatTime(q.remainingSeconds)}
            </span>
          </div>
          <button class="complete-quest-btn" data-quest="${q.id}" ${q.completed || q.expired ? 'disabled' : ''}>
            <span>${q.completed ? '✓ DONE' : q.expired ? 'FAILED' : 'COMPLETE QUEST'}</span>
          </button>
        </div>
      `;

      container.appendChild(item);
    });

    // Attach complete buttons
    container.querySelectorAll('.complete-quest-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const qId = btn.getAttribute('data-quest');
        completeQuest(qId);
      });
    });
  }

  function completeQuest(qId) {
    const q = player.quests.find(x => x.id === qId);
    if (!q || q.completed || q.expired) return;

    q.completed = true;
    player.gold += q.gold;
    player.availableAp += (q.ap || 1);
    player.fatigue = Math.max(0, player.fatigue - 5);

    playSound('quest_done');
    showSystemToast(
      `QUEST COMPLETED: ${q.title}!`,
      `Rewards Claimed: +${q.xp} EXP, +${q.gold.toLocaleString()} Gold, +${q.ap || 1} AP, -5% Fatigue!`,
      'levelup'
    );

    addPlayerExp(q.xp);
    renderQuestList();
  }

  // Quests Countdown Timer Tick (every 1 second)
  setInterval(() => {
    let stateChanged = false;
    player.quests.forEach(q => {
      if (!q.completed && !q.expired) {
        q.remainingSeconds -= 1;
        const timerEl = document.getElementById(`timer_${q.id}`);
        if (timerEl) {
          timerEl.textContent = formatTime(q.remainingSeconds);
          if (q.remainingSeconds < 300) timerEl.classList.add('urgent');
        }

        if (q.remainingSeconds <= 0) {
          q.expired = true;
          stateChanged = true;
          applyLevelPenalty();
        }
      }
    });

    if (stateChanged) {
      renderQuestList();
    }
  }, 1000);

  // Add Custom Quest
  const addQuestBtn = document.getElementById('addQuestBtn');
  if (addQuestBtn) {
    addQuestBtn.addEventListener('click', () => {
      const titleInput = document.getElementById('customQuestTitle');
      const rankSelect = document.getElementById('customQuestRank');
      const minutesInput = document.getElementById('customQuestMinutes');

      const title = titleInput.value.trim();
      const rank = rankSelect.value;
      const minutes = parseInt(minutesInput.value, 10) || 30;

      if (!title) {
        alert('Please enter a valid quest title.');
        return;
      }

      const xpMap = { E: 100, D: 200, C: 350, B: 500, A: 800, S: 1500 };
      const goldMap = { E: 1000, D: 2500, C: 4000, B: 8000, A: 15000, S: 50000 };

      const newQ = {
        id: `custom_${Date.now()}`,
        title: title.toUpperCase(),
        reqs: `Complete task within ${minutes} minutes.`,
        rank: rank,
        xp: xpMap[rank] || 200,
        gold: goldMap[rank] || 3000,
        ap: rank === 'S' ? 5 : rank === 'A' ? 3 : 2,
        totalSeconds: minutes * 60,
        remainingSeconds: minutes * 60,
        completed: false,
        expired: false
      };

      player.quests.push(newQ);
      titleInput.value = '';
      minutesInput.value = '';
      playSound('click');
      showSystemToast('NEW QUEST ISSUED', `[ ${newQ.title} ] has been registered to your Quest Log.`);
      renderQuestList();
      savePlayerState();
    });
  }


  // =========================================================================
  // 7. HUNTER VISION & CAMERA AI SCANNER
  // =========================================================================
  const cameraVideo = document.getElementById('cameraVideo');
  const cameraCanvas = document.getElementById('cameraCaptureCanvas');
  const startCamBtn = document.getElementById('startCamBtn');
  const captureBtn = document.getElementById('captureBtn');
  const stopCamBtn = document.getElementById('stopCamBtn');
  const cameraStatusText = document.getElementById('cameraStatusText');
  const scanStatusOverlay = document.getElementById('scanStatusOverlay');
  const assessmentBox = document.getElementById('assessmentBox');

  let mediaStream = null;

  async function startCamera() {
    try {
      if (cameraStatusText) cameraStatusText.textContent = 'CONNECTING OPTICAL SENSOR...';
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });

      if (cameraVideo) {
        cameraVideo.srcObject = mediaStream;
      }

      if (startCamBtn) startCamBtn.disabled = true;
      if (captureBtn) captureBtn.disabled = false;
      if (stopCamBtn) stopCamBtn.disabled = false;
      if (cameraStatusText) cameraStatusText.textContent = 'OPTICAL SENSORS ACTIVE';
      if (scanStatusOverlay) scanStatusOverlay.textContent = 'TARGET: LOCKING HUNTER BIOMETRICS';
      playSound('click');
    } catch (err) {
      console.warn('Camera error:', err);
      alert('Camera access denied or unavailable. You can still schedule reminders and use the AI Advisor.');
      if (cameraStatusText) cameraStatusText.textContent = 'CAMERA OFFLINE';
    }
  }

  function stopCamera() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    if (cameraVideo) cameraVideo.srcObject = null;
    if (startCamBtn) startCamBtn.disabled = false;
    if (captureBtn) captureBtn.disabled = true;
    if (stopCamBtn) stopCamBtn.disabled = true;
    if (cameraStatusText) cameraStatusText.textContent = 'CAMERA OFFLINE';
    if (scanStatusOverlay) scanStatusOverlay.textContent = 'TARGET: IDLE';
  }

  function captureAndAssess() {
    if (!cameraVideo || !cameraCanvas || !assessmentBox) return;

    const ctx = cameraCanvas.getContext('2d');
    cameraCanvas.width = cameraVideo.videoWidth || 640;
    cameraCanvas.height = cameraVideo.videoHeight || 480;
    ctx.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);

    playSound('click');
    if (scanStatusOverlay) scanStatusOverlay.textContent = 'ANALYZING MANA WAVEFORMS...';

    assessmentBox.innerHTML = `
      <div class="assessment-placeholder">
        <span class="holo-icon">⚙</span>
        <p>Analyzing physical alignment, posture integrity & biometric output...</p>
      </div>
    `;

    setTimeout(() => {
      const metrics = [
        { label: 'HUNTER POSTURE INTEGRITY', val: '96.4% [ S-RANK ALIGNMENT ]' },
        { label: 'PHYSICAL FATIGUE LEVEL', val: `${player.fatigue}% [ NORMAL THRESHOLD ]` },
        { label: 'TASK VERIFICATION STATUS', val: 'CONFIRMED // IN TRAINING ZONE' },
        { label: 'SYSTEM RECOMMENDATION', val: 'Execute 3 Sets of 30 Push-ups & drink 500ml water.' }
      ];

      assessmentBox.innerHTML = `
        <div class="assessment-card-report">
          ${metrics.map(m => `
            <div class="report-metric">
              <span class="report-label">${m.label}:</span>
              <strong class="report-val ${m.val.includes('S-RANK') ? 'glow-text' : ''}">${m.val}</strong>
            </div>
          `).join('')}
        </div>
      `;

      if (scanStatusOverlay) scanStatusOverlay.textContent = 'ASSESSMENT COMPLETE';
      showSystemToast('OPTICAL SCAN COMPLETED', 'Hunter biometric parameters have been verified and updated.');
    }, 1200);
  }

  if (startCamBtn) startCamBtn.addEventListener('click', startCamera);
  if (stopCamBtn) stopCamBtn.addEventListener('click', stopCamera);
  if (captureBtn) captureBtn.addEventListener('click', captureAndAssess);

  // Reminder Scheduling Engine
  const setReminderBtn = document.getElementById('setReminderBtn');
  const activeRemindersList = document.getElementById('activeRemindersList');

  function renderReminders() {
    if (!activeRemindersList) return;
    activeRemindersList.innerHTML = '';

    player.reminders.forEach((r, idx) => {
      const item = document.createElement('div');
      item.className = 'reminder-item';
      item.innerHTML = `
        <span>⏰ ${r.text}</span>
        <span class="gold-text">${formatTime(r.remaining)}</span>
      `;
      activeRemindersList.appendChild(item);
    });
  }

  if (setReminderBtn) {
    setReminderBtn.addEventListener('click', () => {
      const textInput = document.getElementById('reminderText');
      const minsInput = document.getElementById('reminderMinutes');

      const text = textInput.value.trim() || 'Daily Hunter Training Protocol';
      const mins = parseInt(minsInput.value, 10) || 15;

      const newReminder = {
        id: Date.now(),
        text: text,
        remaining: mins * 60
      };

      player.reminders.push(newReminder);
      textInput.value = '';
      playSound('click');
      showSystemToast('HUNTER ALARM SET', `Reminder: "${text}" scheduled in ${mins} minutes.`);
      renderReminders();
      savePlayerState();
    });
  }

  // Reminders tick
  setInterval(() => {
    player.reminders.forEach((r, idx) => {
      r.remaining -= 1;
      if (r.remaining <= 0) {
        playSound('levelup');
        showSystemToast('⏰ SYSTEM REMINDER ALARM!', r.text, 'levelup');
        if (Notification.permission === 'granted') {
          new Notification('SOLO LEVELING SYSTEM ALARM', { body: r.text });
        }
        player.reminders.splice(idx, 1);
        renderReminders();
        savePlayerState();
      }
    });
    if (player.reminders.length > 0) renderReminders();
  }, 1000);


  // =========================================================================
  // 8. SYSTEM AI CHATBOT (THE ARCHITECT)
  // =========================================================================
  const aiChatForm = document.getElementById('aiChatForm');
  const aiUserInput = document.getElementById('aiUserInput');
  const aiMessagesContainer = document.getElementById('aiMessagesContainer');

  const knowledgeBase = [
    {
      keywords: ['gain level', 'level up', 'fast', 'how to level'],
      reply: 'To gain levels rapidly, complete your Daily Quests before the deadline (100 push-ups, 100 sit-ups, 100 squats, 10km run). Consistently meeting these daily quotas awards massive XP and spendable AP to distribute into Strength, Agility, and Intelligence.'
    },
    {
      keywords: ['stat', 'build', 'strength', 'point', 'allocate', 'ap'],
      reply: 'As a Shadow Monarch build, prioritize **Strength** (for melee devastation) and **Intelligence** (to dramatically expand your Mana pool and summon capacity for your Shadow Army). Allocate secondary points into **Agility** for dodging and reaction speeds.'
    },
    {
      keywords: ['penalty', 'fail', 'zone', 'expired', 'punishment'],
      reply: 'Failing to complete your Daily Quest within the time limit triggers the **Penalty Zone**—a harsh dimension where you must survive against giant monsters for 4 hours. In our real-world system, your Player Level and stats decrease, and fatigue spikes!'
    },
    {
      keywords: ['workout', 'pushup', 'squat', 'routine', 'exercise', 'physical'],
      reply: 'The Sacred Monarch Protocol:\n• 100 Push-ups (Chest & Triceps)\n• 100 Sit-ups (Core Stability)\n• 100 Squats (Legs & Explosive Power)\n• 10km Run (Cardiovascular Stamina)\n\nTip: Break them into 4 sets of 25 repetitions throughout your morning!'
    },
    {
      keywords: ['shadow', 'arise', 'igris', 'army', 'extract'],
      reply: 'The "Arise" skill extracts the mana and consciousness of fallen entities, transforming them into loyal shadow legionnaires. Strengthen your Intelligence attribute to maintain hundreds of shadow warriors in your dimensional shadow domain.'
    }
  ];

  function getAiResponse(userText) {
    const lower = userText.toLowerCase();
    for (const entry of knowledgeBase) {
      if (entry.keywords.some(k => lower.includes(k))) {
        return entry.reply;
      }
    }
    return `[ SYSTEM CALIBRATION ]: Query received regarding "${userText}". To maximize your potential as a Player, focus on daily consistency, progressive overload in your physical conditioning, and unbroken focus during study sessions. Allocate your earned AP wisely!`;
  }

  function appendChatMessage(author, text, isUser = false) {
    if (!aiMessagesContainer) return;
    const msg = document.createElement('div');
    msg.className = `ai-message ${isUser ? 'user-msg' : 'system-msg'}`;
    msg.innerHTML = `
      <div class="msg-avatar">${isUser ? '👤' : '◈'}</div>
      <div class="msg-bubble">
        <div class="msg-author">${author}:</div>
        <p>${text.replace(/\n/g, '<br/>')}</p>
      </div>
    `;
    aiMessagesContainer.appendChild(msg);
    aiMessagesContainer.scrollTop = aiMessagesContainer.scrollHeight;
  }

  if (aiChatForm) {
    aiChatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = aiUserInput.value.trim();
      if (!text) return;

      appendChatMessage('PLAYER', text, true);
      aiUserInput.value = '';
      playSound('click');

      // AI Response with slight typing delay
      setTimeout(() => {
        const reply = getAiResponse(text);
        appendChatMessage('SYSTEM ARCHITECT', reply, false);
        playSound('click');
      }, 500);
    });
  }

  // Quick Chips
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query');
      if (aiUserInput) {
        aiUserInput.value = q;
        aiChatForm.dispatchEvent(new Event('submit'));
      }
    });
  });


  // =========================================================================
  // 9. HUNTER PROGRESSION & TRANSFORMATION FEED (WITH PERMISSION)
  // =========================================================================
  const openUploadModalBtn = document.getElementById('openUploadModalBtn');
  const uploadModal = document.getElementById('uploadModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const transformationForm = document.getElementById('transformationForm');
  const transformationGrid = document.getElementById('transformationGrid');

  function openModal() {
    if (uploadModal) uploadModal.classList.remove('hidden-modal');
  }

  function closeModal() {
    if (uploadModal) uploadModal.classList.add('hidden-modal');
  }

  if (openUploadModalBtn) openUploadModalBtn.addEventListener('click', openModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

  function renderTransformations() {
    if (!transformationGrid) return;

    // Keep the initial sample and append stored user transformations
    const userCards = player.transformations.map(t => `
      <div class="transformation-card">
        <div class="card-author-bar">
          <div class="author-info">
            <span class="author-badge">RANK ${t.rank || 'S'}</span>
            <span class="author-name">${t.author}</span>
          </div>
          <span class="post-time">${t.date}</span>
        </div>

        <div class="comparison-display">
          <div class="comp-pane before-pane">
            <span class="pane-tag">DAY 01 (BASELINE)</span>
            <div class="pane-img-placeholder" style="background-image: url('${t.beforeImg}'); background-size: cover;">
            </div>
          </div>
          <div class="vs-divider">VS</div>
          <div class="comp-pane after-pane">
            <span class="pane-tag monarch-tag">CURRENT (LVL ${player.level})</span>
            <div class="pane-img-placeholder" style="background-image: url('${t.afterImg}'); background-size: cover; border-color: var(--purple-bright);">
            </div>
          </div>
        </div>

        <div class="card-caption">
          <p>“${t.caption}”</p>
        </div>

        <div class="card-actions">
          <button class="like-btn" onclick="this.classList.toggle('liked');">
            <span>🔥 ARISE RESPECT ( <span>1</span> )</span>
          </button>
          <span class="post-stats-tag">LVL ${player.level} | VERIFIED</span>
        </div>
      </div>
    `).join('');

    const defaultCardHtml = `
      <div class="transformation-card">
        <div class="card-author-bar">
          <div class="author-info">
            <span class="author-badge">S-RANK PLAYER</span>
            <span class="author-name">Sung Jin-Woo</span>
          </div>
          <span class="post-time">90 DAYS OF PROGRESS</span>
        </div>

        <div class="comparison-display">
          <div class="comp-pane before-pane">
            <span class="pane-tag">DAY 01 (LVL 1)</span>
            <div class="pane-img-placeholder before-bg">
              <span class="avatar-sym">⏳</span>
              <span class="pane-stat">E-Rank Hunter</span>
            </div>
          </div>
          <div class="vs-divider">VS</div>
          <div class="comp-pane after-pane">
            <span class="pane-tag monarch-tag">DAY 90 (LVL ${player.level})</span>
            <div class="pane-img-placeholder after-bg">
              <span class="avatar-sym monarch-sym">⚡</span>
              <span class="pane-stat monarch-stat">Shadow Monarch</span>
            </div>
          </div>
        </div>

        <div class="card-caption">
          <p>“Never skipped a single daily quest. 100 pushups, 100 squats, 10km run every morning without fail. The system does not lie.”</p>
        </div>

        <div class="card-actions">
          <button class="like-btn" onclick="this.classList.toggle('liked');">
            <span>🔥 ARISE RESPECT ( <span class="count">249</span> )</span>
          </button>
          <span class="post-stats-tag">STR +45 | VIT +38</span>
        </div>
      </div>
    `;

    transformationGrid.innerHTML = defaultCardHtml + userCards;
  }

  if (transformationForm) {
    transformationForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const author = document.getElementById('postAuthor').value.trim();
      const beforeInput = document.getElementById('beforePhotoInput');
      const afterInput = document.getElementById('afterPhotoInput');
      const caption = document.getElementById('postCaption').value.trim();
      const permCheckbox = document.getElementById('permCheckbox');

      if (!permCheckbox.checked) {
        alert('You must provide consent/permission to upload and view your progress images.');
        return;
      }

      if (!beforeInput.files[0] || !afterInput.files[0]) {
        alert('Please select both your Before and Current photos.');
        return;
      }

      const reader1 = new FileReader();
      const reader2 = new FileReader();

      reader1.onload = function (e1) {
        const beforeImg = e1.target.result;
        reader2.onload = function (e2) {
          const afterImg = e2.target.result;

          const newPost = {
            id: Date.now(),
            author: author,
            rank: player.rank.charAt(0),
            date: 'TODAY',
            beforeImg: beforeImg,
            afterImg: afterImg,
            caption: caption
          };

          player.transformations.unshift(newPost);
          savePlayerState();
          renderTransformations();
          closeModal();
          transformationForm.reset();
          playSound('quest_done');
          showSystemToast('TRANSFORMATION POSTED', 'Your Hunter evolution has been recorded in the public registry.');
        };
        reader2.readAsDataURL(afterInput.files[0]);
      };
      reader1.readAsDataURL(beforeInput.files[0]);
    });
  }


  // =========================================================================
  // 10. INITIALIZATION
  // =========================================================================
  preloadImages();
  renderPlayerHUD();
  renderQuestList();
  renderReminders();
  renderTransformations();

  // Ask for browser notification permission for alarms
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

})();
