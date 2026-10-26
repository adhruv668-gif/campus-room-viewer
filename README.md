# Campus Room & Lab Availability Viewer

> Real-time campus spatial scheduling, live room availability matrix, and conflict-free booking portal.  
> **Live Platform:** [https://campus-room-viewer.vercel.app](https://campus-room-viewer.vercel.app)

---

## Key Features

- **Interactive 9-Slot Timeline Grid**: Real-time daily timetable across academic blocks (09:00–18:00) with color-coded class occupancy, maintenance states, and live quick-date filters.
- **Free Right Now Radar**: Instant one-click radar filtering rooms that are vacant during the current teaching slot, with duration countdowns until the next class.
- **Slide-Over Instant Booking & Conflict Recommender**: Intelligent side-drawer reservation flow featuring automatic conflict detection and alternative room recommendations when chosen rooms are busy.
- **Digital Room Door Sign Preview**: Printable door schedule and pass generator formatted for classroom notices, physical inspection, and event verification.
- **Role-Based Approval & Maintenance Cascades**: Role switching between Student, Faculty, and Admin (PIN: `1234`) with automated cascades that cancel or reject competing requests upon room maintenance or approval.
- **.ics Calendar & CSV Export**: One-click RFC 5545 calendar invitations compatible with Google Calendar, Apple Calendar, and Outlook, alongside administrative CSV export.

---

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Custom Design System, Dark/Light Themes, Zero CSS Frameworks)
- **Logic & Storage**: Modern ES6+ JavaScript, Client-Side Event-Driven Architecture, `localStorage` Resilient State Engine with In-Memory Rollback
- **Dependencies**: **Zero external runtime dependencies or CDNs** — 100% self-contained and offline-capable.

---

## Quick Start & Tests

### Run Locally

```bash
# Serve static files with any HTTP server
npx serve .
# or: python -m http.server 8000
```

Open `http://localhost:3000` (or `http://localhost:8000`) in your browser.

### Run Automated Test Suite

```bash
# Execute comprehensive test validation suite
node test/test-suite.js
```

---

## Engineering Team

Built by **Team SOUL** — Angel Seth, Kartik, and Dhruv Anand.
