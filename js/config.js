/**
 * js/config.js
 * 
 * Purpose: Centralized system configuration, business rules, validation constraints,
 *          slot timing definitions, and local storage schema constants.
 * Owner: Member A (Kartik - Data Layer & Admin)
 * Depends on: None (First script loaded in index.html)
 * 
 * Exports:
 * - Config: Global immutable configuration object.
 */

'use strict';

const Config = {
  // Application metadata
  APP_NAME: 'Campus Room & Lab Availability Viewer',
  INSTITUTION: 'Lovely Professional University (LPU)',
  COURSE: 'CSE326 - Web Technology',
  TEAM: 'SOUL',
  SCHEMA_VERSION: '1.0',

  // LocalStorage keys
  STORAGE_KEYS: {
    BUILDINGS: 'campus_rooms_buildings',
    ROOMS: 'campus_rooms_rooms',
    TIMETABLE: 'campus_rooms_timetable',
    BOOKINGS: 'campus_rooms_bookings',
    SETTINGS: 'campus_rooms_settings',
    SCHEMA_VERSION: 'campus_rooms_schema_version'
  },

  // Security & Authentication (Demo PIN)
  DEFAULT_PIN: '1234',

  // User Roles
  ROLES: {
    STUDENT: 'Student',
    FACULTY: 'Faculty',
    ADMIN: 'Admin'
  },

  // 9 One-Hour Teaching Slots (Monday to Saturday)
  SLOTS: [
    { id: 1, label: 'Slot 1', start: '09:00', end: '10:00', startHour: 9,  startMin: 0,  endHour: 10, endMin: 0 },
    { id: 2, label: 'Slot 2', start: '10:00', end: '11:00', startHour: 10, startMin: 0,  endHour: 11, endMin: 0 },
    { id: 3, label: 'Slot 3', start: '11:00', end: '12:00', startHour: 11, startMin: 0,  endHour: 12, endMin: 0 },
    { id: 4, label: 'Slot 4', start: '12:00', end: '13:00', startHour: 12, startMin: 0,  endHour: 13, endMin: 0 },
    { id: 5, label: 'Slot 5', start: '13:00', end: '14:00', startHour: 13, startMin: 0,  endHour: 14, endMin: 0 },
    { id: 6, label: 'Slot 6', start: '14:00', end: '15:00', startHour: 14, startMin: 0,  endHour: 15, endMin: 0 },
    { id: 7, label: 'Slot 7', start: '15:00', end: '16:00', startHour: 15, startMin: 0,  endHour: 16, endMin: 0 },
    { id: 8, label: 'Slot 8', start: '16:00', end: '17:00', startHour: 16, startMin: 0,  endHour: 17, endMin: 0 },
    { id: 9, label: 'Slot 9', start: '17:00', end: '18:00', startHour: 17, startMin: 0,  endHour: 18, endMin: 0 }
  ],

  // Teaching Weekdays (1 = Monday, 6 = Saturday; 0 = Sunday has no classes)
  WEEKDAYS: [
    { id: 1, name: 'Monday', short: 'Mon' },
    { id: 2, name: 'Tuesday', short: 'Tue' },
    { id: 3, name: 'Wednesday', short: 'Wed' },
    { id: 4, name: 'Thursday', short: 'Thu' },
    { id: 5, name: 'Friday', short: 'Fri' },
    { id: 6, name: 'Saturday', short: 'Sat' }
  ],

  // Business Rules & Request Limits
  LIMITS: {
    STUDENT_MAX_CONSECUTIVE_SLOTS: 2,
    FACULTY_MAX_CONSECUTIVE_SLOTS: 4,
    STUDENT_MAX_ACTIVE_REQUESTS: 3,
    FACULTY_MAX_ACTIVE_REQUESTS: 6,
    MAX_DAYS_AHEAD: 30,
    MIN_ATTENDEES: 1,
    MAX_ROOM_CAPACITY: 500,
    PURPOSE_MIN_CHARS: 10,
    PURPOSE_MAX_CHARS: 200,
    REJECT_REMARK_MIN_CHARS: 5,
    REJECT_REMARK_MAX_CHARS: 200,
    NAME_MIN_CHARS: 3,
    NAME_MAX_CHARS: 50,
    ROOM_NAME_MIN_CHARS: 3,
    ROOM_NAME_MAX_CHARS: 40,
    BUILDING_CODE_MIN_CHARS: 2,
    BUILDING_CODE_MAX_CHARS: 10
  },

  // Room Classifications
  ROOM_TYPES: [
    'Classroom',
    'Seminar Room',
    'Computer Lab',
    'Science/Engineering Lab'
  ],

  // Room Status Options
  ROOM_STATUS: {
    ACTIVE: 'Active',
    MAINTENANCE: 'Maintenance'
  },

  // Booking Lifecycle Statuses
  BOOKING_STATUS: {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
    COMPLETED: 'Completed' // Computed on the fly when approved booking end time is in the past
  },

  // Room Facilities (Multi-Select)
  FACILITIES: [
    'Projector',
    'Smart Board',
    'AC',
    'Wi-Fi',
    'Whiteboard',
    'PCs',
    'Mic & Speakers',
    'Power Backup'
  ],

  // Special Requirements in Request Form
  SPECIAL_REQUIREMENTS: [
    'Projector',
    'Mic',
    'Extra chairs',
    'AC on',
    'Tech support'
  ],

  // Pagination Settings
  PAGINATION: {
    ITEMS_PER_PAGE: 10
  }
};
