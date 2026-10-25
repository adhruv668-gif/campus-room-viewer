/**
 * js/validators.js
 * 
 * Purpose: Pure validation functions for form inputs, request constraints,
 *          admin data fields, role limits, and reject remarks.
 * Owner: Kartik (Reg. No. 12612598) - Pure Form Validation Engine
 * Depends on: Config (js/config.js), Utils (js/utils.js)
 * 
 * Functions:
 * - validateName(name): object
 * - validateRequesterId(type, id): object
 * - validateEmail(email): object
 * - validatePhone(phone): object
 * - validateDate(dateStr): object
 * - validateSlots(startSlot, endSlot, requesterType, dateStr): object
 * - validateAttendees(attendees, roomCapacity): object
 * - validatePurpose(purpose): object
 * - validateDeclaration(checked): object
 * - validateRejectRemark(remark): object
 * - validatePin(pin): object
 * - validateRoomForm(roomData, existingRooms): object
 * - validateBuildingForm(bldgData, existingBldgs): object
 * - validateRequestForm(formData, room, activeBookingCount): object
 */

'use strict';

const Validators = {
  /**
   * Validates full name: 3-50 chars, letters, spaces, dots, hyphens only.
   * @param {string} name
   * @returns {{ valid: boolean, error?: string }}
   */
  validateName: function(name) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return { valid: false, error: 'Full name is required. Please enter your name.' };
    }
    const trimmed = name.trim();
    if (trimmed.length < Config.LIMITS.NAME_MIN_CHARS || trimmed.length > Config.LIMITS.NAME_MAX_CHARS) {
      return { valid: false, error: `Name must be between ${Config.LIMITS.NAME_MIN_CHARS} and ${Config.LIMITS.NAME_MAX_CHARS} characters.` };
    }
    const nameRegex = /^[A-Za-z\s.\-]+$/;
    if (!nameRegex.test(trimmed)) {
      return { valid: false, error: 'Name can only contain letters, spaces, dots, and hyphens.' };
    }
    return { valid: true };
  },

  /**
   * Validates Registration Number (Students: exactly 8 digits) or Employee ID (Faculty: 4-10 alphanumeric).
   * @param {string} type - "Student" or "Faculty"
   * @param {string} id
   * @returns {{ valid: boolean, error?: string }}
   */
  validateRequesterId: function(type, id) {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      const label = type === Config.ROLES.STUDENT ? 'Registration Number' : 'Employee ID';
      return { valid: false, error: `${label} is required.` };
    }
    const trimmed = id.trim();

    if (type === Config.ROLES.STUDENT) {
      const studentRegex = /^\d{8}$/;
      if (!studentRegex.test(trimmed)) {
        return { valid: false, error: 'Student Registration Number must be exactly 8 digits (e.g. 12345678).' };
      }
    } else {
      const facultyRegex = /^[A-Za-z0-9]{4,10}$/;
      if (!facultyRegex.test(trimmed)) {
        return { valid: false, error: 'Faculty Employee ID must be 4 to 10 alphanumeric characters (e.g. FAC1001).' };
      }
    }
    return { valid: true };
  },

  /**
   * Validates email address format.
   * @param {string} email
   * @returns {{ valid: boolean, error?: string }}
   */
  validateEmail: function(email) {
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return { valid: false, error: 'Email address is required for booking confirmation.' };
    }
    const trimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return { valid: false, error: 'Please enter a valid email address (e.g. yourname@lpu.in).' };
    }
    return { valid: true };
  },

  /**
   * Validates mobile number (Optional, but if provided must be 10 digits starting with 6-9).
   * @param {string} phone
   * @returns {{ valid: boolean, error?: string }}
   */
  validatePhone: function(phone) {
    if (!phone || typeof phone !== 'string' || phone.trim() === '') {
      return { valid: true }; // Phone is optional
    }
    const trimmed = phone.trim();
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(trimmed)) {
      return { valid: false, error: 'Mobile number must be a 10-digit Indian number starting with 6, 7, 8, or 9.' };
    }
    return { valid: true };
  },

  /**
   * Validates date: required, not in past, not more than 30 days ahead.
   * @param {string} dateStr - "YYYY-MM-DD"
   * @returns {{ valid: boolean, error?: string }}
   */
  validateDate: function(dateStr) {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') {
      return { valid: false, error: 'Booking date is required. Please select a date.' };
    }
    const now = Utils.getNow();
    const todayStr = Utils.getLocalDateString(now);

    if (dateStr < todayStr) {
      return { valid: false, error: 'Booking date cannot be in the past. Select today or an upcoming date.' };
    }

    const maxDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + Config.LIMITS.MAX_DAYS_AHEAD);
    const maxDateStr = Utils.getLocalDateString(maxDate);

    if (dateStr > maxDateStr) {
      return { valid: false, error: `Bookings can only be made up to ${Config.LIMITS.MAX_DAYS_AHEAD} days in advance (until ${Utils.formatDate(maxDateStr)}).` };
    }

    // Sunday check
    if (Utils.getWeekday(dateStr) === 0) {
      return { valid: false, error: 'Campus academic facilities are closed on Sundays. Pick Monday to Saturday.' };
    }

    return { valid: true };
  },

  /**
   * Validates slots: end >= start, consecutive limits per role, and prevents booking ended slots today.
   * @param {number} startSlot - 1 to 9
   * @param {number} endSlot - 1 to 9
   * @param {string} requesterType - "Student" or "Faculty"
   * @param {string} dateStr - "YYYY-MM-DD"
   * @returns {{ valid: boolean, error?: string }}
   */
  validateSlots: function(startSlot, endSlot, requesterType, dateStr) {
    startSlot = parseInt(startSlot, 10);
    endSlot = parseInt(endSlot, 10);

    if (isNaN(startSlot) || startSlot < 1 || startSlot > 9) {
      return { valid: false, error: 'Start slot must be between Slot 1 and Slot 9.' };
    }
    if (isNaN(endSlot) || endSlot < 1 || endSlot > 9) {
      return { valid: false, error: 'End slot must be between Slot 1 and Slot 9.' };
    }
    if (endSlot < startSlot) {
      return { valid: false, error: 'End slot cannot be earlier than start slot.' };
    }

    const consecutive = endSlot - startSlot + 1;
    const maxAllowed = requesterType === Config.ROLES.FACULTY ?
      Config.LIMITS.FACULTY_MAX_CONSECUTIVE_SLOTS :
      Config.LIMITS.STUDENT_MAX_CONSECUTIVE_SLOTS;

    if (consecutive > maxAllowed) {
      return { valid: false, error: `${requesterType}s can book at most ${maxAllowed} consecutive slots per request.` };
    }

    // Check if slot has already started or passed if the requested date is today
    const now = Utils.getNow();
    const todayStr = Utils.getLocalDateString(now);

    if (dateStr === todayStr) {
      const slotDef = Config.SLOTS.find(function(s) { return s.id === startSlot; });
      if (slotDef) {
        const slotStartMinutes = slotDef.startHour * 60 + slotDef.startMin;
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const graceMinutes = (typeof Config !== 'undefined' && Config.LIMITS && Config.LIMITS.SLOT_GRACE_MINUTES) ? Config.LIMITS.SLOT_GRACE_MINUTES : 15;
        if (nowMinutes >= slotStartMinutes + graceMinutes) {
          return { valid: false, error: `Slot ${startSlot} (${slotDef.start} - ${slotDef.end}) has already started or passed today. Select an upcoming slot.` };
        }
      }
    }

    return { valid: true };
  },

  /**
   * Validates attendees count against room capacity.
   * @param {number} attendees
   * @param {number} roomCapacity
   * @returns {{ valid: boolean, error?: string }}
   */
  validateAttendees: function(attendees, roomCapacity) {
    const num = parseInt(attendees, 10);
    if (isNaN(num) || num < Config.LIMITS.MIN_ATTENDEES) {
      return { valid: false, error: 'Expected attendees must be a positive whole number (at least 1).' };
    }
    if (roomCapacity && num > roomCapacity) {
      return { valid: false, error: `Attendees (${num}) exceeds this room capacity (${roomCapacity}). Choose a larger hall or reduce group size.` };
    }
    return { valid: true };
  },

  /**
   * Validates purpose description (10-200 chars).
   * @param {string} purpose
   * @returns {{ valid: boolean, error?: string }}
   */
  validatePurpose: function(purpose) {
    if (!purpose || typeof purpose !== 'string' || purpose.trim() === '') {
      return { valid: false, error: 'Purpose of booking is required.' };
    }
    const trimmed = purpose.trim();
    if (trimmed.length < Config.LIMITS.PURPOSE_MIN_CHARS || trimmed.length > Config.LIMITS.PURPOSE_MAX_CHARS) {
      return { valid: false, error: `Purpose must be between ${Config.LIMITS.PURPOSE_MIN_CHARS} and ${Config.LIMITS.PURPOSE_MAX_CHARS} characters (currently ${trimmed.length}).` };
    }
    return { valid: true };
  },

  /**
   * Validates declaration checkbox.
   * @param {boolean} checked
   * @returns {{ valid: boolean, error?: string }}
   */
  validateDeclaration: function(checked) {
    if (!checked) {
      return { valid: false, error: 'You must confirm the campus room usage declaration to proceed.' };
    }
    return { valid: true };
  },

  /**
   * Validates rejection remark (5-200 chars).
   * @param {string} remark
   * @returns {{ valid: boolean, error?: string }}
   */
  validateRejectRemark: function(remark) {
    if (!remark || typeof remark !== 'string' || remark.trim() === '') {
      return { valid: false, error: 'An admin rejection remark is required to inform the requester.' };
    }
    const trimmed = remark.trim();
    if (trimmed.length < Config.LIMITS.REJECT_REMARK_MIN_CHARS || trimmed.length > Config.LIMITS.REJECT_REMARK_MAX_CHARS) {
      return { valid: false, error: `Rejection remark must be between ${Config.LIMITS.REJECT_REMARK_MIN_CHARS} and ${Config.LIMITS.REJECT_REMARK_MAX_CHARS} characters.` };
    }
    return { valid: true };
  },

  /**
   * Validates 4-digit admin PIN.
   * @param {string} pin
   * @returns {{ valid: boolean, error?: string }}
   */
  validatePin: function(pin) {
    if (!pin || !/^\d{4}$/.test(String(pin).trim())) {
      return { valid: false, error: 'Admin PIN must be exactly 4 digits.' };
    }
    return { valid: true };
  },

  /**
   * Validates Admin Room Form.
   * @param {object} roomData
   * @param {object[]} existingRooms
   * @returns {{ valid: boolean, errors: Record<string, string> }}
   */
  validateRoomForm: function(roomData, existingRooms) {
    const errors = {};

    if (!roomData.buildingId) {
      errors.buildingId = 'Building selection is required.';
    }

    if (!roomData.roomNo || !roomData.roomNo.trim()) {
      errors.roomNo = 'Room number is required.';
    } else {
      const trimmedNo = roomData.roomNo.trim().toUpperCase();
      const duplicate = existingRooms.find(function(r) {
        return r.buildingId === roomData.buildingId &&
               r.roomNo.toUpperCase() === trimmedNo &&
               r.id !== roomData.id;
      });
      if (duplicate) {
        errors.roomNo = `Room ${trimmedNo} already exists in this building. Room numbers must be unique.`;
      }
    }

    if (!roomData.name || roomData.name.trim().length < Config.LIMITS.ROOM_NAME_MIN_CHARS || roomData.name.trim().length > Config.LIMITS.ROOM_NAME_MAX_CHARS) {
      errors.name = `Room display name must be between ${Config.LIMITS.ROOM_NAME_MIN_CHARS} and ${Config.LIMITS.ROOM_NAME_MAX_CHARS} characters.`;
    }

    const floor = parseInt(roomData.floor, 10);
    if (isNaN(floor) || floor < 0 || floor > 20) {
      errors.floor = 'Floor must be a number between 0 (Ground) and 20.';
    }

    const capacity = parseInt(roomData.capacity, 10);
    if (isNaN(capacity) || capacity < 1 || capacity > Config.LIMITS.MAX_ROOM_CAPACITY) {
      errors.capacity = `Capacity must be a positive integer between 1 and ${Config.LIMITS.MAX_ROOM_CAPACITY}.`;
    }

    if (!Config.ROOM_TYPES.includes(roomData.type)) {
      errors.type = 'Please select a valid room classification type.';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors: errors
    };
  },

  /**
   * Validates Admin Building Form.
   * @param {object} bldgData
   * @param {object[]} existingBldgs
   * @returns {{ valid: boolean, errors: Record<string, string> }}
   */
  validateBuildingForm: function(bldgData, existingBldgs) {
    const errors = {};

    if (!bldgData.code || !bldgData.code.trim()) {
      errors.code = 'Building code is required.';
    } else {
      const trimmedCode = bldgData.code.trim().toUpperCase();
      if (!/^[A-Z0-9\-]{2,10}$/.test(trimmedCode)) {
        errors.code = 'Building code must be 2-10 uppercase letters, numbers, or hyphens (e.g. B32).';
      } else {
        const duplicate = existingBldgs.find(function(b) {
          return b.code.toUpperCase() === trimmedCode && b.id !== bldgData.id;
        });
        if (duplicate) {
          errors.code = `Building code "${trimmedCode}" already exists. Codes must be unique.`;
        }
      }
    }

    if (!bldgData.name || bldgData.name.trim().length < 3 || bldgData.name.trim().length > 50) {
      errors.name = 'Building name must be between 3 and 50 characters.';
    }

    const floors = parseInt(bldgData.floors, 10);
    if (isNaN(floors) || floors < 1 || floors > 20) {
      errors.floors = 'Total floors must be between 1 and 20.';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors: errors
    };
  },

  /**
   * Aggregates all validations for submitting or editing a booking request.
   * @param {object} formData
   * @param {object} room - Room object
   * @param {number} activeBookingCount - Count of currently active upcoming bookings
   * @returns {{ valid: boolean, errors: Record<string, string> }}
   */
  validateRequestForm: function(formData, room, activeBookingCount) {
    const errors = {};

    // 1. Quota Check for Active Bookings
    const maxActive = formData.requesterType === Config.ROLES.FACULTY ?
      Config.LIMITS.FACULTY_MAX_ACTIVE_REQUESTS :
      Config.LIMITS.STUDENT_MAX_ACTIVE_REQUESTS;

    if (activeBookingCount >= maxActive) {
      errors.quota = `You have reached the maximum active upcoming requests (${maxActive}). Cancel or complete existing requests before submitting new ones.`;
    }

    // 2. Room check
    if (!room) {
      errors.roomId = 'Selected room does not exist or has been removed.';
    } else if (room.status === Config.ROOM_STATUS.MAINTENANCE) {
      errors.roomId = `${room.name} is currently under maintenance and cannot be requested.`;
    }

    // 3. Who validations
    const nameCheck = this.validateName(formData.requesterName);
    if (!nameCheck.valid) errors.requesterName = nameCheck.error;

    const idCheck = this.validateRequesterId(formData.requesterType, formData.requesterId);
    if (!idCheck.valid) errors.requesterId = idCheck.error;

    const emailCheck = this.validateEmail(formData.email);
    if (!emailCheck.valid) errors.email = emailCheck.error;

    const phoneCheck = this.validatePhone(formData.phone);
    if (!phoneCheck.valid) errors.phone = phoneCheck.error;

    // 4. Where & When validations
    const dateCheck = this.validateDate(formData.date);
    if (!dateCheck.valid) errors.date = dateCheck.error;

    const slotsCheck = this.validateSlots(formData.startSlot, formData.endSlot, formData.requesterType, formData.date);
    if (!slotsCheck.valid) errors.slots = slotsCheck.error;

    // 5. Details validations
    const attendeesCheck = this.validateAttendees(formData.attendees, room ? room.capacity : null);
    if (!attendeesCheck.valid) errors.attendees = attendeesCheck.error;

    const purposeCheck = this.validatePurpose(formData.purpose);
    if (!purposeCheck.valid) errors.purpose = purposeCheck.error;

    const declarationCheck = this.validateDeclaration(formData.declaration);
    if (!declarationCheck.valid) errors.declaration = declarationCheck.error;

    return {
      valid: Object.keys(errors).length === 0,
      errors: errors
    };
  }
};
