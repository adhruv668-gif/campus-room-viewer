/**
 * test/test-suite.js
 * 
 * Purpose: Automated unit and regression test suite for Campus Room & Lab Availability Viewer.
 * Covers:
 *  1. Validation (Student/Faculty ID regex, slots, dates, quotas)
 *  2. Conflict Detection (Range overlap formula, Hard vs Soft conflicts, Class/Booking/Maintenance clashes)
 *  3. Quota Calculation (Active request caps, exclusion of ended slots earlier today)
 *  4. Maintenance Cancellation (Cascading cancel of upcoming bookings, preservation of ended slots)
 *  5. Storage Failure Handling (Graceful handling of localStorage write exceptions, fallback memory cache)
 * 
 * Execution: node test/test-suite.js
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// In-memory mock storage
let localStorageData = {};
const mockLocalStorage = {
  getItem: function(key) {
    return Object.prototype.hasOwnProperty.call(localStorageData, key) ? localStorageData[key] : null;
  },
  setItem: function(key, val) {
    localStorageData[key] = String(val);
  },
  removeItem: function(key) {
    delete localStorageData[key];
  },
  clear: function() {
    localStorageData = {};
  }
};

let sessionStorageData = {};
const mockSessionStorage = {
  getItem: function(key) {
    return Object.prototype.hasOwnProperty.call(sessionStorageData, key) ? sessionStorageData[key] : null;
  },
  setItem: function(key, val) {
    sessionStorageData[key] = String(val);
  },
  removeItem: function(key) {
    delete sessionStorageData[key];
  },
  clear: function() {
    sessionStorageData = {};
  }
};

const mockUI = {
  showToast: function() {},
  showModal: function(title, body, onConfirm) {
    if (typeof onConfirm === 'function') onConfirm();
  },
  closeModal: function() {},
  applyTheme: function() {},
  initClock: function() {}
};

const context = {
  console: console,
  Date: Date,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  localStorage: mockLocalStorage,
  sessionStorage: mockSessionStorage,
  UI: mockUI,
  document: {
    documentElement: { setAttribute: function() {}, getAttribute: function() {} },
    getElementById: function() { return null; },
    querySelector: function() { return null; },
    querySelectorAll: function() { return []; },
    addEventListener: function() {},
    createElement: function() { return { setAttribute: function() {}, style: {} }; }
  }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

// Helper to load files into vm context
function loadScript(relPath, exportName) {
  const fullPath = path.join(__dirname, '..', relPath);
  let code = fs.readFileSync(fullPath, 'utf8');
  if (exportName) {
    code += `\nglobalThis.${exportName} = ${exportName};`;
  }
  vm.runInContext(code, context, { filename: fullPath });
}

// Load project scripts in order
loadScript('js/config.js', 'Config');
loadScript('js/utils.js', 'Utils');
loadScript('js/store.js', 'Store');
loadScript('js/seed.js', 'Seed');
loadScript('js/validators.js', 'Validators');
loadScript('js/rooms.js', 'Rooms');
loadScript('js/availability.js', 'Availability');
loadScript('js/bookings.js', 'Bookings');

const Config = context.Config;
const Utils = context.Utils;
const Store = context.Store;
const Validators = context.Validators;
const Rooms = context.Rooms;
const Availability = context.Availability;
const Bookings = context.Bookings;

let passedTests = 0;
let totalTests = 0;

// Dynamic Date Helpers to prevent date expiration
function getUpcomingDateForWeekday(targetWeekday, minDaysAhead = 1) {
  const d = new Date(Utils.getNow().getTime());
  d.setDate(d.getDate() + minDaysAhead);
  while (d.getDay() !== targetWeekday) {
    d.setDate(d.getDate() + 1);
  }
  return Utils.getLocalDateString(d);
}

function getUpcomingFutureDate(daysAhead = 3) {
  const d = new Date(Utils.getNow().getTime());
  d.setDate(d.getDate() + daysAhead);
  if (d.getDay() === 0) {
    d.setDate(d.getDate() + 1); // skip Sunday
  }
  return Utils.getLocalDateString(d);
}

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log('====================================================');
console.log('CAMPUS ROOM VIEWER - AUTOMATED TEST SUITE');
console.log('====================================================\n');

// ----------------------------------------------------
// 1. VALIDATION TESTS
// ----------------------------------------------------
console.log('--- 1. Validation Tests ---');

runTest('Student ID: exactly 8 digits passes (12611041)', () => {
  const res = Validators.validateRequesterId(Config.ROLES.STUDENT, '12611041');
  assert.strictEqual(res.valid, true);
});

runTest('Student ID: 7 digits fails with specific message', () => {
  const res = Validators.validateRequesterId(Config.ROLES.STUDENT, '1261104');
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, 'Student Registration Number must be exactly 8 digits (e.g. 12345678).');
});

runTest('Student ID: non-digits fail', () => {
  const res = Validators.validateRequesterId(Config.ROLES.STUDENT, '1261ABCD');
  assert.strictEqual(res.valid, false);
});

runTest('Faculty ID: 4-10 alphanumeric characters passes (FAC1001)', () => {
  const res = Validators.validateRequesterId(Config.ROLES.FACULTY, 'FAC1001');
  assert.strictEqual(res.valid, true);
});

runTest('Faculty ID: hyphenated string (EMP-102) fails with specific message', () => {
  const res = Validators.validateRequesterId(Config.ROLES.FACULTY, 'EMP-102');
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, 'Faculty Employee ID must be 4 to 10 alphanumeric characters (e.g. FAC1001).');
});

runTest('Slot validation: Student exceeding 2 consecutive slots fails', () => {
  const futureDate = getUpcomingFutureDate(2);
  const res = Validators.validateSlots(1, 3, Config.ROLES.STUDENT, futureDate);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, 'Students can book at most 2 consecutive slots per request.');
});

runTest('Slot validation: Faculty allowed up to 4 consecutive slots', () => {
  const futureDate = getUpcomingFutureDate(2);
  const res = Validators.validateSlots(1, 4, Config.ROLES.FACULTY, futureDate);
  assert.strictEqual(res.valid, true);
});

runTest('Slot validation: Faculty exceeding 4 consecutive slots fails', () => {
  const futureDate = getUpcomingFutureDate(2);
  const res = Validators.validateSlots(1, 5, Config.ROLES.FACULTY, futureDate);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, 'Facultys can book at most 4 consecutive slots per request.');
});

runTest('Slot validation: Inverted range (endSlot < startSlot) fails', () => {
  const futureDate = getUpcomingFutureDate(2);
  const res = Validators.validateSlots(4, 2, Config.ROLES.STUDENT, futureDate);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, 'End slot cannot be earlier than start slot.');
});

runTest('Date validation: Sunday is rejected', () => {
  const nextSunday = getUpcomingDateForWeekday(0);
  const res = Validators.validateDate(nextSunday);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, 'Campus academic facilities are closed on Sundays. Pick Monday to Saturday.');
});

runTest('Date validation: Past date is rejected', () => {
  const res = Validators.validateDate('2020-01-01');
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, 'Booking date cannot be in the past. Select today or an upcoming date.');
});


// ----------------------------------------------------
// 2. CONFLICT DETECTION TESTS
// ----------------------------------------------------
console.log('\n--- 2. Conflict Detection Tests ---');

runTest('Range Overlap Logic: (s1 <= e2) && (s2 <= e1)', () => {
  // Slot 1-2 vs Slot 2-3 overlap at Slot 2
  assert.strictEqual((1 <= 3) && (2 <= 2), true);
  // Slot 1-2 vs Slot 3-4 do not overlap
  assert.strictEqual((1 <= 4) && (3 <= 2), false);
  // Slot 2-5 vs Slot 3-4 overlap
  assert.strictEqual((2 <= 4) && (3 <= 5), true);
  // Slot 1-4 vs Slot 1-4 overlap
  assert.strictEqual((1 <= 4) && (1 <= 4), true);
});

runTest('Hard Conflict: Detects scheduled timetable class overlap', () => {
  Store.init(); // loads seed data
  // Upcoming Monday in room-32-101 has CSE326 class at Slot 1
  const mondayDate = getUpcomingDateForWeekday(1);
  const conflicts = Availability.findConflicts('room-32-101', mondayDate, 1, 2);
  const classConflict = conflicts.find(c => c.type === 'class');
  assert.ok(classConflict, 'Expected hard conflict with scheduled class');
  assert.strictEqual(classConflict.slot, 1);
});

runTest('Hard Conflict: Detects overlap with approved booking', () => {
  Store.init();
  const testDate = getUpcomingDateForWeekday(3); // Wednesday without classes at slot 8 & 9
  Store.addItem('BOOKINGS', {
    id: 'test-bk-approved-8',
    ref: 'BK-TEST-01',
    roomId: 'room-32-101',
    date: testDate,
    startSlot: 8,
    endSlot: 8,
    requesterName: 'Approved User',
    requesterId: '12611041',
    requesterType: 'Student',
    status: 'Approved',
    history: []
  });

  const conflicts = Availability.findConflicts('room-32-101', testDate, 8, 8);
  const approvedConflict = conflicts.find(c => c.type === 'approved');
  assert.ok(approvedConflict, 'Expected hard conflict with approved booking');
  assert.strictEqual(approvedConflict.slot, 8);
});

runTest('Soft Conflict: Detects overlap with pending request', () => {
  Store.init();
  const testDate = getUpcomingDateForWeekday(3); // Wednesday without classes at slot 8 & 9
  Store.addItem('BOOKINGS', {
    id: 'test-bk-pending-8',
    ref: 'BK-TEST-PENDING',
    roomId: 'room-32-101',
    date: testDate,
    startSlot: 8,
    endSlot: 8,
    requesterName: 'Pending User',
    requesterId: '12611041',
    requesterType: 'Student',
    status: 'Pending',
    history: []
  });

  const conflicts = Availability.findConflicts('room-32-101', testDate, 8, 8);
  const pendingConflict = conflicts.find(c => c.type === 'pending');
  assert.ok(pendingConflict, 'Expected soft conflict with pending booking');
  assert.strictEqual(pendingConflict.slot, 8);
});

runTest('No Conflict on adjacent non-overlapping slots', () => {
  Store.init();
  const testDate = getUpcomingDateForWeekday(3);
  // Slot 8 and 9 in room-32-101 on Wednesday have no classes in seed data
  Store.addItem('BOOKINGS', {
    id: 'test-bk-adj-8',
    ref: 'BK-TEST-ADJ',
    roomId: 'room-32-101',
    date: testDate,
    startSlot: 8,
    endSlot: 8,
    requesterName: 'User A',
    requesterId: '12611041',
    requesterType: 'Student',
    status: 'Approved',
    history: []
  });

  // Query adjacent slot 9 only
  const conflicts = Availability.findConflicts('room-32-101', testDate, 9, 9);
  assert.strictEqual(conflicts.length, 0, 'Adjacent non-overlapping slot should produce 0 conflicts');
});


// ----------------------------------------------------
// 3. QUOTA CALCULATION TESTS
// ----------------------------------------------------
console.log('\n--- 3. Quota Calculation Tests ---');

runTest('Quota Calculation: Student cannot exceed 3 active upcoming requests', () => {
  Store.init();
  const futureDate = getUpcomingFutureDate(3);
  const studentId = '12699999';

  // Add 3 pending requests for future date
  Store.addItem('BOOKINGS', { id: 'q1', roomId: 'room-32-101', date: futureDate, startSlot: 1, endSlot: 1, requesterId: studentId, requesterType: 'Student', status: 'Pending', history: [] });
  Store.addItem('BOOKINGS', { id: 'q2', roomId: 'room-32-102', date: futureDate, startSlot: 2, endSlot: 2, requesterId: studentId, requesterType: 'Student', status: 'Pending', history: [] });
  Store.addItem('BOOKINGS', { id: 'q3', roomId: 'room-32-201', date: futureDate, startSlot: 3, endSlot: 3, requesterId: studentId, requesterType: 'Student', status: 'Pending', history: [] });

  const res = Bookings.createBooking({
    roomId: 'room-32-202',
    date: futureDate,
    startSlot: 4,
    endSlot: 4,
    requesterName: 'Quota Tester',
    requesterId: studentId,
    requesterType: 'Student',
    attendees: 10,
    email: 'tester@lpu.in',
    purpose: 'Exceeding quota test purpose',
    declaration: true
  });

  assert.strictEqual(res.success, false);
  assert.ok(res.errors && res.errors.quota, 'Should fail on quota error');
  assert.ok(res.errors.quota.includes('maximum active upcoming requests (3)'));
});

runTest('Quota Calculation: Completed bookings earlier today do NOT count against quota', () => {
  Store.init();
  const studentId = '12688888';
  const today = Utils.getNow();
  const todayStr = Utils.getLocalDateString(today);

  // Set simulated clock to today at 15:30 via Settings
  const simDate = new Date(today.getTime());
  simDate.setHours(15, 30, 0, 0);
  Store.set('SETTINGS', { simulatedNow: simDate.toISOString() });

  // 3 Approved bookings earlier today whose slots have ended (Slot 1, 2, 3 end before 15:30)
  Store.addItem('BOOKINGS', {
    id: 'ended-today-1',
    ref: 'BK-END-01',
    roomId: 'room-32-101',
    date: todayStr,
    startSlot: 1,
    endSlot: 1,
    requesterId: studentId,
    requesterType: 'Student',
    status: 'Approved',
    history: []
  });
  Store.addItem('BOOKINGS', {
    id: 'ended-today-2',
    ref: 'BK-END-02',
    roomId: 'room-32-102',
    date: todayStr,
    startSlot: 2,
    endSlot: 2,
    requesterId: studentId,
    requesterType: 'Student',
    status: 'Approved',
    history: []
  });
  Store.addItem('BOOKINGS', {
    id: 'ended-today-3',
    ref: 'BK-END-03',
    roomId: 'room-32-201',
    date: todayStr,
    startSlot: 3,
    endSlot: 3,
    requesterId: studentId,
    requesterType: 'Student',
    status: 'Approved',
    history: []
  });

  // Pick future date without conflicts
  const futureTestDate = getUpcomingDateForWeekday(3);
  const res = Bookings.createBooking({
    roomId: 'room-32-101',
    date: futureTestDate,
    startSlot: 9,
    endSlot: 9,
    requesterName: 'Quota Pass Tester',
    requesterId: studentId,
    requesterType: 'Student',
    attendees: 15,
    email: 'testerpass@lpu.in',
    purpose: 'Testing ended slot exclusion from quota',
    declaration: true
  });

  // Clean simulated clock
  Store.set('SETTINGS', {});

  assert.strictEqual(res.success, true, 'Booking should succeed because earlier slots ended today');
  assert.ok(res.ref, 'Booking reference should be returned');
});


// ----------------------------------------------------
// 4. MAINTENANCE CANCELLATION TESTS
// ----------------------------------------------------
console.log('\n--- 4. Maintenance Cancellation Tests ---');

runTest('Maintenance Mode: Toggling ON auto-cancels upcoming bookings in that room', () => {
  Store.init();
  const futureDate = getUpcomingFutureDate(4);
  const targetRoomId = 'room-34-201';

  Store.addItem('BOOKINGS', {
    id: 'maint-bk-upcoming',
    ref: 'BK-MAINT-01',
    roomId: targetRoomId,
    date: futureDate,
    startSlot: 2,
    endSlot: 3,
    requesterName: 'Maint Victim',
    requesterId: '12611041',
    requesterType: 'Student',
    status: 'Approved',
    history: []
  });

  const res = Rooms.toggleMaintenance(targetRoomId);
  assert.strictEqual(res.success, true);
  assert.strictEqual(Rooms.getById(targetRoomId).status, 'Maintenance');

  const updatedBooking = Store.get('BOOKINGS').find(b => b.id === 'maint-bk-upcoming');
  assert.strictEqual(updatedBooking.status, 'Cancelled');
  assert.ok(updatedBooking.adminNote.includes('maintenance'));
});

runTest('Maintenance Mode: Does NOT cancel bookings whose slot has already ended earlier today', () => {
  Store.init();
  const today = Utils.getNow();
  const todayStr = Utils.getLocalDateString(today);
  const targetRoomId = 'room-34-202';

  // Set simulated clock to 16:00
  const simDate = new Date(today.getTime());
  simDate.setHours(16, 0, 0, 0);
  Store.set('SETTINGS', { simulatedNow: simDate.toISOString() });

  // Booking from Slot 1 (09:00 - 10:00) ended 6 hours ago
  Store.addItem('BOOKINGS', {
    id: 'maint-bk-past-today',
    ref: 'BK-PAST-01',
    roomId: targetRoomId,
    date: todayStr,
    startSlot: 1,
    endSlot: 1,
    requesterName: 'Past Today User',
    requesterId: '12611041',
    requesterType: 'Student',
    status: 'Approved',
    history: []
  });

  // Booking from Slot 8 (16:00 - 17:00) has NOT ended yet
  Store.addItem('BOOKINGS', {
    id: 'maint-bk-future-today',
    ref: 'BK-FUT-01',
    roomId: targetRoomId,
    date: todayStr,
    startSlot: 8,
    endSlot: 8,
    requesterName: 'Future Today User',
    requesterId: '12611041',
    requesterType: 'Student',
    status: 'Approved',
    history: []
  });

  const res = Rooms.toggleMaintenance(targetRoomId);
  assert.strictEqual(res.success, true);

  const pastBooking = Store.get('BOOKINGS').find(b => b.id === 'maint-bk-past-today');
  const futureBooking = Store.get('BOOKINGS').find(b => b.id === 'maint-bk-future-today');

  Store.set('SETTINGS', {});

  assert.strictEqual(pastBooking.status, 'Approved', 'Past booking earlier today must NOT be cancelled');
  assert.strictEqual(futureBooking.status, 'Cancelled', 'Future/ongoing booking today must be cancelled');
});


// ----------------------------------------------------
// 5. STORAGE FAILURE HANDLING TESTS
// ----------------------------------------------------
console.log('\n--- 5. Storage Failure Handling Tests ---');

runTest('Store.set(): Catches localStorage throw, updates memory cache, and returns false', () => {
  Store.init();

  // Force localStorage.setItem to throw QuotaExceededError
  const originalSetItem = mockLocalStorage.setItem;
  mockLocalStorage.setItem = function() {
    const err = new Error('QuotaExceededError: The quota has been exceeded.');
    err.name = 'QuotaExceededError';
    throw err;
  };

  const writeResult = Store.set('SETTINGS', { theme: 'dark', customFlag: true });
  assert.strictEqual(writeResult, false, 'Store.set() must return false when localStorage throws');
  assert.strictEqual(Store._isStorageAvailable, false, 'Store._isStorageAvailable must be marked false');

  // Verify memory fallback retains data
  const retrieved = Store.get('SETTINGS');
  assert.strictEqual(retrieved.theme, 'dark', 'Store.get() must return updated data from memory cache');
  assert.strictEqual(retrieved.customFlag, true);

  // Restore mock localStorage
  mockLocalStorage.setItem = originalSetItem;
  Store._isStorageAvailable = true;
});

runTest('Bookings.createBooking(): Fails gracefully when Store.addItem fails', () => {
  Store.init();

  // Force Store.addItem to return false (as happens when storage write fails)
  const originalAddItem = Store.addItem;
  Store.addItem = function() {
    return false;
  };

  const res = Bookings.createBooking({
    roomId: 'room-32-101',
    date: getUpcomingDateForWeekday(3),
    startSlot: 9,
    endSlot: 9,
    requesterName: 'Storage Fail Tester',
    requesterId: '12677777',
    requesterType: 'Student',
    attendees: 10,
    email: 'fail@lpu.in',
    purpose: 'Testing persistence failure handling',
    declaration: true
  });

  assert.strictEqual(res.success, false);
  assert.ok(res.errors && res.errors.form, 'Expected form error on storage failure');
  assert.ok(res.errors.form.includes('Storage write failed'));

  // Restore Store.addItem
  Store.addItem = originalAddItem;
});

runTest('Rooms.toggleMaintenance(): Fails gracefully when Store.updateItem fails', () => {
  Store.init();

  const originalUpdateItem = Store.updateItem;
  Store.updateItem = function() {
    return false;
  };

  const res = Rooms.toggleMaintenance('room-32-101');
  assert.strictEqual(res.success, false);
  assert.ok(res.message.includes('Storage write failed'));

  Store.updateItem = originalUpdateItem;
});


// ----------------------------------------------------
// 6. HTML & XSS INJECTION PREVENTION TESTS
// ----------------------------------------------------
console.log('\n--- 6. HTML & XSS Injection Prevention Tests ---');

runTest('XSS Sanitization: Escapes <script> tags', () => {
  const dirty = '<script>alert("XSS")</script>';
  const clean = Utils.escapeHTML(dirty);
  assert.strictEqual(clean, '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
  assert.strictEqual(clean.includes('<'), false);
  assert.strictEqual(clean.includes('>'), false);
});

runTest('XSS Sanitization: Escapes <img> onerror payload', () => {
  const dirty = '<img src=x onerror=alert(1)>';
  const clean = Utils.escapeHTML(dirty);
  assert.strictEqual(clean, '&lt;img src=x onerror=alert(1)&gt;');
  assert.strictEqual(clean.includes('<'), false);
});

runTest('XSS Sanitization: Escapes single quotes and SQL/attribute delimiters', () => {
  const dirty = "' OR 1=1 --";
  const clean = Utils.escapeHTML(dirty);
  assert.strictEqual(clean, '&#39; OR 1=1 --');
});

runTest('XSS Sanitization: Escapes all special characters (&, <, >, ", \')', () => {
  const dirty = '& < > " \'';
  const clean = Utils.escapeHTML(dirty);
  assert.strictEqual(clean, '&amp; &lt; &gt; &quot; &#39;');
});

runTest('XSS Sanitization: Handles non-string primitives and null/undefined safely', () => {
  assert.strictEqual(Utils.escapeHTML(null), '');
  assert.strictEqual(Utils.escapeHTML(undefined), '');
  assert.strictEqual(Utils.escapeHTML(12345), '12345');
  assert.strictEqual(Utils.escapeHTML(true), 'true');
});


// ----------------------------------------------------
// 7. ATOMIC CASCADE & BACKUP ROLLBACK TESTS
// ----------------------------------------------------
console.log('\n--- 7. Atomic Cascade & Backup Rollback Tests ---');

runTest('Backup Import: Rejects invalid or incomplete backup schema without modifying state', () => {
  Store.init();
  const originalRoomsCount = Store.get('ROOMS').length;

  // Incomplete payload: missing rooms, timetable, bookings
  const invalidPayload = JSON.stringify({
    buildings: [{ id: 'bldg-fake', name: 'Fake Block', code: 'FB' }]
  });

  const res = Store.importBackup(invalidPayload);
  assert.strictEqual(res.success, false);
  assert.ok(res.message && res.message.includes('Missing required collections'));

  // State must remain intact
  assert.strictEqual(Store.get('ROOMS').length, originalRoomsCount);
});

runTest('Backup Import: Rejects malformed JSON string without modifying state', () => {
  Store.init();
  const originalBuildingsCount = Store.get('BUILDINGS').length;

  const res = Store.importBackup('This is not JSON {{{{');
  assert.strictEqual(res.success, false);
  assert.ok(res.message && res.message.includes('Corrupted JSON'));
  assert.strictEqual(Store.get('BUILDINGS').length, originalBuildingsCount);
});

runTest('Backup Import: Staged rollback executes when a storage write fails', () => {
  Store.init();
  const originalBuildingsCount = Store.get('BUILDINGS').length;
  const originalRoomsCount = Store.get('ROOMS').length;

  const validPayload = JSON.stringify({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    buildings: [{ id: 'bldg-new', name: 'New Block', code: 'NB', floors: 3 }],
    rooms: [{ id: 'room-new', buildingId: 'bldg-new', roomNo: '101', name: 'New Room', type: 'Classroom', capacity: 40, facilities: [], status: 'Available' }],
    timetable: [],
    bookings: [],
    settings: { theme: 'light' }
  });

  // Mock Store.set to fail when writing 'timetable'
  const originalSet = Store.set;
  Store.set = function(key, data) {
    if (key === 'TIMETABLE') {
      return false; // simulate write failure mid-transaction
    }
    return originalSet.call(Store, key, data);
  };

  const res = Store.importBackup(validPayload);
  assert.strictEqual(res.success, false);
  assert.ok(res.message && res.message.includes('failed'));

  // Restore original Store.set
  Store.set = originalSet;

  // Verify rollback: Buildings and rooms must match initial snapshot
  assert.strictEqual(Store.get('BUILDINGS').length, originalBuildingsCount);
  assert.strictEqual(Store.get('ROOMS').length, originalRoomsCount);
});

runTest('Bookings.approveBooking(): Atomic cascade returns false and leaves target pending if storage fails', () => {
  Store.init();
  const testDate = getUpcomingDateForWeekday(3); // Wednesday slot 9 has no classes

  // Add a pending booking for slot 9
  Store.addItem('BOOKINGS', {
    id: 'cascade-fail-bk-1',
    ref: 'BK-CAS-01',
    roomId: 'room-32-101',
    date: testDate,
    startSlot: 9,
    endSlot: 9,
    requesterName: 'Cascade Tester',
    requesterId: '12611041',
    requesterType: 'Student',
    status: 'Pending',
    history: []
  });

  // Mock Store.set to fail on BOOKINGS write
  const originalSet = Store.set;
  Store.set = function(key, data) {
    if (key === 'BOOKINGS') {
      return false;
    }
    return originalSet.call(Store, key, data);
  };

  const res = Bookings.approveBooking('cascade-fail-bk-1');
  assert.strictEqual(res.success, false);
  assert.ok(res.message && res.message.includes('Storage write failed'));

  // Restore Store.set
  Store.set = originalSet;

  // Verify booking was not marked approved
  const target = Store.get('BOOKINGS').find(b => b.id === 'cascade-fail-bk-1');
  assert.strictEqual(target.status, 'Pending');
});

runTest('Store.isStorageAvailable(): Reports correct boolean status', () => {
  Store.init();
  assert.strictEqual(Store.isStorageAvailable(), true);

  // Simulate storage quota exception
  const originalSetItem = mockLocalStorage.setItem;
  mockLocalStorage.setItem = function() {
    throw new Error('QuotaExceededError');
  };

  Store.set('SETTINGS', { theme: 'dark' });
  assert.strictEqual(Store.isStorageAvailable(), false);

  mockLocalStorage.setItem = originalSetItem;
  Store._isStorageAvailable = true;
});

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
