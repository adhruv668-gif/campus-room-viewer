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

1. **Why hash routing (`#/availability`) instead of path routing (`/availability`)?**  
   Hash routing runs entirely in the browser. On static hosts like GitHub Pages or Vercel (or via `file://`), refreshing a path URL sends a server request which results in HTTP 404. Hash routes always load `index.html` and let JavaScript render the view.

2. **Why avoid `new Date().toISOString()` for date formatting?**  
   `toISOString()` returns UTC time. In Indian Standard Time (UTC+05:30), between 00:00 and 05:30 AM, UTC is still on the previous day. Using local getters (`getFullYear()`, `getMonth() + 1`, `getDate()`) ensures the exact campus calendar date.

3. **How does the range overlap formula work?**  
   Two intervals $[s1, e1]$ and $[s2, e2]$ collide when $s1 \le e2$ and $s2 \le e1$. This handles all collision cases (partial overlap, containment, and identical slots).

4. **What happens when an admin approves a booking with competing requests?**  
   In `Bookings.approveBooking()`, once a booking is approved, all other pending requests overlapping the same room, date, and slots are automatically rejected with a system note.

5. **Is the 4-digit admin PIN secure?**  
   No. In a static client-side web application without a server backend, client-side PIN checks are for user role simulation only. All source code and storage are accessible in the browser console.
