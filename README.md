# Campus Room & Lab Availability Viewer
> **CSE326 Web Development — CA1: Problem Statement-Based Project (30 Marks)**  
> **Institution:** Lovely Professional University (LPU), Punjab, India  
> **Team Name:** SOUL  
> **Team Members (1st Year B.Tech CSE):**  
> 1. **Angel Seth** (Reg. No: 12401231) — UI/UX Layout, Accessible Component Design & Responsive Stylesheets  
> 2. **Kartik** (Reg. No: 12401232) — Core Conflict Detection Algorithm, Slot Status Precedence & Form Validation Engine  
> 3. **Dhruv Anand** (Reg. No: 12401233) — Client-Side Hash Router, LocalStorage Persistence Layer & Admin Management Tools  
> 
> **Live Deployment (GitHub Pages):** [https://adhruv668-gif.github.io/campus-room-viewer/](https://adhruv668-gif.github.io/campus-room-viewer/)  
> **Source Repository:** [https://github.com/adhruv668-gif/campus-room-viewer](https://github.com/adhruv668-gif/campus-room-viewer)  

---

## 1. Project Overview & Problem Statement

### 1.1 Assigned Problem Statement (Verbatim)
> *"Students and faculty often do not know which classrooms, seminar rooms or labs are free. Build a portal showing rooms by building and time slot with occupancy information and booking requests."*

### 1.2 Assigned Objective (Verbatim)
> *"Develop a responsive web-based solution for campus room & lab availability viewer that organizes the required information, simplifies the main workflow, supports clear user actions, and provides useful status or summary views."*

### 1.3 Key Academic Value
Academic campuses frequently experience room contention where student study circles, seminar organizers, and faculty members struggle to locate vacant classrooms and computer labs between lectures. This web portal eliminates physical room hunting by providing a 100% client-side, zero-dependency timetable explorer, real-time slot conflict checker, and booking request tracker.

---

## 2. CA1 Assessment Criteria & Feature Mapping (30 Marks)

| Assessment Component | Weightage | Implementation Details in This Codebase | Primary File Reference |
| :--- | :---: | :--- | :--- |
| **Functionality & UI** | **15 Marks** | • 7 fully integrated views (`#dashboard`, `#availability`, `#find`, `#request`, `#requests`, `#admin`, `#help`)<br>• 9 daily teaching slots (09:00–18:00) across 28 campus rooms in 4 blocks<br>• Interactive timetable grid with color-coded badges and sticky headers<br>• Live conflict detection preventing double-booking and slot collisions<br>• Dark/Light theme switcher with contrast ratios exceeding WCAG AA (>= 4.5:1)<br>• Fully responsive down to 360px mobile viewports without external frameworks | [`index.html`](file:///c:/Users/anand/Downloads/campus%20room/index.html)<br>[`css/components.css`](file:///c:/Users/anand/Downloads/campus%20room/css/components.css)<br>[`js/availability.js`](file:///c:/Users/anand/Downloads/campus%20room/js/availability.js) |
| **Individual Viva** | **10 Marks** | • Clean vanilla ES6 code written with beginner-level clarity (no classes, no async/await, no external libraries)<br>• Each module encapsulated into a single global object with inline docstrings<br>• Configurable limits and constants isolated in `config.js` for instant live modification<br>• Individual contribution breakdown clearly mapped per file and function | [`js/config.js`](file:///c:/Users/anand/Downloads/campus%20room/js/config.js)<br>[`js/validators.js`](file:///c:/Users/anand/Downloads/campus%20room/js/validators.js)<br>[`js/rooms.js`](file:///c:/Users/anand/Downloads/campus%20room/js/rooms.js) |
| **Project Video** | **5 Marks** | • 5–6 minute structured presentation script covering motivation, workflow, architecture, and live demo<br>• Dedicated speaking turns for Angel Seth, Kartik, and Dhruv Anand | Section 8 / Video Script |

---

## 3. Mandatory Functional Requirements Compliance

1. **Responsive Web Interface**:
   - Fluid grid layouts (`grid-2col`, `grid-3col`, `kpi-grid`) and responsive CSS flexbox.
   - Sticky first column for room identifiers during horizontal grid scroll.
   - Accessible slide-out mobile navigation drawer (`#site-nav`) with ARIA toggle controls.
2. **Structured Forms with Validation**:
   - New booking submission, room creation, building management, and rejection remark forms.
   - Strict pattern, range, capacity, and chronological checks before store commit.
3. **Search, Filtering, and Categories**:
   - Availability filtering by Academic Block (Block 32, 34, 38, Tech Center), Room Type (Classroom, Lab, Seminar Room), minimum capacity, and amenities.
   - Live debounced keyword search matching Room Numbers, Room Names, Courses, and Instructors.
4. **Status & Progress Tracking**:
   - Visual step-by-step progress tracker on booking modal (`Submitted` &rarr; `Under Review` &rarr; `Approved` &rarr; `Completed`).
   - Rejection and cancellation audit trail with timestamps, user identity, and remarks.
5. **Dashboard & Summary Views**:
   - Real-time campus KPI cards (Total Rooms, Free Now, Occupied Now, Maintenance, Pending, User Bookings).
   - Pure CSS building occupancy bar chart, slot utilization chart, and status donut chart.
6. **Input Validation & Feedback**:
   - Form-field-level validation error text rendered in red with aria associations.
   - Toast notification system with auto-dismiss and polite screen reader announcements (`aria-live="polite"`).

---

## 4. Technical Constraints & Architecture

- **100% Vanilla Web Stack**: Zero npm packages, zero external CDNs, zero JavaScript frameworks.
- **Double-Click Compatibility**: Fully functional using direct local browser execution (`file:///.../index.html`) or online static hosting (GitHub Pages).
- **No Build Step**: Written in standard ES6 JavaScript and CSS3 custom properties (variables).
- **Dependency Inversion via Script Tags**:
  ```html
  <script src="js/config.js"></script>
  <script src="js/utils.js"></script>
  <script src="js/store.js"></script>
  <script src="js/seed.js"></script>
  <script src="js/validators.js"></script>
  <script src="js/ui.js"></script>
  <script src="js/rooms.js"></script>
  <script src="js/availability.js"></script>
  <script src="js/bookings.js"></script>
  <script src="js/dashboard.js"></script>
  <script src="js/app.js"></script>
  ```
- **Local Timezone Safety (IST UTC+05:30)**:
  Uses `Utils.getLocalDateString()` based on local `getFullYear()`, `getMonth() + 1`, and `getDate()`. Strictly avoids `toISOString().split('T')[0]` which causes premature date rollback between 00:00 and 05:30 IST.

---

## 5. System Roles & Business Rules

### 5.1 Simulated Personas (Header Switcher)
- **Student**: Can browse timetable, search free rooms, submit booking requests (max 2 consecutive slots, max 3 active requests), and track personal submissions using Registration Number (8 digits).
- **Faculty**: Can submit bookings with higher privileges (max 4 consecutive slots, max 6 active requests) using Employee ID (4–10 alphanumeric characters).
- **Admin (Room Coordinator)**: Full administrative access. Unlocked using client-side PIN `1234`. Can approve/reject bookings, mark rooms under maintenance (with automated cancellation of conflicting bookings), edit recurring timetable classes, and import/export database snapshots.

### 5.2 Core Conflict Resolution Logic
When checking slot status for `(Room, Date, Slot)`, the engine resolves in strict sequential order:
1. **Maintenance**: If `room.status === "Maintenance"`, slot is blocked.
2. **Class**: If recurring timetable entry exists for `(Room, Weekday(Date), Slot)`, marked as `Class`.
3. **Booked**: If an `Approved` booking covers `(Room, Date, Slot)`, marked as `Booked`.
4. **Requested**: If one or more `Pending` requests exist, marked as `Requested` (with count badge).
5. **Free**: None of the above conditions apply.

### 5.3 Range Overlap Formula
Two slot intervals `[s1, e1]` and `[s2, e2]` collide if and only if:
$$\text{Overlap} \iff (s1 \le e2) \land (s2 \le e1)$$

### 5.4 Approval Cascade Auto-Rejection
When an Admin approves a pending request, any other overlapping `Pending` requests for the same room, date, and slots are automatically rejected with the automated system note:  
`"Slot allotted to request <REF> by Room Coordinator."`

---

## 6. Directory Structure

```text
campus-room/
│
├── index.html                   # Accessible Single Page Application Shell & Landmarks
│
├── css/
│   ├── base.css                 # CSS Custom Properties, Typography, Dark/Light Themes, Resets
│   ├── layout.css               # Flex/Grid App Shell, Navigation Drawer, Responsive Breakpoints
│   └── components.css           # KPI Cards, Timetable Table Cells, Modals, Toasts, Pure CSS Charts
│
├── js/
│   ├── config.js                # System Constants, Slot Timings (1-9), Roles, Limits, Default PIN
│   ├── utils.js                 # Local IST Date Math, XSS Sanitization, Debounce, CSV/JSON Export
│   ├── store.js                 # LocalStorage Layer with Schema Versioning & Memory Fallback
│   ├── seed.js                  # Deterministic Generator (4 Buildings, 28 Rooms, 632 Classes, 16 Bookings)
│   ├── validators.js            # Pure Validation Rules for IDs, Dates, Durations, and Forms
│   ├── ui.js                    # Live Clock, Accessible Dialog Controller, Toast Alerts, Theme
│   ├── rooms.js                 # Room & Building CRUD, Timetable Manager, Maintenance Cascades
│   ├── availability.js          # Slot Status Resolver, Range Collision Detector, Grid Renderer, Room Finder
│   ├── bookings.js              # Booking Request Form, Real-Time Conflict Alerts, Approval Cascades
│   ├── dashboard.js             # Live Slot Status, KPI Computations, Pure CSS Visualization Charts
│   └── app.js                   # Client Hash Router, Route Guards, Help Guide, App Bootstrap
│
└── README.md                    # Comprehensive Project Manual & Viva Guide
```

---

## 7. How to Run Locally

### Method 1: Direct Double-Click (Zero Setup)
1. Navigate to the downloaded project folder.
2. Double-click [`index.html`](file:///c:/Users/anand/Downloads/campus%20room/index.html) to open it in Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari.
3. Everything runs immediately from client-side memory and browser LocalStorage.

### Method 2: Local Static Server (Python / Node / VS Code Live Server)
- **Using Python 3**:
  ```bash
  python -m http.server 8000
  ```
  Open `http://localhost:8000` in your browser.
- **Using Node `npx serve`**:
  ```bash
  npx serve .
  ```

---

## 8. Team SOUL Contribution & Viva Quick Reference

```
+----------------------------------------------------------------------------------------------------+
|                                    TEAM SOUL RESPONSIBILITY MATRIX                                 |
+----------------------+-----------------------------+-----------------------------------------------+
| Member               | Role / Primary Module       | Key Code Functions to Explain in Viva         |
+----------------------+-----------------------------+-----------------------------------------------+
| Angel Seth           | UI / UX, Stylesheets,       | 1. UI.applyTheme(theme)                       |
| (Reg. No: 12401231)  | Accessibility & Components  | 2. UI.showModal(title, bodyHtml, onConfirm)   |
|                      |                             | 3. css/base.css design tokens & contrast      |
|                      |                             | 4. css/components.css pure CSS charts         |
+----------------------+-----------------------------+-----------------------------------------------+
| Kartik               | Core Business Logic,        | 1. Availability.getSlotStatus(roomId, dt, s)  |
| (Reg. No: 12401232)  | Slot Conflict Engine &      | 2. Availability.findConflicts(...)            |
|                      | Input Validation Rules      | 3. Validators.validateRequestForm(...)        |
|                      |                             | 4. Validators.validateSlots(...)              |
+----------------------+-----------------------------+-----------------------------------------------+
| Dhruv Anand          | Hash Router, LocalStorage,  | 1. Store.init() & Store.set(key, val)         |
| (Reg. No: 12401233)  | Seed Generator, Admin Tools | 2. App.navigate(routeHash)                    |
|                      | & Booking Workflows         | 3. Bookings.approveBooking(id)                |
|                      |                             | 4. Rooms.toggleMaintenance(roomId)            |
+----------------------+-----------------------------+-----------------------------------------------+
```

---

## 9. Viva Questions & Key Concepts

1. **Why use hash routing (`#/dashboard`) instead of standard path routing (`/dashboard`)?**  
   *Answer:* Hash routing executes entirely in the client browser without sending requests to a web server. When deployed on GitHub Pages or double-clicked via `file://`, regular path routes return HTTP 404 on refresh, whereas hash routes always load `index.html` and let JavaScript render the appropriate view.

2. **Why avoid `new Date().toISOString()` for date strings?**  
   *Answer:* `toISOString()` returns UTC time. In India (IST = UTC+05:30), between midnight (00:00) and 05:30 AM, UTC is still on the previous calendar day. Using local date getters (`getFullYear()`, `getMonth() + 1`, `getDate()`) guarantees the exact campus date.

3. **How does the conflict detection formula work?**  
   *Answer:* Two slot ranges $[s1, e1]$ and $[s2, e2]$ overlap when $s1 \le e2$ and $s2 \le e1$. This single mathematical comparison handles all overlap conditions (partial overlap, containment, and identical slots) without nested if-else statements.

4. **What happens when an Admin approves a booking that has competing requests?**  
   *Answer:* Inside `Bookings.approveBooking()`, once the target request is marked `Approved`, the system scans all other `Pending` requests. Any competing request that overlaps the same room, date, and slots is automatically transitioned to `Rejected` with an audit history note explaining that the slot was allotted.

5. **Where is data stored and what happens if localStorage is disabled?**  
   *Answer:* All data is stored in the browser's `localStorage` as JSON strings under versioned keys (`CAMPUS_ROOMS_BUILDINGS_V1`, etc.). If `localStorage` is blocked or unavailable, `Store.js` falls back to an in-memory dictionary so the application continues to run without crashing.
