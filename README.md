# LPU Space & Lab Management Portal
> **Division of Academic Affairs & Estate Operations**  
> **Lovely Professional University (LPU), Punjab**  
> *Engineered by Team SOUL*

[![Automated Tests](https://github.com/adhruv668-gif/campus-room-viewer/actions/workflows/test.yml/badge.svg)](https://github.com/adhruv668-gif/campus-room-viewer/actions)
[![Deployment](https://img.shields.io/badge/deployment-live%20on%20vercel-black?logo=vercel)](https://campus-room-viewer.vercel.app/)
[![License](https://img.shields.io/badge/architecture-zero--dependency%20vanilla-emerald)](#technical-architecture)
[![Accessibility](https://img.shields.io/badge/accessibility-WCAG%202.1%20AA-blue)](#accessibility--standards)

---

## 1. Executive Summary & Platform Overview

The **LPU Space & Lab Management Portal** is an enterprise-grade campus scheduling and resource allocation platform built for Lovely Professional University. It provides unified, real-time spatial visibility across university academic blocks, departmental laboratories, and seminar halls.

Designed with an ultra-fast, zero-dependency client architecture, the system operates deterministically across desktop workstations, mobile tablets, and campus kiosks without requiring server-side rendering or heavyweight frameworks.

### Live Deployments
- **Production URL (Vercel Edge)**: [https://campus-room-viewer.vercel.app/](https://campus-room-viewer.vercel.app/)
- **Mirror Deployment (GitHub Pages)**: [https://adhruv668-gif.github.io/campus-room-viewer/](https://adhruv668-gif.github.io/campus-room-viewer/)
- **Source Repository**: [https://github.com/adhruv668-gif/campus-room-viewer](https://github.com/adhruv668-gif/campus-room-viewer)

---

## 2. Flagship Enterprise Capabilities

1. **Live 9-Slot Campus Availability Matrix**: Visualizes real-time status across 28 campus rooms and 4 blocks (Block 32, Block 33, Block 34, and Central Lab Complex) across 9 teaching periods (`09:00 – 18:00 IST`, Mon–Sat).
2. **Interactive Architectural Campus Block Map**: SVG-driven dashboard campus map color-coded by dynamic occupancy levels (Optimal `<40%`, Moderate `40–75%`, High Load `>75%`) with one-click block filtering.
3. **Smart Conflict Engine & Alternative Recommender**: Enforces mathematical interval overlap detection $(s1 \le e2) \land (s2 \le e1)$. When a requested slot has a clash, the portal automatically suggests the top 3 conflict-free alternative rooms in the same building matching the required capacity.
4. **Global Command Palette (`Ctrl+K` / `Cmd+K` / `/`)**: Fast spotlight navigation across all rooms, booking references, system settings, and route shortcuts with full arrow-key and enter navigation.
5. **Simulated LPU UMS Single Sign-On (SSO)**: Quick-switch profile switcher for Students, Faculty, and Estate Administrators with automatic request form pre-filling and personalized "My UMS Bookings" filtering.
6. **One-Click `.ics` Calendar Event Generation**: Generates RFC 5545 standard `.ics` calendar files enabling instant import into Google Calendar, Microsoft Outlook, and Apple Calendar.
7. **Official Printable Reservation Passes & Door Timetables**: `@media print` optimized layout formatting verified reservation slips complete with official university header, QR verification block, and estate officer signature boxes.
8. **Atomic Administrative Cascades & Rollbacks**: Multi-step booking approvals atomically resolve competing pending submissions, and room maintenance toggles auto-cancel upcoming bookings while strictly preserving completed historical sessions.

---

## 3. Mathematical Overlap & Conflict Policy

The portal classifies room resource demands into two operational categories:

$$\text{Overlap Condition} \iff (s_1 \le e_2) \land (s_2 \le e_1)$$

- **Hard Conflicts (Blocking)**: Collisions with recurring weekly curriculum lectures, approved reservations, or active room maintenance flags. Submission is strictly blocked, and the intelligent assistant surfaces instant alternative rooms.
- **Soft Conflicts (Advisory)**: Multiple pending requests for the same room and slot range. Submissions are permitted to enter administrative review. When an administrator approves one request, all conflicting pending requests are atomically updated to `Rejected` with an audit note citing the approved reference ID.

---

## 4. Technical Architecture & Zero-Dependency Stack

```text
campus-room-viewer/
│
├── index.html              # Accessible SPA shell, landmarks, dialog modals
├── README.md               # Enterprise documentation & developer guide
├── .nojekyll               # Static asset bypass for GitHub Pages deployment
│
├── css/
│   ├── base.css            # Design tokens, typography, CSS variables, dark/light themes
│   ├── layout.css          # Fluid container grids, sticky app header, responsive drawer
│   └── components.css      # KPI widgets, timetable grid, command palette, print styles
│
├── js/
│   ├── config.js           # Immutable slot definitions, quotas, validation limits
│   ├── utils.js            # IST clock math, XSS sanitization, ICS exporter, CSV generator
│   ├── store.js            # LocalStorage engine with schema migration & memory fallback
│   ├── seed.js             # Seed database (4 buildings, 28 rooms, 632 classes, sample bookings)
│   ├── validators.js       # Pure validation functions for IDs, slot spans, attendees, dates
│   ├── ui.js               # Header clock, command palette, modals, toasts, theme toggles
│   ├── rooms.js            # Room and building administration, maintenance cascades
│   ├── availability.js     # Slot precedence resolver, conflict engine, alternative finder
│   ├── bookings.js         # Reservation lifecycle, approval cascades, UMS integration
│   ├── dashboard.js        # KPI calculations, SVG campus block map, slot utilization charts
│   └── app.js              # Hash routing, UMS SSO session state, cross-tab sync, bootstrap
│
├── test/
│   └── test-suite.js       # Zero-dependency automated test runner (100% pass rate)
│
└── docs/
    ├── test-cases.md       # Comprehensive QA test execution matrix
    ├── viva-guide.md       # Architectural deep dives and technical defense reference
    ├── video-script.md     # 5-minute platform demonstration walkthrough
    └── team-contributions.md # Core engineering responsibilities
```

### Stack Highlights
- **100% Vanilla ES6 JavaScript**: No npm runtime dependencies, Webpack, Babel, or external bundlers required.
- **Modern CSS3 Architecture**: Token-based custom properties, CSS Grid, Flexbox, and native `@media print` rules.
- **Offline & Cross-Tab Resilience**: Runs seamlessly offline via `localStorage` with `sessionStorage` privilege isolation and real-time cross-tab state synchronization via the `storage` event.

---

## 5. Local Setup & Verification

### Instant Offline Launch (Zero Setup)
Clone the repository and launch `index.html` directly in any web browser:
```bash
git clone https://github.com/adhruv668-gif/campus-room-viewer.git
cd campus-room-viewer
# Double-click index.html or launch via browser
```

### Local Static Server
```bash
# Using Python 3
python -m http.server 8000

# Or using Node.js
npx serve .
```
Navigate to `http://localhost:8000`.

### Executing Automated Test Suite
```bash
node test/test-suite.js
```
Runs the automated test suite testing validation rules, range overlap math, quota calculations, maintenance lifecycle preservation, XSS sanitization, atomic cascades, alternative recommendations, and ICS export generation.

---

## 6. Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>Cmd</kbd> + <kbd>K</kbd> | Open Global Command Palette |
| <kbd>/</kbd> | Quick Jump (when not typing in an input) |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Inspect focused grid slot or book room |
| <kbd>Esc</kbd> | Dismiss active modal or Command Palette |
| <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> | Accessible keyboard focus navigation |

---

## 7. Platform Engineering Team (Team SOUL)

Developed for the **Division of Academic Affairs & Estate Operations** at **Lovely Professional University (LPU)**, Punjab:

| Engineer | Registration No. | Engineering Role |
| :--- | :--- | :--- |
| **Angel Seth** | `12611041` | Systems UI/UX, CSS Architecture & Session State |
| **Kartik** | `12612598` | Core Availability Engine, Alternative Recommender & Conflict Math |
| **Dhruv Anand** | `12619773` | Storage Persistence, Command Palette & Dashboard Analytics |

---

## 8. Operational Security & Architecture Notes

- **Client Demonstration Model**: The 4-digit coordinator PIN (`1234`) simulates administrative privilege escalation inside `sessionStorage` (`CAMPUS_ADMIN_SESSION`) rather than persistent storage, demonstrating role-based access control (RBAC) boundaries on all mutating methods. In production environments, this interfaces with university LDAP/OAuth SSO and JWT token validation.
- **Storage Graceful Degradation**: If storage quotas are exceeded or private browsing disables storage, the portal switches automatically to an in-memory caching fallback (`_memoryCache`) accompanied by a non-intrusive status banner.
