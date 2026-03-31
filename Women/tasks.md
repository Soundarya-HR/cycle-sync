# Implementation Plan: Women Health Tracker

## Overview

Build a fully client-side SPA using plain HTML, CSS, and vanilla JavaScript with localStorage persistence. The app has three source files (`index.html`, `style.css`, `app.js`) and a `tests/` directory. Implementation proceeds incrementally: scaffold → core engine → storage → pages → tests.

## Tasks

- [x] 1. Project scaffold and theme foundation
  - Create `index.html` shell with `<nav>`, four `<section>` page containers, and `<footer>` with privacy notice
  - Add inline `<script>` at top of `<head>` to apply saved `data-theme` before first paint (prevents flash)
  - Create `style.css` with all CSS custom properties for light and dark themes, base reset, and responsive nav layout
  - Create `app.js` with empty named sections: `Storage`, `CycleEngine`, `Renderer`, `Router`, `WaterTracker`, `SymptomLogger`, `CalendarBuilder`, `ThemeManager`, `EventHandlers`
  - _Requirements: 9.1, 9.2, 10.1, 10.3, 10.4, 14.1, 14.2, 15.1, 15.5_

- [x] 2. CycleEngine pure functions
  - [x] 2.1 Implement all eight CycleEngine functions in `app.js`
    - `calcOvulationDay(startDate, cycleLength)` → `startDate + (cycleLength − 14)` days
    - `calcFertileWindow(ovulationDay)` → `{ start: ovulationDay − 5, end: ovulationDay }`
    - `calcNextPeriod(startDate, cycleLength)` → `startDate + cycleLength` days
    - `calcCurrentCycleDay(startDate, cycleLength, today)` → `(today − startDate) + 1`; advances start by cycleLength when overflow
    - `calcProgressPercent(currentDay, cycleLength)` → `min(currentDay / cycleLength * 100, 100)`
    - `isInFertileWindow(today, fertileWindow)` → boolean
    - `isOvulationDay(today, ovulationDay)` → boolean
    - `daysUntil(targetDate, today)` → signed integer days
    - Use integer day arithmetic (`Math.floor(ms / 86400000)`) throughout; store/parse dates as UTC ISO strings
    - _Requirements: 2.1–2.7, 11.1–11.4, 13.3_

  - [ ]* 2.2 Write property test: Next Period Date Calculation (Property 4)
    - **Property 4: Next Period Date Calculation**
    - **Validates: Requirements 2.1, 2.6**

  - [ ]* 2.3 Write property test: Ovulation Day Calculation (Property 5)
    - **Property 5: Ovulation Day Calculation**
    - **Validates: Requirements 2.3, 2.4**

  - [ ]* 2.4 Write property test: Fertile Window Calculation (Property 6)
    - **Property 6: Fertile Window Calculation**
    - **Validates: Requirements 2.2, 2.5**

  - [ ]* 2.5 Write property test: Days Until Calculation (Property 7)
    - **Property 7: Days Until Calculation**
    - **Validates: Requirements 2.7**

  - [ ]* 2.6 Write property test: Current Cycle Day Calculation (Property 20)
    - **Property 20: Current Cycle Day Calculation**
    - **Validates: Requirements 11.1, 11.2, 11.3**

  - [ ]* 2.7 Write property test: Cycle Day Overflow Handling (Property 21)
    - **Property 21: Cycle Day Overflow Handling**
    - **Validates: Requirements 11.4**

  - [ ]* 2.8 Write property test: Progress Percentage Calculation (Property 22)
    - **Property 22: Progress Percentage Calculation**
    - **Validates: Requirements 13.1, 13.2, 13.3**

  - [ ]* 2.9 Write unit tests for CycleEngine edge cases in `tests/cycle-engine.test.js`
    - Cycle length exactly 21 and exactly 45
    - Today equals start date (day 1)
    - Today equals last day of cycle
    - Overflow: today is one day past next period date

- [x] 3. Storage helpers
  - [x] 3.1 Implement `Storage` module in `app.js`
    - `getCycleData()` / `saveCycleData(startDate, cycleLength)` using key `wht_cycle`
    - `getSymptoms(dateStr)` / `saveSymptoms(dateStr, symptoms[])` using key `wht_symptoms_{YYYY-MM-DD}`
    - `getWaterState(dateStr)` / `saveWaterState(dateStr, checked[])` using key `wht_water_{YYYY-MM-DD}`
    - `getTheme()` / `saveTheme(value)` using key `theme`
    - Validate parsed JSON shape on every read; return `null` for malformed/missing data
    - Wrap all `localStorage` calls in try/catch; fall back to in-memory map when unavailable
    - _Requirements: 1.5, 1.6, 3.3, 3.4, 6.1, 6.2, 8.2, 8.3, 15.4_

  - [ ]* 3.2 Write property test: Cycle Data Persistence Round-Trip (Property 3)
    - **Property 3: Cycle Data Persistence Round-Trip**
    - **Validates: Requirements 1.5, 1.6, 6.2**

  - [ ]* 3.3 Write property test: Symptom Persistence Round-Trip (Property 8)
    - **Property 8: Symptom Persistence Round-Trip**
    - **Validates: Requirements 3.3, 3.4**

  - [ ]* 3.4 Write property test: Water Tracker Persistence Round-Trip (Property 16)
    - **Property 16: Water Tracker Persistence Round-Trip**
    - **Validates: Requirements 8.2, 8.3**

  - [ ]* 3.5 Write property test: Clear Data Removes All App Keys (Property 14)
    - **Property 14: Clear Data Removes All App Keys**
    - **Validates: Requirements 6.3**

  - [ ]* 3.6 Write unit tests for Storage in `tests/storage.test.js`
    - Round-trip with valid data
    - Malformed JSON returns null
    - localStorage unavailable (mock to throw) falls back to in-memory

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Hash-based router and navigation
  - [x] 5.1 Implement `Router` in `app.js`
    - On `hashchange` and initial load: hide all `<section>` elements, show the one matching current hash (default `#home`)
    - Set `.active` class on the matching nav link; remove from all others
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 5.2 Write property test: Active Navigation Highlighting (Property 19)
    - **Property 19: Active Navigation Highlighting**
    - **Validates: Requirements 9.3**

- [x] 6. Track Cycle page
  - [x] 6.1 Implement Track Cycle form in `index.html` and `Renderer`/`EventHandlers` in `app.js`
    - Date picker (max = today), cycle length input (default 28, min 21, max 45), six symptom checkboxes
    - Inline validation: future date → error below date field; cycle length out of range → error below length field
    - On valid submit: call `Storage.saveCycleData` and `Storage.saveSymptoms`, navigate to `#home`
    - Pre-populate fields from `Storage.getCycleData()` and `Storage.getSymptoms(today)` on page render
    - _Requirements: 1.1–1.6, 3.1–3.5_

  - [ ]* 6.2 Write property test: Cycle Length Validation (Property 1)
    - **Property 1: Cycle Length Validation**
    - **Validates: Requirements 1.4, 12.6**

  - [ ]* 6.3 Write property test: Future Date Rejection (Property 2)
    - **Property 2: Future Date Rejection**
    - **Validates: Requirements 1.3, 12.7**

- [x] 7. Home Dashboard
  - [x] 7.1 Implement Dashboard renderer in `app.js`
    - Today Status: "You are on Day X of your cycle" + "Next period in X days"
    - Cycle Progress: "Cycle Progress: Day X / Y" label + `<progress>` bar
    - Reminders: period approaching (≤7 days), fertile window, ovulation day banners
    - Water Tracker: 8 checkbox icons + "X / 8 glasses today" counter + congrats at 8
    - No-data prompt when `Storage.getCycleData()` returns null
    - "Edit Data" button wired to open edit form
    - "Clear Data" button with confirmation dialog
    - _Requirements: 2.1–2.7, 5.1–5.4, 8.1–8.6, 11.1–11.5, 13.1–13.5_

  - [ ]* 7.2 Write property test: Period Approaching Reminder (Property 11)
    - **Property 11: Period Approaching Reminder**
    - **Validates: Requirements 5.1**

  - [ ]* 7.3 Write property test: Fertile Window Reminder (Property 12)
    - **Property 12: Fertile Window Reminder**
    - **Validates: Requirements 5.2**

  - [ ]* 7.4 Write property test: Ovulation Day Reminder (Property 13)
    - **Property 13: Ovulation Day Reminder**
    - **Validates: Requirements 5.3**

  - [ ]* 7.5 Write property test: Water Count Display (Property 17)
    - **Property 17: Water Count Display**
    - **Validates: Requirements 8.4**

  - [ ]* 7.6 Write property test: Water Tracker Daily Reset (Property 18)
    - **Property 18: Water Tracker Daily Reset**
    - **Validates: Requirements 8.6**

  - [ ]* 7.7 Write unit tests for Dashboard renderer in `tests/renderer.test.js`
    - No-data state: status messages hidden, prompt visible
    - Water congrats shown only when all 8 checked
    - Reminder banners shown/hidden based on cycle state

- [x] 8. Edit form
  - [x] 8.1 Implement Edit form (inline or modal) in `index.html` and `app.js`
    - Pre-populate start date and cycle length from `Storage.getCycleData()`
    - Same validation rules as Track Cycle form
    - Save: overwrite `wht_cycle` in localStorage, recalculate all predictions, refresh Dashboard
    - Cancel: discard changes, restore previous values, close form
    - _Requirements: 12.1–12.8_

  - [ ]* 8.2 Write property test: Edit Form Pre-Population (Property 23)
    - **Property 23: Edit Form Pre-Population**
    - **Validates: Requirements 12.2**

  - [ ]* 8.3 Write property test: Edit Save Updates Storage and Predictions (Property 24)
    - **Property 24: Edit Save Updates Storage and Predictions**
    - **Validates: Requirements 12.4, 12.5**

  - [ ]* 8.4 Write property test: Edit Cancel Preserves Storage (Property 25)
    - **Property 25: Edit Cancel Preserves Storage**
    - **Validates: Requirements 12.8**

  - [ ]* 8.5 Write unit tests for edit form in `tests/renderer.test.js`
    - Cancel restores previous values in localStorage
    - Save with invalid data shows inline errors and does not write to localStorage

- [x] 9. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Calendar page
  - [x] 10.1 Implement `CalendarBuilder` and Calendar renderer in `app.js`
    - Month/year header with `<` `>` prev/next navigation
    - 7-column CSS grid; render correct day count per month (handles leap years via `new Date(year, month+1, 0).getDate()`)
    - `classifyDay(date, cycleData)` returns `"period"` | `"fertile"` | `"ovulation"` | `"none"` (ovulation takes precedence over fertile)
    - Color-code cells: pink = period, green = fertile, purple = ovulation
    - Tooltip/label on hover/tap showing day type
    - Color legend below grid
    - _Requirements: 4.1–4.7_

  - [ ]* 10.2 Write property test: Calendar Day Count (Property 9)
    - **Property 9: Calendar Day Count**
    - **Validates: Requirements 4.1**

  - [ ]* 10.3 Write property test: Day Classification Correctness (Property 10)
    - **Property 10: Day Classification Correctness**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.7**

  - [ ]* 10.4 Write unit tests for CalendarBuilder in `tests/calendar.test.js`
    - February in a leap year (29 days)
    - February in a non-leap year (28 days)
    - Ovulation day classified as `"ovulation"` not `"fertile"`

- [x] 11. Health Tips page
  - Implement Health Tips section in `index.html` with ≥ 8 static tip cards
  - Each card: emoji/icon, title, body text; topics: nutrition, exercise, stress, hydration, sleep, cycle tracking benefits
  - No network requests; all content inline
  - _Requirements: 7.1–7.4_

  - [ ]* 11.1 Write property test: Health Tip Card Structure (Property 15)
    - **Property 15: Health Tip Card Structure**
    - **Validates: Requirements 7.3**

- [x] 12. Dark mode toggle and ThemeManager
  - [x] 12.1 Implement `ThemeManager` in `app.js`
    - Toggle switch in nav: on change, set/remove `data-theme="dark"` on `<html>`, call `Storage.saveTheme()`
    - Sync checkbox state to current theme on every page load
    - _Requirements: 15.1–15.7_

  - [ ]* 12.2 Write property test: Theme Toggle Persistence (Property 26)
    - **Property 26: Theme Toggle Persistence**
    - **Validates: Requirements 15.3, 15.4**

  - [ ]* 12.3 Write unit tests for ThemeManager in `tests/theme.test.js`
    - Toggle applies `data-theme` attribute immediately
    - Saved `"dark"` preference restored on load
    - Saved `"light"` preference restored on load

- [x] 13. Responsive layout and mobile nav
  - Add CSS media query for `< 768px`: switch nav to bottom tab bar, ensure touch targets ≥ 44×44px, no horizontal scroll
  - Verify all pages render correctly from 320px to 1920px
  - _Requirements: 9.4, 9.5, 10.1, 10.2, 10.5_

- [x] 14. Wire everything together and final integration
  - [x] 14.1 Wire all `EventHandlers` in `app.js`
    - Nav links, dark mode toggle, Track Cycle form submit, symptom checkboxes, water checkboxes, edit/cancel/save buttons, clear data button, calendar prev/next
    - Call `Router.init()` and `ThemeManager.init()` on `DOMContentLoaded`
    - _Requirements: 6.3, 9.1–9.3_

  - [ ]* 14.2 Write integration tests in `tests/renderer.test.js`
    - Full save → navigate to home → predictions displayed flow
    - Clear data → no-data prompt shown

- [x] 15. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- All 26 correctness properties from the design document are covered by property-based test sub-tasks
- Property tests use `fast-check` with `numRuns: 100` minimum; each test includes the comment tag `// Feature: women-health-tracker, Property N: <property_text>`
- Unit tests use Vitest; run with `npx vitest --run`
- All date arithmetic uses integer offsets (`Math.floor(ms / 86400000)`) to avoid DST bugs
