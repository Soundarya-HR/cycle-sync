# Requirements Document

## Introduction

The Women Health Tracker is a fully client-side web application that helps users track their menstrual cycle, predict fertile windows and ovulation, log symptoms, and access health tips. The app uses browser local storage for persistence, requires no backend or paid APIs, and is built with plain HTML, CSS, and JavaScript. It is fully responsive and features a soft pink/pastel theme across four pages: Home Dashboard, Track Cycle, Calendar, and Health Tips.

## Glossary

- **App**: The Women Health Tracker web application
- **User**: The person using the App in a browser
- **Cycle**: A single menstrual cycle, defined by a start date and an average length in days
- **Period_Days**: The days during which menstruation occurs (assumed to be the first 5 days of a cycle)
- **Fertile_Window**: The 6-day window ending on the Ovulation_Day (days 10–15 of a 28-day cycle, scaled proportionally)
- **Ovulation_Day**: The estimated day of ovulation, calculated as cycle start date + (average cycle length − 14)
- **Next_Period_Date**: The estimated start date of the next cycle, calculated as cycle start date + average cycle length
- **Symptom**: A health indicator selected by the User (cramps, headache, mood swings, bloating, fatigue, backache)
- **Local_Storage**: The browser's built-in key-value persistence mechanism
- **Dashboard**: The Home page showing a summary of cycle status and reminders
- **Calendar**: A monthly calendar view highlighting Period_Days, Fertile_Window, and Ovulation_Day
- **Health_Tips**: Static informational content about women's health
- **Water_Tracker**: A daily checkbox system for tracking water intake (8 glasses per day)
- **Reminder**: An on-screen notification message shown to the User
- **Current_Cycle_Day**: The number of days elapsed since the last cycle start date, inclusive (day 1 = start date)
- **Cycle_Progress_Bar**: A horizontal UI element whose filled portion represents the ratio of Current_Cycle_Day to average cycle length
- **Edit_Form**: The form presented to the User when editing previously saved cycle data
- **Privacy_Notice**: The static text informing the User that all data is stored locally and not shared
- **Dark_Mode**: An alternative color scheme using dark backgrounds and light text, toggled by the User
- **Theme_Preference**: The User's saved choice of light or dark mode, persisted in Local_Storage

---

## Requirements

### Requirement 1: Cycle Data Entry

**User Story:** As a user, I want to enter my last menstrual cycle start date and average cycle length, so that the app can calculate my next period, fertile window, and ovulation day.

#### Acceptance Criteria

1. THE App SHALL provide an input field for the User to enter the last menstrual cycle start date in a date picker format.
2. THE App SHALL provide an input field for the User to enter the average cycle length in days, with a default value of 28.
3. WHEN the User submits cycle data, THE App SHALL validate that the start date is not a future date.
4. IF the User enters an average cycle length outside the range of 21 to 45 days, THEN THE App SHALL display an inline validation error message.
5. WHEN the User submits valid cycle data, THE App SHALL save the data to Local_Storage immediately.
6. WHEN the App loads and Local_Storage contains previously saved cycle data, THE App SHALL pre-populate all cycle input fields with the stored values.

---

### Requirement 2: Cycle Predictions

**User Story:** As a user, I want to see my next period date, fertile window, and ovulation day, so that I can plan accordingly.

#### Acceptance Criteria

1. WHEN valid cycle data is available, THE App SHALL calculate and display the Next_Period_Date.
2. WHEN valid cycle data is available, THE App SHALL calculate and display the Fertile_Window as a date range.
3. WHEN valid cycle data is available, THE App SHALL calculate and display the Ovulation_Day as a specific date.
4. THE App SHALL calculate Ovulation_Day as: last cycle start date + (average cycle length − 14).
5. THE App SHALL calculate Fertile_Window as: the 5 days before Ovulation_Day through Ovulation_Day (inclusive, 6 days total).
6. THE App SHALL calculate Next_Period_Date as: last cycle start date + average cycle length.
7. WHEN valid cycle data is available, THE App SHALL display the number of days remaining until the Next_Period_Date on the Dashboard.

---

### Requirement 3: Symptom Logging

**User Story:** As a user, I want to log symptoms for today, so that I can track how I feel throughout my cycle.

#### Acceptance Criteria

1. THE App SHALL provide a symptom selection interface with the following options: cramps, headache, mood swings, bloating, fatigue, backache.
2. THE App SHALL allow the User to select multiple symptoms simultaneously.
3. WHEN the User saves symptoms, THE App SHALL store the selected symptoms associated with the current date in Local_Storage.
4. WHEN the App loads and Local_Storage contains symptoms for the current date, THE App SHALL pre-select those symptoms in the interface.
5. WHEN the User saves symptoms, THE App SHALL display a confirmation message indicating the symptoms were saved successfully.

---

### Requirement 4: Calendar View

**User Story:** As a user, I want to see a calendar that highlights my period days, fertile window, and ovulation day, so that I can visually understand my cycle at a glance.

#### Acceptance Criteria

1. THE App SHALL display a monthly calendar view showing all days of the current month.
2. WHEN valid cycle data is available, THE App SHALL highlight Period_Days on the calendar with a distinct pink color.
3. WHEN valid cycle data is available, THE App SHALL highlight Fertile_Window days on the calendar with a distinct green color.
4. WHEN valid cycle data is available, THE App SHALL highlight the Ovulation_Day on the calendar with a distinct purple color.
5. THE App SHALL provide navigation controls allowing the User to move to the previous and next months.
6. THE App SHALL display a color legend on the Calendar page identifying the meaning of each highlight color.
7. WHEN a highlighted day is displayed, THE App SHALL show a tooltip or label indicating the day type (period, fertile, ovulation) on hover or tap.

---

### Requirement 5: On-Screen Reminders

**User Story:** As a user, I want to see reminder messages about my upcoming cycle, so that I am informed without needing to check manually.

#### Acceptance Criteria

1. WHEN valid cycle data is available and the Next_Period_Date is within 7 days, THE App SHALL display a reminder message on the Dashboard stating "Your next cycle is expected in X days", where X is the exact number of days remaining.
2. WHEN valid cycle data is available and today falls within the Fertile_Window, THE App SHALL display a reminder message on the Dashboard stating "You are currently in your fertile window."
3. WHEN valid cycle data is available and today is the Ovulation_Day, THE App SHALL display a reminder message on the Dashboard stating "Today is your estimated ovulation day."
4. WHEN no valid cycle data is stored, THE App SHALL display a prompt on the Dashboard directing the User to enter cycle data.

---

### Requirement 6: Data Persistence

**User Story:** As a user, I want my data to be saved automatically, so that I do not lose my information after refreshing or closing the browser.

#### Acceptance Criteria

1. THE App SHALL store all cycle data, symptom logs, and water tracker state in Local_Storage using a defined key schema.
2. WHEN the browser page is refreshed, THE App SHALL restore all previously saved data from Local_Storage without requiring the User to re-enter information.
3. THE App SHALL provide a "Clear Data" option that removes all App data from Local_Storage after the User confirms the action.
4. WHEN the User confirms clearing data, THE App SHALL reset all displayed fields and predictions to their default empty state.

---

### Requirement 7: Health Tips

**User Story:** As a user, I want to read health tips related to women's wellness, so that I can make informed decisions about my health.

#### Acceptance Criteria

1. THE App SHALL display a Health Tips page containing at least 8 static health tip entries.
2. THE Health_Tips content SHALL cover topics including: nutrition during menstruation, exercise recommendations, stress management, hydration, sleep hygiene, and cycle tracking benefits.
3. THE App SHALL display each health tip as a card with a title and descriptive body text.
4. THE App SHALL display the Health Tips page without requiring any network requests or external API calls.

---

### Requirement 8: Daily Water Tracker

**User Story:** As a user, I want to track how many glasses of water I drink each day, so that I can maintain healthy hydration habits.

#### Acceptance Criteria

1. THE App SHALL display a Water_Tracker on the Dashboard with 8 checkboxes, each representing one glass of water.
2. WHEN the User checks a water glass checkbox, THE App SHALL save the updated water intake count for the current date to Local_Storage immediately.
3. WHEN the App loads, THE App SHALL restore the water intake checkboxes for the current date from Local_Storage.
4. THE App SHALL display the current count of checked glasses out of 8 (e.g., "5 / 8 glasses today").
5. WHEN all 8 glasses are checked, THE App SHALL display a congratulatory message to the User.
6. THE App SHALL reset the Water_Tracker checkboxes to unchecked at the start of each new calendar day.

---

### Requirement 9: Multi-Page Navigation

**User Story:** As a user, I want to navigate between the Home Dashboard, Track Cycle, Calendar, and Health Tips pages, so that I can access all features easily.

#### Acceptance Criteria

1. THE App SHALL provide a navigation menu with links to: Home Dashboard, Track Cycle, Calendar, and Health Tips.
2. THE App SHALL implement page navigation without full browser page reloads (single-page application behavior using hash routing or section toggling).
3. THE App SHALL highlight the currently active navigation item to indicate the User's current location.
4. THE App SHALL display the navigation menu in a responsive layout that adapts to both mobile and desktop screen sizes.
5. WHEN the App is viewed on a screen narrower than 768px, THE App SHALL display the navigation as a collapsible or bottom-tab menu.

---

### Requirement 10: Responsive Design and Theming

**User Story:** As a user, I want the app to look clean and work well on my phone and desktop, so that I can use it anywhere.

#### Acceptance Criteria

1. THE App SHALL apply a consistent soft pink and pastel color theme across all pages.
2. THE App SHALL use a responsive CSS layout (flexbox or CSS grid) so that all pages render correctly on screen widths from 320px to 1920px.
3. THE App SHALL use only HTML, CSS, and vanilla JavaScript with no external runtime dependencies or paid APIs.
4. THE App SHALL load fully from a single directory of static files without requiring a server-side runtime.
5. THE App SHALL achieve a Lighthouse mobile usability score indicating no mobile-unfriendly elements (touch targets sized at least 44×44px, no horizontal scroll).

---

### Requirement 11: Today Status Display

**User Story:** As a user, I want to see what day of my cycle I am on and how many days until my next period, so that I have an at-a-glance summary of my current cycle status.

#### Acceptance Criteria

1. WHEN valid cycle data is available, THE Dashboard SHALL display a message in the format "You are on Day X of your cycle", where X is the number of days elapsed since the last cycle start date (inclusive).
2. WHEN valid cycle data is available, THE Dashboard SHALL display a message in the format "Next period in X days", where X is the number of days remaining until the Next_Period_Date.
3. THE App SHALL calculate the current cycle day as: (today's date − last cycle start date) + 1, expressed in whole days.
4. WHEN the current cycle day exceeds the average cycle length, THE App SHALL recalculate using the most recent projected cycle start date to keep the displayed day within the current cycle.
5. WHEN no valid cycle data is stored, THE Dashboard SHALL display a prompt directing the User to enter cycle data instead of the status messages.

---

### Requirement 12: Edit and Update Cycle Data

**User Story:** As a user, I want to edit my previously entered cycle data, so that I can correct mistakes or update my information as my cycle changes.

#### Acceptance Criteria

1. THE App SHALL display an "Edit Data" button on the Dashboard and the Track Cycle page.
2. WHEN the User activates the "Edit Data" button, THE App SHALL present an editable form pre-populated with the currently stored last cycle start date, average cycle length, and symptoms.
3. THE App SHALL allow the User to modify the last cycle start date, average cycle length, and logged symptoms within the edit form.
4. WHEN the User submits the edit form with valid data, THE App SHALL overwrite the existing values in Local_Storage with the updated values immediately.
5. WHEN the User submits the edit form with valid data, THE App SHALL recalculate and refresh all cycle predictions (Next_Period_Date, Fertile_Window, Ovulation_Day) displayed on the Dashboard and Calendar.
6. IF the User enters an average cycle length outside the range of 21 to 45 days in the edit form, THEN THE App SHALL display an inline validation error and prevent saving.
7. IF the User enters a future date as the last cycle start date in the edit form, THEN THE App SHALL display an inline validation error and prevent saving.
8. WHEN the User cancels the edit form without saving, THE App SHALL discard all changes and restore the previously stored values.

---

### Requirement 13: Cycle Progress Indicator

**User Story:** As a user, I want to see a visual progress indicator for my current cycle, so that I can quickly understand how far through my cycle I am.

#### Acceptance Criteria

1. WHEN valid cycle data is available, THE Dashboard SHALL display a cycle progress label in the format "Cycle Progress: Day X / Y", where X is the current cycle day and Y is the average cycle length.
2. WHEN valid cycle data is available, THE Dashboard SHALL display a horizontal progress bar whose filled portion represents the ratio of the current cycle day to the average cycle length.
3. THE App SHALL calculate the progress bar fill percentage as: (current cycle day / average cycle length) × 100, capped at 100%.
4. THE App SHALL update the cycle progress label and progress bar each time the Dashboard is loaded or the cycle data is edited.
5. WHEN no valid cycle data is stored, THE Dashboard SHALL not display the cycle progress label or progress bar.

---

### Requirement 14: Privacy Notice

**User Story:** As a user, I want to see a clear notice that my data stays on my device, so that I can trust the app with my personal health information.

#### Acceptance Criteria

1. THE App SHALL display the text "Your data is stored locally on your device and is not shared." in a consistently visible location on the Dashboard or in the page footer across all pages.
2. THE App SHALL style the privacy notice in a subdued but legible manner, using a font size of at least 12px and a contrast ratio that meets WCAG AA requirements against its background.
3. THE App SHALL render the privacy notice without requiring any network requests or external resources.

---

### Requirement 15: Dark Mode

**User Story:** As a user, I want to switch between light and dark mode, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. WHERE the User enables dark mode, THE App SHALL apply a dark color scheme across all pages, replacing the default pastel pink theme with dark background colors and appropriately contrasting text and accent colors.
2. THE App SHALL provide a toggle switch control that allows the User to switch between light mode (pastel pink theme) and dark mode.
3. WHEN the User toggles the dark mode switch, THE App SHALL apply the selected theme immediately without a page reload.
4. WHEN the User toggles the theme preference, THE App SHALL save the selected mode (light or dark) to Local_Storage.
5. WHEN the App loads, THE App SHALL read the saved theme preference from Local_Storage and apply it before rendering any visible content, preventing a flash of the wrong theme.
6. WHERE dark mode is active, THE App SHALL ensure all text elements maintain a contrast ratio meeting WCAG AA requirements against their backgrounds.
7. WHERE dark mode is active, THE App SHALL preserve full functionality of all existing features including cycle predictions, calendar highlights, symptom logging, water tracker, and cycle progress indicator.
