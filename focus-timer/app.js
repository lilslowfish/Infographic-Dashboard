/* ==========================================================================
   FocusFlow - Pomodoro & Streak Timer Core Logic
   ========================================================================== */

// --- Default Configuration & State ---
const DEFAULT_SETTINGS = {
  workDuration: 25,       // minutes
  shortBreakDuration: 5,  // minutes
  longBreakDuration: 15,  // minutes
  longBreakInterval: 4,   // sessions before long break
  autoStartBreaks: true,
  autoStartWork: false,
  alarmSound: 'chime',    // chime, pulse, digital, none
  ambientSound: 'none',   // none, whitenoise, pinknoise, rain
  ambientVolume: 0.3      // range 0 to 1
};

const DEFAULT_STATS = {
  totalSeconds: 0,
  sessionCount: 0,
  todaySeconds: 0,
  categories: {
    Coding: 0,
    Design: 0,
    Writing: 0,
    Reading: 0,
    Other: 0
  },
  completedDates: []      // array of YYYY-MM-DD strings
};

let settings = { ...DEFAULT_SETTINGS };
let stats = { ...DEFAULT_STATS };
let currentStreak = 0;

// Timer State
let timerInterval = null;
let timeRemaining = 0; // seconds
let currentMode = 'work'; // work, short, long
let timerState = 'idle'; // idle, running, paused
let activeCategory = 'Coding';
let completedSessionsThisCycle = 0;

// Audio Context State
let audioCtx = null;
let ambientSourceNode = null;
let ambientGainNode = null;
let rainInterval = null; // for rain transient scheduler

// Particle System State
let particles = [];
let particleCanvas = null;
let particleCtx = null;
let particleAnimationId = null;

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupUI();
  setupParticles();
  resetTimer();
  updateStatsDisplay();
  renderCalendarGrid();
  loadTimelineLogs();
});

// Load from LocalStorage & Sync with Dashboard
function loadData() {
  // 1. Load standalone FocusFlow settings
  const savedSettings = localStorage.getItem('focusflow_settings');
  if (savedSettings) {
    try {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
    } catch (e) {
      console.error('Error parsing saved settings', e);
    }
  }

  // 2. Sync from dashboard configurations if they exist
  const pomoConfigsRaw = localStorage.getItem('pomo_configs');
  if (pomoConfigsRaw) {
    try {
      const pomoConfigs = JSON.parse(pomoConfigsRaw);
      if (pomoConfigs) {
        if (typeof pomoConfigs.work === 'number') settings.workDuration = pomoConfigs.work;
        if (typeof pomoConfigs.short === 'number') settings.shortBreakDuration = pomoConfigs.short;
        if (typeof pomoConfigs.long === 'number') settings.longBreakDuration = pomoConfigs.long;
        if (typeof pomoConfigs.volume === 'number') settings.ambientVolume = pomoConfigs.volume;
      }
    } catch (e) {
      console.error('Error syncing pomo_configs into FocusFlow settings', e);
    }
  }

  // 3. Load standalone FocusFlow stats
  let localStats = null;
  const savedStats = localStorage.getItem('focusflow_stats');
  if (savedStats) {
    try {
      localStats = JSON.parse(savedStats);
    } catch (e) {
      console.error('Error parsing saved stats', e);
    }
  }

  // 4. Load dashboard stats & heatmap
  const pomoTotalCount = parseInt(localStorage.getItem('pomo_total_count')) || 0;
  const pomoHeatmapRaw = localStorage.getItem('pomo_heatmap_log');
  let pomoHeatmap = {};
  if (pomoHeatmapRaw) {
    try {
      pomoHeatmap = JSON.parse(pomoHeatmapRaw) || {};
    } catch (e) {
      console.error('Error parsing pomo_heatmap_log', e);
    }
  }

  // 5. Merge heatmap logs to reconstruct completedDates
  const dateCounts = {};
  if (localStats && localStats.completedDates) {
    localStats.completedDates.forEach(d => {
      dateCounts[d] = (dateCounts[d] || 0) + 1;
    });
  }
  for (const d in pomoHeatmap) {
    dateCounts[d] = Math.max(dateCounts[d] || 0, parseInt(pomoHeatmap[d]) || 0);
  }

  const mergedCompletedDates = [];
  for (const d in dateCounts) {
    const count = dateCounts[d];
    for (let i = 0; i < count; i++) {
      mergedCompletedDates.push(d);
    }
  }
  mergedCompletedDates.sort((a, b) => new Date(a) - new Date(b));

  // Initialize stats object
  stats = {
    totalSeconds: localStats ? (localStats.totalSeconds || 0) : 0,
    sessionCount: localStats ? (localStats.sessionCount || 0) : 0,
    todaySeconds: localStats ? (localStats.todaySeconds || 0) : 0,
    categories: localStats ? (localStats.categories || { ...DEFAULT_STATS.categories }) : { ...DEFAULT_STATS.categories },
    completedDates: mergedCompletedDates
  };

  // Ensure category structure exists
  stats.categories = { ...DEFAULT_STATS.categories, ...stats.categories };

  // Reconcile count mismatch (if dashboard count or date list has more completions than current FocusFlow total)
  const finalSessionCount = Math.max(stats.completedDates.length, pomoTotalCount);
  if (finalSessionCount > stats.sessionCount) {
    const diff = finalSessionCount - stats.sessionCount;
    const addedSeconds = diff * settings.workDuration * 60;
    stats.totalSeconds += addedSeconds;
    stats.categories['Other'] = (stats.categories['Other'] || 0) + addedSeconds;
    stats.sessionCount = finalSessionCount;

    // Ensure date arrays match length by padding with today's date if necessary
    const todayStr = getLocalDateString();
    while (stats.completedDates.length < finalSessionCount) {
      stats.completedDates.push(todayStr);
    }
  }

  // Ensure today's seconds make sense
  const todayStr = getLocalDateString();
  const todaySessionsCount = stats.completedDates.filter(d => d === todayStr).length;
  const minTodaySeconds = todaySessionsCount * settings.workDuration * 60;
  if (stats.todaySeconds < minTodaySeconds) {
    stats.todaySeconds = minTodaySeconds;
  }

  calculateStreak();
}

// Save standalone and sync back to dashboard
function saveData() {
  localStorage.setItem('focusflow_settings', JSON.stringify(settings));
  localStorage.setItem('focusflow_stats', JSON.stringify(stats));

  // Sync to dashboard pomo_configs
  const configurations = {
    work: settings.workDuration,
    short: settings.shortBreakDuration,
    long: settings.longBreakDuration,
    volume: settings.ambientVolume
  };
  localStorage.setItem('pomo_configs', JSON.stringify(configurations));

  // Sync to dashboard total count
  localStorage.setItem('pomo_total_count', stats.sessionCount);

  // Sync to dashboard pomo_heatmap_log
  const heatmapLog = {};
  stats.completedDates.forEach(d => {
    heatmapLog[d] = (heatmapLog[d] || 0) + 1;
  });
  localStorage.setItem('pomo_heatmap_log', JSON.stringify(heatmapLog));
}

// Load recent timeline logs from the dashboard history log
function loadTimelineLogs() {
  const timeline = document.getElementById('history-timeline');
  if (!timeline) return;

  const history = JSON.parse(localStorage.getItem('pomo_history_log')) || [];
  if (history.length === 0) {
    timeline.innerHTML = `<div class="empty-state">No sessions completed yet. Let's make progress!</div>`;
    return;
  }

  // Clear existing content
  timeline.innerHTML = '';

  // Display top 10 items
  const topHistory = history.slice(0, 10);
  topHistory.forEach(item => {
    let title = item.mode || 'Focus Session';
    let durationStr = `+${settings.workDuration}m`;

    // Reconstruct clean title and duration if we parse a structured string like "💻 Coding Session (25m)"
    const match = title.match(/\((\d+)m\)/);
    if (match) {
      durationStr = `+${match[1]}m`;
      title = title.replace(/\s*\(\d+m\)/, '');
    } else if (title === 'Focus Session') {
      title = '🎯 Focus Session';
    }

    const htmlItem = document.createElement('div');
    htmlItem.className = 'history-item';
    htmlItem.innerHTML = `
      <div class="history-item-details">
        <div class="history-item-title">${title}</div>
        <div class="history-item-meta">Completed on ${item.date} at ${item.time}</div>
      </div>
      <div class="history-item-duration">${durationStr}</div>
    `;
    timeline.appendChild(htmlItem);
  });
}

// Get Local Date String (YYYY-MM-DD)
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Calculate Streaks
function calculateStreak() {
  if (!stats.completedDates || stats.completedDates.length === 0) {
    currentStreak = 0;
    return;
  }

  // Remove duplicates and sort descending
  const uniqueDates = [...new Set(stats.completedDates)].sort((a, b) => new Date(b) - new Date(a));
  
  const todayStr = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  // If the latest completed session was not today or yesterday, streak is broken
  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
    currentStreak = 0;
    return;
  }

  let streak = 0;
  let checkDate = new Date(); // Start from today
  
  // If the user hasn't completed a session today, start checking from yesterday
  if (uniqueDates[0] === yesterdayStr) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const checkDateStr = getLocalDateString(checkDate);
    if (uniqueDates.includes(checkDateStr)) {
      streak++;
      // Go back one day
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  currentStreak = streak;
}

// ==========================================================================
// Web Audio API Sound Synthesizer
// ==========================================================================
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Procedural Audio Generators (White Noise, Pink Noise, Rain)
function createNoiseBuffer(type) {
  const ctx = getAudioContext();
  const bufferSize = 2 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  } else if (type === 'pink') {
    // Pink noise filtering approximation (Voss-McCartney algorithm)
    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11; // compensation
      b6 = white * 0.115926;
    }
  }
  return noiseBuffer;
}

function startAmbientSound() {
  stopAmbientSound();

  if (settings.ambientSound === 'none') return;
  const ctx = getAudioContext();

  // Create Gain Node for Volume Control
  ambientGainNode = ctx.createGain();
  ambientGainNode.gain.setValueAtTime(settings.ambientVolume, ctx.currentTime);
  ambientGainNode.connect(ctx.destination);

  if (settings.ambientSound === 'whitenoise' || settings.ambientSound === 'pinknoise') {
    const noiseType = settings.ambientSound === 'whitenoise' ? 'white' : 'pink';
    const buffer = createNoiseBuffer(noiseType);
    
    ambientSourceNode = ctx.createBufferSource();
    ambientSourceNode.buffer = buffer;
    ambientSourceNode.loop = true;
    
    // Add a lowpass filter to make white/pink noise softer
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    
    ambientSourceNode.connect(filter);
    filter.connect(ambientGainNode);
    ambientSourceNode.start(0);
  } else if (settings.ambientSound === 'rain') {
    // Rain is pink noise + random drop transients
    const buffer = createNoiseBuffer('pink');
    ambientSourceNode = ctx.createBufferSource();
    ambientSourceNode.buffer = buffer;
    ambientSourceNode.loop = true;

    // Filter for rumbling rain backdrop
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);

    ambientSourceNode.connect(filter);
    filter.connect(ambientGainNode);
    ambientSourceNode.start(0);

    // Dynamic scheduler for rain droplets
    rainInterval = setInterval(() => {
      if (Math.random() > 0.4) {
        playRainDroplet(ctx, ambientGainNode);
      }
    }, 80);
  }
}

function stopAmbientSound() {
  if (ambientSourceNode) {
    try {
      ambientSourceNode.stop();
    } catch(e) {}
    ambientSourceNode.disconnect();
    ambientSourceNode = null;
  }
  if (ambientGainNode) {
    ambientGainNode.disconnect();
    ambientGainNode = null;
  }
  if (rainInterval) {
    clearInterval(rainInterval);
    rainInterval = null;
  }
}

function playRainDroplet(ctx, outputNode) {
  // A droplet is synthesized using a short oscillator snap
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  // Random high-frequency pitch sweep
  const startFreq = 1500 + Math.random() * 2000;
  osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.04);

  gain.gain.setValueAtTime(0.0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.05, ctx.currentTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);

  osc.connect(gain);
  gain.connect(outputNode);

  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

// Alarm Sound Synthesizer
function playAlarmSound() {
  if (settings.alarmSound === 'none') return;
  const ctx = getAudioContext();

  const now = ctx.currentTime;

  if (settings.alarmSound === 'chime') {
    // Synthesize a beautiful major-7th chord sweep
    const notes = [261.63, 329.63, 392.00, 493.88, 523.25]; // C4, E4, G4, B4, C5
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);

      gain.gain.setValueAtTime(0, now + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.25, now + index * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 1.3);
    });
  } else if (settings.alarmSound === 'pulse') {
    // Cyber pulse sweep
    const notes = [440, 660, 880];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + index * 0.15);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now + index * 0.15);
      filter.frequency.exponentialRampToValueAtTime(3000, now + index * 0.15 + 0.1);

      gain.gain.setValueAtTime(0, now + index * 0.15);
      gain.gain.linearRampToValueAtTime(0.3, now + index * 0.15 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.15 + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * 0.15);
      osc.stop(now + index * 0.15 + 0.35);
    });
  } else if (settings.alarmSound === 'digital') {
    // Retro arpeggio beep
    const notes = [600, 800, 1000, 1200, 1400];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.06);

      gain.gain.setValueAtTime(0, now + index * 0.06);
      gain.gain.linearRampToValueAtTime(0.3, now + index * 0.06 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.06 + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * 0.06);
      osc.stop(now + index * 0.06 + 0.20);
    });
  }
}

// ==========================================================================
// Background Canvas Particles
// ==========================================================================
function setupParticles() {
  particleCanvas = document.getElementById('particles-canvas');
  particleCtx = particleCanvas.getContext('2d');

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Initialize particles
  particles = [];
  const particleCount = 40;
  for (let i = 0; i < particleCount; i++) {
    particles.push(createParticle());
  }

  animateParticles();
}

function resizeCanvas() {
  particleCanvas.width = window.innerWidth;
  particleCanvas.height = window.innerHeight;
}

function createParticle() {
  return {
    x: Math.random() * particleCanvas.width,
    y: Math.random() * particleCanvas.height,
    radius: Math.random() * 2 + 1,
    speedX: (Math.random() - 0.5) * 0.25,
    speedY: (Math.random() - 0.5) * 0.25 - 0.1, // Drifting upwards slightly
    alpha: Math.random() * 0.3 + 0.1
  };
}

function animateParticles() {
  particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  
  // Speed multiplier based on timer status
  let speedMult = 1.0;
  if (timerState === 'running') {
    speedMult = 0.4; // Calm, slow particles during focus
  } else if (currentMode !== 'work') {
    speedMult = 1.6; // Relaxed, faster particles during breaks
  }

  // Get current accent color from CSS
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim();

  particles.forEach(p => {
    p.x += p.speedX * speedMult;
    p.y += p.speedY * speedMult;

    // Wrap around screen boundaries
    if (p.x < 0) p.x = particleCanvas.width;
    if (p.x > particleCanvas.width) p.x = 0;
    if (p.y < 0) p.y = particleCanvas.height;
    if (p.y > particleCanvas.height) p.y = particleCanvas.height;

    particleCtx.beginPath();
    particleCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    // Draw with semi-transparent accent color
    particleCtx.fillStyle = accent ? accent.replace('rgb', 'rgba').replace(')', ', ' + p.alpha + ')') : 'rgba(255, 255, 255, ' + p.alpha + ')';
    particleCtx.fill();
  });

  particleAnimationId = requestAnimationFrame(animateParticles);
}

// ==========================================================================
// Timer Controls & Core Loop
// ==========================================================================
function setMode(mode) {
  if (timerState === 'running' && mode !== currentMode) {
    const confirmChange = confirm('A session is currently running. Switch modes anyway?');
    if (!confirmChange) return;
  }

  currentMode = mode;
  stopTimer();
  resetTimer();
  updateTheme();
}

function updateTheme() {
  const root = document.documentElement;
  const logo = document.querySelector('.logo-icon');

  if (currentMode === 'work') {
    root.style.setProperty('--theme-color', 'var(--color-work)');
    root.style.setProperty('--theme-color-glow', 'var(--color-work-glow)');
    document.getElementById('timer-label').textContent = 'FOCUS TIME';
    document.getElementById('mode-work').classList.add('active');
    document.getElementById('mode-short').classList.remove('active');
    document.getElementById('mode-long').classList.remove('active');
  } else if (currentMode === 'short') {
    root.style.setProperty('--theme-color', 'var(--color-short)');
    root.style.setProperty('--theme-color-glow', 'var(--color-short-glow)');
    document.getElementById('timer-label').textContent = 'SHORT BREAK';
    document.getElementById('mode-work').classList.remove('active');
    document.getElementById('mode-short').classList.add('active');
    document.getElementById('mode-long').classList.remove('active');
  } else if (currentMode === 'long') {
    root.style.setProperty('--theme-color', 'var(--color-long)');
    root.style.setProperty('--theme-color-glow', 'var(--color-long-glow)');
    document.getElementById('timer-label').textContent = 'LONG BREAK';
    document.getElementById('mode-work').classList.remove('active');
    document.getElementById('mode-short').classList.remove('active');
    document.getElementById('mode-long').classList.add('active');
  }
}

function resetTimer() {
  stopTimer();
  timerState = 'idle';

  if (currentMode === 'work') {
    timeRemaining = settings.workDuration * 60;
  } else if (currentMode === 'short') {
    timeRemaining = settings.shortBreakDuration * 60;
  } else if (currentMode === 'long') {
    timeRemaining = settings.longBreakDuration * 60;
  }

  updateTimerDisplay();
  updateControls();
}

function toggleTimer() {
  getAudioContext(); // Resume audio context if needed on click

  if (timerState === 'running') {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  timerState = 'running';
  updateControls();
  startAmbientSound();

  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();

    // Accumulate total statistics during Work session
    if (currentMode === 'work') {
      stats.totalSeconds++;
      stats.todaySeconds++;
      stats.categories[activeCategory]++;
      
      // Incrementally save stats to avoid losing data
      if (stats.totalSeconds % 15 === 0) {
        saveData();
        updateStatsDisplay();
      }
    }

    if (timeRemaining <= 0) {
      handleTimerCompletion();
    }
  }, 1000);
}

function pauseTimer() {
  timerState = 'paused';
  stopTimerInterval();
  stopAmbientSound();
  updateControls();
}

function stopTimer() {
  stopTimerInterval();
  stopAmbientSound();
}

function stopTimerInterval() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function handleTimerCompletion() {
  stopTimer();
  playAlarmSound();

  if (currentMode === 'work') {
    stats.sessionCount++;
    
    // Log complete session date
    const todayStr = getLocalDateString();
    stats.completedDates.push(todayStr);
    
    // Append to timeline logs
    addTimelineLog(activeCategory, settings.workDuration);

    completedSessionsThisCycle++;
    
    calculateStreak();
    saveData();
    updateStatsDisplay();
    renderCalendarGrid();

    // Determine next phase
    if (completedSessionsThisCycle >= settings.longBreakInterval) {
      completedSessionsThisCycle = 0;
      currentMode = 'long';
      updateTheme();
      resetTimer();
      if (settings.autoStartBreaks) startTimer();
    } else {
      currentMode = 'short';
      updateTheme();
      resetTimer();
      if (settings.autoStartBreaks) startTimer();
    }
  } else {
    // Break finished, go to Work mode
    currentMode = 'work';
    updateTheme();
    resetTimer();
    if (settings.autoStartWork) startTimer();
  }
}

function skipSession() {
  const confirmSkip = confirm('Are you sure you want to skip the current session?');
  if (confirmSkip) {
    stopTimer();
    // Move to next mode
    if (currentMode === 'work') {
      completedSessionsThisCycle++;
      if (completedSessionsThisCycle >= settings.longBreakInterval) {
        completedSessionsThisCycle = 0;
        currentMode = 'long';
      } else {
        currentMode = 'short';
      }
    } else {
      currentMode = 'work';
    }
    updateTheme();
    resetTimer();
  }
}

// ==========================================================================
// UI Updates & Syncing
// ==========================================================================
function setupUI() {
  // Mode tabs
  document.getElementById('mode-work').addEventListener('click', () => setMode('work'));
  document.getElementById('mode-short').addEventListener('click', () => setMode('short'));
  document.getElementById('mode-long').addEventListener('click', () => setMode('long'));

  // Timer Buttons
  document.getElementById('btn-start').addEventListener('click', toggleTimer);
  document.getElementById('btn-reset').addEventListener('click', resetTimer);
  document.getElementById('btn-skip').addEventListener('click', skipSession);

  // Category Selector Pills
  const pills = document.querySelectorAll('.category-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.dataset.category;
    });
  });

  // Settings Modal controls
  const settingsDialog = document.getElementById('settings-dialog');
  const btnSettings = document.getElementById('btn-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const settingsForm = document.getElementById('settings-form');
  const btnResetDefaults = document.getElementById('btn-reset-defaults');
  const ambientSelect = document.getElementById('input-sound-ambient');
  const ambientVolContainer = document.getElementById('ambient-volume-container');

  btnSettings.addEventListener('click', () => {
    // Populate form inputs with current settings
    document.getElementById('input-work').value = settings.workDuration;
    document.getElementById('input-short').value = settings.shortBreakDuration;
    document.getElementById('input-long').value = settings.longBreakDuration;
    document.getElementById('input-auto-breaks').checked = settings.autoStartBreaks;
    document.getElementById('input-auto-work').checked = settings.autoStartWork;
    document.getElementById('input-long-interval').value = settings.longBreakInterval;
    document.getElementById('input-sound-alarm').value = settings.alarmSound;
    document.getElementById('input-sound-ambient').value = settings.ambientSound;
    document.getElementById('input-ambient-volume').value = settings.ambientVolume;

    toggleVolumeSlider();
    settingsDialog.showModal();
  });

  btnCloseSettings.addEventListener('click', () => settingsDialog.close());

  // Light dismiss on backdrop click
  settingsDialog.addEventListener('click', (e) => {
    if (e.target === settingsDialog) {
      settingsDialog.close();
    }
  });

  // Toggle ambient volume slider visibility based on sound type
  ambientSelect.addEventListener('change', toggleVolumeSlider);
  
  function toggleVolumeSlider() {
    if (ambientSelect.value === 'none') {
      ambientVolContainer.classList.add('hidden');
    } else {
      ambientVolContainer.classList.remove('hidden');
    }
  }

  // Volume slider immediate change listener
  document.getElementById('input-ambient-volume').addEventListener('input', (e) => {
    settings.ambientVolume = parseFloat(e.target.value);
    if (ambientGainNode) {
      ambientGainNode.gain.setValueAtTime(settings.ambientVolume, getAudioContext().currentTime);
    }
  });

  // Reset defaults button inside settings
  btnResetDefaults.addEventListener('click', () => {
    if (confirm('Reset all values to factory defaults?')) {
      settings = { ...DEFAULT_SETTINGS };
      saveData();
      settingsDialog.close();
      resetTimer();
    }
  });

  // Handle Form Submit
  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    settings.workDuration = parseInt(document.getElementById('input-work').value);
    settings.shortBreakDuration = parseInt(document.getElementById('input-short').value);
    settings.longBreakDuration = parseInt(document.getElementById('input-long').value);
    settings.autoStartBreaks = document.getElementById('input-auto-breaks').checked;
    settings.autoStartWork = document.getElementById('input-auto-work').checked;
    settings.longBreakInterval = parseInt(document.getElementById('input-long-interval').value);
    settings.alarmSound = document.getElementById('input-sound-alarm').value;
    settings.ambientSound = document.getElementById('input-sound-ambient').value;
    settings.ambientVolume = parseFloat(document.getElementById('input-ambient-volume').value);

    saveData();
    settingsDialog.close();
    resetTimer();

    // If running, restart ambient sound with new selection
    if (timerState === 'running') {
      startAmbientSound();
    }
  });
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  
  const minutesStr = String(minutes).padStart(2, '0');
  const secondsStr = String(seconds).padStart(2, '0');
  
  const timeString = `${minutesStr}:${secondsStr}`;
  document.getElementById('timer-clock').textContent = timeString;

  // Calculate percentage remaining
  let totalSeconds = 25 * 60;
  if (currentMode === 'work') totalSeconds = settings.workDuration * 60;
  else if (currentMode === 'short') totalSeconds = settings.shortBreakDuration * 60;
  else if (currentMode === 'long') totalSeconds = settings.longBreakDuration * 60;

  const percent = (timeRemaining / totalSeconds) * 100;
  document.querySelector('.progress-ring-fg').style.setProperty('--percent', percent);

  // Tab Title Sync
  let modeLabel = 'Focus';
  if (currentMode === 'short' || currentMode === 'long') modeLabel = 'Break';
  
  const stateLabel = timerState === 'paused' ? '⏸️' : '';
  document.title = `${stateLabel} (${timeString}) ${modeLabel} | FocusFlow`;

  // Cycle Subtext
  document.getElementById('timer-sub').textContent = 
    `Session ${completedSessionsThisCycle + 1} of ${settings.longBreakInterval}`;
}

function updateControls() {
  const btnStart = document.getElementById('btn-start');
  const btnText = btnStart.querySelector('span');
  const playIcon = btnStart.querySelector('.icon-play');
  const pauseIcon = btnStart.querySelector('.icon-pause');

  if (timerState === 'running') {
    btnText.textContent = 'Pause';
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    btnStart.style.setProperty('background', 'hsla(230, 20%, 90%, 0.1)');
    btnStart.style.setProperty('color', 'var(--text-primary)');
    btnStart.style.setProperty('border', '1px solid var(--border-focus)');
    btnStart.style.setProperty('box-shadow', 'none');
  } else {
    btnText.textContent = timerState === 'paused' ? 'Resume' : 'Start';
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    btnStart.style.removeProperty('background');
    btnStart.style.removeProperty('color');
    btnStart.style.removeProperty('border');
    btnStart.style.removeProperty('box-shadow');
  }
}

function updateStatsDisplay() {
  // Total Time Formatted
  const hrs = Math.floor(stats.totalSeconds / 3600);
  const mins = Math.floor((stats.totalSeconds % 3600) / 60);
  document.getElementById('stat-total-time').textContent = `${hrs}h ${String(mins).padStart(2, '0')}m`;

  // General Sessions counter
  document.getElementById('stat-total-sessions').textContent = stats.sessionCount;

  // Average session (total time / count)
  const avgMins = stats.sessionCount > 0 ? Math.round((stats.totalSeconds / 60) / stats.sessionCount) : 0;
  document.getElementById('stat-avg-session').textContent = `${avgMins}m`;

  // Sessions completed today
  const todayStr = getLocalDateString();
  const todayCount = stats.completedDates.filter(d => d === todayStr).length;
  document.getElementById('stat-today-sessions').textContent = todayCount;

  // Streak update
  document.getElementById('streak-days').textContent = currentStreak;
  const statusText = document.getElementById('streak-status-text');
  if (todayCount > 0) {
    statusText.innerHTML = `Streak active! Day ${currentStreak} protected 🔥`;
    document.querySelector('.streak-flame-container').style.setProperty('--color-streak', 'hsl(22, 95%, 55%)');
  } else {
    statusText.textContent = `Complete 1 session today to keep your ${currentStreak}-day streak!`;
    if (currentStreak === 0) {
      document.querySelector('.streak-flame-container').style.setProperty('--color-streak', 'var(--text-muted)');
    }
  }

  // Category Breakdown list
  const breakdownList = document.getElementById('category-stats-list');
  breakdownList.innerHTML = '';

  const totalCatSeconds = Object.values(stats.categories).reduce((a, b) => a + b, 0);

  Object.entries(stats.categories).forEach(([category, seconds]) => {
    const catHrs = Math.floor(seconds / 3600);
    const catMins = Math.floor((seconds % 3600) / 60);
    
    // Percentage calculated relative to total category seconds
    const percent = totalCatSeconds > 0 ? Math.round((seconds / totalCatSeconds) * 100) : 0;
    
    const emoji = category === 'Coding' ? '💻' :
                  category === 'Design' ? '🎨' :
                  category === 'Writing' ? '✍️' :
                  category === 'Reading' ? '📚' : '🎯';

    const li = document.createElement('li');
    li.className = 'breakdown-item';
    li.innerHTML = `
      <div class="breakdown-info">
        <span class="breakdown-tag">${emoji} ${category}</span>
        <span class="breakdown-time">${catHrs}h ${String(catMins).padStart(2, '0')}m (${percent}%)</span>
      </div>
      <div class="breakdown-progress-container">
        <div class="breakdown-progress-bar" style="--progress: ${percent}%"></div>
      </div>
    `;
    breakdownList.appendChild(li);
  });
}

// Render Calendar/Activity Grid (similar to github but 30 days)
function renderCalendarGrid() {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  // Generate boxes for the last 30 calendar days
  for (let i = 29; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const dateStr = getLocalDateString(day);

    // Count completions on this date
    const count = stats.completedDates.filter(d => d === dateStr).length;

    // Determine density level
    let level = 0;
    if (count === 1) level = 1;
    else if (count === 2) level = 2;
    else if (count >= 3) level = 3;

    const box = document.createElement('div');
    box.className = `calendar-box level-${level}`;

    // Format readable tooltip (e.g. "June 6: 2 sessions")
    const options = { month: 'short', day: 'numeric' };
    const readableDate = day.toLocaleDateString('en-US', options);
    box.setAttribute('data-tooltip', `${readableDate}: ${count} session${count !== 1 ? 's' : ''}`);

    grid.appendChild(box);
  }
}

function addTimelineLog(category, minutes) {
  const timeline = document.getElementById('history-timeline');
  if (!timeline) return;
  
  // Remove empty state if present
  const emptyState = timeline.querySelector('.empty-state');
  if (emptyState) {
    timeline.removeChild(emptyState);
  }

  const emoji = category === 'Coding' ? '💻' :
                category === 'Design' ? '🎨' :
                category === 'Writing' ? '✍️' :
                category === 'Reading' ? '📚' : '🎯';

  const now = new Date();
  const timeNow = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const item = document.createElement('div');
  item.className = 'history-item';
  item.innerHTML = `
    <div class="history-item-details">
      <div class="history-item-title">${emoji} ${category} Session</div>
      <div class="history-item-meta">Completed at ${timeNow}</div>
    </div>
    <div class="history-item-duration">+${minutes}m</div>
  `;

  // Prepend to timeline list
  timeline.insertBefore(item, timeline.firstChild);

  // Keep timeline items capped at top 10 for layout cleanliness
  if (timeline.children.length > 10) {
    timeline.removeChild(timeline.lastChild);
  }

  // Prepend to dashboard's history log
  const history = JSON.parse(localStorage.getItem('pomo_history_log')) || [];
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  history.unshift({
    date: dateStr,
    time: timeStr,
    mode: `${emoji} ${category} Session (${minutes}m)`
  });

  if (history.length > 50) {
    history.pop();
  }
  localStorage.setItem('pomo_history_log', JSON.stringify(history));
}
