# Complete Viva Preparation & Code Defense Pack
> **Course:** LPU CSE326 Web Development (CA1 Assessment — 10 Viva Marks)  
> **Team SOUL:** Angel Seth (12401231), Kartik (12401232), Dhruv Anand (12401233)  
> **Target:** 10/10 Individual Viva Score for All Three Members

---

## Part 1: Individual Responsibilities & Code Ownership

```
+---------------------------------------------------------------------------------------------------------+
|                                    TEAM SOUL VIVA DEFENSE SPECIALIZATION                                |
+------------------+--------------------------------+-----------------------------------------------------+
| Student Name     | Primary Area of Expertise      | Code Files Defended                                 |
+------------------+--------------------------------+-----------------------------------------------------+
| Angel Seth       | UI Layout, Stylesheets, Design | index.html, css/base.css, css/layout.css,           |
| (12401231)       | Tokens, Accessibility, Modals | css/components.css, js/ui.js                        |
+------------------+--------------------------------+-----------------------------------------------------+
| Kartik           | Conflict Algorithm, Slot Rules | js/availability.js, js/validators.js,              |
| (12401232)       | Date Handling, Input Engine    | js/config.js, js/utils.js                           |
+------------------+--------------------------------+-----------------------------------------------------+
| Dhruv Anand      | LocalStorage Persistence Layer | js/store.js, js/seed.js, js/rooms.js,               |
| (12401233)       | Hash Router, Admin Cascades    | js/bookings.js, js/dashboard.js, js/app.js          |
+------------------+--------------------------------+-----------------------------------------------------+
```

---

## Part 2: 12 Line-by-Line Function Walkthroughs

### 1. Angel Seth: `UI.applyTheme(theme)` (`js/ui.js`)
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
- **Line 195:** `const root = document.documentElement;` selects the root `<html>` element.
- **Line 198–200:** Checks OS system preferences using CSS Media Query API `window.matchMedia('(prefers-color-scheme: dark)')`.
- **Line 200 & 203:** Sets the `data-theme` HTML attribute to either `"dark"` or `"light"`.
- **Why this works:** In `css/base.css`, design tokens are mapped under `[data-theme="dark"]` (e.g. `--bg-canvas: #0f172a;`). Updating the attribute re-computes all CSS custom properties instantly across the DOM with zero page refresh.

### 2. Angel Seth: `UI.showModal(title, bodyHtml, onConfirm, confirmText, isDanger)` (`js/ui.js`)
```javascript
showModal: function(title, bodyHtml, onConfirm, confirmText, isDanger) {
  const modal = document.getElementById('app-modal');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const confirmBtn = document.getElementById('modal-confirm-btn');
  // ... populate content ...
  modal.showModal();
}
```
- **Key concept:** Uses HTML5 native `<dialog>` element.
- **Line 87:** `modal.showModal()` triggers the native browser dialog API, which automatically creates a top-layer backdrop (`::backdrop`), traps keyboard focus inside the dialog, and listens to the `Escape` key for free accessibility.
- **Line 98:** Clones the confirm button or replaces event listeners to prevent duplicate click triggers.

### 3. Angel Seth: `UI.updateClock()` (`js/ui.js`)
```javascript
updateClock: function() {
  const now = Utils.getNow();
  const dateStr = Utils.formatDate(now);
  const timeStr = Utils.formatTime(now);
  // ... updates DOM elements ...
}
```
- **Explanation:** Called by `setInterval` every 1,000 milliseconds (1 second) in `App.init()`.
- **Crucial Detail:** Does not use `new Date()` directly. It calls `Utils.getNow()` so that if an Admin sets a "Simulated Virtual Date/Time" in settings, the header clock freezes or fast-forwards accordingly.

### 4. Angel Seth: `Dashboard._renderStatusDistribution(metrics)` (`js/dashboard.js`)
```javascript
const degPending = (sc.Pending / total) * 360;
const degApproved = (sc.Approved / total) * 360;
// ...
conicGradient = `conic-gradient(
  var(--color-requested) 0deg ${p1}deg,
  var(--color-free) ${p1}deg ${p2}deg,
  ...
)`;
```
- **Explanation:** Renders a pure CSS donut chart without any JavaScript chart libraries like Chart.js.
- **Math:** Divides each booking count by the total to obtain the angle fraction (`count / total * 360`).
- **CSS:** Injects a dynamic `conic-gradient(...)` string into the background property of `.donut-chart`, with an inner `.donut-hole` circle overlaying the center.

---

### 5. Kartik: `Availability.getSlotStatus(roomId, dateStr, slotNumber)` (`js/availability.js`)
```javascript
getSlotStatus: function(roomId, dateStr, slotNumber) {
  // Step 1: Check Room Maintenance
  if (room.status === Config.ROOM_STATUS.MAINTENANCE) return { status: 'Maintenance', ... };

  // Step 2: Check Timetable Schedule
  const classEntry = timetable.find(t => t.roomId === roomId && t.weekday === weekday && t.slot === slotNumber);
  if (classEntry) return { status: 'Class', details: classEntry, ... };

  // Step 3: Check Approved Bookings
  const approved = bookings.find(b => b.roomId === roomId && b.date === dateStr && b.status === 'Approved' && slotNumber >= b.startSlot && slotNumber <= b.endSlot);
  if (approved) return { status: 'Booked', details: approved, ... };

  // Step 4: Check Pending Requests
  const pendingList = bookings.filter(b => b.roomId === roomId && b.date === dateStr && b.status === 'Pending' && slotNumber >= b.startSlot && slotNumber <= b.endSlot);
  if (pendingList.length > 0) return { status: 'Requested', count: pendingList.length, ... };

  // Step 5: Slot is Free
  return { status: 'Free', details: null, ... };
}
```
- **Precedence Order:** Maintenance (1) &rarr; Timetable Lecture (2) &rarr; Approved Booking (3) &rarr; Pending Request (4) &rarr; Free (5).
- **Why this order matters:** A room undergoing electrical repair (Maintenance) can never host a lecture; a scheduled university lecture takes precedence over outside bookings; an approved booking blocks pending requests.

### 6. Kartik: `Availability.findConflicts(...)` (`js/availability.js`)
```javascript
findConflicts: function(roomId, dateStr, startSlot, endSlot, ignoreBookingId) {
  // Checks range overlap formula: (b.startSlot <= endSlot) && (b.endSlot >= startSlot)
}
```
- **Algorithm:** Uses mathematical interval overlap: `(s1 <= e2) && (s2 <= e1)`.
- **Returns:** An array of collision objects. If collisions contain `Maintenance`, `Class`, or `Approved`, they are treated as **Hard Conflicts** that completely disable the form submit button.

### 7. Kartik: `Validators.validateRequestForm(formData, room, activeBookingCount)` (`js/validators.js`)
```javascript
validateRequestForm: function(formData, room, activeBookingCount) {
  const errors = {};
  // 1. Quota Check
  // 2. Room Active Check
  // 3. Name, ID, Email, Phone
  // 4. Date & Slot Limits
  // 5. Attendees vs Room Capacity
  // 6. Purpose & Declaration
  return { valid: Object.keys(errors).length === 0, errors: errors };
}
```
- **Design Pattern:** Pure validation function with zero side effects. It takes plain objects as input and returns `{ valid: boolean, errors: object }`.
- **Integration:** Used both on the client form for instant field-level feedback and inside `Bookings.createBooking()` to safeguard storage.

### 8. Kartik: `Validators.validateSlots(startSlot, endSlot, requesterType, dateStr)` (`js/validators.js`)
```javascript
validateSlots: function(startSlot, endSlot, requesterType, dateStr) {
  // Consecutive slot limit: Student <= 2, Faculty <= 4
  const duration = (endSlot - startSlot) + 1;
  const maxAllowed = requesterType === 'Faculty' ? 4 : 2;
  if (duration > maxAllowed) return { valid: false, error: '...' };

  // Past slot check if booking for today
  if (dateStr === todayStr) {
    const slotDef = Config.SLOTS.find(s => s.id === startSlot);
    if (currentMinutes >= (slotDef.endHour * 60 + slotDef.endMin)) {
      return { valid: false, error: 'Slot has already ended today.' };
    }
  }
}
```
- **Crucial Rule:** Converts slot ending hours into total minutes (`endHour * 60 + endMin`) and compares with `now.getHours() * 60 + now.getMinutes()`. This prevents users from booking an 09:00 slot at 14:00 today.

---

### 9. Dhruv Anand: `Store.init()` & `Store.set(key, val)` (`js/store.js`)
```javascript
init: function() {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    this._isStorageAvailable = true;
  } catch (e) {
    this._isStorageAvailable = false;
  }
  // Check schema version. If missing or outdated, seed initial data.
}
```
- **Resilience:** Performs a feature-detection probe on `localStorage`. If third-party cookies or storage are disabled by browser privacy settings, it flags `_isStorageAvailable = false` and redirects all writes to an internal in-memory object so the app never throws an uncaught error.
- **Schema Migration:** Checks `CAMPUS_ROOMS_SCHEMA_VERSION`. If the version in storage does not match `Config.SCHEMA_VERSION`, it migrates or re-seeds cleanly.

### 10. Dhruv Anand: `App.navigate(routeHash)` (`js/app.js`)
```javascript
navigate: function(routeHash) {
  const cleanHash = (routeHash || '#/dashboard').replace(/^#\/?/, '');
  const [route, queryStr] = cleanHash.split('?');
  // 1. Check Admin Route Guard
  if (route === 'admin' && this.getCurrentRole() !== Config.ROLES.ADMIN) {
    this._renderAdminGuard();
    return;
  }
  // 2. Hide all .view-section, unhide view-${route}
  // 3. Update document.title & shift keyboard focus to <h1>
  // 4. Invoke target renderer (Dashboard.renderView, Availability.renderGrid, etc.)
}
```
- **Hash Router Architecture:** Listens to `window.addEventListener('hashchange')`. Parses path and query parameters (`?roomId=...&date=...`).
- **Accessibility:** Moves `.focus()` to the target section's `<h1>` with `tabindex="-1"` so screen readers immediately announce screen transitions.

### 11. Dhruv Anand: `Bookings.approveBooking(id)` (`js/bookings.js`)
```javascript
approveBooking: function(id) {
  // 1. Mark target request as 'Approved'
  targetBooking.status = 'Approved';
  targetBooking.history.push({ status: 'Approved', at: now, by: adminName });

  // 2. Automatic Cascade Rejection of competing pending requests
  allBookings.forEach(other => {
    if (other.id !== id && other.status === 'Pending' && other.roomId === targetBooking.roomId && other.date === targetBooking.date) {
      if ((other.startSlot <= targetBooking.endSlot) && (other.endSlot >= targetBooking.startSlot)) {
        other.status = 'Rejected';
        other.adminNote = `Slot allotted to request ${targetBooking.ref}`;
        other.history.push({ status: 'Rejected', at: now, by: 'System', note: other.adminNote });
      }
    }
  });
}
```
- **Business Rule Automation:** Once an administrator commits to allotting a room for a specific time range, any other student or faculty requests competing for that exact room and time are instantly set to `Rejected` with full audit history tracking.

### 12. Dhruv Anand: `Rooms.toggleMaintenance(roomId)` (`js/rooms.js`)
```javascript
toggleMaintenance: function(roomId, notes) {
  // If moving to Maintenance:
  // Find all future Pending or Approved bookings for this room
  // Automatically cancel them with remark: 'Room placed under maintenance: <notes>'
}
```
- **Safety Protocol:** Calculates affected future bookings before changing the room status. Prompts administrator with the exact count of cancelled reservations before committing changes to storage.

---

## Part 3: 40 Targeted Examiner Viva Questions & Answers

### Topic 1: HTML5 & Accessible Semantics
1. **Q: Why use semantic tags like `<header>`, `<main>`, `<nav>`, and `<aside>` instead of generic `<div>` tags?**  
   *A:* Semantic tags convey structural meaning to assistive technologies (screen readers) and search engines, creating landmark regions that allow keyboard users to navigate between sections efficiently.
2. **Q: What is the purpose of the `.skip-link` in `index.html`?**  
   *A:* It allows keyboard-only and screen reader users to bypass repetitive header navigation links and jump directly to the primary page content with a single keystroke.
3. **Q: How does the native HTML5 `<dialog>` element improve accessibility over `<div>` modals?**  
   *A:* `<dialog>` automatically provides native focus trapping, renders on the browser's top layer over all other z-indexes, and dismisses on the `Escape` key without requiring complex keyboard event listeners.
4. **Q: What does `aria-live="polite"` on `#toast-container` accomplish?**  
   *A:* It instructs screen readers to announce transient toast alerts to the user at the next idle moment without abruptly interrupting ongoing screen reading.
5. **Q: Why are all image icons implemented with inline SVG and Unicode symbols instead of external `.png` files?**  
   *A:* Inline SVGs and Unicode glyphs scale losslessly to high-DPI displays, eliminate HTTP requests, and ensure the application functions offline via `file://` with zero external dependencies.

### Topic 2: CSS3 Custom Properties & Responsive Layout
6. **Q: What are CSS custom properties (variables) and why are they declared inside `:root`?**  
   *A:* Variables defined in `:root` have global scope across the entire DOM tree, making it easy to manage centralized design tokens for colors, spacing, and typography that adapt automatically during theme switching.
7. **Q: How does the application maintain WCAG AA color contrast compliance?**  
   *A:* All text-to-background combinations are calibrated to maintain a contrast ratio of at least 4.5:1. Darker semantic borders and accessible foreground tokens (`--color-free`, `--color-danger`) ensure readability across both light and dark themes.
8. **Q: How does the timetable table remain usable on 360px mobile viewports?**  
   *A:* The table is wrapped in a `.grid-scroll-wrapper` container with `-webkit-overflow-scrolling: touch`, while the room label column (`.grid-col-room`) has `position: sticky; left: 0;` so room names remain visible as the user scrolls horizontally through the 9 time slots.
9. **Q: What is the difference between CSS Grid and Flexbox in this project?**  
   *A:* Flexbox is used for one-dimensional layouts (header controls, button bars, toast stacks), while CSS Grid is used for two-dimensional layouts (the KPI card grid, 2-column dashboard widgets, and timetable tables).
10. **Q: Why is there no Bootstrap or Tailwind CSS in this project?**  
    *A:* Using pure CSS3 eliminates multi-megabyte library overhead, allows exact compliance with university constraints, and proves a fundamental mastery of responsive web development.

### Topic 3: Vanilla JavaScript Architecture & Module Design
11. **Q: Why avoid ES6 module syntax (`import`/`export`) in this project?**  
    *A:* Browsers block ES6 `import` statements on the `file://` protocol due to CORS security restrictions. Using classic `<script>` tags in topological order ensures the project runs by double-clicking `index.html` without needing a local HTTP server.
12. **Q: How do you prevent namespace collisions if all scripts share the global scope?**  
    *A:* Each JavaScript file defines exactly one PascalCase global object namespace (e.g. `const Availability = { ... }`), encapsulating all internal state and methods so there are zero loose global variables.
13. **Q: Why is `'use strict';` placed at the top of every JavaScript file?**  
    *A:* Strict mode catches common programming bugs by throwing errors for undeclared variables, preventing accidental assignments to global variables, and disabling deprecated JavaScript behaviors.
14. **Q: What is Event Delegation and where is it used?**  
    *A:* Event delegation attaches a single event listener to a common parent element rather than dozens of child buttons. It is used in the availability grid to catch slot clicks on any `.grid-cell` dynamically using `e.target.closest('.grid-cell')`.
15. **Q: Why avoid `async/await` and Promises in this first-year project?**  
    *A:* The application is 100% synchronous and operates on in-memory and local storage data. Avoiding asynchronous syntax keeps the code simple, predictable, and easy for any beginner student to trace line by line during an oral exam.

### Topic 4: Date Mathematics & Timezone Safety
16. **Q: Why does `new Date().toISOString().split('T')[0]` cause bugs in India?**  
    *A:* `toISOString()` returns UTC time (GMT). In India (UTC+05:30), between 00:00 (midnight) and 05:30 AM, UTC is still in the previous day, resulting in bookings being recorded with the wrong calendar date.
17. **Q: How does `Utils.getLocalDateString()` solve the timezone issue?**  
    *A:* It queries local system time methods: `dateObj.getFullYear()`, `dateObj.getMonth() + 1`, and `dateObj.getDate()`, padding them with `String.prototype.padStart(2, '0')` to produce the correct local `YYYY-MM-DD` string in every timezone.
18. **Q: How does the Simulated Clock feature work?**  
    *A:* When an admin enters a simulated date/time in settings, `Utils.getNow()` returns `new Date(settings.simulatedNow)` instead of `new Date()`. Because every function in the app queries `Utils.getNow()`, the entire application travels to that simulated time instantly.
19. **Q: How are weekly recurring timetable classes mapped to dates?**  
    *A:* The app extracts the day of the week using `new Date(y, m-1, d).getDay()`. Sunday is 0 (closed), Monday is 1, through Saturday as 6. Timetable entries store `weekday: 1..6`, allowing exact lookup for any chosen calendar date.
20. **Q: How is slot timing validated against real-time passage?**  
    *A:* Each slot definition in `Config.SLOTS` has `endHour` and `endMin`. The validator converts the ending time to total minutes and compares it against current clock minutes to block booking slots that have already passed earlier today.

### Topic 5: Conflict Detection & Precedence Algorithm
21. **Q: State the 5-level slot precedence sequence.**  
    *A:* 1. Maintenance &rarr; 2. Timetable Lecture &rarr; 3. Approved Booking &rarr; 4. Pending Request &rarr; 5. Free.
22. **Q: Explain the mathematical formula for range overlap.**  
    *A:* Two ranges $[s1, e1]$ and $[s2, e2]$ overlap if and only if $s1 \le e2 \land s2 \le e1$.
23. **Q: Why is Pending vs. Pending overlap treated as a warning rather than a hard block?**  
    *A:* Multiple students or clubs may request the same free slot before coordinator review. The system allows competing pending requests to be submitted so the coordinator can choose which one to approve.
24. **Q: What happens to competing requests when one request is approved?**  
    *A:* The conflict cascade automatically marks all overlapping pending requests as `Rejected` with a system note naming the winning booking reference.
25. **Q: Can a room under Maintenance be booked if no classes are scheduled?**  
    *A:* No. Maintenance is checked first in the precedence chain; any room flagged as Maintenance is immediately disabled for all slots.

### Topic 6: Input Validation & Security
26. **Q: How does the application prevent Cross-Site Scripting (XSS)?**  
    *A:* All user-entered text strings (requester names, purpose, remarks) are sanitized through `Utils.escapeHTML()`, which replaces `&`, `<`, `>`, `"`, and `'` with their respective HTML character entities before inserting them into template literals.
27. **Q: How does the registration ID validator distinguish between students and faculty?**  
    *A:* If `requesterType === 'Student'`, the regex `/^\d{8}$/` enforces exactly 8 digits. If `requesterType === 'Faculty'`, `/^[A-Za-z0-9\-]{4,10}$/` enforces 4 to 10 alphanumeric characters.
28. **Q: Is the 4-digit Admin PIN (`1234`) a true security mechanism?**  
    *A:* No. In a purely client-side static web application without a server backend, client-side PIN checks are for user role simulation only. All source code and storage are accessible in the browser console.
29. **Q: Why does slot inspection mask contact details for non-admin users?**  
    *A:* To protect student and faculty privacy, telephone numbers and email addresses are only visible when the active role is `Admin`. Regular users only see the requester's name and purpose.
30. **Q: What is the maximum consecutive slot limit for students versus faculty?**  
    *A:* Students can book up to 2 consecutive slots (2 hours); faculty can book up to 4 consecutive slots (4 hours). All values are stored in `Config.LIMITS`.

### Topic 7: Persistence & Storage Architecture
31. **Q: How is data structured inside LocalStorage?**  
    *A:* Collections (`BUILDINGS`, `ROOMS`, `TIMETABLE`, `BOOKINGS`, `SETTINGS`) are stored as serialized JSON strings under prefixed keys like `CAMPUS_ROOMS_BUILDINGS_V1`.
32. **Q: What happens if LocalStorage quota is exceeded or storage is disabled?**  
    *A:* `Store.js` wraps every read and write operation in `try/catch` blocks. If `localStorage` throws an exception, it falls back to an in-memory dictionary and alerts the user with a warning toast.
33. **Q: What is the purpose of `CAMPUS_ROOMS_SCHEMA_VERSION`?**  
    *A:* It prevents crashes caused by old, incompatible data stored from previous sessions. If the stored schema version differs from `Config.SCHEMA_VERSION`, the app resets storage to fresh sample data.
34. **Q: How does the application generate unique booking references like `RB-20261024-001`?**  
    *A:* `Utils.generateRef(dateStr)` strips hyphens from the date and computes the next sequential count of bookings made on that day, padding it to 3 digits.
35. **Q: How is tabular data exported to Microsoft Excel without external libraries?**  
    *A:* `Utils.exportToCSV()` converts the array of objects into comma-separated text, prepends the UTF-8 Byte Order Mark (`\uFEFF`) so Excel recognizes special characters, and triggers a download via an anchor element (`<a>`) with an `object URL`.

### Topic 8: Administration & Maintenance Workflows
36. **Q: What safeguards exist before a Room Coordinator can delete a room?**  
    *A:* `Rooms.deleteRoom()` scans `Bookings`. If any historical booking (Pending, Approved, or Completed) refers to that room ID, deletion is blocked, and the admin is advised to use Maintenance mode instead.
37. **Q: What happens when an Academic Building is deleted?**  
    *A:* `Rooms.deleteBuilding()` checks if any rooms belong to that building. Deletion is blocked until all associated rooms have been removed or reassigned.
38. **Q: What happens when an existing room is switched to Maintenance?**  
    *A:* All upcoming Pending and Approved bookings for that room are automatically cancelled, and their history log records that the cancellation was due to facility maintenance.
39. **Q: Why is booking cancellation restricted to Pending and future Approved bookings?**  
    *A:* Completed, Rejected, or already Cancelled bookings are immutable historical audit records and cannot be cancelled again.
40. **Q: How does the "Reset to Sample Data" feature work?**  
    *A:* It calls `Store.resetToSample()`, which wipes existing keys and executes `Seed.generate()` to restore the original 4 buildings, 28 rooms, 632 timetable entries, and 16 sample bookings.
