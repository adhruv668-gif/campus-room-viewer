# Viva Preparation & Code Defense Guide
> **Course:** LPU CSE326 Web Development (CA1 Assessment)  
> **Team SOUL:** Angel Seth (12611041), Kartik (12612598), Dhruv Anand (12619773)

---

## 1. Line-by-Line Code Walkthroughs

### 1.1 Angel Seth: `UI.applyTheme(theme)` (`js/ui.js`)
```javascript
applyTheme: function(theme) {
  const root = document.documentElement;
  const themeIcon = document.getElementById('theme-icon');

  if (theme === 'system') {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    if (themeIcon) themeIcon.innerHTML = '&#9681;';
  } else {
    root.setAttribute('data-theme', theme);
    if (themeIcon) themeIcon.innerHTML = theme === 'dark' ? '&#9789;' : '&#9788;';
  }
}
```
- **How it works:** Targets the `<html>` root element and sets the `data-theme` attribute to `"dark"` or `"light"`.
- **CSS connection:** `css/base.css` maps tokens under `[data-theme="dark"]`. Changing the attribute recalculates custom properties across the DOM instantly without a page reload.

### 1.2 Angel Seth: `UI.showModal(title, bodyHtml, onConfirm, confirmText, isDanger)` (`js/ui.js`)
- Uses the native HTML5 `<dialog>` element.
- `modal.showModal()` triggers the browser dialog API, creating a top-layer backdrop, trapping keyboard focus, and enabling dismiss via the `Escape` key.

### 1.3 Kartik: `Availability.getSlotStatus(roomId, dateStr, slotNumber)` (`js/availability.js`)
```javascript
getSlotStatus: function(roomId, dateStr, slotNumber) {
  // 1. Maintenance check
  if (room.status === Config.ROOM_STATUS.MAINTENANCE) return { status: 'Maintenance', ... };
  // 2. Timetable check
  const classEntry = timetable.find(t => t.roomId === roomId && t.weekday === weekday && t.slot === slotNumber);
  if (classEntry) return { status: 'Class', details: classEntry, ... };
  // 3. Approved booking check
  const approved = bookings.find(b => b.roomId === roomId && b.date === dateStr && b.status === 'Approved' && slotNumber >= b.startSlot && slotNumber <= b.endSlot);
  if (approved) return { status: 'Booked', details: approved, ... };
  // 4. Pending request check
  const pendingList = bookings.filter(b => b.roomId === roomId && b.date === dateStr && b.status === 'Pending' && slotNumber >= b.startSlot && slotNumber <= b.endSlot);
  if (pendingList.length > 0) return { status: 'Requested', count: pendingList.length, ... };
  // 5. Free
  return { status: 'Free', details: null, ... };
}
```
- **Precedence sequence:** Maintenance &rarr; Class &rarr; Booked &rarr; Requested &rarr; Free.

### 1.4 Kartik: `Availability.findConflicts(...)` (`js/availability.js`)
- **Range overlap formula:** $(s1 \le e2) \land (s2 \le e1)$.
- Catches maintenance windows, scheduled recurring lectures, and existing approved bookings for the requested slot range.

### 1.5 Dhruv Anand: `Store.init()` (`js/store.js`)
- Performs a feature-detection probe on `localStorage`. If third-party storage is blocked by browser privacy settings, it falls back to an internal memory dictionary so the application never crashes.
- Validates `CAMPUS_ROOMS_SCHEMA_VERSION`. If outdated, resets and loads fresh seed data.

### 1.6 Dhruv Anand: `App.navigate(routeHash)` (`js/app.js`)
- Handles client-side hash routing (`window.addEventListener('hashchange')`).
- Enforces the admin route guard on `#/admin`.
- Shifts keyboard focus to the active section's `<h1>` element for accessibility.

---

## 2. Key Viva Questions & Answers

1. **Why hash routing (`#/availability`) instead of HTML5 pushState path routing (`/availability`)?**  
   Hash routing runs entirely on the client side. On static file hosting (GitHub Pages, Vercel, or `file://`), refreshing a path URL sends an HTTP GET request for a sub-path that does not exist on disk, resulting in a 404 error. Hash routes (`window.location.hash`) keep the browser on `index.html` and let the JavaScript router (`App.navigate`) render the requested view.

2. **Why avoid `new Date().toISOString().slice(0, 10)` for campus calendar dates?**  
   `toISOString()` always returns Universal Coordinated Time (UTC). In Indian Standard Time (UTC+05:30), between midnight (00:00) and 05:30 AM, UTC is still on the previous calendar day. Using local date components (`getFullYear()`, `getMonth() + 1`, `getDate()`) via `Utils.getLocalDateString()` guarantees the exact local campus date.

3. **How does the range overlap formula $(s1 \le e2) \land (s2 \le e1)$ work mathematically?**  
   Two discrete intervals $[s1, e1]$ and $[s2, e2]$ overlap if and only if interval 1 starts before or when interval 2 ends ($s1 \le e2$), and interval 2 starts before or when interval 1 ends ($s2 \le e1$). This compact boolean condition correctly catches identical intervals, partial overlaps, and nested intervals without nested conditionals.

4. **What is the difference between a Hard Conflict and a Soft Conflict?**  
   A **Hard Conflict** occurs when a requested slot collides with a scheduled timetable lecture, an approved reservation, or a room under maintenance. Hard conflicts strictly block form submission. A **Soft Conflict** occurs when one or more pending booking requests exist for the same slot; the user receives an advisory notice, and the request is permitted to enter administrative review.

5. **What happens during an administrative approval cascade?**  
   In `Bookings.approveBooking()`, once a booking is selected for approval, the system prepares an atomic batch commit: it clones the `BOOKINGS` collection in memory, marks the target booking as `Approved`, and queries all other pending requests for the same room and date whose slots overlap $(s1 \le e2) \land (s2 \le e1)$. All competing requests are updated to `Rejected` with an audit remark citing the approved reference ID. Finally, the entire updated collection is committed in a single `Store.set('BOOKINGS', clonedBookings)` call. If storage persistence fails, no partial mutations persist, and an accurate failure status is returned.

6. **Why are bookings from earlier today excluded from the active upcoming quota?**  
   In `Bookings.createBooking()`, the quota counter filters active bookings for a user. If a booking was scheduled for today but its ending slot has already passed (`nowMinutes >= slotEndMinutes`), it has finished its operational lifecycle. Counting ended slots against a student's 3-request quota would unfairly block them from booking upcoming slots later in the week.

7. **How does `Rooms.toggleMaintenance()` handle bookings from earlier today?**  
   When toggling a room into maintenance mode, the system auto-cancels future bookings. However, for bookings scheduled earlier today whose slot end time has already elapsed (`nowMinutes >= slotEndMinutes`), the cancellation is skipped. This preserves historical records and prevents retroactively cancelling completed campus sessions.

8. **What happens when `localStorage.setItem()` throws a `QuotaExceededError` or is disabled in private browsing?**  
   In `Store.set()`, writes are wrapped in a `try...catch` block. If `setItem` throws, the system flags `Store._isStorageAvailable = false`, keeps the data updated in its internal in-memory cache (`Store._memoryCache`), and returns `false`. The UI surfaces a persistent warning banner indicating session-only memory operation so the user understands changes will not persist across browser reloads.

9. **Why does `Store.get()` check `Store._isStorageAvailable` before reading from `localStorage`?**  
   If a storage write has previously failed or storage is blocked, `Store._memoryCache` holds the most up-to-date state. If `Store.get()` blindly read from `localStorage`, it would either throw or return stale data, clobbering recent in-memory changes.

10. **How does the application prevent Cross-Site Scripting (XSS) in confirmation dialogs?**  
    In `Utils.escapeHTML()`, special HTML characters (`&`, `<`, `>`, `"`, `'`) are converted to their respective HTML entities. All user-controlled fields—such as room numbers, building names, booking references, and requester names—are sanitized before insertion into template literals or `UI.showModal()` HTML strings.

11. **How does the CSV export guarantee proper display in Microsoft Excel?**  
    In `Utils.exportCSV()`, the CSV text is prefixed with a UTF-8 Byte Order Mark (`\uFEFF`). Without this preamble, Microsoft Excel on Windows frequently misinterprets UTF-8 files containing special characters or accented names as ASCII/ANSI.

12. **What validation regexes distinguish student and faculty IDs?**  
    Students are validated against `/^\d{8}$/` (strictly 8 numeric digits, e.g. `12611041`). Faculty members are validated against `/^[A-Za-z0-9]{4,10}$/` (4 to 10 alphanumeric characters, e.g. `FAC1001`). Hyphens and special symbols are disallowed.

13. **Why does `Validators.validateDate()` reject Sunday bookings?**  
    `Utils.getWeekday(dateStr) === 0` identifies Sundays. Lovely Professional University academic facilities are closed on Sundays, so requests for Sunday are rejected immediately at the client validation layer.

14. **What are the consecutive slot caps and why do they differ by role?**  
    Students are limited to 2 consecutive slots (2 hours) per booking to ensure fair sharing of study rooms. Faculty members are permitted up to 4 consecutive slots (4 hours) to accommodate longer lab sessions, workshops, or academic examinations.

15. **What is the active upcoming request quota limit per user?**  
    Students can have at most 3 active upcoming requests (pending or approved) simultaneously. Faculty members can have up to 6. This prevents a single user from monopolizing campus facilities.

16. **What is the exact slot precedence hierarchy in `Availability.getSlotStatus()`?**  
    The status of any slot is evaluated in strict order:  
    1. **Maintenance** (room-level flag takes precedence over everything)  
    2. **Class** (recurring weekly academic timetable)  
    3. **Booked** (approved reservation)  
    4. **Requested** (one or more pending booking requests)  
    5. **Free** (no conflicts detected)

17. **Why does the application use native HTML5 `<dialog>` rather than custom `<div>` overlays?**  
    Native `<dialog>` elements invoked via `.showModal()` provide built-in accessibility benefits: automatic top-layer placement, native backdrop styling, automatic keyboard focus trapping within the dialog, and default `Escape` key dismissal.

18. **How does dark and light theme switching work without reloading the page?**  
    `UI.applyTheme()` sets the `data-theme` attribute on the root `<html>` element (`<html data-theme="dark">`). In `css/base.css`, all colors are defined as CSS custom properties (`--bg-primary`, `--text-primary`, `--border-color`). Changing the root attribute instantly updates all rendered components without DOM rebuilding.

19. **How does `Store.init()` handle schema version migrations?**  
    `Config.STORAGE_KEYS.SCHEMA_VERSION` stores `'campus_rooms_schema_version'`, and `Config.SCHEMA_VERSION` is defined as `'1.0'`. When the app boots, `Store.init()` reads the stored schema version. If missing or mismatched with `Config.SCHEMA_VERSION`, it clears outdated application keys and loads the fresh seed dataset, ensuring data integrity across updates.

20. **Why does the application use global event delegation instead of attaching listeners to every button?**  
    Dynamic views (e.g. timetable grids, room lists) frequently re-render when filters change. Attaching individual event listeners to hundreds of grid cells creates memory leaks and requires tedious re-binding. Event delegation listens on a common parent container and inspects `event.target.closest('[data-action]')`.

21. **What is the purpose of `Utils.debounce()` in the timetable search input?**  
    Typing triggers the `input` event on every keystroke. Debouncing delays the execution of the filter logic by 250 milliseconds until the user stops typing, eliminating UI lag and unnecessary DOM recalculations.

22. **How are real-time dashboard KPIs calculated in `Dashboard.getMetrics()`?**  
    `Dashboard.getMetrics()` evaluates the campus state against the active client-side clock (or simulated time offset). It iterates over all active rooms, evaluates their occupancy for today's current slot (determined by time bounds), counts free rooms, maintenance rooms, and computes the occupancy percentage: $(\text{Occupied} / \text{Total Active}) \times 100$. This is calculated purely in the browser from local sample data rather than live hardware IoT sensors.

23. **How are the dashboard occupancy charts generated without third-party chart libraries?**  
    Charts are built using pure CSS. Building occupancy and slot utilization bars use CSS Flexbox with inline style percentage widths (`width: ${pct}%`). The overall status distribution donut chart uses a pure CSS `conic-gradient()` background with an inner circle cutout.

24. **How does `Rooms.addRoom()` prevent duplicate room numbers within the same building?**  
    Before inserting a new room, `Rooms.addRoom()` queries existing rooms and checks `r.buildingId === roomData.buildingId && r.roomNo.toUpperCase() === trimmedNo`. If a match is found, the submission is rejected with an error message.

25. **How does `Rooms.deleteBuilding()` prevent orphaned room records?**  
    `Rooms.deleteBuilding()` queries the rooms list to check if any rooms reference the target `buildingId`. If matching rooms exist, deletion is blocked, requiring the administrator to delete or reassign all rooms in that block first.

26. **How does the simulated clock in settings work?**  
    `Utils.getNow()` inspects `localStorage` under `Config.STORAGE_KEYS.SETTINGS` for a `simulatedNow` property (format `YYYY-MM-DDTHH:MM`). If set, `Utils.getNow()` returns a `Date` object corresponding to that timestamp. All availability checks, past-slot validations, and timetable views instantly evaluate against this simulated time. The simulation can be reset to real system time at any time via the top banner button or the settings panel.

27. **Why does `Validators.validateRejectRemark()` enforce a minimum length of 5 characters?**  
    When an admin rejects a booking, the applicant receives the rejection remark. Enforcing a 5-to-200 character requirement prevents administrators from submitting blank or single-character dismissal notes (e.g. "." or "x") without a valid reason.

28. **What happens if a user attempts to book a slot that has already ended earlier today?**  
    In `Validators.validateSlots()`, if `dateStr === todayStr`, the function looks up the slot's closing time (`endHour * 60 + endMin`). If the current time in minutes exceeds the slot's end time, validation fails with an explicit error: `"Slot X has already ended today. Select a future slot."`

29. **How are booking reference codes generated and structured?**  
    In `Utils.generateRef(dateString)`, references follow the pattern `RB-YYYYMMDD-NNN`, where `YYYYMMDD` is the sanitized date string (digits only) and `NNN` is a 3-digit random integer between 100 and 999 (e.g. `RB-20261024-482`). This creates consistent, human-readable reference tokens.

30. **How does the application address accessibility (a11y) standards?**  
    The academic project implementation targets core WCAG 2.1 Level AA recommendations: contrast ratios meet or exceed 4.5:1 for normal text across both light and dark themes, all interactive buttons and inputs have visible `:focus-visible` keyboard focus rings, semantic landmark elements (`<header>`, `<nav>`, `<main>`, `<dialog>`) are used throughout, form inputs have explicit `<label>` bindings, and timetable grid cells provide descriptive `aria-label` strings.

31. **Is the 4-digit admin PIN (`1234`) secure against inspection?**  
    No. In any client-side single-page application without a backend server, all JavaScript source code, validation logic, and storage data reside in the user's browser. The PIN serves solely as a role simulation demonstration for academic presentation.

32. **Why are all modules organized into object literals (`Store`, `Rooms`, `Availability`, `Bookings`, `UI`, `App`)?**  
    Object namespaces prevent polluting the global `window` scope. Each module encapsulates its private state and exposes only public API methods, providing clean separation of concerns without requiring a build step or bundler.
