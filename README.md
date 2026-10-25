# Campus Room & Lab Availability Viewer
> **CSE326 Web Development — CA1: Problem Statement-Based Project**  
> **Lovely Professional University (LPU)**  
> **Team SOUL:** Angel Seth (12611041), Kartik (12612598), Dhruv Anand (12619773)

---

## 1. Project Title & Problem Statement

**Title:** Campus Room & Lab Availability Viewer  
**Problem Statement:**  
> *"Students and faculty often do not know which classrooms, seminar rooms or labs are free. Build a portal showing rooms by building and time slot with occupancy information and booking requests."*

---

## 2. Project Overview & Key Features

A lightweight, responsive single-page web application designed for academic campus room scheduling. It visualizes room availability across academic blocks using local demonstration sample data, tracks a 9-slot daily schedule, and enforces strict conflict prevention for scheduled classes and approved reservations while managing competing pending requests through administrative review.

### Key Features
- **Campus Dashboard**: Summary KPI metrics computed dynamically from local demo data, pure CSS building occupancy and slot load charts, and quick-reserve shortcuts for currently free rooms.
- **Availability Explorer**: 9-slot daily timetable grid (09:00–18:00, Mon–Sat) across 28 campus rooms in 4 academic blocks (Block 32 (B32), Block 33 (B33), Block 34 (B34), and Lab Block (BLAB)) evaluated client-side against local schedules.
- **Room Finder**: Filters rooms by date, slot duration, minimum capacity, and facilities (Projector, AC, Wi-Fi, Smart Board).
- **Booking Engine**: Enforces role quotas (Student: max 2 consecutive slots, 3 active upcoming requests; Faculty: max 4 slots, 6 active requests) with 8-digit student ID and alphanumeric faculty ID validation.
- **Conflict Detection & Pending Request Policy**: Uses range overlap logic $(s1 \le e2) \land (s2 \le e1)$ to strictly block submission against hard conflicts (scheduled lectures, maintenance windows, and approved bookings). Competing pending requests do not hard-block submission; they generate an advisory notice and enter coordinator review, where approving one request automatically cascades rejections to competing pending submissions.
- **Admin Management & Cascades**: Approving a booking auto-rejects overlapping pending requests; toggling room maintenance auto-cancels affected upcoming reservations while preserving completed sessions.
- **Accessible Design**: Native HTML5 `<dialog>` modals with sanitized content, dark/light theme switcher, WCAG AA contrast (>= 4.5:1), and responsive layout down to 360px mobile viewports.

---

## 3. Technologies Used

- **HTML5**: Semantic document structure (`<header>`, `<nav>`, `<main>`, `<aside>`, `<dialog>`), accessibility landmarks, and form controls.
- **CSS3**: Custom properties (design tokens), CSS Grid, Flexbox, pure CSS visual charts, and responsive media queries.
- **JavaScript (ES6)**: Pure vanilla JavaScript, modular object namespaces, DOM event delegation, and client-side hash routing.
- **Zero External Dependencies**: Built without npm packages, external frameworks (React, Vue, jQuery, Bootstrap, Tailwind), or external CDNs.

---

## 4. Instructions to Run Locally

### Method 1: Direct Browser Launch (No Setup)
1. Download or clone this repository.
2. Double-click `index.html` to open it in any modern browser (Chrome, Edge, Firefox, Safari).
3. The application runs immediately offline using browser `localStorage`.

### Method 2: Local Static Server
Using Python:
```bash
python -m http.server 8000
```
Open `http://localhost:8000` in your browser.

Using Node:
```bash
npx serve .
```

---

## 5. Project Structure

```text
campus-room-viewer/
│
├── index.html              # Single-page application shell and dialog modals
├── README.md               # Project overview and local execution guide
│
├── css/
│   ├── base.css            # Design tokens, typography, dark/light theme variables
│   ├── layout.css          # App layout, sticky header, responsive breakpoints
│   └── components.css      # KPI cards, timetable grid, dialogs, toasts, CSS charts
│
├── js/
│   ├── config.js           # Slot timings (1-9), roles, limits, room types, facilities
│   ├── utils.js            # IST date math, XSS sanitization, debounce, CSV export
│   ├── store.js            # LocalStorage persistence wrapper with schema versioning
│   ├── seed.js             # Initial dataset (4 buildings, 28 rooms, 632 classes)
│   ├── validators.js       # Pure validation rules for IDs, slots, dates, and forms
│   ├── ui.js               # Header clock, dialog controller, toasts, theme switcher
│   ├── rooms.js            # Room and building management, maintenance workflows
│   ├── availability.js     # Slot status resolver, conflict checks, grid renderer
│   ├── bookings.js         # Booking form, conflict alerts, approval cascade logic
│   ├── dashboard.js        # KPI calculations, pure CSS occupancy and slot charts
│   └── app.js              # Hash router, route guards, help view, app bootstrap
│
├── test/
│   └── test-suite.js       # Node.js automated test runner and regression assertions
│
└── docs/
    ├── viva-guide.md       # Code explanations and viva defense questions
    ├── test-cases.md       # QA verification test scenarios
    ├── video-script.md     # 5-minute project video recording script
    └── team-contributions.md # Individual member contribution breakdown
```

---

## 6. Team SOUL Members

| Name | Registration No. | Academic Role |
| :--- | :--- | :--- |
| **Angel Seth** | 12611041 | UI/UX Design, CSS Architecture & Accessibility |
| **Kartik** | 12612598 | Core Conflict Engine, Slot Rules & Form Validation |
| **Dhruv Anand** | 12619773 | Persistence Layer, Hash Routing & Admin Workflows |

---

## 7. Repository & Deployment Links

- **Custom Live URL (Vercel)**: [https://campus-room-viewer.vercel.app/](https://campus-room-viewer.vercel.app/)
- **Live Deployment (GitHub Pages)**: [https://adhruv668-gif.github.io/campus-room-viewer/](https://adhruv668-gif.github.io/campus-room-viewer/)
- **GitHub Repository**: [https://github.com/adhruv668-gif/campus-room-viewer](https://github.com/adhruv668-gif/campus-room-viewer)

---

## 8. Technical Limitations

- **Browser Storage Scope**: Application data persists in the browser's `localStorage`. Data is local to each specific browser/device and resets to seed data if browser storage is cleared.
- **Demonstration-Only Admin Access**: The 4-digit PIN (`1234`) simulates administrative authorization purely on the client side. It is designed for academic demonstration and does not provide production server-side security.
- **Client-Side Environment**: The system runs entirely in the browser without a backend database or live server push. Slot availability calculations rely on the local system time or the simulated clock feature in settings.
