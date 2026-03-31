# Design Document: Women Health Tracker

## Overview

The Women Health Tracker is a fully client-side single-page application (SPA) built with plain HTML, CSS, and vanilla JavaScript. It runs entirely in the browser with no backend, no external APIs, and no build step. All user data is persisted in `localStorage`. The app presents four logical "pages" — Home Dashboard, Track Cycle, Calendar, and Health Tips — rendered by toggling section visibility or responding to URL hash changes.

The primary design goals are:

- Zero external dependencies at runtime
- Instant load from a single directory of static files
- Responsive layout from 320 px to 1920 px
- Soft pink/pastel light theme with an optional dark mode (applied before first paint to prevent flash)
- Correct cycle arithmetic for period prediction, fertile window, and ovulation day

---

## Architecture

The app is a single HTML file (`index.html`) with companion `style.css` and `app.js` files. All logic lives in `app.js`; the HTML file is a shell that contains all four page sections hidden by default.

```
women-health-tracker/
├── index.html      # Shell: nav, four <section> pages, footer
├── style.css       # Theme variables, layout, dark-mode overrides
└── app.js          # All application logic
```

### Navigation Model

Hash-based routing (`window.location.hash`) drives page switching. Each page maps to a hash:

| Hash | Page |
|---|---|
| `#home` | Home Dashboard |
| `#track` | Track Cycle |
| `#calendar` | Calendar |
| `#tips` | Health Tips |

On `hashchange` and on initial load, the router hides all `<section>` elements and shows the one matching the current hash (defaulting to `#home`).

### Dark Mode Strategy

A `data-theme="dark"` attribute is set on `<html>` by an inline `<script>` tag at the very top of `<head>` — before any CSS is parsed — so the correct theme is applied before the first paint. CSS custom properties switch based on this attribute.

```html
<script>
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
</script>
```

### Module Structure (app.js)

`app.js` is organized into cohesive namespaces/sections:

| Section | Responsibility |
|---|---|
| `Storage` | Read/write helpers wrapping `localStorage` |
| `CycleEngine` | Pure calculation functions (predictions, current day, progress) |
| `Renderer` | DOM update functions for each page |
| `Router` | Hash-based page switching, active nav highlighting |
| `WaterTracker` | Daily water state management |
| `SymptomLogger` | Symptom save/load for current date |
| `CalendarBuilder` | Monthly calendar grid generation |
| `ThemeManager` | Dark mode toggle and persistence |
| `EventHandlers` | All `addEventListener` wiring |

---

## Components and Interfaces

### Navigation Bar

- Horizontal on ≥ 768 px; bottom tab bar on < 768 px
- Four links: Home, Track Cycle, Calendar, Health Tips
- Active link receives `.active` class via Router
- Dark mode toggle switch (checkbox + label) in the nav header

### Home Dashboard

Sections rendered in order:

1. **Today Status** — "You are on Day X of your cycle" / "Next period in X days"
2. **Cycle Progress** — "Cycle Progress: Day X / Y" label + `<progress>` bar
3. **Reminders** — conditional banners (period approaching, fertile window, ovulation day)
4. **Water Tracker** — 8 checkbox icons + "X / 8 glasses today" counter + congrats message
5. **Edit Data button** — opens the edit form modal/inline
6. **No-data prompt** — shown when no cycle data exists

### Track Cycle Page

- Date picker for last cycle start date (max = today)
- Number input for average cycle length (default 28, min 21, max 45)
- Symptom checkboxes (6 options)
- Submit button → saves and navigates to `#home`
- Edit Data button (same as Dashboard)
- Inline validation error messages

### Calendar Page

- Month/year header with `<` `>` navigation buttons
- 7-column CSS grid calendar
- Color-coded day cells: pink (period), green (fertile), purple (ovulation), default (other)
- Color legend below the grid
- Tooltip/label on hover/tap showing day type

### Health Tips Page

- Grid of ≥ 8 tip cards
- Each card: icon/emoji, title, body text
- Static content, no network requests

### Edit Form

- Inline form (or modal overlay) pre-populated from `localStorage`
- Same validation as Track Cycle
- Save → overwrites storage, recalculates, refreshes Dashboard
- Cancel → discards changes

### Footer / Privacy Notice

- Persistent across all pages
- Text: "Your data is stored locally on your device and is not shared."
- Font size ≥ 12 px, WCAG AA contrast

---

## Data Models

All data is stored in `localStorage` under the following keys:

### Key Schema

| Key | Type | Description |
|---|---|---|
| `wht_cycle` | JSON object | Last cycle start date and average cycle length |
| `wht_symptoms_{YYYY-MM-DD}` | JSON array | Symptom strings for a given date |
| `wht_water_{YYYY-MM-DD}` | JSON object | Water intake state for a given date |
| `theme` | string | `"light"` or `"dark"` |

### `wht_cycle` Object

```json
{
  "startDate": "2025-06-01",
  "cycleLength": 28
}
```

### `wht_symptoms_{YYYY-MM-DD}` Array

```json
["cramps", "fatigue", "bloating"]
```

Valid symptom values: `"cramps"`, `"headache"`, `"mood swings"`, `"bloating"`, `"fatigue"`, `"backache"`

### `wht_water_{YYYY-MM-DD}` Object

```json
{
  "checked": [true, true, true, false, false, false, false, false]
}
```

An array of 8 booleans, index 0–7 corresponding to glasses 1–8.

### CycleData Interface (in-memory)

```js
{
  startDate: Date,      // parsed from wht_cycle.startDate
  cycleLength: number,  // integer 21–45
}
```

### Computed Predictions (derived, never stored)

```js
{
  ovulationDay: Date,       // startDate + (cycleLength - 14)
  fertileWindowStart: Date, // ovulationDay - 5
  fertileWindowEnd: Date,   // ovulationDay
  nextPeriodDate: Date,     // startDate + cycleLength
  currentCycleDay: number,  // (today - startDate) + 1, recalculated if > cycleLength
  progressPercent: number,  // min(currentCycleDay / cycleLength * 100, 100)
}
```

### CycleEngine Pure Functions

```js
// All inputs/outputs are plain Date objects or numbers
calcOvulationDay(startDate, cycleLength) → Date
calcFertileWindow(ovulationDay) → { start: Date, end: Date }
calcNextPeriod(startDate, cycleLength) → Date
calcCurrentCycleDay(startDate, cycleLength, today) → number
calcProgressPercent(currentDay, cycleLength) → number  // capped at 100
isInFertileWindow(today, fertileWindow) → boolean
isOvulationDay(today, ovulationDay) → boolean
daysUntil(targetDate, today) → number
```

### CSS Custom Properties (Theme)

```css
:root {
  --color-bg: #fff5f7;
  --color-surface: #ffffff;
  --color-primary: #e91e8c;
  --color-accent: #f48fb1;
  --color-text: #3d1a24;
  --color-text-muted: #8c6070;
  --color-period: #f48fb1;
  --color-fertile: #a5d6a7;
  --color-ovulation: #ce93d8;
  --color-border: #f8bbd0;
}

[data-theme="dark"] {
  --color-bg: #1a0d12;
  --color-surface: #2d1520;
  --color-primary: #f06292;
  --color-accent: #ad1457;
  --color-text: #fce4ec;
  --color-text-muted: #f48fb1;
  --color-period: #c2185b;
  --color-fertile: #388e3c;
  --color-ovulation: #7b1fa2;
  --color-border: #4a1a2a;
}
```

---


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Cycle Length Validation

*For any* integer value submitted as average cycle length, the app should accept it if and only if it falls within the inclusive range [21, 45]; any value outside this range should be rejected with an inline error and not saved to localStorage.

**Validates: Requirements 1.4, 12.6**

---

### Property 2: Future Date Rejection

*For any* date value submitted as the last cycle start date, the app should reject it if and only if it is strictly after today's date; dates on or before today should be accepted.

**Validates: Requirements 1.3, 12.7**

---

### Property 3: Cycle Data Persistence Round-Trip

*For any* valid cycle start date and cycle length, saving the cycle data to localStorage and then reading it back should produce an object with the same start date string and cycle length value.

**Validates: Requirements 1.5, 1.6, 6.2**

---

### Property 4: Next Period Date Calculation

*For any* valid cycle start date and cycle length in [21, 45], the calculated Next_Period_Date should equal the start date advanced by exactly `cycleLength` days.

**Validates: Requirements 2.1, 2.6**

---

### Property 5: Ovulation Day Calculation

*For any* valid cycle start date and cycle length in [21, 45], the calculated Ovulation_Day should equal the start date advanced by exactly `cycleLength − 14` days.

**Validates: Requirements 2.3, 2.4**

---

### Property 6: Fertile Window Calculation

*For any* valid ovulation day, the calculated Fertile_Window should be exactly 6 consecutive days ending on (and including) the ovulation day, i.e., [ovulationDay − 5, ovulationDay].

**Validates: Requirements 2.2, 2.5**

---

### Property 7: Days Until Calculation

*For any* target date and today's date, `daysUntil(target, today)` should return the number of whole days from today to the target (positive when target is in the future, zero when equal, negative when past).

**Validates: Requirements 2.7**

---

### Property 8: Symptom Persistence Round-Trip

*For any* non-empty subset of the 6 valid symptom strings saved for a given date, reading the symptoms back from localStorage for that same date should return a set containing exactly the same symptom strings.

**Validates: Requirements 3.3, 3.4**

---

### Property 9: Calendar Day Count

*For any* month and year, the calendar grid should render exactly the correct number of day cells equal to the number of days in that month (e.g., 28, 29, 30, or 31).

**Validates: Requirements 4.1**

---

### Property 10: Day Classification Correctness

*For any* valid cycle data and any calendar date, the `classifyDay(date, cycleData)` function should return exactly one of `"period"`, `"fertile"`, `"ovulation"`, or `"none"`, and the classification should be consistent with the cycle arithmetic definitions: period days are [startDate, startDate+4], ovulation is startDate+(cycleLength−14), fertile window is [ovulationDay−5, ovulationDay], with ovulation taking precedence over fertile.

**Validates: Requirements 4.2, 4.3, 4.4, 4.7**

---

### Property 11: Period Approaching Reminder

*For any* valid cycle data where `daysUntil(nextPeriodDate, today)` is in [0, 7], the Dashboard should display a reminder message containing the exact number of days remaining; when `daysUntil` is outside [0, 7], this reminder should not be shown.

**Validates: Requirements 5.1**

---

### Property 12: Fertile Window Reminder

*For any* valid cycle data where today falls within the Fertile_Window, the Dashboard should display the fertile window reminder message; when today is outside the Fertile_Window, this reminder should not be shown.

**Validates: Requirements 5.2**

---

### Property 13: Ovulation Day Reminder

*For any* valid cycle data where today equals the Ovulation_Day, the Dashboard should display the ovulation reminder message; when today is not the Ovulation_Day, this reminder should not be shown.

**Validates: Requirements 5.3**

---

### Property 14: Clear Data Removes All App Keys

*For any* localStorage state containing any combination of `wht_cycle`, `wht_symptoms_*`, `wht_water_*`, and `theme` keys, after the user confirms the clear action, all keys with the `wht_` prefix should be absent from localStorage.

**Validates: Requirements 6.3**

---

### Property 15: Health Tip Card Structure

*For any* health tip card rendered on the Health Tips page, the card element should contain both a non-empty title element and a non-empty body text element.

**Validates: Requirements 7.3**

---

### Property 16: Water Tracker Persistence Round-Trip

*For any* combination of checked/unchecked states across the 8 water glasses saved for today's date, reading the water state back from localStorage for today should produce an array of 8 booleans matching the saved state exactly.

**Validates: Requirements 8.2, 8.3**

---

### Property 17: Water Count Display

*For any* water tracker state with N glasses checked (0 ≤ N ≤ 8), the displayed counter text should read "N / 8 glasses today".

**Validates: Requirements 8.4**

---

### Property 18: Water Tracker Daily Reset

*For any* water state stored under a date key that differs from today's date, initializing the water tracker should result in all 8 checkboxes being unchecked and the stored date being updated to today.

**Validates: Requirements 8.6**

---

### Property 19: Active Navigation Highlighting

*For any* of the 4 valid page hashes (`#home`, `#track`, `#calendar`, `#tips`), after the router processes that hash, exactly the corresponding navigation link should have the `.active` CSS class and all other nav links should not.

**Validates: Requirements 9.3**

---

### Property 20: Current Cycle Day Calculation

*For any* cycle start date and today's date where today ≥ startDate and today < nextPeriodDate, `calcCurrentCycleDay(startDate, cycleLength, today)` should return `(today − startDate) + 1` expressed in whole days.

**Validates: Requirements 11.1, 11.2, 11.3**

---

### Property 21: Cycle Day Overflow Handling

*For any* cycle data where today is on or after the Next_Period_Date, the displayed current cycle day should be within [1, cycleLength], calculated by advancing the start date by multiples of cycleLength until today falls within the resulting cycle.

**Validates: Requirements 11.4**

---

### Property 22: Progress Percentage Calculation

*For any* current cycle day and cycle length, `calcProgressPercent(currentDay, cycleLength)` should return `min((currentDay / cycleLength) × 100, 100)`, and the value should never exceed 100 nor be negative.

**Validates: Requirements 13.1, 13.2, 13.3**

---

### Property 23: Edit Form Pre-Population

*For any* valid cycle data stored in localStorage, opening the edit form should result in the start date field and cycle length field displaying values that exactly match the stored `startDate` and `cycleLength`.

**Validates: Requirements 12.2**

---

### Property 24: Edit Save Updates Storage and Predictions

*For any* valid updated cycle data submitted through the edit form, localStorage should contain the new values immediately after save, and all derived predictions (Next_Period_Date, Ovulation_Day, Fertile_Window, current cycle day, progress percent) should be recalculated using the new values.

**Validates: Requirements 12.4, 12.5**

---

### Property 25: Edit Cancel Preserves Storage

*For any* edit session where the user cancels without saving, the values in localStorage under `wht_cycle` should be identical to what they were before the edit form was opened.

**Validates: Requirements 12.8**

---

### Property 26: Theme Toggle Persistence

*For any* toggle action on the dark mode switch, the `theme` key in localStorage should immediately reflect the new state (`"dark"` or `"light"`), and the `data-theme` attribute on `<html>` should match.

**Validates: Requirements 15.3, 15.4**

---

## Error Handling

### Validation Errors

| Condition | Behavior |
|---|---|
| Cycle start date is in the future | Inline error below date field; form not submitted |
| Cycle length < 21 or > 45 | Inline error below length field; form not submitted |
| Cycle length is not a number | Inline error; form not submitted |
| localStorage unavailable (private browsing) | Graceful degradation: app works in-memory for the session; a banner warns the user that data will not persist |

### Data Integrity

- On every read from localStorage, the app validates the parsed JSON against expected shape. If the data is malformed or missing required fields, it is treated as absent and the no-data state is shown.
- Dates are always stored as ISO 8601 strings (`YYYY-MM-DD`) and parsed with explicit UTC handling to avoid timezone-shift bugs.
- All date arithmetic uses integer day offsets (milliseconds / 86400000, floored) to avoid DST edge cases.

### Edge Cases

- **Cycle day overflow**: When today is past the projected next period date, the engine advances the start date by `cycleLength` days repeatedly until today falls within the resulting cycle window.
- **Leap year February**: The calendar builder uses `new Date(year, month + 1, 0).getDate()` to get the correct day count, which handles leap years natively.
- **Water tracker date change**: On every Dashboard render, the stored water date is compared to today. If different, the tracker resets.
- **All 8 glasses checked**: The congratulatory message is shown; the checkboxes remain interactive (user can uncheck).

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:

- **Unit tests** cover specific examples, integration points, and edge cases
- **Property-based tests** verify universal correctness across randomized inputs

### Property-Based Testing

**Library**: [fast-check](https://github.com/dubzzz/fast-check) (JavaScript, MIT license, no build step required via CDN or npm)

Each property-based test must run a minimum of **100 iterations**.

Each test must include a comment tag in the format:
```
// Feature: women-health-tracker, Property N: <property_text>
```

Each correctness property defined above must be implemented by exactly one property-based test.

**Example test structure:**

```js
// Feature: women-health-tracker, Property 4: Next Period Date Calculation
fc.assert(
  fc.property(
    fc.record({
      startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
      cycleLength: fc.integer({ min: 21, max: 45 }),
    }),
    ({ startDate, cycleLength }) => {
      const result = calcNextPeriod(startDate, cycleLength);
      const expected = new Date(startDate);
      expected.setDate(expected.getDate() + cycleLength);
      return result.toDateString() === expected.toDateString();
    }
  ),
  { numRuns: 100 }
);
```

### Unit Tests

Unit tests should cover:

- Specific examples for each calculation function with known inputs/outputs
- Edge cases: cycle length exactly 21, exactly 45; today = start date (day 1); today = last day of cycle
- localStorage unavailability (mock `localStorage` to throw)
- Calendar rendering for February in a leap year vs. non-leap year
- Water tracker reset when stored date is yesterday
- Symptom save/load with empty array
- Edit cancel restoring previous values
- No-data state rendering (all prompts visible, no predictions shown)
- Dark mode toggle applying `data-theme` attribute immediately

### Test File Structure

```
women-health-tracker/
├── index.html
├── style.css
├── app.js
└── tests/
    ├── cycle-engine.test.js   # Property + unit tests for CycleEngine functions
    ├── storage.test.js        # Round-trip tests for Storage helpers
    ├── water-tracker.test.js  # Property + unit tests for WaterTracker
    ├── calendar.test.js       # Property + unit tests for CalendarBuilder
    ├── renderer.test.js       # Unit tests for Renderer DOM updates
    └── theme.test.js          # Unit + property tests for ThemeManager
```

Tests can be run with any test runner that supports ES modules (e.g., Vitest with `--run` flag):

```bash
npx vitest --run
```
