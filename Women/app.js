/**
 * Women Health Tracker — app.js
 * All application logic organized into named module sections.
 * Zero external dependencies; runs entirely in the browser.
 */

'use strict';

/* ============================================================
   Storage
   Read/write helpers wrapping localStorage.
   ============================================================ */
const Storage = {
  // Private in-memory fallback when localStorage is unavailable
  _memStore: new Map(),

  // Test localStorage availability
  _isAvailable() {
    try {
      const testKey = '__wht_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Read and parse a value; returns null on any error
  _get(key) {
    try {
      if (this._isAvailable()) {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        return JSON.parse(raw);
      } else {
        const raw = this._memStore.get(key);
        if (raw === undefined) return null;
        return JSON.parse(raw);
      }
    } catch (e) {
      return null;
    }
  },

  // Stringify and write a value; swallows errors
  _set(key, value) {
    try {
      const str = JSON.stringify(value);
      if (this._isAvailable()) {
        localStorage.setItem(key, str);
      } else {
        this._memStore.set(key, str);
      }
    } catch (e) {
      // swallow
    }
  },

  // Remove a key
  _remove(key) {
    try {
      if (this._isAvailable()) {
        localStorage.removeItem(key);
      } else {
        this._memStore.delete(key);
      }
    } catch (e) {
      // swallow
    }
  },

  // --- Cycle Data ---

  getCycleData() {
    const data = this._get('wht_cycle');
    if (
      data === null ||
      typeof data.startDate !== 'string' ||
      typeof data.cycleLength !== 'number' ||
      data.cycleLength < 21 ||
      data.cycleLength > 45
    ) {
      return null;
    }
    return { startDate: data.startDate, cycleLength: data.cycleLength };
  },

  saveCycleData(startDate, cycleLength) {
    this._set('wht_cycle', { startDate, cycleLength });
  },

  // --- Symptoms ---

  getSymptoms(dateStr) {
    const data = this._get(`wht_symptoms_${dateStr}`);
    if (!Array.isArray(data)) return [];
    return data;
  },

  saveSymptoms(dateStr, symptoms) {
    this._set(`wht_symptoms_${dateStr}`, symptoms);
  },

  // --- Water State ---

  getWaterState(dateStr) {
    const data = this._get(`wht_water_${dateStr}`);
    if (
      data === null ||
      typeof data.date !== 'string' ||
      !Array.isArray(data.checked)
    ) {
      return null;
    }
    return { date: data.date, checked: data.checked };
  },

  saveWaterState(dateStr, checked) {
    this._set(`wht_water_${dateStr}`, { date: dateStr, checked });
  },

  // --- Theme ---

  getTheme() {
    const val = this._get('theme');
    if (val === 'dark' || val === 'light') return val;
    return 'light';
  },

  saveTheme(value) {
    this._set('theme', value);
  },

  // --- Clear App Data ---

  clearAppData() {
    try {
      if (this._isAvailable()) {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('wht_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } else {
        for (const key of this._memStore.keys()) {
          if (key.startsWith('wht_')) {
            this._memStore.delete(key);
          }
        }
      }
    } catch (e) {
      // swallow
    }
  },
};

/* ============================================================
   CycleEngine
   Pure calculation functions (predictions, current day, progress).
   All inputs/outputs are plain Date objects or numbers.
   ============================================================ */
const CycleEngine = {
  // Strip time component — returns whole days since epoch
  _toDay(d) {
    return Math.floor(d.getTime() / 86400000);
  },

  // Returns startDate + (cycleLength - 14) days
  calcOvulationDay(startDate, cycleLength) {
    return new Date(startDate.getTime() + (cycleLength - 14) * 86400000);
  },

  // Returns { start: ovulationDay - 5, end: ovulationDay }
  calcFertileWindow(ovulationDay) {
    return {
      start: new Date(ovulationDay.getTime() - 5 * 86400000),
      end: new Date(ovulationDay.getTime()),
    };
  },

  // Returns startDate + cycleLength days
  calcNextPeriod(startDate, cycleLength) {
    return new Date(startDate.getTime() + cycleLength * 86400000);
  },

  // Returns current day within cycle [1, cycleLength], advancing start if today is past next period
  calcCurrentCycleDay(startDate, cycleLength, today) {
    let start = startDate;
    const cycleLengthMs = cycleLength * 86400000;
    let day = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
    while (day > cycleLength) {
      start = new Date(start.getTime() + cycleLengthMs);
      day = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
    }
    return Math.max(1, day);
  },

  // Returns min((currentDay / cycleLength) * 100, 100), never negative
  calcProgressPercent(currentDay, cycleLength) {
    return Math.min((currentDay / cycleLength) * 100, 100);
  },

  // Returns true if today falls within [fertileWindow.start, fertileWindow.end] (day-level)
  isInFertileWindow(today, fertileWindow) {
    const t = this._toDay(today);
    return t >= this._toDay(fertileWindow.start) && t <= this._toDay(fertileWindow.end);
  },

  // Returns true if today equals ovulationDay (day-level comparison)
  isOvulationDay(today, ovulationDay) {
    return this._toDay(today) === this._toDay(ovulationDay);
  },

  // Returns signed integer days from today to targetDate (positive = future, negative = past)
  daysUntil(targetDate, today) {
    return Math.floor((targetDate.getTime() - today.getTime()) / 86400000);
  },

  // Classifies a date as 'period', 'ovulation', 'fertile', or 'none'
  classifyDay(date, cycleData) {
    if (!cycleData) return 'none';
    const { startDate, cycleLength } = cycleData;
    const d = this._toDay(date);
    const s = this._toDay(startDate);

    // Period: startDate through startDate + 4 (5 days)
    if (d >= s && d <= s + 4) return 'period';

    const ovulationDay = this.calcOvulationDay(startDate, cycleLength);
    const ov = this._toDay(ovulationDay);

    // Ovulation takes precedence over fertile
    if (d === ov) return 'ovulation';

    // Fertile: [ovulationDay - 5, ovulationDay]
    if (d >= ov - 5 && d <= ov) return 'fertile';

    return 'none';
  },
};

/* ============================================================
   Renderer
   DOM update functions for each page section.
   ============================================================ */
const Renderer = {
  _todayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  showError(fieldEl, message) {
    fieldEl.classList.add('error');
    const errorEl = fieldEl.nextElementSibling;
    if (errorEl && errorEl.classList.contains('form-error')) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
  },

  clearError(fieldEl) {
    fieldEl.classList.remove('error');
    const errorEl = fieldEl.nextElementSibling;
    if (errorEl && errorEl.classList.contains('form-error')) {
      errorEl.classList.remove('visible');
    }
  },

  showConfirmation(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = [
      'position:fixed',
      'bottom:5rem',
      'left:50%',
      'transform:translateX(-50%)',
      'background-color:var(--color-primary)',
      'color:#fff',
      'padding:0.75rem 1.5rem',
      'border-radius:var(--radius)',
      'font-size:var(--font-size-sm)',
      'font-weight:600',
      'box-shadow:var(--shadow-md)',
      'z-index:200',
      'white-space:nowrap',
    ].join(';');
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  renderTrackPage() {
    const today = this._todayStr();

    // Set max date on date picker
    const startDateEl = document.getElementById('cycle-start-date');
    if (startDateEl) {
      startDateEl.max = today;
    }

    // Pre-populate fields from stored cycle data
    const cycleData = Storage.getCycleData();
    if (cycleData) {
      if (startDateEl) startDateEl.value = cycleData.startDate;
      const cycleLengthEl = document.getElementById('cycle-length');
      if (cycleLengthEl) cycleLengthEl.value = cycleData.cycleLength;

      // Show edit button when data exists
      const editBtn = document.getElementById('edit-data-btn-track');
      if (editBtn) editBtn.hidden = false;
    }

    // Pre-select today's symptoms
    const todaySymptoms = SymptomLogger.getSymptoms(today);
    SymptomLogger.renderSymptomCheckboxes(todaySymptoms);
  },

  renderDashboard() {
    const cycleData = Storage.getCycleData();

    const noDataPrompt = document.getElementById('no-data-prompt');
    const todayStatus = document.getElementById('today-status');
    const cycleProgressCard = document.getElementById('cycle-progress-card');
    const dashboardActions = document.getElementById('dashboard-actions');

    if (!cycleData) {
      if (noDataPrompt) noDataPrompt.hidden = false;
      if (todayStatus) todayStatus.hidden = true;
      if (cycleProgressCard) cycleProgressCard.hidden = true;
      if (dashboardActions) dashboardActions.hidden = true;
      const remindersContainer = document.getElementById('reminders-container');
      if (remindersContainer) remindersContainer.innerHTML = '';
      WaterTracker.init();
      return;
    }

    const startDate = new Date(cycleData.startDate + 'T00:00:00');
    const cycleLength = cycleData.cycleLength;
    const today = new Date();
    const todayNorm = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const ovulationDay = CycleEngine.calcOvulationDay(startDate, cycleLength);
    const fertileWindow = CycleEngine.calcFertileWindow(ovulationDay);
    const nextPeriod = CycleEngine.calcNextPeriod(startDate, cycleLength);
    const currentCycleDay = CycleEngine.calcCurrentCycleDay(startDate, cycleLength, todayNorm);
    const progressPercent = CycleEngine.calcProgressPercent(currentCycleDay, cycleLength);

    // Today Status
    if (todayStatus) todayStatus.hidden = false;
    const cycleDayText = document.getElementById('cycle-day-text');
    if (cycleDayText) cycleDayText.textContent = `You are on Day ${currentCycleDay} of your cycle`;
    const daysLeft = CycleEngine.daysUntil(nextPeriod, todayNorm);
    const nextPeriodText = document.getElementById('next-period-text');
    if (nextPeriodText) nextPeriodText.textContent = `Next period in ${daysLeft} days`;

    // Cycle Progress
    if (cycleProgressCard) cycleProgressCard.hidden = false;
    const cycleProgressLabel = document.getElementById('cycle-progress-label');
    if (cycleProgressLabel) cycleProgressLabel.textContent = `Cycle Progress: Day ${currentCycleDay} / ${cycleLength}`;
    const cycleProgressBar = document.getElementById('cycle-progress-bar');
    if (cycleProgressBar) cycleProgressBar.style.width = `${progressPercent}%`;

    // Reminders
    const remindersContainer = document.getElementById('reminders-container');
    if (remindersContainer) {
      remindersContainer.innerHTML = '';

      const daysUntilPeriod = CycleEngine.daysUntil(nextPeriod, todayNorm);
      if (daysUntilPeriod >= 0 && daysUntilPeriod <= 7) {
        const banner = document.createElement('div');
        banner.className = 'reminder reminder-period';
        banner.textContent = `🩸 Your next cycle is expected in ${daysUntilPeriod} days`;
        remindersContainer.appendChild(banner);
      }

      if (CycleEngine.isInFertileWindow(todayNorm, fertileWindow)) {
        const banner = document.createElement('div');
        banner.className = 'reminder reminder-fertile';
        banner.textContent = '🌿 You are currently in your fertile window.';
        remindersContainer.appendChild(banner);
      }

      if (CycleEngine.isOvulationDay(todayNorm, ovulationDay)) {
        const banner = document.createElement('div');
        banner.className = 'reminder reminder-ovulation';
        banner.textContent = '🌸 Today is your estimated ovulation day.';
        remindersContainer.appendChild(banner);
      }
    }

    // Show actions, hide no-data prompt
    if (dashboardActions) dashboardActions.hidden = false;
    if (noDataPrompt) noDataPrompt.hidden = true;

    WaterTracker.init();
  },

  _calendarState: { month: new Date().getMonth(), year: new Date().getFullYear() },

  renderCalendar() {
    const { month, year } = this._calendarState;
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthYearEl = document.getElementById('cal-month-year');
    if (monthYearEl) monthYearEl.textContent = `${monthNames[month]} ${year}`;

    const cycleData = Storage.getCycleData();
    const container = document.getElementById('calendar-grid-container');
    if (container) {
      container.innerHTML = '';
      container.appendChild(CalendarBuilder.build(month, year, cycleData));
    }

    const legendContainer = document.getElementById('calendar-legend');
    if (legendContainer) {
      legendContainer.innerHTML = '';
      legendContainer.appendChild(CalendarBuilder.buildLegend());
    }
  },

  renderTips() {
    const container = document.getElementById('tips-grid');
    if (!container) return;
    if (container.children.length > 0) return; // already rendered

    const tips = [
      {
        icon: '🥗',
        title: 'Nutrition During Menstruation',
        body: 'Iron-rich foods like leafy greens, lentils, and lean meats help replenish iron lost during your period. Pair them with vitamin C sources to boost absorption.',
      },
      {
        icon: '🏃‍♀️',
        title: 'Exercise & Your Cycle',
        body: 'Light to moderate exercise like walking, yoga, or swimming can reduce cramps and boost mood. Listen to your body — rest is equally important during heavy flow days.',
      },
      {
        icon: '🧘‍♀️',
        title: 'Stress Management',
        body: 'Chronic stress can disrupt your cycle. Try mindfulness, deep breathing, or journaling to manage stress levels and support hormonal balance.',
      },
      {
        icon: '💧',
        title: 'Stay Hydrated',
        body: 'Drinking 8 glasses of water daily reduces bloating and fatigue. Herbal teas like ginger or chamomile can also soothe cramps and support relaxation.',
      },
      {
        icon: '😴',
        title: 'Sleep Hygiene',
        body: 'Aim for 7–9 hours of quality sleep. Hormonal fluctuations can affect sleep quality — a consistent bedtime routine helps regulate your body clock.',
      },
      {
        icon: '📅',
        title: 'Benefits of Cycle Tracking',
        body: 'Tracking your cycle helps you understand your body\'s patterns, anticipate symptoms, plan activities, and have more informed conversations with your healthcare provider.',
      },
      {
        icon: '🌡️',
        title: 'Understanding Your Fertile Window',
        body: 'Your fertile window is the 5 days before ovulation plus ovulation day itself. Knowing this window helps with both family planning and understanding your hormonal cycle.',
      },
      {
        icon: '🩺',
        title: 'When to See a Doctor',
        body: 'Consult a healthcare provider if you experience cycles shorter than 21 days or longer than 45 days, very heavy bleeding, severe pain, or sudden changes in your cycle pattern.',
      },
    ];

    tips.forEach(({ icon, title, body }) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <p class="card-title">${icon} ${title}</p>
        <p class="card-body">${body}</p>
      `;
      container.appendChild(card);
    });
  },
  // TODO: implement renderNoDataState() — show prompt when no cycle data exists
  // TODO: implement renderReminders(predictions, today) — show/hide reminder banners
  // TODO: implement renderProgressBar(progressPercent, currentDay, cycleLength) — update bar fill
};

/* ============================================================
   Router
   Hash-based page switching and active nav link highlighting.
   ============================================================ */
const Router = {
  _validHashes: ['#home', '#track', '#calendar', '#tips'],

  // Attach hashchange listener and navigate to current hash on load
  init() {
    window.addEventListener('hashchange', () => {
      this.navigate(this.getCurrentHash());
    });
    this.navigate(this.getCurrentHash());
  },

  // Hide all .page sections, show the one matching hash, update nav, trigger renderer
  navigate(hash) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
      page.hidden = true;
    });

    const targetId = hash.slice(1); // strip leading '#'
    const targetPage = document.getElementById(targetId);
    if (targetPage) {
      targetPage.hidden = false;
    }

    this.setActiveLink(hash);

    // Update page title
    const pageTitles = {
      '#home': 'Home — Women Health Tracker',
      '#track': 'Track Cycle — Women Health Tracker',
      '#calendar': 'Calendar — Women Health Tracker',
      '#tips': 'Health Tips — Women Health Tracker',
    };
    document.title = pageTitles[hash] || 'Women Health Tracker';

    // Trigger page-specific renderer if available
    if (hash === '#home' && typeof Renderer.renderDashboard === 'function') {
      Renderer.renderDashboard();
    } else if (hash === '#track' && typeof Renderer.renderTrackPage === 'function') {
      Renderer.renderTrackPage();
    } else if (hash === '#calendar' && typeof Renderer.renderCalendar === 'function') {
      Renderer.renderCalendar();
    } else if (hash === '#tips' && typeof Renderer.renderTips === 'function') {
      Renderer.renderTips();
    }
  },

  // Remove .active from all nav links, add it to the one matching hash
  setActiveLink(hash) {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === hash) {
        link.classList.add('active');
      }
    });
  },

  // Return current hash if valid, otherwise '#home'
  getCurrentHash() {
    const hash = window.location.hash || '#home';
    return this._validHashes.includes(hash) ? hash : '#home';
  },
};

/* ============================================================
   WaterTracker
   Daily water intake state management (8 glasses per day).
   ============================================================ */
const WaterTracker = {
  _todayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  init() {
    this.checkDailyReset();
    const today = this._todayStr();
    const state = this.getState(today);
    this.renderGlasses(state);
  },

  checkDailyReset() {
    const today = this._todayStr();
    const stored = Storage.getWaterState(today);
    if (!stored || stored.date !== today) {
      Storage.saveWaterState(today, new Array(8).fill(false));
    }
  },

  getState(dateStr) {
    const stored = Storage.getWaterState(dateStr);
    if (stored && Array.isArray(stored.checked) && stored.checked.length === 8) {
      return stored.checked;
    }
    return new Array(8).fill(false);
  },

  setState(index, checked) {
    const today = this._todayStr();
    const state = this.getState(today);
    state[index] = checked;
    Storage.saveWaterState(today, state);
    this.renderGlasses(state);
  },

  getCount(state) {
    return state.filter(Boolean).length;
  },

  renderGlasses(state) {
    const container = document.getElementById('water-glasses');
    if (!container) return;
    container.innerHTML = '';

    state.forEach((checked, i) => {
      const label = document.createElement('label');
      label.className = 'water-glass';
      label.setAttribute('aria-label', `Glass ${i + 1}`);

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = checked;
      checkbox.dataset.index = i;
      checkbox.addEventListener('change', (e) => {
        WaterTracker.setState(i, e.target.checked);
      });

      const emoji = document.createTextNode(checked ? '💧' : '🫙');
      label.appendChild(checkbox);
      label.appendChild(emoji);
      container.appendChild(label);
    });

    const count = this.getCount(state);
    const countEl = document.getElementById('water-count');
    if (countEl) countEl.textContent = `${count} / 8 glasses today`;

    const congratsEl = document.getElementById('water-congrats');
    if (congratsEl) congratsEl.hidden = count < 8;
  },
};

/* ============================================================
   SymptomLogger
   Symptom save/load for the current date.
   ============================================================ */
const SymptomLogger = {
  _symptoms: ['cramps', 'headache', 'mood-swings', 'bloating', 'fatigue', 'backache'],

  getSymptoms(dateStr) {
    return Storage.getSymptoms(dateStr);
  },

  saveSymptoms(dateStr, symptoms) {
    Storage.saveSymptoms(dateStr, symptoms);
  },

  collectSelected() {
    const checked = document.querySelectorAll('input[name="symptom"]:checked');
    return Array.from(checked).map(el => el.value);
  },

  renderSymptomCheckboxes(selected) {
    const inputs = document.querySelectorAll('input[name="symptom"]');
    inputs.forEach(input => {
      input.checked = selected.includes(input.value);
    });
  },
};

/* ============================================================
   CalendarBuilder
   Monthly calendar grid generation and day classification.
   ============================================================ */
const CalendarBuilder = {
  getDaysInMonth(month, year) {
    // month is 0-indexed (0=Jan, 11=Dec)
    return new Date(year, month + 1, 0).getDate();
  },

  getFirstDayOfWeek(month, year) {
    return new Date(year, month, 1).getDay(); // 0=Sun, 6=Sat
  },

  build(month, year, cycleData) {
    const fragment = document.createDocumentFragment();

    // Day name headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const headerRow = document.createElement('div');
    headerRow.className = 'calendar-grid';
    dayNames.forEach(name => {
      const cell = document.createElement('div');
      cell.className = 'calendar-day-name';
      cell.textContent = name;
      headerRow.appendChild(cell);
    });
    fragment.appendChild(headerRow);

    // Day cells grid
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';

    const daysInMonth = this.getDaysInMonth(month, year);
    const firstDay = this.getFirstDayOfWeek(month, year);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'calendar-day';
      grid.appendChild(empty);
    }

    // Build cycleData with Date objects for classifyDay
    let cycleDataForEngine = null;
    if (cycleData) {
      cycleDataForEngine = {
        startDate: new Date(cycleData.startDate + 'T00:00:00'),
        cycleLength: cycleData.cycleLength,
      };
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day';
      cell.textContent = day;

      const dateObj = new Date(year, month, day);
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

      // Today highlight
      if (dateStr === todayStr) cell.classList.add('today');

      // Cycle classification
      if (cycleDataForEngine) {
        const classification = CycleEngine.classifyDay(dateObj, cycleDataForEngine);
        if (classification !== 'none') {
          cell.classList.add(classification);
          // Tooltip
          const labels = { period: 'Period', fertile: 'Fertile Window', ovulation: 'Ovulation Day' };
          cell.setAttribute('title', labels[classification]);
          cell.setAttribute('aria-label', `Day ${day}: ${labels[classification]}`);
        }
      }

      grid.appendChild(cell);
    }

    fragment.appendChild(grid);
    return fragment;
  },

  buildLegend() {
    const legend = document.createElement('div');
    legend.className = 'calendar-legend';
    const items = [
      { color: 'var(--color-period)', label: 'Period' },
      { color: 'var(--color-fertile)', label: 'Fertile Window' },
      { color: 'var(--color-ovulation)', label: 'Ovulation Day' },
    ];
    items.forEach(({ color, label }) => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      const dot = document.createElement('span');
      dot.className = 'legend-dot';
      dot.style.backgroundColor = color;
      const text = document.createElement('span');
      text.textContent = label;
      item.appendChild(dot);
      item.appendChild(text);
      legend.appendChild(item);
    });
    return legend;
  },
};

/* ============================================================
   ThemeManager
   Dark mode toggle and theme preference persistence.
   ============================================================ */
const ThemeManager = {
  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  },

  applyTheme(mode) {
    if (mode === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    Storage.saveTheme(mode);
    // Sync toggle checkbox
    const toggle = document.getElementById('theme-toggle-input');
    if (toggle) {
      toggle.checked = mode === 'dark';
      toggle.setAttribute('aria-checked', String(mode === 'dark'));
    }
  },

  toggle() {
    const current = this.getCurrentTheme();
    this.applyTheme(current === 'dark' ? 'light' : 'dark');
  },

  init() {
    // Apply saved theme (already applied by inline script, just sync the toggle UI)
    const saved = Storage.getTheme();
    const toggle = document.getElementById('theme-toggle-input');
    if (toggle) {
      toggle.checked = saved === 'dark';
      toggle.setAttribute('aria-checked', String(saved === 'dark'));
    }
  },
};

/* ============================================================
   EventHandlers
   All addEventListener wiring — called once on DOMContentLoaded.
   ============================================================ */
const EventHandlers = {
  init() {
    // Set max date on cycle start date input
    const startDateEl = document.getElementById('cycle-start-date');
    if (startDateEl) {
      startDateEl.max = Renderer._todayStr();
    }

    this._attachCycleFormListeners();

    const clearBtn = document.getElementById('clear-data-btn');
    if (clearBtn) clearBtn.addEventListener('click', () => this.onClearDataClick());

    const editBtn = document.getElementById('edit-data-btn');
    if (editBtn) editBtn.addEventListener('click', () => this.onEditButtonClick());

    const editBtnTrack = document.getElementById('edit-data-btn-track');
    if (editBtnTrack) editBtnTrack.addEventListener('click', () => this.onEditButtonClick());

    const editForm = document.getElementById('edit-form');
    if (editForm) editForm.addEventListener('submit', (e) => this.onEditFormSubmit(e));

    const editCancelBtn = document.getElementById('edit-form-cancel');
    if (editCancelBtn) editCancelBtn.addEventListener('click', () => this.onEditFormCancel());

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle-input');
    if (themeToggle) themeToggle.addEventListener('change', () => this.onThemeToggleChange());

    const calPrev = document.getElementById('cal-prev');
    if (calPrev) calPrev.addEventListener('click', () => {
      Renderer._calendarState.month--;
      if (Renderer._calendarState.month < 0) {
        Renderer._calendarState.month = 11;
        Renderer._calendarState.year--;
      }
      Renderer.renderCalendar();
    });

    const calNext = document.getElementById('cal-next');
    if (calNext) calNext.addEventListener('click', () => {
      Renderer._calendarState.month++;
      if (Renderer._calendarState.month > 11) {
        Renderer._calendarState.month = 0;
        Renderer._calendarState.year++;
      }
      Renderer.renderCalendar();
    });
  },

  _attachCycleFormListeners() {
    const form = document.getElementById('cycle-form');
    if (form) {
      form.addEventListener('submit', (e) => this.onCycleFormSubmit(e));
    }
  },

  _validateCycleForm(startDateEl, cycleLengthEl) {
    let valid = true;
    const today = Renderer._todayStr();

    // Validate start date
    const startDate = startDateEl.value;
    if (!startDate) {
      Renderer.showError(startDateEl, 'Please enter a start date.');
      valid = false;
    } else if (startDate > today) {
      Renderer.showError(startDateEl, 'Start date cannot be in the future.');
      valid = false;
    } else {
      Renderer.clearError(startDateEl);
    }

    // Validate cycle length
    const cycleLength = parseInt(cycleLengthEl.value, 10);
    if (isNaN(cycleLength) || cycleLength < 21 || cycleLength > 45) {
      Renderer.showError(cycleLengthEl, 'Cycle length must be between 21 and 45 days.');
      valid = false;
    } else {
      Renderer.clearError(cycleLengthEl);
    }

    return valid;
  },

  onCycleFormSubmit(event) {
    event.preventDefault();

    const startDateEl = document.getElementById('cycle-start-date');
    const cycleLengthEl = document.getElementById('cycle-length');

    if (!this._validateCycleForm(startDateEl, cycleLengthEl)) {
      return;
    }

    const startDate = startDateEl.value;
    const cycleLength = parseInt(cycleLengthEl.value, 10);
    const today = Renderer._todayStr();

    Storage.saveCycleData(startDate, cycleLength);
    const symptoms = SymptomLogger.collectSelected();
    SymptomLogger.saveSymptoms(today, symptoms);

    Renderer.showConfirmation('Cycle data saved!');
    window.location.hash = '#home';
  },

  onEditButtonClick() {
    const cycleData = Storage.getCycleData();
    if (!cycleData) {
      window.location.hash = '#track';
      return;
    }
    const editStartDate = document.getElementById('edit-start-date');
    const editCycleLength = document.getElementById('edit-cycle-length');
    if (editStartDate) {
      editStartDate.value = cycleData.startDate;
      editStartDate.max = Renderer._todayStr();
    }
    if (editCycleLength) editCycleLength.value = cycleData.cycleLength;
    // Pre-check today's symptoms
    const today = Renderer._todayStr();
    const symptoms = SymptomLogger.getSymptoms(today);
    const editInputs = document.querySelectorAll('input[name="edit-symptom"]');
    editInputs.forEach(input => { input.checked = symptoms.includes(input.value); });
    const modal = document.getElementById('edit-modal');
    if (modal) modal.hidden = false;
  },

  onEditFormSubmit(event) {
    event.preventDefault();
    const startDateEl = document.getElementById('edit-start-date');
    const cycleLengthEl = document.getElementById('edit-cycle-length');
    if (!this._validateCycleForm(startDateEl, cycleLengthEl)) return;
    const startDate = startDateEl.value;
    const cycleLength = parseInt(cycleLengthEl.value, 10);
    const today = Renderer._todayStr();
    Storage.saveCycleData(startDate, cycleLength);
    const editSymptoms = Array.from(document.querySelectorAll('input[name="edit-symptom"]:checked')).map(el => el.value);
    SymptomLogger.saveSymptoms(today, editSymptoms);
    const modal = document.getElementById('edit-modal');
    if (modal) modal.hidden = true;
    Renderer.showConfirmation('Cycle data updated!');
    Renderer.renderDashboard();
  },

  onEditFormCancel() {
    const modal = document.getElementById('edit-modal');
    if (modal) modal.hidden = true;
  },

  onThemeToggleChange() {
    if (typeof ThemeManager.toggle === 'function') ThemeManager.toggle();
  },

  onClearDataClick() {
    if (confirm('Clear all your health data? This cannot be undone.')) {
      Storage.clearAppData();
      Router.navigate('#home');
    }
  },
};

/* ============================================================
   App Bootstrap
   Entry point — initialise all modules after DOM is ready.
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  Router.init();
  EventHandlers.init();
});
