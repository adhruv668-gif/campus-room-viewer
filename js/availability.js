/**
 * js/availability.js
 * 
 * Purpose: Core availability calculation engine, timetable grid renderer,
 *          card view toggle, slot inspector modal, and free room finder.
 * Owner: Kartik (Reg. No. 12612598) - Slot Conflict Algorithm & Availability Explorer
 * Depends on: Config (js/config.js), Utils (js/utils.js), Store (js/store.js),
 *             Rooms (js/rooms.js), UI (js/ui.js)
 * 
 * Functions:
 * - getSlotStatus(roomId, dateStr, slotNumber): object
 * - findConflicts(roomId, dateStr, startSlot, endSlot, ignoreBookingId): object[]
 * - getRoomDailySummary(roomId, dateStr): object
 * - findFreeRooms(criteria): object[]
 * - renderGrid(containerEl, filterOverrides): void
 * - renderFinder(containerEl): void
 * - renderSlotDetails(roomId, dateStr, slotNumber): void
 */

'use strict';

const Availability = {
  /**
   * Determines exact status of a specific room, date, and slot.
   * Priority order:
   *  1. Maintenance (room level)
   *  2. Class (recurring weekly timetable)
   *  3. Booked (approved booking)
   *  4. Requested (pending requests)
   *  5. Free (none of the above)
   * Plus computes isPast flag if slot has already concluded.
   * 
   * @param {string} roomId
   * @param {string} dateStr - "YYYY-MM-DD"
   * @param {number} slotNumber - 1 to 9
   * @returns {{ status: string, isPast: boolean, details: object|null, pendingCount?: number }}
   */
  getSlotStatus: function(roomId, dateStr, slotNumber) {
    const room = Rooms.getById(roomId);
    if (!room) {
      return { status: 'Maintenance', isPast: false, details: null };
    }

    // Step 1: Check Room Maintenance
    if (room.status === Config.ROOM_STATUS.MAINTENANCE) {
      return { status: 'Maintenance', isPast: false, details: { reason: room.notes || 'Room under maintenance' } };
    }

    // Compute isPast flag
    const now = Utils.getNow();
    const todayStr = Utils.getLocalDateString(now);
    let isPast = false;

    if (dateStr < todayStr) {
      isPast = true;
    } else if (dateStr === todayStr) {
      const slotDef = Config.SLOTS.find(function(s) { return s.id === slotNumber; });
      if (slotDef) {
        const slotEndMinutes = slotDef.endHour * 60 + slotDef.endMin;
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        if (nowMinutes >= slotEndMinutes) {
          isPast = true;
        }
      }
    }

    // Step 2: Check Timetable Class
    const weekday = Utils.getWeekday(dateStr);
    const timetable = Store.get('TIMETABLE') || [];
    const classEntry = timetable.find(function(t) {
      return t.roomId === roomId && t.weekday === weekday && t.slot === slotNumber;
    });

    if (classEntry) {
      return { status: 'Class', isPast: isPast, details: classEntry };
    }

    // Step 3: Check Approved Bookings
    const bookings = Store.get('BOOKINGS') || [];
    const approvedBooking = bookings.find(function(b) {
      return b.roomId === roomId &&
             b.date === dateStr &&
             b.status === Config.BOOKING_STATUS.APPROVED &&
             slotNumber >= b.startSlot &&
             slotNumber <= b.endSlot;
    });

    if (approvedBooking) {
      return { status: 'Booked', isPast: isPast, details: approvedBooking };
    }

    // Step 4: Check Pending Requests
    const pendingRequests = bookings.filter(function(b) {
      return b.roomId === roomId &&
             b.date === dateStr &&
             b.status === Config.BOOKING_STATUS.PENDING &&
             slotNumber >= b.startSlot &&
             slotNumber <= b.endSlot;
    });

    if (pendingRequests.length > 0) {
      return {
        status: 'Requested',
        isPast: isPast,
        details: pendingRequests[0],
        pendingCount: pendingRequests.length
      };
    }

    // Step 5: Free
    return { status: 'Free', isPast: isPast, details: null };
  },

  /**
   * Conflict detection algorithm for range [startSlot, endSlot].
   * Evaluates mathematical overlap: (s1 <= e2) AND (s2 <= e1).
   * 
   * @param {string} roomId
   * @param {string} dateStr - "YYYY-MM-DD"
   * @param {number} startSlot - 1 to 9
   * @param {number} endSlot - 1 to 9
   * @param {string} [ignoreBookingId=""] - ID of booking to ignore (for edits)
   * @returns {Array<{ type: string, slot: number, reason: string, details?: object }>}
   */
  findConflicts: function(roomId, dateStr, startSlot, endSlot, ignoreBookingId) {
    const conflicts = [];
    const room = Rooms.getById(roomId);

    if (!room || room.status === Config.ROOM_STATUS.MAINTENANCE) {
      conflicts.push({
        type: 'maintenance',
        slot: startSlot,
        reason: 'Room is currently under scheduled maintenance.'
      });
      return conflicts;
    }

    // 1. Timetable classes check
    const weekday = Utils.getWeekday(dateStr);
    const timetable = Store.get('TIMETABLE') || [];

    for (let s = startSlot; s <= endSlot; s++) {
      const classEntry = timetable.find(function(t) {
        return t.roomId === roomId && t.weekday === weekday && t.slot === s;
      });
      if (classEntry) {
        conflicts.push({
          type: 'class',
          slot: s,
          reason: `Slot ${s} is reserved for class ${classEntry.course} (${classEntry.faculty}).`,
          details: classEntry
        });
      }
    }

    // 2. Bookings overlap check
    const bookings = Store.get('BOOKINGS') || [];
    bookings.forEach(function(b) {
      if (b.roomId !== roomId || b.date !== dateStr || b.id === ignoreBookingId) return;

      // Mathematical range overlap condition
      const overlaps = (startSlot <= b.endSlot) && (b.startSlot <= endSlot);
      if (overlaps) {
        if (b.status === Config.BOOKING_STATUS.APPROVED) {
          conflicts.push({
            type: 'approved',
            slot: b.startSlot,
            reason: `Overlaps with approved booking ${b.ref} (${b.purpose}).`,
            details: b
          });
        } else if (b.status === Config.BOOKING_STATUS.PENDING) {
          conflicts.push({
            type: 'pending',
            slot: b.startSlot,
            reason: `Overlaps with pending request ${b.ref} by ${b.requesterName}.`,
            details: b
          });
        }
      }
    });

    return conflicts;
  },

  /**
   * Summarizes daily occupancy metrics for a given room.
   * @param {string} roomId
   * @param {string} dateStr
   * @returns {{ freeSlots: number, occupiedSlots: number, percentOccupied: number, slots: object[] }}
   */
  getRoomDailySummary: function(roomId, dateStr) {
    const slots = [];
    let freeCount = 0;

    for (let s = 1; s <= 9; s++) {
      const statusInfo = this.getSlotStatus(roomId, dateStr, s);
      slots.push({ slot: s, status: statusInfo.status, isPast: statusInfo.isPast });
      if (statusInfo.status === 'Free' && !statusInfo.isPast) {
        freeCount++;
      }
    }

    const occupiedCount = 9 - freeCount;
    const percentOccupied = Math.round((occupiedCount / 9) * 100);

    return {
      freeSlots: freeCount,
      occupiedSlots: occupiedCount,
      percentOccupied: percentOccupied,
      slots: slots
    };
  },

  /**
   * Finds all rooms free for the ENTIRE chosen slot range.
   * Best fit: smallest capacity that accommodates attendees.
   * Also computes partial matches if exact match unavailable.
   * 
   * @param {object} criteria
   * @returns {Array<{ room: object, fitCategory: string, partialMatches?: number[] }>}
   */
  findFreeRooms: function(criteria) {
    const allRooms = Rooms.getAll().filter(function(r) { return r.status === Config.ROOM_STATUS.ACTIVE; });
    const attendees = parseInt(criteria.attendees, 10) || 1;
    const dateStr = criteria.date || Utils.getLocalDateString(Utils.getNow());
    const startSlot = parseInt(criteria.startSlot, 10) || 1;
    const endSlot = parseInt(criteria.endSlot, 10) || startSlot;

    const results = [];

    allRooms.forEach(function(room) {
      // 1. Capacity filter
      if (room.capacity < attendees) return;

      // 2. Building filter
      if (criteria.buildingId && room.buildingId !== criteria.buildingId) return;

      // 3. Room Type filter
      if (criteria.type && room.type !== criteria.type) return;

      // 4. Facilities check
      if (Array.isArray(criteria.facilities) && criteria.facilities.length > 0) {
        const hasAll = criteria.facilities.every(function(f) {
          return (room.facilities || []).includes(f);
        });
        if (!hasAll) return;
      }

      // 5. Slot conflict check
      const conflicts = Availability.findConflicts(room.id, dateStr, startSlot, endSlot);
      const hardConflicts = conflicts.filter(function(c) {
        return c.type === 'maintenance' || c.type === 'class' || c.type === 'approved';
      });

      if (hardConflicts.length === 0) {
        // Fits all chosen slots!
        let fitCategory = 'Large Hall';
        const occupancyRatio = attendees / room.capacity;
        if (occupancyRatio >= 0.75) {
          fitCategory = 'Perfect Fit';
        } else if (occupancyRatio >= 0.40) {
          fitCategory = 'Spacious';
        }

        results.push({
          room: room,
          fitCategory: fitCategory,
          hasPendingWarning: conflicts.some(function(c) { return c.type === 'pending'; })
        });
      }
    });

    // Sort best-fit first: smallest capacity >= attendees
    results.sort(function(a, b) {
      return a.room.capacity - b.room.capacity;
    });

    return results;
  },

  /**
   * Suggests top 3 available alternative rooms for a conflicted slot range.
   * Prioritizes: (1) Same building, (2) Same room type, (3) Adequate capacity.
   * @param {string} roomId
   * @param {string} dateStr
   * @param {number} startSlot
   * @param {number} endSlot
   * @param {number} [minCapacity=1]
   * @returns {Array<{ room: object, building: object|null, score: number, reason: string }>}
   */
  suggestAlternatives: function(roomId, dateStr, startSlot, endSlot, minCapacity) {
    const targetRoom = Rooms.getById(roomId);
    const targetBuildingId = targetRoom ? targetRoom.buildingId : null;
    const targetType = targetRoom ? targetRoom.type : null;
    const requiredCap = minCapacity || (targetRoom ? targetRoom.capacity : 1);

    const allRooms = Rooms.getAll();
    const candidates = [];

    allRooms.forEach(function(room) {
      if (room.id === roomId) return;
      if (room.status === Config.ROOM_STATUS.MAINTENANCE) return;

      const conflicts = Availability.findConflicts(room.id, dateStr, startSlot, endSlot);
      const hasHardConflict = conflicts.some(function(c) {
        return c.type === 'maintenance' || c.type === 'class' || c.type === 'approved';
      });

      if (!hasHardConflict) {
        let score = 0;
        const reasons = [];

        // 1. Same building bonus
        if (targetBuildingId && room.buildingId === targetBuildingId) {
          score += 100;
          reasons.push('Same Block');
        }

        // 2. Same room type bonus
        if (targetType && room.type === targetType) {
          score += 50;
          reasons.push(room.type);
        }

        // 3. Capacity suitability
        if (room.capacity >= requiredCap) {
          score += 40;
          const diff = room.capacity - requiredCap;
          score += Math.max(0, 20 - Math.floor(diff / 5));
          reasons.push(`${room.capacity} seats`);
        } else {
          score += Math.max(0, 10 - Math.floor((requiredCap - room.capacity) / 5));
        }

        // Soft conflict penalty
        const softConflicts = conflicts.filter(function(c) { return c.type === 'pending'; });
        if (softConflicts.length > 0) {
          score -= (softConflicts.length * 15);
        } else {
          score += 20;
          reasons.push('Completely Free');
        }

        const bldg = Rooms.getBuildingById(room.buildingId);
        candidates.push({
          room: room,
          building: bldg,
          score: score,
          reason: reasons.join(' • ')
        });
      }
    });

    candidates.sort(function(a, b) { return b.score - a.score; });
    return candidates.slice(0, 3);
  },

  /**
   * Renders the interactive Availability Explorer grid with building groups and filters.
   * @param {HTMLElement} containerEl
   * @param {object} [filterOverrides={}]
   */
  renderGrid: function(containerEl, filterOverrides) {
    const settings = Store.get('SETTINGS') || {};
    const viewPrefs = settings.viewPrefs || { filters: {}, viewMode: 'grid' };
    const savedFilters = (typeof App !== 'undefined' && App.state && App.state.filters && App.state.filters.grid) || viewPrefs.filters || {};

    const activeFilters = {
      date: (filterOverrides && filterOverrides.date) || savedFilters.date || Utils.getLocalDateString(Utils.getNow()),
      buildingId: (filterOverrides && filterOverrides.buildingId) || savedFilters.buildingId || '',
      type: savedFilters.type || '',
      minCapacity: savedFilters.minCapacity || '',
      facilities: savedFilters.facilities || [],
      onlyFree: Boolean(savedFilters.onlyFree),
      searchQuery: savedFilters.searchQuery || '',
      viewMode: savedFilters.viewMode || viewPrefs.viewMode || 'grid'
    };

    const buildings = Rooms.getAllBuildings();
    const rooms = Rooms.getAll();

    // Build filter UI
    let bldgOptions = '<option value="">All Buildings</option>';
    buildings.forEach(function(b) {
      bldgOptions += `<option value="${Utils.escapeHTML(b.id)}" ${b.id === activeFilters.buildingId ? 'selected' : ''}>${Utils.escapeHTML(b.name)}</option>`;
    });

    let typeOptions = '<option value="">All Room Types</option>';
    Config.ROOM_TYPES.forEach(function(t) {
      typeOptions += `<option value="${t}" ${t === activeFilters.type ? 'selected' : ''}>${t}</option>`;
    });

    containerEl.innerHTML = `
      <!-- Filter Toolbar -->
      <div class="card" style="margin-bottom: var(--space-4);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3);">
          <!-- Date Navigator -->
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <button id="avail-prev-date-btn" class="btn btn-sm btn-secondary" type="button" aria-label="Previous Day">&larr; Prev</button>
            <input type="date" id="avail-date-input" class="form-input" style="width: auto; min-height: 34px;" value="${Utils.escapeHTML(activeFilters.date)}" />
            <button id="avail-next-date-btn" class="btn btn-sm btn-secondary" type="button" aria-label="Next Day">Next &rarr;</button>
            <button id="avail-today-date-btn" class="btn btn-sm btn-subtle" type="button">Today</button>
          </div>

          <!-- View Mode & Action Toggle -->
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <button id="avail-mode-toggle" class="btn btn-sm btn-secondary" type="button">
              ${activeFilters.viewMode === 'grid' ? '&#128196; Switch to Cards' : '&#9638; Switch to Grid'}
            </button>
            <button id="avail-print-btn" class="btn btn-sm btn-subtle" type="button" title="Print Timetable Grid">&#128424; Print</button>
          </div>
        </div>

        <!-- Filter Row -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-2);">
          <input type="text" id="avail-search-input" class="form-input" placeholder="Search room, course, faculty..." value="${Utils.escapeHTML(activeFilters.searchQuery)}" />
          <select id="avail-bldg-select" class="form-select">${bldgOptions}</select>
          <select id="avail-type-select" class="form-select">${typeOptions}</select>
          <input type="number" id="avail-capacity-input" class="form-input" placeholder="Min. Capacity" value="${activeFilters.minCapacity}" min="1" max="500" />
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-3); flex-wrap: wrap; gap: var(--space-2);">
          <label class="checkbox-label" style="font-size: var(--text-xs);">
            <input type="checkbox" id="avail-only-free-cb" class="checkbox-input" ${activeFilters.onlyFree ? 'checked' : ''} />
            Only show rooms with at least one free slot today
          </label>
          <div style="display: flex; gap: var(--space-2); align-items: center;">
            <span id="avail-results-count" class="chip">Calculating...</span>
            <button id="avail-clear-filters-btn" class="btn btn-sm btn-subtle" type="button">Clear Filters</button>
          </div>
        </div>
      </div>

      <!-- Sunday Academic Notice Container -->
      <div id="avail-sunday-banner"></div>

      <!-- Main Display Container -->
      <div id="avail-display-container"></div>

      <!-- Accessible Color Legend -->
      <div class="card" style="margin-top: var(--space-4); display: flex; flex-wrap: wrap; gap: var(--space-3); justify-content: center; font-size: var(--text-xs);">
        <span class="badge badge-free">&#9989; Free</span>
        <span class="badge badge-class">&#128218; Timetable Class</span>
        <span class="badge badge-booked">&#128100; Approved Booking</span>
        <span class="badge badge-requested">&#9203; Pending Request</span>
        <span class="badge badge-maint">&#128295; Maintenance</span>
        <span style="display: inline-flex; align-items: center; gap: 4px; color: var(--text-muted);">&#9200; Muted = Past Slot</span>
      </div>
    `;

    // Render Grid or Card contents
    const self = this;
    const renderContent = function() {
      // Filter rooms
      let filtered = rooms.filter(function(r) {
        if (activeFilters.buildingId && r.buildingId !== activeFilters.buildingId) return false;
        if (activeFilters.type && r.type !== activeFilters.type) return false;
        if (activeFilters.minCapacity && r.capacity < parseInt(activeFilters.minCapacity, 10)) return false;

        if (activeFilters.searchQuery) {
          const q = activeFilters.searchQuery.toLowerCase();
          const matchRoom = r.roomNo.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
          if (matchRoom) return true;

          // Check if any timetable entry for this room matches course or faculty
          const timetable = Store.get('TIMETABLE') || [];
          const matchClass = timetable.some(function(t) {
            return t.roomId === r.id && (t.course.toLowerCase().includes(q) || t.faculty.toLowerCase().includes(q));
          });
          if (!matchClass) return false;
        }

        if (activeFilters.onlyFree) {
          const summary = self.getRoomDailySummary(r.id, activeFilters.date);
          if (summary.freeSlots === 0) return false;
        }

        return true;
      });

      const countEl = document.getElementById('avail-results-count');
      if (countEl) countEl.textContent = `Showing ${filtered.length} of ${rooms.length} rooms`;

      const displayEl = document.getElementById('avail-display-container');
      if (!displayEl) return;

      if (filtered.length === 0) {
        displayEl.innerHTML = `
          <div class="empty-state card">
            <div class="empty-icon">&#128269;</div>
            <h3 class="empty-title">No rooms match your filter criteria</h3>
            <p class="empty-desc">Try clearing selected facilities or expanding the capacity and building filters.</p>
          </div>
        `;
        return;
      }

      if (activeFilters.viewMode === 'grid') {
        self._renderBuildingGridGroups(displayEl, filtered, activeFilters.date, buildings);
      } else {
        self.renderCards(displayEl, filtered, activeFilters.date);
      }

      // Render Sunday academic notice if selected date falls on Sunday
      const sundayBannerEl = document.getElementById('avail-sunday-banner');
      if (sundayBannerEl) {
        const isSunday = Utils.getWeekday(activeFilters.date) === 0;
        if (isSunday) {
          sundayBannerEl.innerHTML = `
            <div class="card" style="margin-bottom: var(--space-4); border-left: 4px solid var(--accent-primary); background-color: var(--bg-subtle); display: flex; align-items: center; gap: var(--space-3);">
              <span style="font-size: 1.5rem;" aria-hidden="true">&#128197;</span>
              <div>
                <strong>Sunday Academic Schedule:</strong> Regular curriculum classes are off on Sundays. All non-maintenance rooms are free from recurring timetable schedules.
              </div>
            </div>
          `;
        } else {
          sundayBannerEl.innerHTML = '';
        }
      }

      // Persist filter preferences
      settings.viewPrefs = { filters: activeFilters, viewMode: activeFilters.viewMode };
      Store.set('SETTINGS', settings);
      if (typeof App !== 'undefined' && App.state && App.state.filters) {
        App.state.filters.grid = Object.assign({}, activeFilters);
      }
    };

    renderContent();

    // Event Bindings
    const dateInput = document.getElementById('avail-date-input');
    dateInput.addEventListener('change', function(e) {
      activeFilters.date = e.target.value;
      renderContent();
    });

    document.getElementById('avail-prev-date-btn').addEventListener('click', function() {
      const cur = Utils.parseLocalDate(activeFilters.date);
      cur.setDate(cur.getDate() - 1);
      activeFilters.date = Utils.getLocalDateString(cur);
      dateInput.value = activeFilters.date;
      renderContent();
    });

    document.getElementById('avail-next-date-btn').addEventListener('click', function() {
      const cur = Utils.parseLocalDate(activeFilters.date);
      cur.setDate(cur.getDate() + 1);
      activeFilters.date = Utils.getLocalDateString(cur);
      dateInput.value = activeFilters.date;
      renderContent();
    });

    document.getElementById('avail-today-date-btn').addEventListener('click', function() {
      activeFilters.date = Utils.getLocalDateString(Utils.getNow());
      dateInput.value = activeFilters.date;
      renderContent();
    });

    document.getElementById('avail-bldg-select').addEventListener('change', function(e) {
      activeFilters.buildingId = e.target.value;
      renderContent();
    });

    document.getElementById('avail-type-select').addEventListener('change', function(e) {
      activeFilters.type = e.target.value;
      renderContent();
    });

    document.getElementById('avail-capacity-input').addEventListener('input', Utils.debounce(function(e) {
      activeFilters.minCapacity = e.target.value;
      renderContent();
    }, 250));

    document.getElementById('avail-search-input').addEventListener('input', Utils.debounce(function(e) {
      activeFilters.searchQuery = e.target.value;
      renderContent();
    }, 250));

    document.getElementById('avail-only-free-cb').addEventListener('change', function(e) {
      activeFilters.onlyFree = e.target.checked;
      renderContent();
    });

    document.getElementById('avail-clear-filters-btn').addEventListener('click', function() {
      activeFilters.buildingId = '';
      activeFilters.type = '';
      activeFilters.minCapacity = '';
      activeFilters.searchQuery = '';
      activeFilters.onlyFree = false;
      activeFilters.date = Utils.getLocalDateString(Utils.getNow());
      dateInput.value = activeFilters.date;
      document.getElementById('avail-bldg-select').value = '';
      document.getElementById('avail-type-select').value = '';
      document.getElementById('avail-capacity-input').value = '';
      document.getElementById('avail-search-input').value = '';
      document.getElementById('avail-only-free-cb').checked = false;
      renderContent();
      UI.showToast('Availability filters cleared.', 'info');
    });

    document.getElementById('avail-mode-toggle').addEventListener('click', function() {
      activeFilters.viewMode = activeFilters.viewMode === 'grid' ? 'cards' : 'grid';
      this.innerHTML = activeFilters.viewMode === 'grid' ? '&#128196; Switch to Cards' : '&#9638; Switch to Grid';
      renderContent();
    });

    document.getElementById('avail-print-btn').addEventListener('click', function() {
      window.print();
    });

    // Cell click and keyboard delegation for slot inspector
    containerEl.addEventListener('click', function(e) {
      const cell = e.target.closest('.grid-cell');
      if (cell) {
        const roomId = cell.getAttribute('data-room-id');
        const slot = parseInt(cell.getAttribute('data-slot'), 10);
        self.renderSlotDetails(roomId, activeFilters.date, slot);
      }
    });

    containerEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        const cell = e.target.closest('.grid-cell');
        if (cell) {
          e.preventDefault();
          const roomId = cell.getAttribute('data-room-id');
          const slot = parseInt(cell.getAttribute('data-slot'), 10);
          self.renderSlotDetails(roomId, activeFilters.date, slot);
        }
      }
    });
  },

  /**
   * Renders the 9-slot grid grouped by building inside <details> sections.
   */
  _renderBuildingGridGroups: function(containerEl, rooms, dateStr, buildings) {
    let html = '';
    const currentSlot = Utils.getCurrentSlot();
    const isToday = (dateStr === Utils.getLocalDateString(Utils.getNow()));

    buildings.forEach(function(bldg) {
      const bldgRooms = rooms.filter(function(r) { return r.buildingId === bldg.id; });
      if (bldgRooms.length === 0) return;

      // Compute building average occupancy for the summary badge
      let totalOccupiedPercent = 0;
      bldgRooms.forEach(function(r) {
        const sum = Availability.getRoomDailySummary(r.id, dateStr);
        totalOccupiedPercent += sum.percentOccupied;
      });
      const avgOccupancy = Math.round(totalOccupiedPercent / bldgRooms.length);

      let tableRows = '';
      bldgRooms.forEach(function(room) {
        let cellTds = '';
        for (let s = 1; s <= 9; s++) {
          const statusInfo = Availability.getSlotStatus(room.id, dateStr, s);
          const isCurrent = isToday && (currentSlot === s);

          let cellClass = `cell-${statusInfo.status.toLowerCase()}`;
          if (statusInfo.isPast) cellClass += ' cell-past';
          if (isCurrent) cellClass += ' cell-current-slot';

          const iconMap = {
            Free: '&#9989;',
            Class: '&#128218;',
            Booked: '&#128100;',
            Requested: '&#9203;',
            Maintenance: '&#128295;'
          };

          const slotTime = Utils.formatSlotTime(s);
          const bookingPrompt = (statusInfo.status === 'Free' && !statusInfo.isPast) ? ' - Click or press enter to book' : '';

          cellTds += `
            <td class="grid-cell ${cellClass}" data-room-id="${Utils.escapeHTML(room.id)}" data-slot="${s}" tabindex="0" role="button" aria-label="Room ${Utils.escapeHTML(room.roomNo)}, ${slotTime}, ${Utils.escapeHTML(statusInfo.status)}${bookingPrompt}">
              <div class="grid-cell-content">
                <span class="grid-cell-icon" aria-hidden="true">${iconMap[statusInfo.status] || ''}</span>
                <span class="grid-cell-label">${Utils.escapeHTML(statusInfo.status)}</span>
              </div>
            </td>
          `;
        }

        tableRows += `
          <tr>
            <td class="grid-col-room">
              <strong>${Utils.escapeHTML(room.roomNo)}</strong> &bull; ${Utils.escapeHTML(room.name)}
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">
                ${Utils.escapeHTML(room.type)} &bull; ${Utils.escapeHTML(String(room.capacity))} seats
              </div>
            </td>
            ${cellTds}
          </tr>
        `;
      });

      html += `
        <details class="card" open style="margin-bottom: var(--space-4); padding: 0; overflow: hidden;">
          <summary style="padding: var(--space-3) var(--space-4); background-color: var(--bg-subtle); cursor: pointer; font-weight: var(--font-bold); display: flex; justify-content: space-between; align-items: center;">
            <span>${Utils.escapeHTML(bldg.name)} (${bldgRooms.length} rooms)</span>
            <span class="badge ${avgOccupancy > 60 ? 'badge-requested' : 'badge-free'}">${avgOccupancy}% occupied</span>
          </summary>
          <div class="grid-scroll-wrapper" style="border: none; border-radius: 0;">
            <table class="grid-table">
              <thead>
                <tr>
                  <th class="grid-col-room" scope="col">Room Details</th>
                  ${Config.SLOTS.map(function(s) {
                    const isCurr = isToday && (currentSlot === s.id);
                    return `<th scope="col" class="${isCurr ? 'cell-current-slot' : ''}">${s.label}<br><span style="font-weight: normal; font-size: 0.65rem;">${s.start}-${s.end}</span></th>`;
                  }).join('')}
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </details>
      `;
    });

    containerEl.innerHTML = html;
  },

  /**
   * Renders Card View alternative for availability.
   */
  renderCards: function(containerEl, rooms, dateStr) {
    let cardsHtml = '<div class="grid-2col">';

    rooms.forEach(function(room) {
      const summary = Availability.getRoomDailySummary(room.id, dateStr);

      // Find next free slot today
      let nextFreeText = 'No free slots';
      for (let i = 0; i < summary.slots.length; i++) {
        const slotItem = summary.slots[i];
        if (slotItem.status === 'Free' && !slotItem.isPast) {
          const slotDef = Config.SLOTS.find(function(s) { return s.id === slotItem.slot; });
          if (slotDef) {
            nextFreeText = `Free at ${slotDef.start}`;
            break;
          }
        }
      }

      // 9 mini squares strip
      let stripHtml = '<div style="display: flex; gap: 3px; margin: var(--space-2) 0;">';
      summary.slots.forEach(function(s) {
        let bg = 'var(--color-free-bg)';
        if (s.status === 'Class') bg = 'var(--color-class-bg)';
        if (s.status === 'Booked') bg = 'var(--color-booked-bg)';
        if (s.status === 'Requested') bg = 'var(--color-requested-bg)';
        if (s.status === 'Maintenance') bg = 'var(--color-maint-bg)';
        stripHtml += `<div style="flex: 1; height: 12px; border-radius: 2px; background: ${bg}; opacity: ${s.isPast ? '0.4' : '1'};" title="Slot ${s.slot}: ${s.status}"></div>`;
      });
      stripHtml += '</div>';

      cardsHtml += `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <h3 style="margin: 0;">Room ${Utils.escapeHTML(room.roomNo)}</h3>
                <p class="form-hint" style="margin: 0;">${Utils.escapeHTML(room.name)}</p>
              </div>
              <span class="badge ${room.status === 'Active' ? 'badge-free' : 'badge-maint'}">${Utils.escapeHTML(room.status)}</span>
            </div>

            <div style="margin-top: var(--space-2); display: flex; gap: var(--space-2); flex-wrap: wrap;">
              <span class="chip">${Utils.escapeHTML(room.type)}</span>
              <span class="chip">&#128101; ${Utils.escapeHTML(String(room.capacity))} seats</span>
              <span class="chip">&#9200; ${Utils.escapeHTML(nextFreeText)}</span>
            </div>

            ${stripHtml}

            <div style="margin-top: var(--space-2); font-size: var(--text-xs); color: var(--text-secondary);">
              <strong>Facilities:</strong> ${(room.facilities || []).map(function(f) { return Utils.escapeHTML(f); }).join(', ') || 'Standard room'}
            </div>
          </div>

          <div style="margin-top: var(--space-4); display: flex; justify-content: flex-end;">
            <a href="#/request?roomId=${encodeURIComponent(room.id)}&date=${encodeURIComponent(dateStr)}" class="btn btn-sm btn-primary">Request Room</a>
          </div>
        </div>
      `;
    });

    cardsHtml += '</div>';
    containerEl.innerHTML = cardsHtml;
  },

  /**
   * Inspector dialog opened on clicking any grid cell.
   * Shows Class, Booked, Requested, or Free details.
   */
  renderSlotDetails: function(roomId, dateStr, slotNumber) {
    const room = Rooms.getById(roomId);
    if (!room) return;

    const slotInfo = this.getSlotStatus(roomId, dateStr, slotNumber);
    const slotDef = Config.SLOTS.find(function(s) { return s.id === slotNumber; }) || {};
    const isAdmin = (typeof App !== 'undefined' && App.getCurrentRole) ? App.getCurrentRole() === Config.ROLES.ADMIN : false;

    let bodyHtml = `
      <div style="margin-bottom: var(--space-3);">
        <p><strong>Room:</strong> ${Utils.escapeHTML(room.name)} (Room ${Utils.escapeHTML(room.roomNo)})</p>
        <p><strong>Date:</strong> ${Utils.formatDate(dateStr)} &bull; <strong>Time:</strong> Slot ${slotNumber} (${slotDef.start} - ${slotDef.end})</p>
        <p><strong>Current Status:</strong> <span class="badge badge-${slotInfo.status.toLowerCase()}">${slotInfo.status}</span></p>
      </div>
    `;

    if (slotInfo.status === 'Class') {
      const cls = slotInfo.details;
      bodyHtml += `
        <div class="card" style="background-color: var(--color-class-bg); border-color: var(--color-class-border); color: var(--color-class);">
          <h4 style="margin-bottom: var(--space-1);">&#128218; Scheduled Academic Lecture</h4>
          <p><strong>Course:</strong> ${Utils.escapeHTML(cls.course)}</p>
          <p><strong>Faculty:</strong> ${Utils.escapeHTML(cls.faculty)}</p>
          <p style="margin: 0;"><strong>Section:</strong> ${Utils.escapeHTML(cls.section)}</p>
        </div>
      `;
    } else if (slotInfo.status === 'Booked') {
      const bk = slotInfo.details;
      bodyHtml += `
        <div class="card" style="background-color: var(--color-booked-bg); border-color: var(--color-booked-border); color: var(--color-booked);">
          <h4 style="margin-bottom: var(--space-1);">&#128100; Approved Campus Booking</h4>
          <p><strong>Reference:</strong> <code>${Utils.escapeHTML(bk.ref)}</code></p>
          <p><strong>Purpose:</strong> ${Utils.escapeHTML(bk.purpose)}</p>
          <p><strong>Requester:</strong> ${Utils.escapeHTML(bk.requesterName)} (${Utils.escapeHTML(bk.requesterType)})</p>
          ${isAdmin ? `<p><strong>Contact:</strong> ${Utils.escapeHTML(bk.email)} ${bk.phone ? '&bull; ' + Utils.escapeHTML(bk.phone) : ''}</p>` : ''}
        </div>
      `;
    } else if (slotInfo.status === 'Requested') {
      bodyHtml += `
        <div class="card" style="background-color: var(--color-requested-bg); border-color: var(--color-requested-border); color: var(--color-requested);">
          <h4 style="margin-bottom: var(--space-1);">&#9203; Pending Requests</h4>
          <p>There are currently <strong>${slotInfo.pendingCount}</strong> pending request(s) awaiting coordinator approval for this slot.</p>
          <p class="form-hint" style="margin: 0;">You can still submit a request. The coordinator will review competing submissions.</p>
        </div>
      `;
    } else if (slotInfo.status === 'Free') {
      bodyHtml += `
        <div class="card" style="background-color: var(--color-free-bg); border-color: var(--color-free-border); color: var(--color-free);">
          <h4 style="margin-bottom: var(--space-1);">&#9989; Available Slot</h4>
          <p style="margin: 0;">This room and slot are completely free with zero scheduled classes or approved reservations.</p>
        </div>
      `;
    } else if (slotInfo.status === 'Maintenance') {
      bodyHtml += `
        <div class="card" style="background-color: var(--color-maint-bg); border-color: var(--color-maint-border); color: var(--color-maint);">
          <h4 style="margin-bottom: var(--space-1);">&#128295; Room Under Maintenance</h4>
          <p style="margin: 0;">${Utils.escapeHTML((slotInfo.details && slotInfo.details.reason) || 'This facility is temporarily closed for repairs.')}</p>
        </div>
      `;
    }

    // Smart Alternative Room Recommendations if slot is occupied or requested
    if (slotInfo.status !== 'Free') {
      const alternatives = this.suggestAlternatives(roomId, dateStr, slotNumber, slotNumber, 1);
      if (alternatives.length > 0) {
        bodyHtml += `
          <div style="margin-top: var(--space-4); padding-top: var(--space-3); border-top: 1px dashed var(--border-color);">
            <h4 style="font-size: var(--text-sm); margin-bottom: var(--space-2); color: var(--text-primary);">&#128161; Available Alternative Rooms for Slot ${slotNumber}:</h4>
            <div style="display: flex; flex-direction: column; gap: var(--space-2);">
              ${alternatives.map(function(alt) {
                return `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); border: 1px solid var(--border-color); gap: var(--space-2); flex-wrap: wrap;">
                    <div>
                      <strong>Room ${Utils.escapeHTML(alt.room.roomNo)}</strong> &bull; ${Utils.escapeHTML(alt.room.name)}
                      <div style="font-size: var(--text-xs); color: var(--text-muted);">${Utils.escapeHTML(alt.reason)}</div>
                    </div>
                    <button type="button" class="btn btn-sm btn-primary slot-alt-book-btn" data-room-id="${Utils.escapeHTML(alt.room.id)}" style="font-size: var(--text-xs); padding: 4px 8px;">
                      Book Room ${Utils.escapeHTML(alt.room.roomNo)}
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }
    }

    // Modal action buttons
    const now = Utils.getNow();
    const todayStr = Utils.getLocalDateString(now);
    const slotStartMinutes = (slotDef && slotDef.startHour !== undefined) ? (slotDef.startHour * 60 + slotDef.startMin) : 0;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const isStarted = (dateStr === todayStr && nowMinutes >= slotStartMinutes);

    const onConfirmAction = (!slotInfo.isPast && !isStarted && (slotInfo.status === 'Free' || slotInfo.status === 'Requested')) ? function() {
      UI.closeModal();
      window.location.hash = `#/request?roomId=${room.id}&date=${dateStr}&startSlot=${slotNumber}&endSlot=${slotNumber}`;
    } : null;

    UI.showModal(`Room ${Utils.escapeHTML(room.roomNo)} - Slot ${slotNumber} Inspection`, bodyHtml, onConfirmAction, 'Request This Slot');

    const modalEl = document.getElementById('app-modal');
    if (modalEl) {
      const altBtns = modalEl.querySelectorAll('.slot-alt-book-btn');
      altBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
          const targetRoomId = btn.getAttribute('data-room-id');
          UI.closeModal();
          window.location.hash = `#/request?roomId=${encodeURIComponent(targetRoomId)}&date=${encodeURIComponent(dateStr)}&startSlot=${slotNumber}&endSlot=${slotNumber}`;
        });
      });
    }
  },

  /**
   * Renders Find a Free Room Screen (#/find).
   * @param {HTMLElement} containerEl
   */
  renderFinder: function(containerEl) {
    const todayStr = Utils.getLocalDateString(Utils.getNow());
    const buildings = Rooms.getAllBuildings();

    const savedFinder = (typeof App !== 'undefined' && App.state && App.state.filters && App.state.filters.finder) || {};
    const initialDate = savedFinder.date || todayStr;
    const initialStartSlot = savedFinder.startSlot || 1;
    const initialEndSlot = savedFinder.endSlot || 1;
    const initialAttendees = savedFinder.attendees || 30;
    const initialBuildingId = savedFinder.buildingId || '';
    const initialType = savedFinder.type || '';
    const initialFacilities = savedFinder.facilities || [];

    let bldgOptions = '<option value="">Any Building</option>';
    buildings.forEach(function(b) {
      bldgOptions += `<option value="${Utils.escapeHTML(b.id)}" ${b.id === initialBuildingId ? 'selected' : ''}>${Utils.escapeHTML(b.name)}</option>`;
    });

    let typeOptions = '<option value="">Any Room Type</option>';
    Config.ROOM_TYPES.forEach(function(t) {
      typeOptions += `<option value="${t}" ${t === initialType ? 'selected' : ''}>${t}</option>`;
    });

    let facCheckboxes = '';
    Config.FACILITIES.forEach(function(f) {
      const isChecked = initialFacilities.includes(f) ? 'checked' : '';
      facCheckboxes += `
        <label class="checkbox-label" style="font-size: var(--text-xs);">
          <input type="checkbox" name="finder_facility" value="${f}" class="checkbox-input" ${isChecked}> ${f}
        </label>
      `;
    });

    containerEl.innerHTML = `
      <!-- Sunday Notice Banner Container -->
      <div id="finder-sunday-banner"></div>

      <div class="card" style="margin-bottom: var(--space-6);">
        <form id="finder-form" style="display: flex; flex-direction: column; gap: var(--space-4);">
          <div class="grid-3col">
            <div class="form-group">
              <label for="find-date" class="form-label form-label-required">Reservation Date</label>
              <input type="date" id="find-date" class="form-input" value="${Utils.escapeHTML(initialDate)}" min="${todayStr}" required />
            </div>
            <div class="form-group">
              <label for="find-start-slot" class="form-label form-label-required">From Slot</label>
              <select id="find-start-slot" class="form-select">
                ${Config.SLOTS.map(function(s) { return `<option value="${s.id}" ${s.id === initialStartSlot ? 'selected' : ''}>${s.label} (${s.start})</option>`; }).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="find-end-slot" class="form-label form-label-required">To Slot</label>
              <select id="find-end-slot" class="form-select">
                ${Config.SLOTS.map(function(s) { return `<option value="${s.id}" ${s.id === initialEndSlot ? 'selected' : ''}>${s.label} (${s.end})</option>`; }).join('')}
              </select>
            </div>
          </div>

          <div class="grid-3col">
            <div class="form-group">
              <label for="find-attendees" class="form-label form-label-required">Expected Attendees</label>
              <input type="number" id="find-attendees" class="form-input" value="${initialAttendees}" min="1" max="500" required />
            </div>
            <div class="form-group">
              <label for="find-building" class="form-label">Preferred Building</label>
              <select id="find-building" class="form-select">${bldgOptions}</select>
            </div>
            <div class="form-group">
              <label for="find-type" class="form-label">Room Type</label>
              <select id="find-type" class="form-select">${typeOptions}</select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Required Facilities</label>
            <div class="checkbox-group">${facCheckboxes}</div>
          </div>

          <div style="display: flex; justify-content: flex-end;">
            <button type="submit" class="btn btn-primary">&#128269; Search Free Rooms</button>
          </div>
        </form>
      </div>

      <!-- Results Container -->
      <div id="finder-results-container"></div>
    `;

    const self = this;
    const form = document.getElementById('finder-form');

    const updateSundayBanner = function(dateVal) {
      const bannerEl = document.getElementById('finder-sunday-banner');
      if (!bannerEl) return;
      const isSunday = Utils.getWeekday(dateVal) === 0;
      if (isSunday) {
        bannerEl.innerHTML = `
          <div class="card" style="margin-bottom: var(--space-4); border-left: 4px solid var(--accent-primary); background-color: var(--bg-subtle); display: flex; align-items: center; gap: var(--space-3);">
            <span style="font-size: 1.5rem;" aria-hidden="true">&#128197;</span>
            <div>
              <strong>Sunday Academic Schedule:</strong> Regular classes are off on Sundays. All non-maintenance rooms are free from recurring timetable schedules.
            </div>
          </div>
        `;
      } else {
        bannerEl.innerHTML = '';
      }
    };

    const findDateInput = document.getElementById('find-date');
    if (findDateInput) {
      findDateInput.addEventListener('change', function(e) {
        updateSundayBanner(e.target.value);
      });
    }
    updateSundayBanner(initialDate);

    const executeSearch = function() {
      const date = document.getElementById('find-date').value;
      const startSlot = parseInt(document.getElementById('find-start-slot').value, 10);
      const endSlot = parseInt(document.getElementById('find-end-slot').value, 10);
      const attendees = parseInt(document.getElementById('find-attendees').value, 10);
      const buildingId = document.getElementById('find-building').value;
      const type = document.getElementById('find-type').value;

      const checkedFacilities = Array.from(document.querySelectorAll('input[name="finder_facility"]:checked')).map(function(el) {
        return el.value;
      });

      if (endSlot < startSlot) {
        UI.showToast('To Slot cannot be earlier than From Slot.', 'error');
        return;
      }

      // Persist active finder filter state
      if (typeof App !== 'undefined' && App.state && App.state.filters) {
        App.state.filters.finder = {
          date: date,
          startSlot: startSlot,
          endSlot: endSlot,
          attendees: attendees,
          buildingId: buildingId,
          type: type,
          facilities: checkedFacilities
        };
      }

      const results = self.findFreeRooms({
        date: date,
        startSlot: startSlot,
        endSlot: endSlot,
        attendees: attendees,
        buildingId: buildingId,
        type: type,
        facilities: checkedFacilities
      });

      const resultsEl = document.getElementById('finder-results-container');
      if (!resultsEl) return;

      if (results.length === 0) {
        resultsEl.innerHTML = `
          <div class="card empty-state">
            <div class="empty-icon">&#128269;</div>
            <h3 class="empty-title">No rooms completely free for all selected slots</h3>
            <p class="empty-desc">All candidate rooms have scheduled classes or approved bookings during your chosen slot interval.</p>
          </div>
        `;
        return;
      }

      let resHtml = `
        <h3 style="margin-bottom: var(--space-4);">Matching Rooms (${results.length} found, sorted best fit first)</h3>
        <div class="grid-2col">
      `;

      results.forEach(function(item) {
        const r = item.room;
        const bldg = buildings.find(function(b) { return b.id === r.buildingId; });
        const bldgName = bldg ? bldg.name : 'Campus';

        resHtml += `
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <h4 style="margin: 0; font-size: var(--text-base);">Room ${Utils.escapeHTML(r.roomNo)} &bull; ${Utils.escapeHTML(r.name)}</h4>
                  <p class="form-hint" style="margin: 0;">${Utils.escapeHTML(bldgName)}</p>
                </div>
                <span class="badge badge-free">${item.fitCategory}</span>
              </div>

              <div style="margin-top: var(--space-2); display: flex; gap: var(--space-2); flex-wrap: wrap;">
                <span class="chip">${Utils.escapeHTML(r.type)}</span>
                <span class="chip">&#128101; ${Utils.escapeHTML(String(r.capacity))} seats</span>
                <span class="chip">&#9200; Slots ${startSlot}-${endSlot} Free</span>
              </div>

              <div style="margin-top: var(--space-2); font-size: var(--text-xs); color: var(--text-secondary);">
                <strong>Facilities:</strong> ${(r.facilities || []).map(Utils.escapeHTML).join(', ') || 'Standard room'}
              </div>
            </div>

            <div style="margin-top: var(--space-4); display: flex; justify-content: flex-end;">
              <a href="#/request?roomId=${encodeURIComponent(r.id)}&date=${encodeURIComponent(date)}&startSlot=${encodeURIComponent(startSlot)}&endSlot=${encodeURIComponent(endSlot)}" class="btn btn-sm btn-primary">Request This Room</a>
            </div>
          </div>
        `;
      });

      resHtml += '</div>';
      resultsEl.innerHTML = resHtml;
    };

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      executeSearch();
    });

    // Execute search initially
    executeSearch();
  }
};
