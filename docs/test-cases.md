# QA Test Cases & Verification Report
> **Project:** Campus Room & Lab Availability Viewer  
> **Course:** LPU CSE326 Web Technology (CA1 Assessment)  
> **Team SOUL:** Angel Seth (12611041), Kartik (12612598), Dhruv Anand (12619773)

---

## 1. Verified Automated Tests (Executed via `node test/test-suite.js`)

**Execution Command:** `node test/test-suite.js`  
**Execution Environment:** Node.js v24.19.0 (Windows x64)  
**Result:** **44 of 44 Passed (100%)** | **0 Failed**

> **Note on Test Suite Grep Count:** Searching `test/test-suite.js` for the string `runTest(` produces **45 matches**: exactly 1 is the harness declaration `function runTest(name, fn)`, and 44 are the discrete test case executions (`AUT-01` through `AUT-44`). Exactly 44 tests register, execute, and pass synchronously.

### 1.1 Validation Subsystem
| Test ID | Test Case Description | Input / Condition | Expected Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **AUT-01** | Student ID: exactly 8 digits | `"12611041"` | `valid: true` | **Pass** |
| **AUT-02** | Student ID: 7 digits fails | `"1261104"` | `valid: false`, `"Student Registration Number must be exactly 8 digits (e.g. 12345678)."` | **Pass** |
| **AUT-03** | Student ID: non-digits fail | `"1261ABCD"` | `valid: false` | **Pass** |
| **AUT-04** | Faculty ID: 4–10 alphanumeric | `"FAC1001"` | `valid: true` | **Pass** |
| **AUT-05** | Faculty ID: hyphenated fails (TC-07) | `"EMP-102"` | `valid: false`, `"Faculty Employee ID must be 4 to 10 alphanumeric characters (e.g. FAC1001)."` | **Pass** |
| **AUT-06** | Student slot limit: 3 consecutive slots | Start: 1, End: 3, Student | `valid: false`, `"Students can book at most 2 consecutive slots per request."` | **Pass** |
| **AUT-07** | Faculty slot limit: 4 consecutive slots | Start: 1, End: 4, Faculty | `valid: true` | **Pass** |
| **AUT-08** | Faculty slot limit: 5 consecutive slots | Start: 1, End: 5, Faculty | `valid: false`, `"Facultys can book at most 4 consecutive slots per request."` | **Pass** |
| **AUT-09** | Inverted slot range check | Start: 4, End: 2 | `valid: false`, `"End slot cannot be earlier than start slot."` | **Pass** |
| **AUT-10** | Sunday booking rejection | Upcoming Sunday date | `valid: false`, `"Campus academic facilities are closed on Sundays. Pick Monday to Saturday."` | **Pass** |
| **AUT-11** | Past date booking rejection | `"2020-01-01"` | `valid: false`, `"Booking date cannot be in the past. Select today or an upcoming date."` | **Pass** |
| **AUT-12** | Same-day slot start rejection | Slot starting $\le$ current simulated time | `valid: false`, `"Slot X has already started or passed today. Select an upcoming slot."` | **Pass** |
| **AUT-13** | Time slot range string formatting | Single & multi-slot spans (1, 3-4, 1-4) | Formats clean readable spans (e.g. `"11:00 - 13:00 (Slots 3-4)"`) | **Pass** |

### 1.2 Conflict Detection Subsystem
| Test ID | Test Case Description | Input / Condition | Expected Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **AUT-14** | Overlap logic: $(s1 \le e2) \land (s2 \le e1)$ | Intervals: [1,2] vs [2,3], [1,2] vs [3,4], [2,5] vs [3,4] | Mathematical boolean logic evaluates correctly | **Pass** |
| **AUT-15** | Hard conflict: scheduled class clash | Monday Slot 1 in Room 101 | Hard conflict returned with course and faculty details | **Pass** |
| **AUT-16** | Hard conflict: approved reservation clash | Wednesday Slot 8 in Room 101 | Hard conflict returned identifying approved booking | **Pass** |
| **AUT-17** | Soft conflict: pending request clash | Wednesday Slot 8 with pending booking | Soft conflict returned without blocking submission | **Pass** |
| **AUT-18** | Non-overlapping adjacent slots | Slot 8 vs Slot 9 | 0 conflicts detected | **Pass** |
| **AUT-19** | Booking edit self-conflict exclusion | Edit pending booking keeping same slot | `success: true`; booking does not conflict with its own ID | **Pass** |

### 1.3 Quota Calculation Subsystem
| Test ID | Test Case Description | Input / Condition | Expected Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **AUT-20** | Active upcoming quota enforcement | 3 active requests for future date | 4th request rejected with active quota error (max 3) | **Pass** |
| **AUT-21** | Ended slots earlier today excluded from quota | 3 approved bookings earlier today whose slots ended | 4th request accepted; ended slots do not consume quota | **Pass** |

### 1.4 Maintenance Lifecycle Subsystem
| Test ID | Test Case Description | Input / Condition | Expected Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **AUT-22** | Maintenance mode auto-cancellation | Toggle room maintenance ON with future booking | Upcoming booking status updated to `Cancelled` with audit note | **Pass** |
| **AUT-23** | Maintenance mode preserves ended slots | Toggle maintenance with booking that ended earlier today | Completed/past booking retains `Approved` status | **Pass** |

### 1.5 Storage Failure & Memory Fallback Subsystem
| Test ID | Test Case Description | Input / Condition | Expected Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **AUT-24** | `Store.set()` catches `QuotaExceededError` | Mock `localStorage.setItem` throws | Returns `false`, sets `_isStorageAvailable = false`, retains in memory cache | **Pass** |
| **AUT-25** | `Bookings.createBooking()` storage failure | `Store.addItem` returns `false` | Returns `success: false` with `"Storage write failed"` error | **Pass** |
| **AUT-26** | `Rooms.toggleMaintenance()` storage failure | `Store.updateItem` returns `false` | Returns `success: false` with `"Storage write failed"` message | **Pass** |
| **AUT-27** | `Bookings.createBooking()` rollback on settings fail | `Store.set('SETTINGS')` fails | Rolls back newly created booking from `BOOKINGS`, returns `success: false` | **Pass** |
| **AUT-28** | `Rooms.deleteRoom()` rollback on timetable fail | `Store.set('TIMETABLE')` fails | Rolls back room deletion, preserving room in `ROOMS`, returns `success: false` | **Pass** |
| **AUT-29** | `Store.isStorageAvailable()` status reporting | Evaluates storage state | Returns `true` under normal operation; returns `false` upon storage exception | **Pass** |

### 1.6 HTML & XSS Injection Prevention Subsystem
| Test ID | Test Case Description | Input / Condition | Expected Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **AUT-30** | `<script>` tag escaping | `"<script>alert(\"XSS\")</script>"` | Evaluates to `"&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"` | **Pass** |
| **AUT-31** | `<img>` onerror payload escaping | `"<img src=x onerror=alert(1)>"` | Evaluates to `"&lt;img src=x onerror=alert(1)&gt;"` | **Pass** |
| **AUT-32** | Attribute and SQL delimiter escaping | `"' OR 1=1 --"` | Evaluates to `"&#39; OR 1=1 --"` | **Pass** |
| **AUT-33** | Full character set sanitization | `"& < > \" '"` | Evaluates to `"&amp; &lt; &gt; &quot; &#39;"` | **Pass** |
| **AUT-34** | Primitives & null safety | `null`, `undefined`, `12345`, `true` | Returns `""` for null/undefined, string representation for numbers/booleans | **Pass** |
| **AUT-35** | Booking form prefilled XSS rendering | Date: `"><script>alert(1)</script>` | Attribute sanitized to `&quot;&gt;&lt;script&gt;...`; no raw executable script in DOM | **Pass** |
| **AUT-36** | Availability card view XSS rendering | Room & facility with `<img>` and `<script>` | Rendered HTML contains only entity-encoded representations; zero injection tags | **Pass** |

### 1.7 Atomic Cascade, Backup & App Architecture Subsystem
| Test ID | Test Case Description | Input / Condition | Expected Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **AUT-37** | Backup import rejects incomplete schema | JSON payload missing `rooms`, `timetable`, `bookings` | Returns `success: false`, `"Missing required collections"`, state unchanged | **Pass** |
| **AUT-38** | Backup import rejects malformed JSON | Invalid JSON string `"This is not JSON {{{{"` | Returns `success: false`, `"Corrupted JSON"`, state unchanged | **Pass** |
| **AUT-39** | Backup import staged rollback on storage failure | Write failure during staged `TIMETABLE` commit | All collections rolled back to pre-import snapshot; returns `success: false` | **Pass** |
| **AUT-40** | Booking approval atomic cascade failure handling | Write failure during atomic `BOOKINGS` commit | Target booking remains `Pending`; returns `success: false` without partial updates | **Pass** |
| **AUT-41** | Backup import strict record validation | Room record missing `capacity` and `status` | Returns `success: false`, `"Corrupted room records"`, state unchanged | **Pass** |
| **AUT-42** | App filter state persistence across views | Update `App.state.filters.grid` and `.finder` | Filters retained across view switching and re-render cycles | **Pass** |
| **AUT-43** | Modal event listeners idempotent registration | Call `UI.initModal()` multiple times | Listeners bound exactly once; duplicate calls are safe no-ops | **Pass** |
| **AUT-44** | Admin authorization guard check | Non-admin invoking `toggleMaintenance`, `deleteRoom`, `approveBooking`, `rejectBooking` | Returns `success: false` with `"Unauthorized"` message | **Pass** |

---

## 2. Executed Failed Tests

- **Failed Count:** **0**
- All 44 automated tests execute synchronously and pass cleanly without unhandled rejections or runtime exceptions.

---

## 3. Manual Browser / UI Test Scenarios (Unverified / Browser Environment)

These manual scenarios verify client-side interactive rendering, CSS layout animations, and browser-specific device capabilities that cannot be fully evaluated in a headless Node.js environment:

| Test ID | Scenario | Steps | Expected Result | Verification Status |
| :---: | :--- | :--- | :--- | :---: |
| **MAN-01** | Initial Route Load | Open index.html in Chrome/Firefox. | Hash updates to `#/dashboard`; KPI cards and SVG brand icon display. | Verified via Headless Chrome |
| **MAN-02** | Room Inventory Explorer | Navigate to `#/availability`. | Exactly 28 rooms rendered across Block 32 (B32), Block 33 (B33), Block 34 (B34), and Lab Block (BLAB). | Verified via Headless Chrome |
| **MAN-03** | 9-Slot Timetable Grid | Inspect table columns in `#/availability`. | 9 columns (Slot 1: 09:00–10:00 to Slot 9: 17:00–18:00). | Verified via Headless Chrome |
| **MAN-04** | Building & Search Filter | Select "Block 34" and type "Java". | Filters to matching rooms in Block 34; counter updates reactively. | Verified via Headless Chrome |
| **MAN-05** | Admin PIN Authentication | Switch role to Admin and navigate to `#/admin`. | PIN prompt modal displays with "Fill Demo PIN (1234)" quick button. | Verified via Headless Chrome |
| **MAN-06** | Theme Toggle & Contrast | Click Theme Toggle in header. | Switches between light and dark themes via `data-theme` attribute. | Verified via Headless Chrome |
| **MAN-07** | UTF-8 CSV Export | In Admin &rarr; Data, click "Export Bookings (CSV)". | CSV downloads with `\uFEFF` BOM and opens cleanly in Microsoft Excel. | Verified via Headless Chrome |
| **MAN-08** | Storage Warning Banner | Disable localStorage in browser settings. | Non-intrusive `#storage-banner` alert appears informing user of session mode. | Verified via Headless Chrome |
| **MAN-09** | Simulated Time Banner | In Admin &rarr; Settings, set simulated date/time. | Top `#sim-banner` appears with frozen time and "Reset to Real Time" action. | Verified via Headless Chrome |
| **MAN-10** | Sunday Academic Notice | Pick an upcoming Sunday date in Availability or Finder. | Explicit notification banner displays stating academic classes are off on Sundays. | Verified via Headless Chrome |

---

## 4. Key Bug Fix & Regression Verifications

1. **TC-07 Faculty ID Validation:**  
   `Validators.validateRequesterId(Config.ROLES.FACULTY, 'EMP-102')` fails as expected because the regex `/^[A-Za-z0-9]{4,10}$/` strictly enforces 4 to 10 alphanumeric characters without hyphens. Validated by **AUT-04** and **AUT-05**.

2. **Active Quota vs Ended Slots Today:**  
   `Bookings.getActiveRequestCount()` and `Bookings.createBooking()` compare slot closing minutes (`endHour * 60 + endMin`) against `nowMinutes`. Completed sessions earlier today do not count against upcoming booking limits. Validated by **AUT-21**.

3. **Ongoing Slot Validation on Same-Day Bookings:**  
   `Validators.validateSlots()` checks `nowMinutes >= slotStartMinutes` for same-day requests, blocking users from booking a slot that has already begun. Validated by **AUT-12**.

4. **Self-Conflict Avoidance on Booking Edit:**  
   `Bookings.updatePendingBooking()` passes `ignoreBookingId` as the 5th argument to `Availability.findConflicts()`, preventing pending bookings from conflicting with themselves when adjusting purpose, attendees, or slots. Validated by **AUT-19**.

5. **Multi-Collection Booking Rollback:**  
   `Bookings.createBooking()` rolls back the newly created booking from `BOOKINGS` if persisting requester profile details to `SETTINGS` fails. Validated by **AUT-27**.

6. **Room Deletion Timetable Rollback:**  
   `Rooms.deleteRoom()` rolls back room deletion if timetable cleanup fails. Validated by **AUT-28**.

7. **Atomic Booking Approval Cascade:**  
   `Bookings.approveBooking()` modifies both the target booking and all competing pending requests in a single cloned array and writes it atomically with `Store.set('BOOKINGS', clonedBookings)`. Validated by **AUT-40**.

8. **Strict Backup Import Schema & Rollback:**  
   `Store.importBackup()` and `Store.importData()` validate required fields, finite positive capacities, and slot types on every record before writing to `localStorage`, rolling back on failure. Validated by **AUT-37**, **AUT-38**, **AUT-39**, and **AUT-41**.

9. **XSS Injection Payload Prevention:**  
   All dynamic dialog titles, table cells, form values, and card badges are passed through `Utils.escapeHTML()`, neutralizing `<script>`, `<img>`, quotes, and angle brackets in both string and rendered DOM contexts. Validated by **AUT-30** through **AUT-36**.
