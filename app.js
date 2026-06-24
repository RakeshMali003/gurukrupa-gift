/* ==========================================================================
   GURUKRUPA WHOLESALE DEPOT - PREMIUM JAVASCRIPT CONTROLLER (app.js)
   ========================================================================== */

(function () {
  'use strict';

  // --- CAMPAIGN CONFIG & DEFAULTS ---
  const STORE_COORDS = { latitude: 15.63138, longitude: 76.89271 };
  const MAX_ALLOWED_DISTANCE_METERS = 100;
  const DEFAULT_EXPIRY_DATE = '2026-09-30';

  // --- STATE SYSTEM ---
  let appState = {
    // Customer profile
    customerName: '',
    billNumber: '',
    mobileNumber: '',
    
    // Reward / Voucher details
    wonAmount: 0,
    scratchTimestamp: null,
    verificationCode: '',
    deviceFingerprint: '',
    
    // Flow flags
    hasSpun: false,
    hasScratched: false,
    wheelAngle: 0,
    
    // Audio Node Refs
    audioContext: null,
    isScratching: false,
    scratchSoundNode: null,
    scratchGainNode: null,
    
    // Administrative Settings (Loaded from LocalStorage or Defaults)
    config: {
      probabilities: { 50: 45, 100: 25, 150: 15, 200: 8, 250: 5, 300: 2 },
      schemeEnabled: true,
      expiryDate: DEFAULT_EXPIRY_DATE,
      deviceScratchCount: 0,
      mockFestivalDate: null // Null means use actual calendar date
    }
  };

  // --- DOM BINDINGS ---
  const screens = {
    hero: document.getElementById('hero-screen'),
    location: document.getElementById('location-screen'),
    form: document.getElementById('form-screen'),
    wheel: document.getElementById('wheel-screen'),
    scratch: document.getElementById('scratch-screen'),
    reward: document.getElementById('reward-screen')
  };

  const elements = {
    header: document.getElementById('app-header'),
    greetingText: document.getElementById('time-greeting'),
    festivalIndicator: document.getElementById('festival-indicator'),
    participantCount: document.getElementById('participant-count'),
    winnersMarquee: document.getElementById('winners-marquee'),
    
    ctaGetVoucherBtn: document.getElementById('cta-get-voucher-btn'),
    daysV2: document.getElementById('days-v2'),
    hoursV2: document.getElementById('hours-v2'),
    minutesV2: document.getElementById('minutes-v2'),
    secondsV2: document.getElementById('seconds-v2'),
    toggleTermsBtn: document.getElementById('toggle-terms-btn'),
    briefTermsList: document.getElementById('brief-terms-list'),
    
    locationCheckingState: document.getElementById('location-checking-state'),
    locationFailedState: document.getElementById('location-failed-state'),
    locationStatusTitle: document.getElementById('location-status-title'),
    locationStatusDesc: document.getElementById('location-status-desc'),
    currentDistanceText: document.getElementById('current-distance-text'),
    currentAccuracyText: document.getElementById('current-accuracy-text'),
    locationFailTitle: document.getElementById('location-fail-title'),
    locationFailDesc: document.getElementById('location-fail-desc'),
    retryLocationBtn: document.getElementById('retry-location-btn'),
    bypassGpsBtn: document.getElementById('bypass-gps-btn'),
    
    customerInfoForm: document.getElementById('customer-info-form'),
    wheelCanvas: document.getElementById('wheel-canvas'),
    spinWheelBtn: document.getElementById('spin-wheel-btn'),
    wheelStatusTip: document.getElementById('wheel-status-tip'),
    
    scratch3dCard: document.getElementById('scratch-3d-card'),
    scratchCanvas: document.getElementById('scratch-canvas'),
    revealedPrizeAmount: document.getElementById('revealed-prize-amount'),
    scratchTip: document.getElementById('scratch-tip'),
    
    wonAmountText: document.getElementById('won-amount-text'),
    qrCodeCanvas: document.getElementById('qr-code-canvas'),
    resultCustomerName: document.getElementById('result-customer-name'),
    resultBillNumber: document.getElementById('result-bill-number'),
    resultScratchTime: document.getElementById('result-scratch-time'),
    resultFingerprintCode: document.getElementById('result-fingerprint-code'),
    resultVerificationCode: document.getElementById('result-verification-code'),
    
    btnInstaFollow: document.getElementById('btn-insta-follow'),
    btnWhatsappShare: document.getElementById('btn-whatsapp-share'),
    btnShareStory: document.getElementById('btn-share-story'),
    instagramPopup: document.getElementById('instagram-popup'),
    closeInstagramModalBtn: document.getElementById('close-instagram-modal-btn'),
    instagramFollowLink: document.getElementById('instagram-follow-link'),
    
    adminTriggerLogo: document.getElementById('admin-trigger-logo'),
    adminPasscodeOverlay: document.getElementById('admin-passcode-overlay'),
    adminPasscodeInput: document.getElementById('admin-passcode-input'),
    adminPasscodeError: document.getElementById('admin-passcode-error'),
    adminAuthSubmitBtn: document.getElementById('admin-auth-submit-btn'),
    adminAuthCancelBtn: document.getElementById('admin-auth-cancel-btn'),
    
    adminPanelOverlay: document.getElementById('admin-panel-overlay'),
    adminSchemeEnabled: document.getElementById('admin-scheme-enabled'),
    adminOfferExpiry: document.getElementById('admin-offer-expiry'),
    adminDeviceScratches: document.getElementById('admin-device-scratches'),
    adminResetVouchersBtn: document.getElementById('admin-reset-vouchers-btn'),
    adminSaveBtn: document.getElementById('admin-save-btn'),
    adminCloseBtn: document.getElementById('admin-close-btn'),
    sliderSumWarning: document.getElementById('slider-sum-warning'),
    weightSumVal: document.getElementById('weight-sum-val'),
    weightSumIcon: document.getElementById('weight-sum-icon'),
    
    // PWA Install Banner Buttons
    pwaInstallBtn: document.getElementById('pwa-install-btn'),
    pwaCancelBtn: document.getElementById('pwa-cancel-btn')
  };

  // --- INITIALIZATION ---
  window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadAdminConfig();
    initIndexedDB();
    generateFingerprint();
    initGreetingsAndFestivals();
    initCountdownTimer();
    initBackgroundRain();
    setupGamificationSimulation();
    setupEventListeners();
    initPwaInstallPrompt();
    registerServiceWorker();
  });

  // --- THEME MANAGEMENT ---
  function initTheme() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    const sun = themeBtn.querySelector('.sun-icon');
    const moon = themeBtn.querySelector('.moon-icon');
    const saved = localStorage.getItem('theme') || 'light';
    
    if (saved === 'dark') {
      document.body.classList.add('dark-theme');
      sun.style.display = 'none';
      moon.style.display = 'block';
    } else {
      document.body.classList.remove('dark-theme');
      sun.style.display = 'block';
      moon.style.display = 'none';
    }

    themeBtn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-theme');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      if (isDark) {
        sun.style.display = 'none';
        moon.style.display = 'block';
      } else {
        sun.style.display = 'block';
        moon.style.display = 'none';
      }
    });
  }

  // --- PERSONALIZATION GREETINGS & FESTIVALS ---
  function initGreetingsAndFestivals() {
    const now = appState.config.mockFestivalDate ? new Date(appState.config.mockFestivalDate) : new Date();
    const hour = now.getHours();
    let greet = 'Welcome 🌸';

    // 1. Hourly greeting
    if (hour >= 5 && hour < 12) {
      greet = 'Good Morning 🌞';
    } else if (hour >= 12 && hour < 17) {
      greet = 'Good Afternoon 🌤️';
    } else if (hour >= 17 && hour < 22) {
      greet = 'Good Evening 🌙';
    } else {
      greet = 'Good Night 🌟';
    }
    
    elements.greetingText.innerText = greet + ", Welcome";

    // 2. Festival Date Calculations & Theme shifts
    const month = now.getMonth(); // 0-indexed (June = 5, July = 6, August = 7, Sept = 8)
    const date = now.getDate();
    let activeFestival = null;

    // Ganesh Chaturthi (simulated/actual: Sept 1st to Sept 10th)
    if (month === 8 && date >= 1 && date <= 10) {
      activeFestival = {
        name: 'Ganesh Chaturthi Special 🌸',
        colors: {
          maroon: '#E65100', // Saffron
          maroonDark: '#5D2500',
          maroonLight: '#FF6F00',
          gold: '#FFD54F',
          goldLight: '#FFF59D',
          goldDark: '#FFB300'
        }
      };
    }
    // Dussehra (simulated/actual: Sept 15th to Sept 30th)
    else if (month === 8 && date >= 15 && date <= 30) {
      activeFestival = {
        name: 'Happy Dussehra 🏹',
        colors: {
          maroon: '#4A148C', // Royal Purple
          maroonDark: '#1E0034',
          maroonLight: '#7B1FA2',
          gold: '#D4AF37',
          goldLight: '#FFE082',
          goldDark: '#AA7C11'
        }
      };
    }

    if (activeFestival) {
      // Set festival visual indicator
      elements.festivalIndicator.innerText = activeFestival.name;
      elements.festivalIndicator.classList.remove('hidden');
      
      // Override root styles dynamically
      const root = document.documentElement;
      root.style.setProperty('--primary-maroon', activeFestival.colors.maroon);
      root.style.setProperty('--primary-maroon-dark', activeFestival.colors.maroonDark);
      root.style.setProperty('--primary-maroon-light', activeFestival.colors.maroonLight);
      root.style.setProperty('--gold-primary', activeFestival.colors.gold);
      root.style.setProperty('--gold-light', activeFestival.colors.goldLight);
      root.style.setProperty('--gold-dark', activeFestival.colors.goldDark);
      
      // Paint motif center logo color to match
      document.getElementById('motif-center').setAttribute('fill', activeFestival.colors.maroon);
    } else {
      elements.festivalIndicator.classList.add('hidden');
    }
  }

  // --- BACKGROUND RAIN PARTICLE SYSTEM ---
  function initBackgroundRain() {
    const canvas = document.getElementById('rain-canvas');
    const ctx = canvas.getContext('2d');
    
    function resizeRainCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeRainCanvas();
    window.addEventListener('resize', resizeRainCanvas, { passive: true });

    const rainParticles = [];
    const maxRaindrops = 80;

    for (let i = 0; i < maxRaindrops; i++) {
      rainParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        len: Math.random() * 15 + 10,
        speed: Math.random() * 5 + 8,
        opacity: Math.random() * 0.2 + 0.05
      });
    }

    function animateRain() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Soft light-blue/silver rain stroke
      ctx.strokeStyle = document.body.classList.contains('dark-theme') 
        ? 'rgba(212, 175, 55, 0.15)' 
        : 'rgba(94, 13, 27, 0.12)';
        
      ctx.lineWidth = 1.5;
      
      rainParticles.forEach(p => {
        ctx.beginPath();
        // Slanted angle representing wind
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 3, p.y + p.len);
        ctx.stroke();
        
        p.y += p.speed;
        p.x -= 0.5; // Slight drift
        
        if (p.y > canvas.height) {
          p.y = -p.len;
          p.x = Math.random() * canvas.width;
        }
      });
      requestAnimationFrame(animateRain);
    }
    animateRain();
  }

  // --- COIN CELEBRATION ENGINE ---
  function triggerCoinsAnimation() {
    const canvas = document.getElementById('coins-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.classList.add('active');

    const coins = [];
    const coinCount = 50;

    for (let i = 0; i < coinCount; i++) {
      coins.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height - 20,
        r: Math.random() * 8 + 6,
        vy: Math.random() * 4 + 4,
        rotationSpeed: Math.random() * 0.1 + 0.05,
        rotation: Math.random() * Math.PI,
        wRatio: 1
      });
    }

    let animId;
    const start = Date.now();

    function drawCoins() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      coins.forEach(c => {
        c.y += c.vy;
        c.rotation += c.rotationSpeed;
        c.wRatio = Math.sin(c.rotation); // Simulated spin width ratio

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.scale(c.wRatio, 1); // Flattens width to simulate spin

        // Gold coin circle
        ctx.beginPath();
        ctx.arc(0, 0, c.r, 0, Math.PI * 2);
        
        const grad = ctx.createRadialGradient(0,0,1, 0,0,c.r);
        grad.addColorStop(0, '#FFF3A8');
        grad.addColorStop(0.5, '#D4AF37');
        grad.addColorStop(1, '#AA7C11');
        ctx.fillStyle = grad;
        ctx.fill();

        // Inner rim border
        ctx.strokeStyle = '#FFE082';
        ctx.lineWidth = 1;
        ctx.strokeRect(-c.r/2, -c.r/2, c.r, c.r);
        
        ctx.restore();

        if (c.y > canvas.height) {
          c.y = -20;
          c.x = Math.random() * canvas.width;
        }
      });

      if (Date.now() - start < 6000) {
        animId = requestAnimationFrame(drawCoins);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.classList.remove('active');
        cancelAnimationFrame(animId);
      }
    }
    drawCoins();
  }

  // --- FIREWORKS CELEBRATION ENGINE ---
  function triggerFireworksAnimation() {
    const canvas = document.getElementById('fireworks-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.classList.add('active');

    const particles = [];
    
    function spawnBurst(cx, cy) {
      const pCount = 40;
      const hue = Math.random() * 360;
      for (let i = 0; i < pCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: Math.random() * 2 + 1,
          alpha: 1,
          decay: Math.random() * 0.02 + 0.015,
          color: `hsla(${hue}, 80%, 60%, `
        });
      }
    }

    let nextLaunch = Date.now();
    let animId;
    const start = Date.now();

    function drawFireworks() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (Date.now() - nextLaunch > 800 && Date.now() - start < 5000) {
        spawnBurst(Math.random() * canvas.width, Math.random() * (canvas.height * 0.6) + 100);
        nextLaunch = Date.now();
      }

      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // Gravity
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(idx, 1);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = p.color + p.alpha + ')';
          ctx.fill();
        }
      });

      if (Date.now() - start < 7000 || particles.length > 0) {
        animId = requestAnimationFrame(drawFireworks);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.classList.remove('active');
        cancelAnimationFrame(animId);
      }
    }
    drawFireworks();
  }

  // --- CONFETTI PARTY ENGINE ---
  function triggerConfettiAnimation() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.classList.add('active');

    const colors = ['#D4AF37', '#FFE082', '#5E0D1B', '#7E1C2B', '#E65100', '#25D366', '#FFFFFF'];
    const particles = [];
    const count = 100;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        r: Math.random() * 5 + 3,
        vy: Math.random() * 3 + 3,
        vx: Math.random() * 2 - 1,
        tilt: Math.random() * 8 - 4,
        tiltAngle: 0,
        tiltInc: Math.random() * 0.08 + 0.02,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    let animId;
    const start = Date.now();

    function drawConfetti() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.y += p.vy;
        p.x += p.vx;
        p.tiltAngle += p.tiltInc;
        p.tilt = Math.sin(p.tiltAngle) * 6;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r/2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r/2);
        ctx.stroke();

        if (p.y > canvas.height) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
      });

      if (Date.now() - start < 6000) {
        animId = requestAnimationFrame(drawConfetti);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.classList.remove('active');
        cancelAnimationFrame(animId);
      }
    }
    drawConfetti();
  }

  // --- GAMIFICATION TICKER SIMULATOR ---
  function setupGamificationSimulation() {
    // 1. Animate participant count slightly
    let baseParticipants = parseInt(localStorage.getItem('gurukrupa_sim_participants') || '10284');
    elements.participantCount.innerText = baseParticipants.toLocaleString();
    
    setInterval(() => {
      baseParticipants += Math.floor(Math.random() * 2) + 1; // 1-2 new users periodically
      elements.participantCount.innerText = baseParticipants.toLocaleString();
      localStorage.setItem('gurukrupa_sim_participants', String(baseParticipants));
    }, 15000);

    // 2. Winner marquee updates
    const billTypes = ['GK-109A', 'GK-403B', 'GK-112E', 'GK-092X', 'GK-887F', 'GK-192T', 'GK-902S', 'GK-554R'];
    const rewards = [50, 100, 150, 200, 250];
    
    setInterval(() => {
      const randomBill = billTypes[Math.floor(Math.random() * billTypes.length)];
      const randomReward = rewards[Math.floor(Math.random() * rewards.length)];
      
      const newTickerItem = `<span>₹${randomReward} won by Bill ${randomBill}</span> • `;
      elements.winnersMarquee.innerHTML = newTickerItem + elements.winnersMarquee.innerHTML;
      
      // Limit list to prevent text memory leak
      const spans = elements.winnersMarquee.querySelectorAll('span');
      if (spans.length > 15) {
        elements.winnersMarquee.innerHTML = Array.from(spans).slice(0, 10).map(s => s.outerHTML).join(' • ');
      }
    }, 18000);
  }

  // --- COUNTDOWN TIMER ---
  function initCountdownTimer() {
    function updateTimer() {
      const now = new Date();
      const expiry = new Date(appState.config.expiryDate + 'T23:59:59+05:30');
      const diff = expiry - now;

      if (diff <= 0) {
        document.getElementById('countdown-timer').innerHTML = "<div class='timer-closed'>Campaign Concluded!</div>";
        elements.ctaGetVoucherBtn.disabled = true;
        elements.ctaGetVoucherBtn.querySelector('span').innerText = "Scheme Concluded";
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      elements.daysV2.innerText = String(days).padStart(2, '0');
      elements.hoursV2.innerText = String(hours).padStart(2, '0');
      elements.minutesV2.innerText = String(minutes).padStart(2, '0');
      elements.secondsV2.innerText = String(seconds).padStart(2, '0');
    }
    updateTimer();
    setInterval(updateTimer, 1000);
  }

  // --- BROWSER FINGERPRINTING ---
  function generateFingerprint() {
    try {
      const data = {
        userAgent: navigator.userAgent,
        screen: `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
        timezone: new Date().getTimezoneOffset(),
        language: navigator.language || 'en',
        pixelRatio: window.devicePixelRatio || 1,
        cores: navigator.hardwareConcurrency || 2
      };

      // Hidden canvas drawing polynomial hash
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = "top";
      ctx.font = "14px 'Playfair Display', serif";
      ctx.fillStyle = "#5E0D1B";
      ctx.fillRect(10, 10, 180, 30);
      ctx.fillStyle = "#D4AF37";
      ctx.fillText("GK-Monsoon-Premium-2026", 15, 17);
      
      const canvasData = canvas.toDataURL();
      let canvasHash = 0;
      for (let i = 0; i < canvasData.length; i++) {
        canvasHash = (canvasHash * 31 + canvasData.charCodeAt(i)) & 0xFFFFFF;
      }
      
      const strToHash = `${JSON.stringify(data)}-${canvasHash}`;
      let finalHash = 0;
      for (let i = 0; i < strToHash.length; i++) {
        finalHash = (finalHash * 31 + strToHash.charCodeAt(i)) & 0xFFFFFF;
      }
      
      appState.deviceFingerprint = 'FP-' + finalHash.toString(16).toUpperCase().padStart(6, '0');
    } catch (err) {
      console.warn("Fingerprinting failed, using backup ID", err);
      appState.deviceFingerprint = 'FP-' + Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(6, '0');
    }
  }

  // --- INDEXEDDB & LOCALSTORAGE DOUBLE-LOCK ---
  const DB_NAME = 'GurukrupaSecureDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'vouchers';
  let dbRef = null;

  function initIndexedDB() {
    if (!window.indexedDB) {
      console.warn("IndexedDB not supported, falling back to LocalStorage double lock.");
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (e) => {
      console.error("IndexedDB failed to open", e);
    };

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = (e) => {
      dbRef = e.target.result;
      checkExistingDBVoucher();
    };
  }

  function checkExistingDBVoucher() {
    if (!dbRef) return;
    try {
      const transaction = dbRef.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get("monsoon_voucher");

      request.onsuccess = (e) => {
        const dbVoucher = e.target.result;
        const localFlag = localStorage.getItem('gurukrupa_voucher_used') === 'true';
        const localVoucherStr = localStorage.getItem('gurukrupa_saved_voucher');

        if (dbVoucher && (!localFlag || !localVoucherStr)) {
          // Recover data from DB to localStorage (anti-abuse override recovery!)
          localStorage.setItem('gurukrupa_voucher_used', 'true');
          localStorage.setItem('gurukrupa_saved_voucher', JSON.stringify(dbVoucher.data));
          console.log("LocalStorage restored via IndexedDB protection.");
          restoreVoucherState(dbVoucher.data);
        } else if (!dbVoucher && localFlag && localVoucherStr) {
          // Recover data from localStorage to DB
          const parsed = JSON.parse(localVoucherStr);
          saveVoucherToIndexedDB(parsed);
          console.log("IndexedDB restored via LocalStorage backup.");
          restoreVoucherState(parsed);
        } else if (dbVoucher && localFlag && localVoucherStr) {
          // Fully synchronized
          restoreVoucherState(dbVoucher.data);
        }
      };
    } catch (err) {
      console.error("Failed to query IndexedDB store", err);
    }
  }

  function saveVoucherToIndexedDB(voucherObject) {
    if (!dbRef) return;
    try {
      const transaction = dbRef.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.put({ id: "monsoon_voucher", data: voucherObject });
    } catch (err) {
      console.error("IndexedDB write fail", err);
    }
  }

  function restoreVoucherState(voucher) {
    appState.customerName = voucher.name;
    appState.billNumber = voucher.bill;
    appState.mobileNumber = voucher.mobile || 'N/A';
    appState.wonAmount = voucher.amount;
    appState.scratchTimestamp = new Date(voucher.timestamp);
    appState.verificationCode = voucher.code;
    appState.hasSpun = true;
    appState.hasScratched = true;

    renderRewardScreen();
    navigateTo('reward');
  }

  // --- DUAL GPS LOCATION VERIFICATION ---
  let locationPhase = 'pre-spin'; // 'pre-spin' or 'post-scratch'

  function verifyLocation(phase) {
    locationPhase = phase;
    navigateTo('location');
    
    elements.locationStatusTitle.innerText = "Acquiring GPS Signal...";
    elements.locationStatusDesc.innerText = "Verifying coordinate proximity and device GPS accuracy before unlocking rewards.";
    elements.locationFailedState.classList.add('hidden');
    elements.locationCheckingState.classList.remove('hidden');

    if (!navigator.geolocation) {
      showLocationError("Geolocation is not supported by this browser.");
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        const isMocked = position.mocked === true || 
                         (position.coords && (position.coords.isMocked === true || position.coords.mocked === true));
        
        elements.currentAccuracyText.innerText = `${Math.round(accuracy)} meters`;

        // 1. Accuracy limits < 30 meters
        if (accuracy > 30) {
          showLocationError(`GPS Accuracy too low (${Math.round(accuracy)}m). We require accuracy < 30 meters to confirm your location. Please step outside or near windows.`);
          return;
        }

        // 2. Block Mock Locations
        if (isMocked || accuracy === 0 || accuracy === 1) {
          showLocationError("Suspicious location faking detected. Mock GPS location applications are blocked.");
          return;
        }

        // 3. Compute Distance
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;
        const distance = calculateDistance(userLat, userLon, STORE_COORDS.latitude, STORE_COORDS.longitude);

        if (distance <= MAX_ALLOWED_DISTANCE_METERS) {
          // Success Path!
          if (locationPhase === 'pre-spin') {
            setTimeout(() => navigateTo('form'), 600);
          } else {
            // Post scratch success! Store voucher details and render reward
            setTimeout(() => {
              completeVoucherGeneration();
            }, 600);
          }
        } else {
          showDistanceFailure(distance, accuracy);
        }
      },
      (error) => {
        let msg = "GPS Permission denied. To scratch, please enable location services for this browser.";
        if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "GPS signals unavailable. Try stepping near a window or check device location toggles.";
        } else if (error.code === error.TIMEOUT) {
          msg = "GPS request timed out. Please try again.";
        }
        showLocationError(msg);
      },
      options
    );
  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  function showDistanceFailure(distanceMeters, accuracy) {
    elements.locationCheckingState.classList.add('hidden');
    elements.locationFailedState.classList.remove('hidden');

    let formattedDistance = '';
    if (distanceMeters >= 1000) {
      formattedDistance = (distanceMeters / 1000).toFixed(2) + ' km';
    } else {
      formattedDistance = Math.round(distanceMeters) + ' meters';
    }
    
    elements.currentDistanceText.innerText = `${formattedDistance} away`;
    elements.currentAccuracyText.innerText = `${Math.round(accuracy)}m (Lock OK)`;
    
    elements.locationFailTitle.innerText = "Voucher Restricted To In-Store";
    elements.locationFailDesc.innerText = "Please visit Gurukrupa Wholesale Depot, Siruguppa, to verify. You must be within a 100m radius.";
  }

  function showLocationError(errorMessage) {
    elements.locationCheckingState.classList.add('hidden');
    elements.locationFailedState.classList.remove('hidden');
    elements.currentDistanceText.innerText = "GPS Error";
    elements.currentAccuracyText.innerText = "Unavailable";
    elements.locationFailTitle.innerText = "Location Lock Denied";
    elements.locationFailDesc.innerText = errorMessage;
  }

  function bypassLocationVerification() {
    // Simulates a genuine high-accuracy GPS lock inside the store boundary
    console.log("Mocking store GPS coordinates (15m accuracy)...");
    elements.currentAccuracyText.innerText = "15 meters";
    elements.currentDistanceText.innerText = "5 meters away";

    if (locationPhase === 'pre-spin') {
      navigateTo('form');
    } else {
      completeVoucherGeneration();
    }
  }

  // --- NAVIGATION STATE ---
  function navigateTo(screenKey) {
    Object.keys(screens).forEach(key => {
      if (key === screenKey) {
        screens[key].classList.add('active');
      } else {
        screens[key].classList.remove('active');
      }
    });

    if (screenKey === 'reward') {
      elements.header.style.display = 'none';
      document.getElementById('greeting-banner').style.display = 'none';
    } else {
      elements.header.style.display = 'flex';
      document.getElementById('greeting-banner').style.display = 'flex';
    }
    
    window.scrollTo(0, 0);
  }

  // --- EVENT LISTENERS REGISTRATION ---
  function setupEventListeners() {
    // T&C drawer toggle
    elements.toggleTermsBtn.addEventListener('click', () => {
      elements.briefTermsList.classList.toggle('hidden');
      elements.toggleTermsBtn.querySelector('.chevron-icon').classList.toggle('rotated');
    });

    // Start flow
    elements.ctaGetVoucherBtn.addEventListener('click', () => {
      if (localStorage.getItem('gurukrupa_voucher_used') === 'true') {
        alert("This device has already generated a monsoon voucher.");
        return;
      }
      verifyLocation('pre-spin');
    });

    elements.retryLocationBtn.addEventListener('click', () => {
      verifyLocation(locationPhase);
    });

    elements.bypassGpsBtn.addEventListener('click', () => {
      bypassLocationVerification();
    });

    // Submit Customer Details Info
    elements.customerInfoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      document.getElementById('name-error').style.display = 'none';
      document.getElementById('bill-error').style.display = 'none';
      document.getElementById('mobile-error').style.display = 'none';

      const nameInput = document.getElementById('input-customer-name');
      const billInput = document.getElementById('input-bill-number');
      const mobileInput = document.getElementById('input-mobile-number');

      let isValid = true;

      if (nameInput.value.trim().length < 3) {
        const err = document.getElementById('name-error');
        err.innerText = "Please enter your full name (minimum 3 characters).";
        err.style.display = 'block';
        isValid = false;
      }

      if (billInput.value.trim().length < 2) {
        const err = document.getElementById('bill-error');
        err.innerText = "Please enter your purchase receipt number.";
        err.style.display = 'block';
        isValid = false;
      }

      if (mobileInput.value.trim().length > 0) {
        if (!/^[6789][0-9]{9}$/.test(mobileInput.value.trim())) {
          const err = document.getElementById('mobile-error');
          err.innerText = "Please enter a valid 10-digit mobile number.";
          err.style.display = 'block';
          isValid = false;
        }
      }

      if (!isValid) return;

      // Lock Details
      appState.customerName = nameInput.value.trim();
      appState.billNumber = billInput.value.trim().toUpperCase();
      appState.mobileNumber = mobileInput.value.trim() || 'N/A';

      // Pick reward beforehand (Spin outcomes are locked dynamically using parameters)
      appState.wonAmount = selectLuckyReward();
      
      navigateTo('wheel');
      initLuckyWheelCanvas();
    });

    // Spin trigger
    elements.spinWheelBtn.addEventListener('click', () => {
      if (appState.hasSpun) return;
      spinLuckyWheel();
    });

    // 3D Card Hover Interaction
    elements.scratch3dCard.addEventListener('mousemove', (e) => {
      const card = elements.scratch3dCard;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      // Rotate perspective subtly based on mouse offset
      card.style.transform = `rotateX(${-y * 0.12}deg) rotateY(${x * 0.12}deg) scale(1.02)`;
    });

    elements.scratch3dCard.addEventListener('mouseleave', () => {
      elements.scratch3dCard.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
    });

    // Social Sharing Links
    elements.btnInstaFollow.addEventListener('click', () => {
      elements.instagramPopup.classList.remove('hidden');
    });

    elements.closeInstagramModalBtn.addEventListener('click', () => {
      elements.instagramPopup.classList.add('hidden');
    });

    elements.instagramFollowLink.addEventListener('click', () => {
      elements.instagramPopup.classList.add('hidden');
    });

    elements.btnWhatsappShare.addEventListener('click', () => {
      const text = encodeURIComponent(`Hey! I just spun the lucky wheel and won a ₹${appState.wonAmount} discount voucher at Gurukrupa Wholesale Depot, Siruguppa! Shop for ₹1000 or more and get your digital scratch voucher too! 🌧️🛍️`);
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    });

    elements.btnShareStory.addEventListener('click', () => {
      alert("📸 Take a screenshot of this receipt page and tag @gurukrupa_wholesale_depot on your Instagram Story to enter our weekly Mega Wedding Silk Saree giveaway! 🎉");
    });

    // Warn on navigation
    window.addEventListener('beforeunload', (e) => {
      if (appState.hasSpun && !appState.hasScratched) {
        const msg = "Warning: Leaving this page now will lock your voucher!";
        e.returnValue = msg;
        return msg;
      }
    });

    // --- SECRET ADMIN PANEL ACTIONS ---
    let logoTouchTimer = null;
    elements.adminTriggerLogo.addEventListener('mousedown', startLogoLongPress);
    elements.adminTriggerLogo.addEventListener('touchstart', startLogoLongPress, { passive: true });
    
    elements.adminTriggerLogo.addEventListener('mouseup', cancelLogoLongPress);
    elements.adminTriggerLogo.addEventListener('mouseleave', cancelLogoLongPress);
    elements.adminTriggerLogo.addEventListener('touchend', cancelLogoLongPress, { passive: true });

    function startLogoLongPress(e) {
      logoTouchTimer = setTimeout(() => {
        elements.adminPasscodeOverlay.classList.remove('hidden');
        elements.adminPasscodeInput.focus();
      }, 5000); // 5 seconds long press
    }

    function cancelLogoLongPress() {
      if (logoTouchTimer) clearTimeout(logoTouchTimer);
    }

    // Admin Passcode Check
    elements.adminAuthSubmitBtn.addEventListener('click', () => {
      const pin = elements.adminPasscodeInput.value.trim();
      if (pin === '1234' || pin === 'GK-ADMIN-2026') {
        elements.adminPasscodeOverlay.classList.add('hidden');
        elements.adminPasscodeInput.value = '';
        elements.adminPasscodeError.style.display = 'none';
        
        openAdminDashboard();
      } else {
        elements.adminPasscodeError.style.display = 'block';
      }
    });

    elements.adminAuthCancelBtn.addEventListener('click', () => {
      elements.adminPasscodeOverlay.classList.add('hidden');
      elements.adminPasscodeInput.value = '';
      elements.adminPasscodeError.style.display = 'none';
    });

    elements.adminCloseBtn.addEventListener('click', () => {
      elements.adminPanelOverlay.classList.add('hidden');
    });

    // Interconnect administrative probability sliders
    const sliders = [50, 100, 150, 200, 250, 300];
    sliders.forEach(amt => {
      const slider = document.getElementById(`weight-slider-${amt}`);
      const lbl = document.getElementById(`weight-lbl-${amt}`);
      slider.addEventListener('input', () => {
        lbl.innerText = slider.value;
        checkSliderWeightsSum();
      });
    });

    elements.adminSaveBtn.addEventListener('click', saveAdminSettings);
    elements.adminResetVouchersBtn.addEventListener('click', resetAllVoucherHistory);
  }

  // --- REWARD LOGIC: WEIGHTED PROBABILITIES ---
  function selectLuckyReward() {
    const probs = appState.config.probabilities;
    
    // Convert weights to distribution array
    const entries = Object.keys(probs).map(k => ({ amt: parseInt(k), weight: parseFloat(probs[k]) }));
    const totalWeight = entries.reduce((sum, item) => sum + item.weight, 0);

    const r = Math.random() * totalWeight;
    let runningSum = 0;
    
    for (let i = 0; i < entries.length; i++) {
      runningSum += entries[i].weight;
      if (r <= runningSum) {
        return entries[i].amt;
      }
    }
    return 50; // Fallback
  }

  // --- SPINNING LUCKY WHEEL CANVAS ---
  const sectors = [
    { amt: 50, color: '#F9E7B9', text: '#5E0D1B' },
    { amt: 300, color: '#5E0D1B', text: '#FDFBF7' },
    { amt: 100, color: '#F9E7B9', text: '#5E0D1B' },
    { amt: 250, color: '#5E0D1B', text: '#FDFBF7' },
    { amt: 150, color: '#F9E7B9', text: '#5E0D1B' },
    { amt: 200, color: '#5E0D1B', text: '#FDFBF7' }
  ];

  function initLuckyWheelCanvas() {
    const ctx = elements.wheelCanvas.getContext('2d');
    const cx = elements.wheelCanvas.width / 2;
    const cy = elements.wheelCanvas.height / 2;
    const r = cx - 10;

    // Reset styles
    elements.wheelCanvas.style.transform = 'rotate(0deg)';
    elements.wheelCanvas.style.transition = 'none';
    appState.hasSpun = false;
    elements.spinWheelBtn.disabled = false;
    elements.wheelStatusTip.innerText = "Press the button to initiate your spin! 🎰";

    drawWheel(ctx, cx, cy, r);
  }

  function drawWheel(ctx, cx, cy, r) {
    const len = sectors.length;
    const arc = Math.PI * 2 / len;

    ctx.clearRect(0,0,cx*2,cy*2);

    sectors.forEach((sec, i) => {
      const angle = arc * i;
      
      // Draw slice
      ctx.beginPath();
      ctx.fillStyle = sec.color;
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + arc);
      ctx.lineTo(cx, cy);
      ctx.fill();

      // Border lines
      ctx.strokeStyle = 'rgba(212,175,55,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Render Text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = sec.text;
      ctx.font = 'bold 16px "Outfit", sans-serif';
      ctx.fillText(`₹${sec.amt}`, r - 25, 6);
      ctx.restore();
    });

    // Central golden logo hub
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#D4AF37';
    ctx.fill();
    ctx.strokeStyle = '#AA7C11';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#5E0D1B';
    ctx.fill();
  }

  function spinLuckyWheel() {
    initAudio();
    appState.hasSpun = true;
    elements.spinWheelBtn.disabled = true;
    elements.wheelStatusTip.innerText = "Spinning... Good Luck! 🍀";

    // 1. Locate won prize sector index
    const wonAmt = appState.wonAmount;
    const targetSectorIdx = sectors.findIndex(s => s.amt === wonAmt);
    const len = sectors.length;
    const sectorArcDegrees = 360 / len;

    // Angle of sector center relative to pointer (at top: -90 degrees)
    // Sector i goes from (i * sectorArc) to ((i+1) * sectorArc)
    // Center is (i * sectorArc + sectorArc/2)
    // We want the wheel rotation to line up that sector center with the top pointer (270 degrees)
    const targetDeg = 270 - (targetSectorIdx * sectorArcDegrees + sectorArcDegrees/2);
    
    // Add 6 complete spins (2160 deg) for momentum look
    const finalSpinDeg = 2160 + targetDeg;
    
    // Trigger transition rotation
    elements.wheelCanvas.style.transition = 'transform 6s cubic-bezier(0.12, 0.8, 0.15, 1)';
    elements.wheelCanvas.style.transform = `rotate(${finalSpinDeg}deg)`;

    // Play ticking sound effect matching speed decel
    playSpinTickerAudio(6000);

    // Landed path
    setTimeout(() => {
      playWinningChime();
      elements.wheelStatusTip.innerHTML = `🎉 Landed on <strong class='text-gold' style='font-size: 1.1rem;'>₹${appState.wonAmount}</strong>!`;
      
      // Go to scratch card page after 1.8s
      setTimeout(() => {
        elements.revealedPrizeAmount.innerText = `₹${appState.wonAmount}`;
        navigateTo('scratch');
        initScratchCanvas();
      }, 180000 / 100); // 1.8s
      
    }, 6000);
  }

  // --- 3D CANVAS SCRATCH CONTROLLER ---
  function initScratchCanvas() {
    const ctx = elements.scratchCanvas.getContext('2d');
    const width = elements.scratchCanvas.width;
    const height = elements.scratchCanvas.height;

    // Reset styles
    elements.scratchCanvas.style.opacity = '1';
    elements.scratchCanvas.style.pointerEvents = 'auto';
    elements.scratchTip.innerText = "💡 Move your finger / cursor on card to scratch!";

    // Setup Canvas foil
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0,0,width,height);

    // Gold silk gradient
    const gold = ctx.createLinearGradient(0,0,width,height);
    gold.addColorStop(0, '#FFE082');
    gold.addColorStop(0.3, '#D4AF37');
    gold.addColorStop(0.5, '#AA7C11');
    gold.addColorStop(0.7, '#D4AF37');
    gold.addColorStop(1, '#8D6E63');

    ctx.fillStyle = gold;
    ctx.fillRect(0,0,width,height);

    // Fine saree grids texture
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1;
    for(let i=0; i<width; i+=6) {
      ctx.beginPath();
      ctx.moveTo(i,0); ctx.lineTo(i,height); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0,i); ctx.lineTo(width,i); ctx.stroke();
    }

    // Border Frame
    ctx.strokeStyle = '#AA7C11';
    ctx.lineWidth = 5;
    ctx.strokeRect(10,10,width-20,height-20);
    ctx.strokeStyle = '#FFE082';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(14,14,width-28,height-28);

    // Draw paisley overlay logo
    drawPaisleyMotif(ctx, width/2, height/2 - 20);

    // Text labels
    ctx.fillStyle = '#5E0D1B';
    ctx.font = 'bold 17px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,255,255,0.4)';
    ctx.shadowBlur = 2;
    ctx.fillText("SCRATCH TO CLAIM", width/2, height/2 + 55);
    
    ctx.font = '9px "Outfit", sans-serif';
    ctx.fillStyle = '#3A050D';
    ctx.fillText("GURUKRUPA MONSOON PREMIUM", width/2, height/2 + 75);
    
    ctx.shadowBlur = 0;

    // Pointer events for canvas dragging
    let active = false;
    let lx = 0, ly = 0;

    elements.scratchCanvas.addEventListener('pointerdown', (e) => {
      initAudio();
      active = true;
      const c = getCoords(e);
      lx = c.x; ly = c.y;
      playScratchSound();
    }, { passive: true });

    elements.scratchCanvas.addEventListener('pointermove', (e) => {
      if (!active) return;
      e.preventDefault();
      
      const c = getCoords(e);
      
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = 36;
      
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();

      lx = c.x; ly = c.y;

      updateScratchSoundVolume(0.5);

      // Trigger standard mobile vibration (Haptic)
      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }

      throttle(checkFoilTransparency, 100)();
    }, { passive: false });

    elements.scratchCanvas.addEventListener('pointerup', () => {
      active = false;
      stopScratchSound();
    }, { passive: true });

    elements.scratchCanvas.addEventListener('pointercancel', () => {
      active = false;
      stopScratchSound();
    }, { passive: true });

    function getCoords(e) {
      const rect = elements.scratchCanvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * width,
        y: ((e.clientY - rect.top) / rect.height) * height
      };
    }
  }

  function drawPaisleyMotif(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    
    ctx.fillStyle = '#5E0D1B';
    ctx.beginPath();
    ctx.moveTo(0, -35);
    ctx.quadraticCurveTo(20, -10, 20, 15);
    ctx.arc(0, 15, 20, 0, Math.PI);
    ctx.quadraticCurveTo(-20, -10, 0, -35);
    ctx.fill();

    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    ctx.moveTo(0, -23);
    ctx.quadraticCurveTo(12, -7, 12, 10);
    ctx.arc(0, 10, 12, 0, Math.PI);
    ctx.quadraticCurveTo(-12, -7, 0, -23);
    ctx.fill();

    ctx.fillStyle = '#FFE082';
    ctx.beginPath();
    ctx.arc(0, 10, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Throttler
  let throttleTimer = false;
  function throttle(callback, time) {
    return function() {
      if (throttleTimer) return;
      throttleTimer = true;
      setTimeout(() => {
        callback();
        throttleTimer = false;
      }, time);
    };
  }

  function checkFoilTransparency() {
    if (appState.hasScratched) return;

    const ctx = elements.scratchCanvas.getContext('2d');
    const width = elements.scratchCanvas.width;
    const height = elements.scratchCanvas.height;
    
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    let clearedCount = 0;
    
    const len = data.length;
    for (let i = 3; i < len; i += 16) {
      if (data[i] === 0) clearedCount++;
    }
    
    const ratio = clearedCount / (len / 16);

    if (ratio >= 0.45) {
      // 1. Lock scratching interactions
      appState.hasScratched = true;
      elements.scratchCanvas.style.pointerEvents = 'none';
      elements.scratchTip.innerText = "✨ Verifying Location... 🎉";
      stopScratchSound();

      // 2. DUAL GPS: Verify location again post-scratch to validate coordinates!
      setTimeout(() => {
        verifyLocation('post-scratch');
      }, 500);
    }
  }

  function completeVoucherGeneration() {
    appState.scratchTimestamp = new Date();
    
    // Hash details
    const combinedStr = `${appState.billNumber}-${appState.customerName.toUpperCase().substring(0,3)}-${appState.wonAmount}-${appState.scratchTimestamp.getTime()}`;
    let hashVal = 0;
    for (let i = 0; i < combinedStr.length; i++) {
      hashVal = (hashVal * 31 + combinedStr.charCodeAt(i)) & 0xFFFFFF;
    }
    appState.verificationCode = `GK-MON-${hashVal.toString(16).toUpperCase().padStart(6, '0')}`;

    // Incremental administrative counts
    appState.config.deviceScratchCount++;
    localStorage.setItem('gurukrupa_config', JSON.stringify(appState.config));

    // Save double-locks
    const voucherData = {
      name: appState.customerName,
      bill: appState.billNumber,
      mobile: appState.mobileNumber,
      amount: appState.wonAmount,
      timestamp: appState.scratchTimestamp.getTime(),
      code: appState.verificationCode,
      fingerprint: appState.deviceFingerprint
    };

    localStorage.setItem('gurukrupa_voucher_used', 'true');
    localStorage.setItem('gurukrupa_saved_voucher', JSON.stringify(voucherData));
    saveVoucherToIndexedDB(voucherData);

    // Fade out canvas foil overlay
    let op = 1;
    const fade = setInterval(() => {
      op -= 0.1;
      if (op <= 0) {
        clearInterval(fade);
        elements.scratchCanvas.style.opacity = '0';
        
        // Spawn chimes, coins, fireworks and confetti
        triggerFireworksAnimation();
        triggerCoinsAnimation();
        triggerConfettiAnimation();

        setTimeout(() => {
          renderRewardScreen();
          navigateTo('reward');
          
          // Popup Instagram reminder
          setTimeout(() => {
            elements.instagramPopup.classList.remove('hidden');
          }, 3500);
        }, 1500);
      } else {
        elements.scratchCanvas.style.opacity = String(op);
      }
    }, 45);
  }

  function renderRewardScreen() {
    elements.wonAmountText.innerText = `₹${appState.wonAmount}`;
    elements.resultCustomerName.innerText = appState.customerName;
    elements.resultBillNumber.innerText = appState.billNumber;
    elements.resultFingerprintCode.innerText = appState.deviceFingerprint;
    elements.resultVerificationCode.innerText = appState.verificationCode;

    // Date formatter
    const d = appState.scratchTimestamp;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    elements.resultScratchTime.innerText = `${day}-${month}-${year} ${hours}:${minutes}`;

    // Dynamic winner label text
    const textGreet = document.getElementById('greeting-win-label');
    if (appState.wonAmount >= 200) {
      textGreet.innerText = "🏆 Grand Winner! 🎉";
    } else {
      textGreet.innerText = "Congratulations! 🎉";
    }

    // GENERATE REDEMPTION QR CODE OFFLINE
    try {
      const qrData = {
        n: appState.customerName,
        b: appState.billNumber,
        a: appState.wonAmount,
        t: d.getTime(),
        c: appState.verificationCode,
        f: appState.deviceFingerprint
      };
      
      // Renders QR on qr-code-canvas using Qrious locally
      new QRious({
        element: elements.qrCodeCanvas,
        value: JSON.stringify(qrData),
        size: 280,
        level: 'H',
        background: '#ffffff',
        foreground: '#5E0D1B'
      });
    } catch(err) {
      console.error("QR Code rendering failed offline", err);
    }
  }

  // --- WEB AUDIO AUDIO SYNTH NODES ---
  function initAudio() {
    if (appState.audioContext) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      appState.audioContext = new AudioCtx();
    } catch(e) {
      console.warn("Web Audio API is not supported.", e);
    }
  }

  function playSpinTickerAudio(durationMs) {
    if (!appState.audioContext) return;
    if (appState.audioContext.state === 'suspended') {
      appState.audioContext.resume();
    }

    const start = appState.audioContext.currentTime;
    const ticksCount = 36; // Clicks during slow down spin
    
    // Play ticking sound nodes at logarithmic increasing intervals
    for (let i = 0; i < ticksCount; i++) {
      // Logarithmic curve spacing out ticks
      const ratio = i / ticksCount;
      const delay = Math.pow(ratio, 2.5) * (durationMs / 1000);
      
      const osc = appState.audioContext.createOscillator();
      const gain = appState.audioContext.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, start + delay); // Click frequency
      osc.frequency.exponentialRampToValueAtTime(40, start + delay + 0.05);

      gain.gain.setValueAtTime(0.08, start + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, start + delay + 0.04);

      osc.connect(gain);
      gain.connect(appState.audioContext.destination);

      osc.start(start + delay);
      osc.stop(start + delay + 0.06);
    }
  }

  function playWinningChime() {
    if (!appState.audioContext) return;
    const now = appState.audioContext.currentTime;

    // Play arpeggiated C-major scale chords for satisfying reward landing
    const freqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
    
    freqs.forEach((freq, idx) => {
      const delay = idx * 0.1;
      const osc = appState.audioContext.createOscillator();
      const gain = appState.audioContext.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.01, now + delay);
      gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.5);

      osc.connect(gain);
      gain.connect(appState.audioContext.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.6);
    });
  }

  function playScratchSound() {
    if (!appState.audioContext) return;
    if (appState.audioContext.state === 'suspended') {
      appState.audioContext.resume();
    }

    try {
      const bufferSize = 2 * appState.audioContext.sampleRate;
      const buffer = appState.audioContext.createBuffer(1, bufferSize, appState.audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // Noise
      }

      appState.scratchSoundNode = appState.audioContext.createBufferSource();
      appState.scratchSoundNode.buffer = buffer;
      appState.scratchSoundNode.loop = true;

      const filter = appState.audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 850;
      filter.Q.value = 4.0;

      appState.scratchGainNode = appState.audioContext.createGain();
      appState.scratchGainNode.gain.setValueAtTime(0.001, appState.audioContext.currentTime);

      appState.scratchSoundNode.connect(filter);
      filter.connect(appState.scratchGainNode);
      appState.scratchGainNode.connect(appState.audioContext.destination);

      appState.scratchSoundNode.start();
      appState.isScratching = true;
    } catch(err) {
      console.error(err);
    }
  }

  function updateScratchSoundVolume(vol) {
    if (!appState.audioContext || !appState.isScratching || !appState.scratchGainNode) return;
    appState.scratchGainNode.gain.setTargetAtTime(vol, appState.audioContext.currentTime, 0.04);
  }

  function stopScratchSound() {
    if (!appState.audioContext || !appState.isScratching || !appState.scratchSoundNode) return;
    try {
      appState.scratchGainNode.gain.setTargetAtTime(0, appState.audioContext.currentTime, 0.04);
      const node = appState.scratchSoundNode;
      setTimeout(() => node.disconnect(), 100);
      appState.isScratching = false;
      appState.scratchSoundNode = null;
    } catch(err) {}
  }

  // --- HIDDEN ADMINISTRATIVE CONFIGS ---
  function loadAdminConfig() {
    const localConfig = localStorage.getItem('gurukrupa_config');
    if (localConfig) {
      try {
        const parsed = JSON.parse(localConfig);
        appState.config = Object.assign(appState.config, parsed);
      } catch(err) {
        console.error("Config parse fail, resetting", err);
      }
    }
  }

  function openAdminDashboard() {
    elements.adminPanelOverlay.classList.remove('hidden');
    
    // Load config values to form inputs
    const probs = appState.config.probabilities;
    Object.keys(probs).forEach(amt => {
      const slider = document.getElementById(`weight-slider-${amt}`);
      const lbl = document.getElementById(`weight-lbl-${amt}`);
      slider.value = probs[amt];
      lbl.innerText = probs[amt];
    });

    elements.adminSchemeEnabled.checked = appState.config.schemeEnabled;
    elements.adminOfferExpiry.value = appState.config.expiryDate;
    elements.adminDeviceScratches.innerText = appState.config.deviceScratchCount;

    checkSliderWeightsSum();
  }

  function checkSliderWeightsSum() {
    const sliders = [50, 100, 150, 200, 250, 300];
    let sum = 0;
    sliders.forEach(amt => {
      sum += parseInt(document.getElementById(`weight-slider-${amt}`).value);
    });

    elements.weightSumVal.innerText = sum;
    if (sum === 100) {
      elements.sliderSumWarning.classList.remove('error');
      elements.weightSumIcon.innerText = '✅';
      elements.adminSaveBtn.disabled = false;
    } else {
      elements.sliderSumWarning.classList.add('error');
      elements.weightSumIcon.innerText = '❌';
      elements.adminSaveBtn.disabled = true; // Block save if sum is not 100%
    }
  }

  function saveAdminSettings() {
    const sliders = [50, 100, 150, 200, 250, 300];
    let sum = 0;
    sliders.forEach(amt => {
      const val = parseInt(document.getElementById(`weight-slider-${amt}`).value);
      appState.config.probabilities[amt] = val;
      sum += val;
    });

    if (sum !== 100) {
      alert("Sliders sum must be exactly 100%!");
      return;
    }

    appState.config.schemeEnabled = elements.adminSchemeEnabled.checked;
    appState.config.expiryDate = elements.adminOfferExpiry.value;

    // Save settings local
    localStorage.setItem('gurukrupa_config', JSON.stringify(appState.config));
    elements.adminPanelOverlay.classList.add('hidden');
    
    // Refresh date calculations & countdowns
    initGreetingsAndFestivals();
    initCountdownTimer();
    alert("Admin Settings Saved Successfully!");
  }

  function resetAllVoucherHistory() {
    if (!confirm("Are you sure you want to reset all coupon scratch history on this device? This will clear local security locks, IndexedDB, and state, allowing you to test scratching again.")) return;
    
    // Clear state keys
    localStorage.removeItem('gurukrupa_voucher_used');
    localStorage.removeItem('gurukrupa_saved_voucher');
    
    // Clear IndexedDB stores
    if (dbRef) {
      try {
        const transaction = dbRef.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        store.delete("monsoon_voucher");
      } catch(err) {
        console.error("IndexedDB delete fail", err);
      }
    }

    // Refresh page
    alert("Voucher History Reset. Reloading page...");
    window.location.reload();
  }

  // --- PWA APP INSTALL PROMPTS ---
  let deferredPrompt = null;
  function initPwaInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      const used = localStorage.getItem('gurukrupa_voucher_used') === 'true';
      if (!used) {
        setTimeout(() => {
          document.getElementById('pwa-install-banner').classList.remove('hidden');
        }, 4000); // Prompts after 4s
      }
    });

    elements.pwaInstallBtn.addEventListener('click', () => {
      if (!deferredPrompt) return;
      document.getElementById('pwa-install-banner').classList.add('hidden');
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        deferredPrompt = null;
      });
    });

    elements.pwaCancelBtn.addEventListener('click', () => {
      document.getElementById('pwa-install-banner').classList.add('hidden');
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => console.log('PWA Service Worker registered:', reg.scope))
          .catch((err) => console.error('PWA Service Worker registration failed:', err));
      });
    }
  }

})();
