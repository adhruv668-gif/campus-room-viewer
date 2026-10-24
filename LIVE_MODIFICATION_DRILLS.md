# 10 Live Modification Drills for Examiner Coding Tests
> **Course:** LPU CSE326 Web Development (CA1 Assessment — Live Viva Modification)  
> **Team SOUL:** Angel Seth (12401231), Kartik (12401232), Dhruv Anand (12401233)  
> **Purpose:** Step-by-step instructions for live code changes an examiner might ask any member to demonstrate on the spot.

---

### Drill 1: Change Student Max Consecutive Slot Limit from 2 to 3
- **Examiner Prompt:** *"Change the maximum consecutive booking duration allowed for students from 2 slots to 3 slots."*
- **File to Edit:** [`js/config.js`](file:///c:/Users/anand/Downloads/campus%20room/js/config.js)
- **Line to Change (~Line 75):**
  ```javascript
  // BEFORE:
  STUDENT_MAX_CONSECUTIVE_SLOTS: 2,
  
  // AFTER:
  STUDENT_MAX_CONSECUTIVE_SLOTS: 3,
  ```
- **How to Demonstrate:**
  1. Save `config.js` and reload `index.html`.
  2. Navigate to `#/request`. Select `Student`.
  3. Pick Slot 1 to Slot 3 (3 slots). Notice that validation passes without blocking.
- **Viva Explanation:** *"All business limits are centralized in the `Config.LIMITS` dictionary in `config.js`. When updated, `Validators.validateSlots()` references `Config.LIMITS.STUDENT_MAX_CONSECUTIVE_SLOTS` directly."*

---

### Drill 2: Change Admin PIN from 1234 to 4321
- **Examiner Prompt:** *"Change the default Room Coordinator Admin PIN from 1234 to 4321."*
- **File to Edit:** [`js/config.js`](file:///c:/Users/anand/Downloads/campus%20room/js/config.js)
- **Line to Change (~Line 86):**
  ```javascript
  // BEFORE:
  DEFAULT_PIN: '1234',
  
  // AFTER:
  DEFAULT_PIN: '4321',
  ```
- **How to Demonstrate:**
  1. Save `config.js`. In the footer, click "Reset Sample Data" so settings re-seed.
  2. In the header role switcher, select "Admin".
  3. Enter `4321` to unlock. Entering `1234` will show "Incorrect Admin PIN".
- **Viva Explanation:** *"The default PIN is stored in `Config.DEFAULT_PIN`. During app initialization, `Store.js` seeds this into `settings.adminPin`."*

---

### Drill 3: Add a New Teaching Slot 10 (18:00 - 19:00)
- **Examiner Prompt:** *"The university wants to add an evening 10th slot from 18:00 to 19:00."*
- **File to Edit:** [`js/config.js`](file:///c:/Users/anand/Downloads/campus%20room/js/config.js)
- **Lines to Change (~Line 25):**
  ```javascript
  // Append inside Config.SLOTS array:
  { id: 10, label: 'Slot 10', start: '18:00', end: '19:00', startHour: 18, startMin: 0, endHour: 19, endMin: 0 }
  ```
- **How to Demonstrate:**
  1. Save `config.js` and reload.
  2. Open `#/availability`. Notice a 10th column (`Slot 10: 18:00 - 19:00`) automatically renders across all 28 rooms.
- **Viva Explanation:** *"The availability table headers and body cells loop dynamically over `Config.SLOTS`. Adding an entry automatically scales the entire timetable grid."*

---

### Drill 4: Change Active Booking Quota for Students from 3 to 5
- **Examiner Prompt:** *"Allow students to have up to 5 active pending/approved requests at the same time."*
- **File to Edit:** [`js/config.js`](file:///c:/Users/anand/Downloads/campus%20room/js/config.js)
- **Line to Change (~Line 76):**
  ```javascript
  // BEFORE:
  STUDENT_MAX_ACTIVE_REQUESTS: 3,
  
  // AFTER:
  STUDENT_MAX_ACTIVE_REQUESTS: 5,
  ```
- **How to Demonstrate:**
  1. Save `config.js` and reload.
  2. Navigate to `#/request`. `Validators.validateRequestForm()` will now permit up to 5 active upcoming reservations.

---

### Drill 5: Change the Application Primary Theme Accent Color
- **Examiner Prompt:** *"Change the application's primary blue brand color to emerald green or purple."*
- **File to Edit:** [`css/base.css`](file:///c:/Users/anand/Downloads/campus%20room/css/base.css)
- **Line to Change (~Line 18):**
  ```css
  /* BEFORE (Blue): */
  --color-primary: #1d4ed8;

  /* AFTER (Purple or Emerald Green): */
  --color-primary: #7c3aed; /* Purple */
  /* or --color-primary: #059669; /* Emerald */
  ```
- **How to Demonstrate:**
  1. Save `base.css` and reload.
  2. Notice the header logo, active navigation pills, primary buttons, and progress steps immediately take on the new brand color.
- **Viva Explanation:** *"Design tokens are centralized as CSS custom properties in `:root`. Changing `--color-primary` updates the entire UI hierarchy instantly."*

---

### Drill 6: Add a New Room Amenity (e.g. "VR Headsets")
- **Examiner Prompt:** *"Add 'VR Headsets' as a selectable room facility."*
- **File to Edit:** [`js/config.js`](file:///c:/Users/anand/Downloads/campus%20room/js/config.js)
- **Line to Change (~Line 55):**
  ```javascript
  // Append inside Config.FACILITIES array:
  'VR Headsets'
  ```
- **How to Demonstrate:**
  1. Save `config.js` and reload.
  2. Navigate to `#/find` or `#/request`. The facility filter and checklist now include "VR Headsets".
- **Viva Explanation:** *"Form checkboxes and search multi-select dropdowns iterate dynamically over `Config.FACILITIES`."*

---

### Drill 7: Change Booking Auto-Dismiss Toast Duration from 4s to 2s
- **Examiner Prompt:** *"Make toast notifications disappear faster (after 2 seconds)."*
- **File to Edit:** [`js/ui.js`](file:///c:/Users/anand/Downloads/campus%20room/js/ui.js)
- **Line to Change (~Line 46):**
  ```javascript
  // BEFORE:
  setTimeout(function() { ... }, 4000);
  
  // AFTER:
  setTimeout(function() { ... }, 2000);
  ```
- **How to Demonstrate:**
  1. Save `ui.js` and reload.
  2. Trigger any action (e.g. toggle theme or submit request). Notice the toast notification automatically slides out after 2 seconds.

---

### Drill 8: Modify the Booking Reference Prefix from "RB-" to "LPU-"
- **Examiner Prompt:** *"Change booking reference numbers to look like `LPU-20261024-001` instead of `RB-20261024-001`."*
- **File to Edit:** [`js/utils.js`](file:///c:/Users/anand/Downloads/campus%20room/js/utils.js)
- **Line to Change (~Line 190):**
  ```javascript
  // BEFORE:
  return `RB-${dateCompact}-${padNum}`;

  // AFTER:
  return `LPU-${dateCompact}-${padNum}`;
  ```
- **How to Demonstrate:**
  1. Save `utils.js` and submit a new booking on `#/request`.
  2. Notice the generated reference is `LPU-YYYYMMDD-001`.

---

### Drill 9: Increase Minimum Rejection Remark Length from 5 to 15 Characters
- **Examiner Prompt:** *"Require coordinators to provide more detailed rejection reasons (minimum 15 characters instead of 5)."*
- **File to Edit:** [`js/validators.js`](file:///c:/Users/anand/Downloads/campus%20room/js/validators.js)
- **Line to Change (~Line 245):**
  ```javascript
  // BEFORE:
  if (trimmed.length < 5 || trimmed.length > 200) {
    return { valid: false, error: 'Rejection remark must be between 5 and 200 characters.' };
  }

  // AFTER:
  if (trimmed.length < 15 || trimmed.length > 200) {
    return { valid: false, error: 'Rejection remark must be at least 15 characters.' };
  }
  ```
- **How to Demonstrate:**
  1. As Admin, attempt rejecting a booking with a short remark like `"Room busy"`.
  2. Validation error displays: `"Rejection remark must be at least 15 characters."`

---

### Drill 10: Toggle Maintenance Status from Admin UI
- **Examiner Prompt:** *"Show me how an administrator marks a room as under maintenance and explain what happens to existing bookings."*
- **How to Demonstrate:**
  1. In the header role switcher, select "Admin" (PIN `1234`).
  2. Navigate to `#/admin` &rarr; click the "Rooms" tab.
  3. Find Room 101; click "Set Maintenance".
  4. A warning modal appears showing how many future bookings will be affected.
  5. Click "Confirm Maintenance".
  6. In `#/availability`, Room 101 now shows gray striped maintenance cells, and all conflicting bookings are automatically moved to `Cancelled`.
- **Viva Explanation:** *"Implemented in `Rooms.toggleMaintenance()` in `js/rooms.js`. It ensures safety by cancelling any conflicting future reservations with a documented audit remark."*
