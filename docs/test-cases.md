# QA Test Cases
> **Campus Room & Lab Availability Viewer**  
> **Course:** LPU CSE326 CA1 | **Team:** SOUL

---

## 1. Core Functional Scenarios

| Test ID | Scenario | Steps | Expected Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **TC-01** | Initial Route Load | Open the app without hash. | URL updates to `#/dashboard`; KPI metrics display. | Pass |
| **TC-02** | Room Inventory | Open `#/availability`. | Exactly 28 rooms displayed across 4 blocks. | Pass |
| **TC-03** | 9-Slot Grid | Inspect timetable columns. | 9 columns (Slot 1: 09:00–10:00 to Slot 9: 17:00–18:00). | Pass |
| **TC-04** | Building Filter | Select "Block 34" in filter. | Only Block 34 rooms appear; counter updates to "Showing 8 of 28". | Pass |
| **TC-05** | Live Search | Type "Java" in search box. | Grid filters to rooms hosting Java classes. | Pass |
| **TC-06** | Student ID Validation | Enter 7 digits ("1234567") as Student Reg No. | Validation error: "Student Registration Number must be exactly 8 digits (e.g. 12345678)." | Pass |
| **TC-07** | Faculty ID Validation | Select Faculty; enter "FAC1001". | Passes validation (4–10 alphanumeric characters, e.g. FAC1001). | Pass |
| **TC-08** | Max Slots (Student) | Select 3 consecutive slots as Student. | Validation error: "Students can book at most 2 consecutive slots per request." | Pass |
| **TC-09** | Max Slots (Faculty) | Select 4 consecutive slots as Faculty. | Accepted: Faculty are permitted up to 4 consecutive slots. | Pass |
| **TC-10** | Quota Limit | Submit a 4th request with an ID that has 3 pending. | Validation error: "You have reached the maximum active upcoming requests (3). Cancel or complete existing requests before submitting new ones." | Pass |
| **TC-11** | Hard Conflict Block | Attempt booking a slot with a scheduled lecture. | Blocked with hard conflict alert naming course and faculty. | Pass |
| **TC-12** | Approval Cascade | As Admin, approve Request A that clashes with B. | Request A becomes `Approved`; Request B automatically turns `Rejected`. | Pass |
| **TC-13** | Admin PIN Guard | Access `#/admin`; enter "9999". | Access denied; portal unlocks when entering PIN `1234`. | Pass |
| **TC-14** | Maintenance Cascade | Mark a room under Maintenance in Admin. | Conflicting future bookings are automatically cancelled. | Pass |
| **TC-15** | Theme Toggle | Click theme toggle button. | Switches between light and dark themes via `data-theme` attribute. | Pass |
