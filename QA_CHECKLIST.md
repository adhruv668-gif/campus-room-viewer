# QA Testing & Verification Checklist
> **Campus Room & Lab Availability Viewer**  
> **Course:** LPU CSE326 CA1 | **Team:** SOUL (Angel Seth, Kartik, Dhruv Anand)  
> **Total Test Cases:** 42 Comprehensive Scenarios

---

## 1. Navigation, Shell & Accessibility (Tests 1–6)

| Test ID | Test Scenario | Steps to Execute | Expected Behavior | Status |
| :---: | :--- | :--- | :--- | :---: |
| **TC-01** | Initial Route Redirect | Load `index.html` without hash. | URL updates to `#/dashboard`; Dashboard view is rendered; `<title>` is set. | [x] Pass |
| **TC-02** | Hash Navigation | Click each menu item: Availability, Find, Request, Requests, Help. | View switches instantly with zero page reload; active nav tab highlights. | [x] Pass |
| **TC-03** | Accessible Skip Link | Focus skip link via `Tab` key and press `Enter`. | Keyboard focus shifts immediately to `<main id="main-content">`. | [x] Pass |
| **TC-04** | Accessible Modal Trap | Open slot details or booking modal; press `Escape`. | Modal dialog closes cleanly; keyboard focus restores to trigger element. | [x] Pass |
| **TC-05** | Dark/Light Theme Toggle | Click theme toggle button in header. | `data-theme` switches between `light` and `dark`; colors update instantly. | [x] Pass |
| **TC-06** | Mobile Drawer Toggle | Resize browser to 360px; click hamburger icon. | Navigation drawer expands (`aria-expanded="true"`); closes on route click. | [x] Pass |

---

## 2. Real-Time Dashboard & Summary Visuals (Tests 7–11)

| Test ID | Test Scenario | Steps to Execute | Expected Behavior | Status |
| :---: | :--- | :--- | :--- | :---: |
| **TC-07** | Live Clock Synchronization | Observe header clock for 5 seconds. | Clock updates every second showing current date and 24h local time. | [x] Pass |
| **TC-08** | Current Teaching Slot Detection | Check "Live Clock" card between 09:00 and 18:00. | Correct slot badge (Slot 1–9) is displayed; shows outside hours after 18:00. | [x] Pass |
| **TC-09** | KPI Card Interactivity | Click on the "Campus Rooms" KPI card. | App navigates to `#/availability` showing all 28 rooms. | [x] Pass |
| **TC-10** | Building Occupancy Bar Chart | Inspect building occupancy visual bars on Dashboard. | Percentage bars render dynamically with proper widths and accessible labels. | [x] Pass |
| **TC-11** | Pure CSS Donut Chart | Check "Request Status Breakdown" widget. | CSS `conic-gradient` renders proportional slices; center hole shows total count. | [x] Pass |

---

## 3. Availability Explorer & Timetable Grid (Tests 12–18)

| Test ID | Test Scenario | Steps to Execute | Expected Behavior | Status |
| :---: | :--- | :--- | :--- | :---: |
| **TC-12** | Complete Room Inventory | Open `#/availability` with default filters. | Exactly 28 rooms displayed, grouped under 4 academic buildings. | [x] Pass |
| **TC-13** | 9-Slot Grid Completeness | Verify table column headers for any room row. | 9 columns (Slot 1: 09:00–10:00 to Slot 9: 17:00–18:00) with times. | [x] Pass |
| **TC-14** | Building Filter | Select "Block 34" in Building dropdown. | Only rooms located in Block 34 are shown; counter updates to "Showing 8 of 28". | [x] Pass |
| **TC-15** | Room Type Filter | Select "Computer Lab" in Room Type dropdown. | Only computer labs appear; lecture classrooms are hidden. | [x] Pass |
| **TC-16** | Debounced Live Search | Type "Java" in the search box. | Grid filters to rooms hosting Java classes or with "Java" in their name. | [x] Pass |
| **TC-17** | Free Slots Only Toggle | Check "Only show rooms with free slots". | Rooms that are completely booked or occupied for the date are hidden. | [x] Pass |
| **TC-18** | Slot Inspection Modal | Click any grid cell (e.g. Free, Class, Booked). | Modal opens showing room name, slot time, status, and course or booking note. | [x] Pass |

---

## 4. Room Finder Engine (Tests 19–22)

| Test ID | Test Scenario | Steps to Execute | Expected Behavior | Status |
| :---: | :--- | :--- | :--- | :---: |
| **TC-19** | Date & Slot Range Search | Select Tomorrow, Slot 2 to 3, Attendees: 40. | Returns only rooms with capacity >= 40 that are completely free in Slots 2–3. | [x] Pass |
| **TC-20** | Amenities Matching | Check "Projector" and "AC" in Finder. | Filtered results only include rooms providing both Projector and AC. | [x] Pass |
| **TC-21** | Quick Booking Pre-Fill | Click "Reserve This Room" on a finder result card. | Redirects to `#/request` with room, date, and slots pre-populated in the form. | [x] Pass |
| **TC-22** | No Match Friendly State | Search for 200 attendees on a fully occupied slot. | Friendly empty-state illustration appears suggesting relaxing filters. | [x] Pass |

---

## 5. Input Validation & Quota Rules (Tests 23–29)

| Test ID | Test Scenario | Steps to Execute | Expected Behavior | Status |
| :---: | :--- | :--- | :--- | :---: |
| **TC-23** | Student Registration ID Format | Enter 7 digits ("1234567") as Student Reg No. | Validation error: "Student Registration Number must be exactly 8 digits". | [x] Pass |
| **TC-24** | Faculty Employee ID Format | Select Faculty; enter "EMP-102" as Employee ID. | Validated successfully (accepts 4–10 alphanumeric characters). | [x] Pass |
| **TC-25** | Past Slot Prevention | Pick today's date and select a slot that has ended. | Submission blocked: "Slot X has already ended today. Select a future slot." | [x] Pass |
| **TC-26** | 30-Day Forward Booking Limit | Select a booking date 35 days in the future. | Submission blocked: "Bookings can only be made up to 30 days in advance." | [x] Pass |
| **TC-27** | Max Consecutive Slots (Student) | As Student, select Slot 1 to 4 (4 hours). | Blocked: "Students can reserve a maximum of 2 consecutive slots." | [x] Pass |
| **TC-28** | Max Consecutive Slots (Faculty) | As Faculty, select Slot 1 to 4 (4 hours). | Accepted: Faculty are permitted up to 4 consecutive slots per policy. | [x] Pass |
| **TC-29** | Active Request Quota Limit | Submit a 4th request with an ID that has 3 pending. | Blocked: "You have reached the maximum active upcoming requests (3)." | [x] Pass |

---

## 6. Conflict Detection & Auto-Rejection (Tests 30–33)

| Test ID | Test Scenario | Steps to Execute | Expected Behavior | Status |
| :---: | :--- | :--- | :--- | :---: |
| **TC-30** | Maintenance Room Block | Try booking Room 301 while status is Maintenance. | Blocked with hard error: "Room is currently under maintenance." | [x] Pass |
| **TC-31** | Timetable Lecture Conflict | Attempt booking a slot occupied by a scheduled class. | Hard conflict error displayed naming the clashing lecture and faculty. | [x] Pass |
| **TC-32** | Approved Booking Conflict | Attempt booking a slot already approved for another user. | Hard conflict error blocks submission. | [x] Pass |
| **TC-33** | Approval Auto-Reject Cascade | As Admin, approve Request A that clashes with B. | Request A becomes `Approved`; Request B automatically turns `Rejected`. | [x] Pass |

---

## 7. Request Management & Audit Trail (Tests 34–37)

| Test ID | Test Scenario | Steps to Execute | Expected Behavior | Status |
| :---: | :--- | :--- | :--- | :---: |
| **TC-34** | Owner Editing | Edit a `Pending` request via `#/requests`. | Form opens with values; re-validates and updates store on save. | [x] Pass |
| **TC-35** | User Self-Cancellation | Click "Cancel" on a user's own `Pending` request. | Confirmation modal appears; status changes to `Cancelled`; history logged. | [x] Pass |
| **TC-36** | Admin Mandatory Rejection Remark | As Admin, click "Reject" on a request without remark. | Rejection blocked: remark between 5 and 200 characters is required. | [x] Pass |
| **TC-37** | Visual Progress Tracker | Click any request reference (`RB-...`) to view details. | Step tracker renders active/complete badges and shows chronological history. | [x] Pass |

---

## 8. Admin Portal & Data Tools (Tests 38–42)

| Test ID | Test Scenario | Steps to Execute | Expected Behavior | Status |
| :---: | :--- | :--- | :--- | :---: |
| **TC-38** | Admin PIN Protection | Switch to Admin role in header; enter "9999". | Error toast: "Incorrect Admin PIN"; portal remains locked. | [x] Pass |
| **TC-39** | Admin PIN Unlock | Switch to Admin role; enter "1234". | Success toast; Admin Panel tab appears in nav; admin tools unlocked. | [x] Pass |
| **TC-40** | Maintenance Auto-Cancellation | Put Room 101 under Maintenance in Admin. | Warning modal states affected bookings; future bookings auto-cancelled. | [x] Pass |
| **TC-41** | Delete Room Block Safeguard | Attempt to delete a room that has historical bookings. | Delete blocked: System suggests marking room as Maintenance instead. | [x] Pass |
| **TC-42** | Database JSON Backup & Reset | Export JSON backup, then click "Reset to Sample Data". | UTF-8 JSON downloads; reset restores original 28 rooms and sample bookings. | [x] Pass |
