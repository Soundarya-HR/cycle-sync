# Women Health Tracker — A Frontend-Only Web App Built with HTML, CSS & Vanilla JavaScript

Tracking your menstrual cycle shouldn't require signing up for an account or handing your personal health data to a third-party server. I built this app with one goal: **a fully working cycle tracker that runs entirely in the browser, with zero backend and zero external dependencies.**

In this post I'll walk through what the app does, how it's built, the key technical decisions, and how to deploy it on AWS S3 as a static website.

---

## What the App Does

The Women Health Tracker is a single-page web application with four pages:

- **Home Dashboard** — today's cycle status, progress bar, smart reminders, and daily water tracker
- **Track Cycle** — enter your last period start date, cycle length, and symptoms
- **Calendar** — monthly view with color-coded period, fertile, and ovulation days
- **Health Tips** — 8 evidence-based wellness cards

### Key Features

| Feature | Details |
|---|---|
| Cycle predictions | Next period date, fertile window, ovulation day |
| Today status | "You are on Day X of your cycle" + "Next period in X days" |
| Cycle progress bar | Visual indicator of current cycle progress |
| Smart reminders | Banners for approaching period, fertile window, ovulation day |
| Symptom logging | Cramps, headache, mood swings, bloating, fatigue, backache |
| Water tracker | 8 glasses/day with daily auto-reset |
| Edit cycle data | Update data anytime via a modal form |
| Dark mode | Toggle with saved preference, no flash on load |
| Data privacy | All data stored locally in the browser — never sent anywhere |

---

## Tech Stack

No frameworks. No build tools. No npm install.

```
HTML5      — app structure and semantic markup
CSS3       — custom properties, flexbox, grid, responsive design
JavaScript — vanilla ES6+, zero external libraries
localStorage — all data persistence
```

The entire app is three files:

```
index.html   — shell with nav, 4 page sections, edit modal, footer
style.css    — theming, layout, components, dark mode, responsive rules
app.js       — all application logic
```

---

## Architecture

The app uses **hash-based routing** for SPA navigation — no page reloads, no framework needed.

```
#home      → Home Dashboard
#track     → Track Cycle form
#calendar  → Calendar view
#tips      → Health Tips
```

`app.js` is organized into named module sections:

```js
Storage        // localStorage read/write with in-memory fallback
CycleEngine    // pure calculation functions
Renderer       // DOM update functions per page
Router         // hash-based navigation
WaterTracker   // daily water intake with auto-reset
SymptomLogger  // symptom save/load per date
CalendarBuilder // monthly grid + day classification
ThemeManager   // dark/light mode toggle
EventHandlers  // all event listener wiring
```

---

## The Cycle Math

All predictions are derived from two inputs: **last period start date** and **average cycle length**.

```js
// Ovulation day
ovulationDay = startDate + (cycleLength - 14) days

// Fertile window — 6 days ending on ovulation day
fertileWindow.start = ovulationDay - 5 days
fertileWindow.end   = ovulationDay

// Next period
nextPeriod = startDate + cycleLength days

// Current cycle day
currentDay = (today - startDate) + 1
// If today is past next period, advance startDate by cycleLength until today falls within range
```

All date arithmetic uses integer day offsets to avoid daylight saving time bugs:

```js
const toDay = (d) => Math.floor(d.getTime() / 86400000);
```

---

## Dark Mode Without Flash

The theme is applied **before the first paint** using an inline script at the very top of `<head>` — before any CSS loads:

```html
<script>
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
</script>
```

The entire color palette switches via CSS custom properties:

```css
:root {
  --color-bg: #fff5f7;
  --color-primary: #e91e8c;
  --color-surface: #ffffff;
}

[data-theme="dark"] {
  --color-bg: #1a0d12;
  --color-primary: #f06292;
  --color-surface: #2d1520;
}
```

No JavaScript class toggling on every element — one attribute change on `<html>` does everything.

---

## Data Storage

All data lives in `localStorage` under these keys:

| Key | Value |
|---|---|
| `wht_cycle` | `{ "startDate": "2025-06-01", "cycleLength": 28 }` |
| `wht_symptoms_YYYY-MM-DD` | `["cramps", "fatigue"]` |
| `wht_water_YYYY-MM-DD` | `{ "date": "2025-06-01", "checked": [true, false, ...] }` |
| `theme` | `"light"` or `"dark"` |

Every read validates the parsed JSON shape and returns `null` for malformed data. All writes are wrapped in `try/catch` with an in-memory `Map` fallback for private browsing mode.

---

## Calendar Color Coding

The `classifyDay(date, cycleData)` function returns one of four values:

| Class | Color | Meaning |
|---|---|---|
| `period` | Pink | First 5 days of cycle |
| `fertile` | Green | 5 days before ovulation + ovulation day |
| `ovulation` | Purple | Ovulation day (takes precedence over fertile) |
| `today` | Outlined | Current date |

---

## Deploying on AWS S3

Since this is a fully static app (no server required), **Amazon S3 static website hosting** is a perfect fit — cheap, reliable, and globally accessible.

### Step 1 — Create an S3 Bucket

1. Go to the [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click **Create bucket**
3. Give it a unique name (e.g. `women-health-tracker-app`)
4. Choose your preferred region
5. **Uncheck** "Block all public access" (required for static hosting)
6. Click **Create bucket**

### Step 2 — Enable Static Website Hosting

1. Open your bucket → **Properties** tab
2. Scroll to **Static website hosting** → click **Edit**
3. Select **Enable**
4. Set **Index document** to `index.html`
5. Click **Save changes**

### Step 3 — Upload the App Files

Upload these three files to the bucket root:

```
index.html
style.css
app.js
```

### Step 4 — Make Files Public

1. Go to the **Permissions** tab
2. Under **Bucket policy**, add this policy (replace `YOUR-BUCKET-NAME`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

### Step 5 — Access Your App

Go back to **Properties → Static website hosting** and copy the **Bucket website endpoint** URL. Open it in a browser — your app is live.

---

## Adding CloudFront (Optional but Recommended)

For HTTPS support, faster global delivery, and a custom domain, add **Amazon CloudFront** in front of your S3 bucket:

1. Go to [CloudFront Console](https://console.aws.amazon.com/cloudfront/) → **Create distribution**
2. Set **Origin domain** to your S3 bucket website endpoint
3. Set **Default root object** to `index.html`
4. Deploy — CloudFront gives you an `*.cloudfront.net` HTTPS URL

Benefits:
- HTTPS out of the box
- Global CDN edge caching
- Custom domain support
- Zero server management

---

## Running Locally

No installation needed.

```bash
# Option 1 — open directly
open index.html

# Option 2 — local server
npx serve .
# then visit http://localhost:3000
```

---

## What I Learned

**Hash routing is underrated.** For small SPAs, `window.location.hash` + section toggling is simpler and more reliable than any client-side router library.

**CSS custom properties make theming trivial.** One `data-theme` attribute on `<html>` switches the entire color palette — no JavaScript needed per element.

**DST-safe date math matters.** Using `Math.floor(ms / 86400000)` instead of `Date` subtraction avoids off-by-one errors around daylight saving transitions.

**localStorage is enough** for personal data that doesn't need cross-device sync. With proper validation and a fallback Map, it's robust enough for a real app.

**Static apps + S3 = perfect pairing.** No server to manage, no runtime to maintain, and costs pennies per month for a personal project.

---

## Privacy

All user data is stored in the browser's `localStorage`. Nothing is transmitted to any server. Clearing browser data removes all app data.

---

## Source

The full source code is three files — `index.html`, `style.css`, and `app.js`. No build step, no dependencies, no configuration.

---

*Built with HTML, CSS, and vanilla JavaScript. Deployed on AWS S3.*
