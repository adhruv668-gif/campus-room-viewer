# QA Test Cases & Verification Report
> **Project:** Campus Room & Lab Availability Viewer  
> **Course:** LPU CSE326 Web Technology (CA1 Assessment)  
> **Team SOUL:** Angel Seth (12611041), Kartik (12612598), Dhruv Anand (12619773)

---

## 1. Verified Automated Tests (Executed via `node test/test-suite.js`)

**Execution Command:** `node test/test-suite.js`  
**Execution Environment:** Node.js v24.19.0 (Windows x64)  
**Result:** **37 of 37 Passed (100%)** | **0 Failed**

> **Note on Test Suite Grep Count:** Searching `test/test-suite.js` for the string `runTest(` produces **38 matches**: exactly 1 is the harness declaration `function runTest(name, fn)`, and 37 are the discrete test case executions (`AUT-01` through `AUT-37`). Exactly 37 tests register, execute, and pass synchronously.

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

### 1.2 Conflict Detection Subsystem
| Test ID | Test Case Description | Input / Condition | Expected Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **AUT-12** | Overlap logic: $(s1 \le e2) \land (s2 \le e1)$ | Intervals: [1,2] vs [2,3], [1,2] vs [3,4], [2,5] vs [3,4] | Mathematical boolean logic evaluates correctly | **Pass** |
| **AUT-13** | Hard conflict: scheduled class clash | Monday Slot 1 in Room 101 | Hard conflict returned with course and faculty details | **Pass** |
| **AUT-14** | Hard conflict: approved reservation clash | Wednesday Slot 8 in Room 101 | Hard conflict returned identifying approved booking | **Pass** |
| **AUT-15** | Soft conflict: pending request clash | Wednesday Slot 8 with pending booking | Soft conflict returned without blocking submission | **Pass** |
| **AUT-16** | Non-overlapping adjacent slots | Slot 8 vs Slot 9 | 0 conflicts detected | **Pass** |

### 1.3 Quota Calculation Subsystem
| Test ID | Test Case Description | Input / Condition | Expected Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **AUT-17** | Active upcoming quota enforcement | 3 active requests for future date | 4th request rejected with active quota error (max 3) | **Pass** |
| **AUT-18** | Ended slots earlier today excluded from quota | 3 approved bookings earlier today whose slots ended | 4th request accepted; ended slots do not consume quota | **Pass** |

### 1.4 Maintenance Lifecycle Subsystem
| Test ID | Test Case Description | Input / Condition | Expected Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **AUT-19** | Maintenance mode auto-cancellation | Toggle room maintenance ON with future booking | Upcoming booking status updated to `Cancelled` with audit note | **Pass** |
| **AUT-20** | Maintenance mode preserves ended slots | Toggle maintenance with booking that ended earlier today | Completed/past booking retains `Approved` status | **Pass** |

### 1.5 Storage Failure & Memory Fallback Subsystem
| Test ID | Test Case Description | Input / Condition | Expected Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **AUT-21** | `Store.set()` catches `QuotaExceededError` | Mock `localStorage.setItem` throws | Returns `false`, sets `_isStorageAvailable = false`, retains in memory cache | **Pass** |
| **AUT-22** | `Bookings.createBooking()` storage failure | `Store.addItem` returns `false` | Returns `success: false` with `"Storage write failed"` error | **Pass** |
| **AUT-23** | `Rooms.toggleMaintenance()` storage failure | `Store.updateItem` returns `false` | Returns `success: false` with `"Storage write failed"` message | **Pass** |
| **AUT-24** | `Bookings.createBooking()` rollback on settings fail | `Store.set('SETTINGS')` fails | Rolls back newly created booking from `BOOKINGS`, returns `success: false` | **Pass** |
| **AUT-25** | `Rooms.deleteRoom()` rollback on timetable fail | `Store.set('TIMETABLE')` fails | Rolls back room deletion, preserving room in `ROOMS`, returns `success: false` | **Pass** |
| **AUT-26** | `Store.isStorageAvailable()` status reporting | Evaluates storage state | Returns `true` under normal operation; returns `false` upon storage exception | **Pass** |

### 1.6 HTML & XSS Injection Prevention Subsystem
| Test ID | Test Case Description | Input / Condition | Expected Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **AUT-27** | `<script>` tag escaping | `"<script>alert(\"XSS\")</script>"` | Evaluates to `"&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"` | **Pass** |
| **AUT-28** | `<img>` onerror payload escaping | `"<img src=x onerror=alert(1)>"` | Evaluates to `"&lt;img src=x onerror=alert(1)&gt;"` | **Pass** |
| **AUT-29** | Attribute and SQL delimiter escaping | `"' OR 1=1 --"` | Evaluates to `"&#39; OR 1=1 --"` | **Pass** |
| **AUT-30** | Full character set sanitization | `"& < > \" '"` | Evaluates to `"&amp; &lt; &gt; &quot; &#39;"` | **Pass** |
| **AUT-31** | Primitives & null safety | `null`, `undefined`, `12345`, `true` | Returns `""` for null/undefined, string representation for numbers/booleans | **Pass** |
| **AUT-32** | Booking form prefilled XSS rendering | Date: `"><script>alert(1)</script>` | Attribute sanitized to `&quot;&gt;&lt;script&gt;...`; no raw executable script in DOM | **Pass** |
| **AUT-33** | Availability card view XSS rendering | Room & facility with `<img>` and `<script>` | Rendered HTML contains only entity-encoded representations; zero injection tags | **Pass** |

### 1.7 Atomic Cascade & Staged Backup Rollback Subsystem
| Test ID | Test Case Description | Input / Condition | Expected Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **AUT-34** | Backup import rejects incomplete schema | JSON payload missing `rooms`, `timetable`, `bookings` | Returns `success: false`, `"Missing required collections"`, state unchanged | **Pass** |
| **AUT-35** | Backup import rejects malformed JSON | Invalid JSON string `"This is not JSON {{{{"` | Returns `success: false`, `"Corrupted JSON"`, state unchanged | **Pass** |
| **AUT-36** | Backup import staged rollback on storage failure | Write failure during staged `TIMETABLE` commit | All collections rolled back to pre-import snapshot; returns `success: false` | **Pass** |
| **AUT-37** | Booking approval atomic cascade failure handling | Write failure during atomic `BOOKINGS` commit | Target booking remains `Pending`; returns `success: false` without partial updates | **Pass** |

---

## 2. Executed Failed Tests

- **Failed Count:** **0**
- All 37 automated tests execute synchronously and pass cleanly without unhandled rejections or runtime exceptions.

---

## 3. Manual Browser / UI Test Scenarios (Unverified / Browser Environment)

These manual scenarios verify client-side interactive rendering, CSS layout animations, and browser-specific device capabilities that cannot be fully evaluated in a headless Node.js environment:

| Test ID | Scenario | Steps | Expected Result | Verification Status |
| :---: | :--- | :--- | :--- | :---: |
| **MAN-01** | Initial Route Load | Open index.html in Chrome/Firefox. | Hash updates to `#/dashboard`; KPI cards and SVG brand icon display. | Unverified (Manual Browser Check) |
| **MAN-02** | Room Inventory Explorer | Navigate to `#/availability`. | Exactly 28 rooms rendered across Block 32, 33, 34, and 38. | Unverified (Manual Browser Check) |
| **MAN-03** | 9-Slot Timetable Grid | Inspect table columns in `#/availability`. | 9 columns (Slot 1: 09:00–10:00 to Slot 9: 17:00–18:00). | Unverified (Manual Browser Check) |
| **MAN-04** | Building & Search Filter | Select "Block 34" and type "Java". | Filters to matching rooms in Block 34; counter updates reactively. | Unverified (Manual Browser Check) |
| **MAN-05** | Admin PIN Authentication | Switch role to Admin and navigate to `#/admin`. | PIN prompt modal displays; PIN `1234` unlocks coordinator tabs. | Unverified (Manual Browser Check) |
| **MAN-06** | Theme Toggle & Contrast | Click Theme Toggle in header. | Switches between light and dark themes via `data-theme` attribute. | Unverified (Manual Browser Check) |
| **MAN-07** | UTF-8 CSV Export | In Admin &rarr; Data, click "Export Bookings (CSV)". | CSV downloads with `\uFEFF` BOM and opens cleanly in Microsoft Excel. | Unverified (Manual Browser Check) |
| **MAN-08** | Storage Warning Banner | Disable localStorage in browser settings. | Non-intrusive `#storage-banner` alert appears informing user of session mode. | Unverified (Manual Browser Check) |
| **MAN-09** | Simulated Time Banner | In Admin &rarr; Settings, set simulated date/time. | Top `#sim-banner` appears with frozen time and "Reset to Real Time" action. | Unverified (Manual Browser Check) |

---

## 4. Key Bug Fix & Regression Verifications

1. **TC-07 Faculty ID Validation:**  
   `Validators.validateRequesterId(Config.ROLES.FACULTY, 'EMP-102')` fails as expected because the regex `/^[A-Za-z0-9]{4,10}$/` strictly enforces 4 to 10 alphanumeric characters without hyphens. Validated by **AUT-04** and **AUT-05**.

2. **Active Quota vs Ended Slots Today:**  
   `Bookings.getActiveRequestCount()` and `Bookings.createBooking()` compare slot closing minutes (`endHour * 60 + endMin`) against `nowMinutes`. Completed sessions earlier today do not count against upcoming booking limits. Validated by **AUT-18**.

3. **Maintenance Mode Cancellation Safety:**  
   `Rooms.toggleMaintenance()` skips cancelling bookings scheduled earlier today whose slot end time has passed, preserving historical logs. Validated by **AUT-20**.

4. **Multi-Collection Booking Rollback:**  
   `Bookings.createBooking()` rolls back the newly created booking from `BOOKINGS` if persisting requester profile details to `SETTINGS` fails. Validated by **AUT-24**.

5. **Room Deletion Timetable Rollback:**  
   `Rooms.deleteRoom()` rolls back room deletion if timetable cleanup fails. Validated by **AUT-25**.

6. **Atomic Booking Approval Cascade:**  
   `Bookings.approveBooking()` modifies both the target booking and all competing pending requests in a single cloned array and writes it atomically with `Store.set('BOOKINGS', clonedBookings)`. Validated by **AUT-37**.

7. **Staged Backup Import & Rollback:**  
   `Store.importBackup()` validates all collections before initiating writes, snapshots state, and executes a full rollback if any individual key write fails. Validated by **AUT-34**, **AUT-35**, and **AUT-36**.

8. **XSS Injection Payload Prevention:**  
   All dynamic dialog titles, table cells, form values, and card badges are passed through `Utils.escapeHTML()`, neutralizing `<script>`, `<img>`, quotes, and angle brackets in both string and rendered DOM contexts. Validated by **AUT-27** through **AUT-33**.
