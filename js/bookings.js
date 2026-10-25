/**
 * js/bookings.js
 * 
 * Purpose: Booking lifecycle management, structured reservation forms,
 *          conflict re-checks, auto-rejection cascades, and request tracking.
 * Owner: Dhruv Anand (Reg. No. 12619773) - Booking Workflows, Approval Cascades & Tracking
 * Depends on: Config (js/config.js), Utils (js/utils.js), Store (js/store.js),
 *             Validators (js/validators.js), Rooms (js/rooms.js),
 *             Availability (js/availability.js), UI (js/ui.js)
 * 
 * Functions:
 * - getAll(): object[]
 * - getById(id): object|null
 * - getByRef(ref): object|null
 * - getByRequester(requesterId): object[]
 * - getComputedStatus(booking): string
 * - createBooking(formData): object
 * - updatePendingBooking(id, formData): object
 * - approveBooking(id): object
 * - rejectBooking(id, adminRemark): object
 * - cancelBooking(id, cancelReason): object
 * - renderRequestsList(containerEl, filters): void
 * - renderBookingDetails(id): void
 * - renderRequestForm(containerEl, editBookingId, prefill): void
 */

'use strict';

const Bookings = {
  /**
   * Retrieves all bookings from store.
   * @returns {object[]}
   */
  getAll: function() {
    return Store.get('BOOKINGS') || [];
  },

  /**
   * Retrieves a single booking by internal ID.
   * @param {string} id
   * @returns {object|null}
   */
  getById: function(id) {
    const list = this.getAll();
    return list.find(function(b) { return b.id === id; }) || null;
  },

  /**
   * Finds booking by human-readable reference (e.g. "RB-20261024-001").
   * @param {string} ref
   * @returns {object|null}
   */
  getByRef: function(ref) {
    if (!ref) return null;
    const cleanRef = ref.trim().toUpperCase();
    const list = this.getAll();
    return list.find(function(b) { return b.ref.toUpperCase() === cleanRef; }) || null;
  },

  /**
   * Retrieves all bookings submitted by a student reg no or faculty employee ID.
   * @param {string} requesterId
   * @returns {object[]}
   */
  getByRequester: function(requesterId) {
    if (!requesterId) return [];
    const cleanId = requesterId.trim().toUpperCase();
    const list = this.getAll();
    return list.filter(function(b) { return b.requesterId.toUpperCase() === cleanId; });
  },

  /**
   * Computes display status.
   * If status is "Approved" but date/time has passed, returns "Completed".
   * @param {object} booking
   * @returns {"Pending"|"Approved"|"Rejected"|"Cancelled"|"Completed"}
   */
  getComputedStatus: function(booking) {
    if (!booking) return 'Cancelled';
    if (booking.status !== Config.BOOKING_STATUS.APPROVED) {
      return booking.status;
    }

    const now = Utils.getNow();
    const todayStr = Utils.getLocalDateString(now);

    if (booking.date < todayStr) {
      return Config.BOOKING_STATUS.COMPLETED;
    }

    if (booking.date === todayStr) {
      const slotDef = Config.SLOTS.find(function(s) { return s.id === booking.endSlot; });
      if (slotDef) {
        const slotEndMinutes = slotDef.endHour * 60 + slotDef.endMin;
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        if (nowMinutes >= slotEndMinutes) {
          return Config.BOOKING_STATUS.COMPLETED;
        }
      }
    }

    return Config.BOOKING_STATUS.APPROVED;
  },

  /**
   * Calculates the number of active/upcoming requests for a requester.
   * Excludes completed bookings (past dates or completed today).
   * @param {string} requesterId
   * @returns {number}
   */
  getActiveRequestCount: function(requesterId) {
    if (!requesterId) return 0;
    const allBookings = this.getAll();
    const now = Utils.getNow();
    const todayStr = Utils.getLocalDateString(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const reqIdUpper = requesterId.trim().toUpperCase();
    const self = this;

    return allBookings.filter(function(b) {
      if (b.requesterId.trim().toUpperCase() !== reqIdUpper) {
        return false;
      }
      if (b.date < todayStr) {
        return false;
      }
      const computed = self.getComputedStatus(b);
      if (computed !== Config.BOOKING_STATUS.PENDING && computed !== Config.BOOKING_STATUS.APPROVED) {
        return false;
      }
      // If booking is today, check if its endSlot has already ended
      if (b.date === todayStr) {
        const slotDef = Config.SLOTS.find(function(s) { return s.id === b.endSlot; });
        if (slotDef) {
          const slotEndMinutes = slotDef.endHour * 60 + slotDef.endMin;
          if (nowMinutes >= slotEndMinutes) {
            return false;
          }
        }
      }
      return true;
    }).length;
  },

  /**
   * Submits a new booking request.
   * Checks role quotas, validates fields, and blocks on hard conflicts.
   * @param {object} formData
   * @returns {{ success: boolean, ref?: string, errors?: Record<string, string> }}
   */
  createBooking: function(formData) {
    const room = Rooms.getById(formData.roomId);

    // 1. Calculate active upcoming booking count for this requester
    const activeCount = this.getActiveRequestCount(formData.requesterId);

    // 2. Validate input fields
    const validation = Validators.validateRequestForm(formData, room, activeCount);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // 3. Conflict Check (Hard conflicts block submission)
    const conflicts = Availability.findConflicts(formData.roomId, formData.date, formData.startSlot, formData.endSlot);
    const hardConflicts = conflicts.filter(function(c) {
      return c.type === 'maintenance' || c.type === 'class' || c.type === 'approved';
    });

    if (hardConflicts.length > 0) {
      return {
        success: false,
        errors: { slots: hardConflicts[0].reason }
      };
    }

    // 4. Create Booking Entity
    const nowIso = Utils.getNow().toISOString();
    const ref = Utils.generateRef(formData.date);

    const newBooking = {
      id: Utils.generateId('bk'),
      ref: ref,
      roomId: formData.roomId,
      date: formData.date,
      startSlot: parseInt(formData.startSlot, 10),
      endSlot: parseInt(formData.endSlot, 10),
      purpose: formData.purpose.trim(),
      attendees: parseInt(formData.attendees, 10),
      requesterName: formData.requesterName.trim(),
      requesterId: formData.requesterId.trim().toUpperCase(),
      requesterType: formData.requesterType,
      email: formData.email.trim(),
      phone: (formData.phone || '').trim(),
      requirements: Array.isArray(formData.requirements) ? formData.requirements : [],
      status: Config.BOOKING_STATUS.PENDING,
      adminNote: '',
      createdAt: nowIso,
      updatedAt: nowIso,
      history: [
        {
          status: Config.BOOKING_STATUS.PENDING,
          at: nowIso,
          by: formData.requesterType,
          note: 'Submitted room booking request.'
        }
      ]
    };

    const saved = Store.addItem('BOOKINGS', newBooking);
    if (!saved) {
      return { success: false, errors: { form: 'Storage write failed. Request could not be saved.' } };
    }

    // 5. Remember requester details in settings with atomic rollback if settings write fails
    const settings = Store.get('SETTINGS') || {};
    settings.lastRequester = {
      type: formData.requesterType,
      name: newBooking.requesterName,
      id: newBooking.requesterId,
      email: newBooking.email,
      phone: newBooking.phone
    };
    const settingsSaved = Store.set('SETTINGS', settings);
    if (!settingsSaved) {
      Store.removeItem('BOOKINGS', newBooking.id);
      return { success: false, errors: { form: 'Storage write failed. Request could not be saved.' } };
    }

    return { success: true, ref: ref };
  },

  /**
   * Updates an existing Pending request.
   * @param {string} id
   * @param {object} formData
   * @returns {{ success: boolean, errors?: Record<string, string> }}
   */
  updatePendingBooking: function(id, formData) {
    const booking = this.getById(id);
    if (!booking) return { success: false, errors: { form: 'Booking not found.' } };

    if (booking.status !== Config.BOOKING_STATUS.PENDING) {
      return { success: false, errors: { form: 'Only Pending requests can be edited.' } };
    }

    const room = Rooms.getById(formData.roomId);
    const validation = Validators.validateRequestForm(formData, room, 0); // Don't block on active count for self
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const conflicts = Availability.findConflicts(formData.roomId, formData.date, formData.startSlot, formData.endSlot, id);
    const hardConflicts = conflicts.filter(function(c) {
      return c.type === 'maintenance' || c.type === 'class' || c.type === 'approved';
    });

    if (hardConflicts.length > 0) {
      return { success: false, errors: { slots: hardConflicts[0].reason } };
    }

    const nowIso = Utils.getNow().toISOString();
    booking.roomId = formData.roomId;
    booking.date = formData.date;
    booking.startSlot = parseInt(formData.startSlot, 10);
    booking.endSlot = parseInt(formData.endSlot, 10);
    booking.purpose = formData.purpose.trim();
    booking.attendees = parseInt(formData.attendees, 10);
    booking.requesterName = formData.requesterName.trim();
    booking.requesterId = formData.requesterId.trim().toUpperCase();
    booking.requesterType = formData.requesterType;
    booking.email = formData.email.trim();
    booking.phone = (formData.phone || '').trim();
    booking.requirements = formData.requirements || [];
    booking.updatedAt = nowIso;
    booking.history.push({
      status: Config.BOOKING_STATUS.PENDING,
      at: nowIso,
      by: formData.requesterType,
      note: 'Edited request details.'
    });

    const saved = Store.updateItem('BOOKINGS', id, booking);
    if (!saved) {
      return { success: false, errors: { form: 'Storage write failed. Booking could not be updated.' } };
    }
    return { success: true };
  },

  /**
   * Approves booking request.
   * Auto-rejects competing pending requests with reference remark.
   * @param {string} id
   * @returns {{ success: boolean, message: string, rejectedConflicts: object[] }}
   */
  approveBooking: function(id) {
    const booking = this.getById(id);
    if (!booking || booking.status !== Config.BOOKING_STATUS.PENDING) {
      return { success: false, message: 'Invalid or non-pending booking.', rejectedConflicts: [] };
    }

    // Step 1: Re-verify conflicts at approval moment
    const conflicts = Availability.findConflicts(booking.roomId, booking.date, booking.startSlot, booking.endSlot, id);
    const hardConflicts = conflicts.filter(function(c) {
      return c.type === 'maintenance' || c.type === 'class' || c.type === 'approved';
    });

    if (hardConflicts.length > 0) {
      return { success: false, message: `Cannot approve: ${hardConflicts[0].reason}`, rejectedConflicts: [] };
    }

    const nowIso = Utils.getNow().toISOString();

    // Prepare atomic update across entire bookings collection
    const allBookings = Store.get('BOOKINGS') || [];
    const clonedBookings = JSON.parse(JSON.stringify(allBookings));

    const targetBooking = clonedBookings.find(function(b) { return b.id === id; });
    if (!targetBooking || targetBooking.status !== Config.BOOKING_STATUS.PENDING) {
      return { success: false, message: 'Target booking was modified or removed. Refresh and retry.', rejectedConflicts: [] };
    }

    // Step 2: Mark current booking as Approved
    targetBooking.status = Config.BOOKING_STATUS.APPROVED;
    targetBooking.updatedAt = nowIso;
    targetBooking.history.push({
      status: Config.BOOKING_STATUS.APPROVED,
      at: nowIso,
      by: 'Admin',
      note: 'Request approved by Room Coordinator.'
    });

    // Step 3: Auto-reject competing Pending requests in the same atomic commit
    const competingPending = conflicts.filter(function(c) { return c.type === 'pending'; });
    const autoRejected = [];

    competingPending.forEach(function(conflict) {
      const compId = conflict.details && conflict.details.id;
      const compBooking = clonedBookings.find(function(b) { return b.id === compId; });
      if (compBooking && compBooking.status === Config.BOOKING_STATUS.PENDING) {
        compBooking.status = Config.BOOKING_STATUS.REJECTED;
        compBooking.adminNote = `Slot allotted to request ${targetBooking.ref}`;
        compBooking.updatedAt = nowIso;
        compBooking.history.push({
          status: Config.BOOKING_STATUS.REJECTED,
          at: nowIso,
          by: 'System',
          note: `Slot allotted to request ${targetBooking.ref}`
        });
        autoRejected.push(compBooking);
      }
    });

    const saved = Store.set('BOOKINGS', clonedBookings);
    if (!saved) {
      return { success: false, message: 'Storage write failed. Booking approval and cascade could not be saved.', rejectedConflicts: [] };
    }

    const msg = `Booking ${targetBooking.ref} approved.` +
      (autoRejected.length > 0 ? ` ${autoRejected.length} competing request(s) were auto-rejected.` : '');

    return { success: true, message: msg, rejectedConflicts: autoRejected };
  },

  /**
   * Rejects request with mandatory coordinator remark.
   * @param {string} id
   * @param {string} adminRemark
   * @returns {{ success: boolean, message: string }}
   */
  rejectBooking: function(id, adminRemark) {
    const booking = this.getById(id);
    if (!booking) return { success: false, message: 'Booking not found.' };

    const check = Validators.validateRejectRemark(adminRemark);
    if (!check.valid) return { success: false, message: check.error };

    const nowIso = Utils.getNow().toISOString();
    booking.status = Config.BOOKING_STATUS.REJECTED;
    booking.adminNote = adminRemark.trim();
    booking.updatedAt = nowIso;
    booking.history.push({
      status: Config.BOOKING_STATUS.REJECTED,
      at: nowIso,
      by: 'Admin',
      note: adminRemark.trim()
    });

    const saved = Store.updateItem('BOOKINGS', id, booking);
    if (!saved) {
      return { success: false, message: 'Storage write failed. Booking could not be rejected.' };
    }
    return { success: true, message: `Booking ${booking.ref} rejected.` };
  },

  /**
   * Cancels a pending or upcoming approved booking.
   * @param {string} id
   * @param {string} cancelReason
   * @returns {{ success: boolean, message: string }}
   */
  cancelBooking: function(id, cancelReason) {
    const booking = this.getById(id);
    if (!booking) return { success: false, message: 'Booking not found.' };

    const computed = this.getComputedStatus(booking);
    if (computed === Config.BOOKING_STATUS.COMPLETED || computed === Config.BOOKING_STATUS.REJECTED || computed === Config.BOOKING_STATUS.CANCELLED) {
      return { success: false, message: `Cannot cancel a booking that is ${computed}.` };
    }

    const nowIso = Utils.getNow().toISOString();
    const role = (typeof App !== 'undefined' && App.getCurrentRole) ? App.getCurrentRole() : 'User';

    booking.status = Config.BOOKING_STATUS.CANCELLED;
    booking.adminNote = cancelReason || 'Cancelled by user.';
    booking.updatedAt = nowIso;
    booking.history.push({
      status: Config.BOOKING_STATUS.CANCELLED,
      at: nowIso,
      by: role,
      note: cancelReason || 'Cancelled by user.'
    });

    const saved = Store.updateItem('BOOKINGS', id, booking);
    if (!saved) {
      return { success: false, message: 'Storage write failed. Booking could not be cancelled.' };
    }
    return { success: true, message: `Booking ${booking.ref} cancelled.` };
  },

  /**
   * Renders the Requests List table, pagination, search, and status chips.
   * @param {HTMLElement} containerEl
   * @param {object} [initialFilters={}]
   */
  renderRequestsList: function(containerEl, initialFilters) {
    const isAdmin = (typeof App !== 'undefined' && App.getCurrentRole) ? App.getCurrentRole() === Config.ROLES.ADMIN : false;
    const settings = Store.get('SETTINGS') || {};
    const lastRequester = settings.lastRequester || {};

    const state = {
      status: 'All',
      search: (initialFilters && initialFilters.search) || '',
      requesterId: isAdmin ? '' : (lastRequester.id || ''),
      page: 1,
      pageSize: Config.PAGINATION.ITEMS_PER_PAGE
    };

    const self = this;
    const render = function() {
      const allBookings = self.getAll();

      // Filter by requester for non-admins
      let filtered = allBookings;
      if (!isAdmin) {
        filtered = filtered.filter(function(b) {
          if (!state.requesterId) return true;
          return b.requesterId.toUpperCase() === state.requesterId.toUpperCase();
        });
      }

      // Filter by status tab
      if (state.status !== 'All') {
        filtered = filtered.filter(function(b) {
          const computed = self.getComputedStatus(b);
          return computed === state.status;
        });
      }

      // Filter by text search
      if (state.search) {
        const q = state.search.toLowerCase();
        filtered = filtered.filter(function(b) {
          const room = Rooms.getById(b.roomId);
          const roomNo = room ? room.roomNo.toLowerCase() : '';
          return b.ref.toLowerCase().includes(q) ||
                 b.requesterName.toLowerCase().includes(q) ||
                 b.requesterId.toLowerCase().includes(q) ||
                 b.purpose.toLowerCase().includes(q) ||
                 roomNo.includes(q);
        });
      }

      // Sort newest date first
      filtered.sort(function(a, b) {
        return b.date.localeCompare(a.date) || b.startSlot - a.startSlot;
      });

      // Pagination slice
      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / state.pageSize) || 1;
      if (state.page > totalPages) state.page = totalPages;
      const startIdx = (state.page - 1) * state.pageSize;
      const pageBookings = filtered.slice(startIdx, startIdx + state.pageSize);

      // Status count chips
      const counts = { All: allBookings.length, Pending: 0, Approved: 0, Rejected: 0, Cancelled: 0, Completed: 0 };
      allBookings.forEach(function(b) {
        if (!isAdmin && state.requesterId && b.requesterId.toUpperCase() !== state.requesterId.toUpperCase()) return;
        const comp = self.getComputedStatus(b);
        if (counts[comp] !== undefined) counts[comp]++;
      });

      let statusChips = '';
      ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled', 'Completed'].forEach(function(st) {
        const activeClass = state.status === st ? 'btn-primary' : 'btn-subtle';
        const cnt = counts[st] !== undefined ? counts[st] : 0;
        statusChips += `<button class="btn btn-sm ${activeClass} req-status-tab" data-status="${st}" type="button">${st} (${cnt})</button>`;
      });

      // Table rows
      let rows = '';
      pageBookings.forEach(function(b) {
        const room = Rooms.getById(b.roomId);
        const roomLabel = room ? `${room.roomNo} (${room.name})` : 'Unknown';
        const computed = self.getComputedStatus(b);

        const badgeMap = {
          Pending: 'badge-requested',
          Approved: 'badge-booked',
          Rejected: 'badge-danger',
          Cancelled: 'badge-maint',
          Completed: 'badge-free'
        };

        const timeSpan = `${Utils.formatSlotTime(b.startSlot)}` +
          (b.endSlot > b.startSlot ? ` to ${Utils.formatSlotTime(b.endSlot).split('-')[1]}` : '');

        const isOwner = (b.requesterId.toUpperCase() === (lastRequester.id || '').toUpperCase());
        const canEdit = isOwner && (computed === 'Pending');
        const canCancel = (isOwner || isAdmin) && (computed === 'Pending' || computed === 'Approved');

        rows += `
          <tr>
            <td data-label="Reference">
              <button class="footer-link-btn view-details-btn" data-id="${Utils.escapeHTML(b.id)}" type="button" style="font-weight: bold;">
                ${Utils.escapeHTML(b.ref)}
              </button>
            </td>
            <td data-label="Room">${Utils.escapeHTML(roomLabel)}</td>
            <td data-label="Date">${Utils.formatDate(b.date)}</td>
            <td data-label="Time">${timeSpan}</td>
            <td data-label="Purpose" title="${Utils.escapeHTML(b.purpose)}">
              ${Utils.escapeHTML(b.purpose.length > 28 ? b.purpose.substring(0, 28) + '...' : b.purpose)}
            </td>
            ${isAdmin ? `<td data-label="Requester">${Utils.escapeHTML(b.requesterName)}<br><span style="font-size: 0.7rem; color: var(--text-muted);">${Utils.escapeHTML(b.requesterId)}</span></td>` : ''}
            <td data-label="Status">
              <span class="badge ${badgeMap[computed] || 'badge-subtle'}">${computed}</span>
            </td>
            <td data-label="Actions" style="text-align: right;">
              <div style="display: inline-flex; gap: 4px;">
                <button class="btn btn-sm btn-subtle view-details-btn" data-id="${Utils.escapeHTML(b.id)}" type="button">Details</button>
                ${isAdmin && computed === 'Pending' ? `
                  <button class="btn btn-sm btn-accent req-approve-btn" data-id="${Utils.escapeHTML(b.id)}" type="button">Approve</button>
                  <button class="btn btn-sm btn-danger req-reject-btn" data-id="${Utils.escapeHTML(b.id)}" type="button">Reject</button>
                ` : ''}
                ${canEdit ? `<a href="#/request?edit=${encodeURIComponent(b.id)}" class="btn btn-sm btn-secondary">Edit</a>` : ''}
                ${canCancel ? `<button class="btn btn-sm btn-subtle req-cancel-btn" data-id="${Utils.escapeHTML(b.id)}" type="button" style="color: var(--color-danger);">Cancel</button>` : ''}
              </div>
            </td>
          </tr>
        `;
      });

      containerEl.innerHTML = `
        <div class="card" style="margin-bottom: var(--space-4);">
          <!-- Top Row: Persona context & Search -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3);">
            <div>
              <h3 style="margin: 0;">${isAdmin ? 'All Campus Booking Requests' : 'My Requests Tracking'}</h3>
              <p class="form-hint" style="margin: 0;">
                ${isAdmin ? 'Review, approve, or reject submissions across all departments.' : `Showing requests for ID: <strong>${Utils.escapeHTML(state.requesterId || 'All')}</strong>`}
              </p>
            </div>
            ${isAdmin ? `<button id="export-csv-btn" class="btn btn-sm btn-secondary" type="button">&#128190; Export CSV</button>` : ''}
          </div>

          <!-- Search & Status filter tabs -->
          <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-3);">
            <div style="flex: 1; min-width: 220px;">
              <input type="text" id="req-search-input" class="form-input" placeholder="Search reference, room, purpose..." value="${Utils.escapeHTML(state.search)}" />
            </div>
            ${!isAdmin ? `
              <div style="width: 160px;">
                <input type="text" id="req-id-filter" class="form-input" placeholder="Filter by ID" value="${Utils.escapeHTML(state.requesterId)}" />
              </div>
            ` : ''}
          </div>

          <div style="display: flex; gap: var(--space-1); overflow-x: auto; padding-bottom: var(--space-1);">
            ${statusChips}
          </div>
        </div>

        <!-- Table View -->
        <div class="data-table-container">
          <table class="data-table responsive-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Room</th>
                <th>Date</th>
                <th>Slot Time</th>
                <th>Purpose</th>
                ${isAdmin ? '<th>Requester</th>' : ''}
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="8" style="text-align: center; padding: var(--space-6);">No booking requests found.</td></tr>'}
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        ${totalPages > 1 ? `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-4);">
            <button id="req-prev-page" class="btn btn-sm btn-secondary" ${state.page <= 1 ? 'disabled' : ''} type="button">&larr; Previous</button>
            <span style="font-size: var(--text-xs); color: var(--text-secondary);">Page ${state.page} of ${totalPages} (${totalItems} requests)</span>
            <button id="req-next-page" class="btn btn-sm btn-secondary" ${state.page >= totalPages ? 'disabled' : ''} type="button">Next &rarr;</button>
          </div>
        ` : ''}
      `;

      // Event bindings for controls
      document.getElementById('req-search-input').addEventListener('input', Utils.debounce(function(e) {
        state.search = e.target.value;
        state.page = 1;
        render();
      }, 250));

      const idFilter = document.getElementById('req-id-filter');
      if (idFilter) {
        idFilter.addEventListener('input', Utils.debounce(function(e) {
          state.requesterId = e.target.value.trim();
          state.page = 1;
          render();
        }, 250));
      }

      const tabs = containerEl.querySelectorAll('.req-status-tab');
      tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
          state.status = this.getAttribute('data-status');
          state.page = 1;
          render();
        });
      });

      const prevBtn = document.getElementById('req-prev-page');
      if (prevBtn) {
        prevBtn.addEventListener('click', function() {
          if (state.page > 1) {
            state.page--;
            render();
          }
        });
      }

      const nextBtn = document.getElementById('req-next-page');
      if (nextBtn) {
        nextBtn.addEventListener('click', function() {
          if (state.page < totalPages) {
            state.page++;
            render();
          }
        });
      }

      const exportBtn = document.getElementById('export-csv-btn');
      if (exportBtn) {
        exportBtn.addEventListener('click', function() {
          const headers = ['Reference', 'Room', 'Date', 'Start Slot', 'End Slot', 'Requester Name', 'ID', 'Type', 'Email', 'Phone', 'Purpose', 'Status', 'Admin Remark'];
          const exportRows = allBookings.map(function(b) {
            const r = Rooms.getById(b.roomId);
            const rNo = r ? r.roomNo : b.roomId;
            return [
              b.ref,
              rNo,
              b.date,
              b.startSlot,
              b.endSlot,
              b.requesterName,
              b.requesterId,
              b.requesterType,
              b.email,
              b.phone || '',
              b.purpose,
              self.getComputedStatus(b),
              b.adminNote || ''
            ];
          });
          Utils.exportToCSV(`campus-bookings-${Utils.getLocalDateString(Utils.getNow())}.csv`, headers, exportRows);
          UI.showToast('Bookings CSV exported successfully.', 'success');
        });
      }
    };

    render();

    // Table Actions Delegation
    containerEl.addEventListener('click', function(e) {
      const detailsBtn = e.target.closest('.view-details-btn');
      if (detailsBtn) {
        self.renderBookingDetails(detailsBtn.getAttribute('data-id'));
        return;
      }

      const approveBtn = e.target.closest('.req-approve-btn');
      if (approveBtn) {
        const id = approveBtn.getAttribute('data-id');
        const b = self.getById(id);
        if (!b) return;

        UI.showModal('Confirm Booking Approval', `<p>Approve request <strong>${Utils.escapeHTML(b.ref)}</strong> for ${Utils.escapeHTML(b.requesterName)}?</p><p class="form-hint">Any competing requests for this slot will be automatically rejected.</p>`, function() {
          const res = self.approveBooking(id);
          UI.closeModal();
          UI.showToast(res.message, res.success ? 'success' : 'error');
          render();
        }, 'Approve Request');
        return;
      }

      const rejectBtn = e.target.closest('.req-reject-btn');
      if (rejectBtn) {
        const id = rejectBtn.getAttribute('data-id');
        const b = self.getById(id);
        if (!b) return;

        const modalBody = `
          <div class="form-group">
            <label for="reject-remark-input" class="form-label form-label-required">Rejection Remark:</label>
            <textarea id="reject-remark-input" class="form-textarea" placeholder="Provide reason (5-200 characters)..." required></textarea>
            <p class="form-hint">This remark will be visible to the requester in their status history.</p>
          </div>
        `;

        UI.showModal(`Reject Request ${Utils.escapeHTML(b.ref)}`, modalBody, function() {
          const remark = document.getElementById('reject-remark-input').value;
          const res = self.rejectBooking(id, remark);
          if (res.success) {
            UI.closeModal();
            UI.showToast(res.message, 'success');
            render();
          } else {
            UI.showToast(res.message, 'error');
          }
        }, 'Confirm Rejection', true);
        return;
      }

      const cancelBtn = e.target.closest('.req-cancel-btn');
      if (cancelBtn) {
        const id = cancelBtn.getAttribute('data-id');
        const b = self.getById(id);
        if (!b) return;

        UI.showModal('Cancel Booking Request', `<p>Are you sure you want to cancel request <strong>${Utils.escapeHTML(b.ref)}</strong>?</p>`, function() {
          const res = self.cancelBooking(id, 'Cancelled by user.');
          UI.closeModal();
          UI.showToast(res.message, res.success ? 'success' : 'error');
          render();
        }, 'Cancel Request', true);
      }
    });
  },

  /**
   * Modal dialog with complete booking progress tracker and history trail.
   * @param {string} id
   */
  renderBookingDetails: function(id) {
    const b = this.getById(id);
    if (!b) return;

    const room = Rooms.getById(b.roomId);
    const roomName = room ? `${room.name} (Room ${room.roomNo})` : 'Unknown Room';
    const computed = this.getComputedStatus(b);
    const isAdmin = (typeof App !== 'undefined' && App.getCurrentRole) ? App.getCurrentRole() === Config.ROLES.ADMIN : false;

    // Progress tracker steps
    const isPending = computed === 'Pending';
    const isApproved = computed === 'Approved' || computed === 'Completed';
    const isCompleted = computed === 'Completed';
    const isRejected = computed === 'Rejected';
    const isCancelled = computed === 'Cancelled';

    let trackerHtml = '';
    if (isCancelled || isRejected) {
      trackerHtml = `
        <div class="progress-tracker">
          <div class="progress-step is-complete">
            <div class="step-circle">&#10003;</div>
            <div>Submitted</div>
          </div>
          <div class="progress-step is-complete" style="color: var(--color-danger);">
            <div class="step-circle" style="background-color: var(--color-danger-bg); border-color: var(--color-danger); color: var(--color-danger);">&#10007;</div>
            <div>${Utils.escapeHTML(computed)}</div>
          </div>
        </div>
      `;
    } else {
      trackerHtml = `
        <div class="progress-tracker">
          <div class="progress-step is-complete">
            <div class="step-circle">&#10003;</div>
            <div>Submitted</div>
          </div>
          <div class="progress-step ${isPending ? 'is-active' : 'is-complete'}">
            <div class="step-circle">${isPending ? '2' : '&#10003;'}</div>
            <div>Review</div>
          </div>
          <div class="progress-step ${isApproved ? (isCompleted ? 'is-complete' : 'is-active') : ''}">
            <div class="step-circle">${isCompleted ? '&#10003;' : '3'}</div>
            <div>Approved</div>
          </div>
          <div class="progress-step ${isCompleted ? 'is-complete' : ''}">
            <div class="step-circle">4</div>
            <div>Completed</div>
          </div>
        </div>
      `;
    }

    let historyLines = '';
    (b.history || []).forEach(function(h) {
      historyLines += `
        <li style="margin-bottom: var(--space-2); font-size: var(--text-xs);">
          <strong>${Utils.escapeHTML(h.status)}</strong> &bull; ${Utils.formatDate(h.at)} ${Utils.formatTime(h.at)} (${Utils.escapeHTML(h.by)})
          <div style="color: var(--text-secondary);">${Utils.escapeHTML(h.note)}</div>
        </li>
      `;
    });

    const bodyHtml = `
      ${trackerHtml}
      <div style="display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-3);">
        <p><strong>Reference:</strong> <code>${Utils.escapeHTML(b.ref)}</code></p>
        <p><strong>Room:</strong> ${Utils.escapeHTML(roomName)}</p>
        <p><strong>Date &amp; Time:</strong> ${Utils.formatDate(b.date)} &bull; ${Utils.formatSlotTime(b.startSlot)} to ${Utils.formatSlotTime(b.endSlot)}</p>
        <p><strong>Requester:</strong> ${Utils.escapeHTML(b.requesterName)} (${Utils.escapeHTML(b.requesterType)} &bull; ${Utils.escapeHTML(b.requesterId)})</p>
        ${isAdmin ? `<p><strong>Contact:</strong> ${Utils.escapeHTML(b.email)} ${b.phone ? '&bull; ' + Utils.escapeHTML(b.phone) : ''}</p>` : ''}
        <p><strong>Attendees:</strong> ${Utils.escapeHTML(String(b.attendees))} persons</p>
        <p><strong>Purpose:</strong> ${Utils.escapeHTML(b.purpose)}</p>
        ${b.requirements && b.requirements.length > 0 ? `<p><strong>Special Requirements:</strong> ${b.requirements.map(function(r) { return Utils.escapeHTML(r); }).join(', ')}</p>` : ''}
        ${b.adminNote ? `<div class="card" style="background-color: var(--bg-subtle); margin-top: var(--space-2);"><p style="margin: 0;"><strong>Coordinator Note:</strong> ${Utils.escapeHTML(b.adminNote)}</p></div>` : ''}

        <div style="margin-top: var(--space-3); border-top: 1px solid var(--border-subtle); padding-top: var(--space-2);">
          <h4 style="margin-bottom: var(--space-2);">Activity Log</h4>
          <ul style="list-style: none; padding-left: 0;">
            ${historyLines}
          </ul>
        </div>
      </div>
    `;

    UI.showModal(`Booking Details: ${Utils.escapeHTML(b.ref)}`, bodyHtml, null, 'Close');
  },

  /**
   * Renders semantic reservation form (#/request).
   * @param {HTMLElement} containerEl
   * @param {string} [editBookingId=""]
   * @param {object} [prefill={}]
   */
  renderRequestForm: function(containerEl, editBookingId, prefill) {
    const isEdit = Boolean(editBookingId);
    const editBooking = isEdit ? this.getById(editBookingId) : null;
    const settings = Store.get('SETTINGS') || {};
    const lastRequester = settings.lastRequester || {};

    const activeRole = (typeof App !== 'undefined' && App.getCurrentRole) ? App.getCurrentRole() : Config.ROLES.STUDENT;
    const initialType = (editBooking ? editBooking.requesterType : (activeRole === Config.ROLES.FACULTY ? 'Faculty' : 'Student'));

    const initialData = {
      requesterType: initialType,
      requesterName: editBooking ? editBooking.requesterName : (lastRequester.name || ''),
      requesterId: editBooking ? editBooking.requesterId : (lastRequester.id || ''),
      email: editBooking ? editBooking.email : (lastRequester.email || ''),
      phone: editBooking ? editBooking.phone : (lastRequester.phone || ''),
      roomId: editBooking ? editBooking.roomId : (prefill && prefill.roomId) || '',
      date: editBooking ? editBooking.date : (prefill && prefill.date) || Utils.getLocalDateString(Utils.getNow()),
      startSlot: editBooking ? editBooking.startSlot : (prefill && prefill.startSlot) || 1,
      endSlot: editBooking ? editBooking.endSlot : (prefill && prefill.endSlot) || 1,
      purpose: editBooking ? editBooking.purpose : '',
      attendees: editBooking ? editBooking.attendees : 30,
      requirements: editBooking ? editBooking.requirements : [],
      declaration: isEdit
    };

    const buildings = Rooms.getAllBuildings();
    const rooms = Rooms.getAll();

    let bldgOptions = '<option value="">-- Select Building --</option>';
    const selectedRoom = Rooms.getById(initialData.roomId);
    const initialBldgId = selectedRoom ? selectedRoom.buildingId : (buildings[0] ? buildings[0].id : '');

    buildings.forEach(function(b) {
      bldgOptions += `<option value="${Utils.escapeHTML(b.id)}" ${b.id === initialBldgId ? 'selected' : ''}>${Utils.escapeHTML(b.name)}</option>`;
    });

    const getRoomOptionsForBldg = function(bldgId, selRoomId) {
      const bRooms = rooms.filter(function(r) { return r.buildingId === bldgId && r.status === Config.ROOM_STATUS.ACTIVE; });
      let opts = '<option value="">-- Select Room --</option>';
      bRooms.forEach(function(r) {
        opts += `<option value="${Utils.escapeHTML(r.id)}" ${r.id === selRoomId ? 'selected' : ''}>${Utils.escapeHTML(r.name)} (${Utils.escapeHTML(r.roomNo)} &bull; ${Utils.escapeHTML(String(r.capacity))} seats)</option>`;
      });
      return opts;
    };

    let reqCheckboxes = '';
    Config.SPECIAL_REQUIREMENTS.forEach(function(sr) {
      const checked = (initialData.requirements || []).includes(sr) ? 'checked' : '';
      reqCheckboxes += `
        <label class="checkbox-label" style="font-size: var(--text-xs);">
          <input type="checkbox" name="booking_requirements" value="${sr}" class="checkbox-input" ${checked} /> ${sr}
        </label>
      `;
    });

    const todayStr = Utils.getLocalDateString(Utils.getNow());

    containerEl.innerHTML = `
      <div class="form-card" style="max-width: 800px; margin: 0 auto;">
        <h2 style="margin-bottom: var(--space-4);">${isEdit ? `Edit Pending Request: ${Utils.escapeHTML(editBooking.ref)}` : 'Submit Room &amp; Lab Booking Request'}</h2>
        
        <form id="booking-request-form" novalidate>
          <!-- Fieldset 1: Who -->
          <fieldset class="form-fieldset">
            <legend class="form-legend">1. Requester Identity</legend>
            <div class="form-group">
              <label class="form-label form-label-required">Requester Role</label>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" name="req_type" value="Student" class="radio-input" ${initialData.requesterType === 'Student' ? 'checked' : ''} /> Student
                </label>
                <label class="radio-label">
                  <input type="radio" name="req_type" value="Faculty" class="radio-input" ${initialData.requesterType === 'Faculty' ? 'checked' : ''} /> Faculty
                </label>
              </div>
            </div>

            <div class="grid-2col">
              <div class="form-group">
                <label for="req-name" class="form-label form-label-required">Full Name</label>
                <input type="text" id="req-name" class="form-input" value="${Utils.escapeHTML(initialData.requesterName)}" required />
                <div id="err-req-name" class="form-error"></div>
              </div>
              <div class="form-group">
                <label id="lbl-req-id" for="req-id" class="form-label form-label-required">
                  ${initialData.requesterType === 'Student' ? 'Registration Number (8 digits)' : 'Employee ID (4-10 characters)'}
                </label>
                <input type="text" id="req-id" class="form-input" value="${Utils.escapeHTML(initialData.requesterId)}" required />
                <div id="err-req-id" class="form-error"></div>
              </div>
            </div>

            <div class="grid-2col">
              <div class="form-group">
                <label for="req-email" class="form-label form-label-required">Official Email</label>
                <input type="email" id="req-email" class="form-input" value="${Utils.escapeHTML(initialData.email)}" placeholder="name@lpu.in" required />
                <div id="err-req-email" class="form-error"></div>
              </div>
              <div class="form-group">
                <label for="req-phone" class="form-label">Phone Number (Optional)</label>
                <input type="tel" id="req-phone" class="form-input" value="${Utils.escapeHTML(initialData.phone)}" placeholder="10-digit mobile" />
                <div id="err-req-phone" class="form-error"></div>
              </div>
            </div>
          </fieldset>

          <!-- Fieldset 2: Where & When -->
          <fieldset class="form-fieldset">
            <legend class="form-legend">2. Venue &amp; Timing</legend>
            <div class="grid-2col">
              <div class="form-group">
                <label for="req-bldg" class="form-label form-label-required">Building Block</label>
                <select id="req-bldg" class="form-select" required>${bldgOptions}</select>
              </div>
              <div class="form-group">
                <label for="req-room" class="form-label form-label-required">Room</label>
                <select id="req-room" class="form-select" required>${getRoomOptionsForBldg(initialBldgId, initialData.roomId)}</select>
                <div id="err-req-room" class="form-error"></div>
              </div>
            </div>

            <div class="grid-3col">
              <div class="form-group">
                <label for="req-date" class="form-label form-label-required">Date</label>
                <input type="date" id="req-date" class="form-input" value="${Utils.escapeHTML(initialData.date)}" min="${todayStr}" required />
                <div id="err-req-date" class="form-error"></div>
              </div>
              <div class="form-group">
                <label for="req-start-slot" class="form-label form-label-required">From Slot</label>
                <select id="req-start-slot" class="form-select">
                  ${Config.SLOTS.map(function(s) { return `<option value="${s.id}" ${s.id === initialData.startSlot ? 'selected' : ''}>${s.label} (${s.start})</option>`; }).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="req-end-slot" class="form-label form-label-required">To Slot</label>
                <select id="req-end-slot" class="form-select">
                  ${Config.SLOTS.map(function(s) { return `<option value="${s.id}" ${s.id === initialData.endSlot ? 'selected' : ''}>${s.label} (${s.end})</option>`; }).join('')}
                </select>
              </div>
            </div>
            <div id="err-req-slots" class="form-error"></div>

            <!-- Live Slot Check Status Indicator -->
            <div id="live-slot-check" class="card" style="padding: var(--space-2) var(--space-3); margin-top: var(--space-2); font-size: var(--text-xs); background-color: var(--bg-subtle);">
              Checking availability...
            </div>
          </fieldset>

          <!-- Fieldset 3: Details -->
          <fieldset class="form-fieldset">
            <legend class="form-legend">3. Purpose &amp; Requirements</legend>
            <div class="form-group">
              <label for="req-attendees" class="form-label form-label-required">Expected Attendees</label>
              <input type="number" id="req-attendees" class="form-input" value="${Utils.escapeHTML(String(initialData.attendees))}" min="1" max="500" required />
              <div id="err-req-attendees" class="form-error"></div>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between;">
                <label for="req-purpose" class="form-label form-label-required">Purpose of Booking</label>
                <span id="purpose-counter" class="char-counter">0 / 200</span>
              </div>
              <textarea id="req-purpose" class="form-textarea" placeholder="Describe the academic, club, or seminar activity (10-200 characters)..." required>${Utils.escapeHTML(initialData.purpose)}</textarea>
              <div id="err-req-purpose" class="form-error"></div>
            </div>

            <div class="form-group">
              <label class="form-label">Special Requirements</label>
              <div class="checkbox-group">${reqCheckboxes}</div>
            </div>

            <div class="form-group" style="margin-top: var(--space-4);">
              <label class="checkbox-label" style="font-weight: var(--font-semibold);">
                <input type="checkbox" id="req-declaration" class="checkbox-input" ${initialData.declaration ? 'checked' : ''} required />
                I agree to the university facility rules and declare that this room will be used exclusively for official academic or club activities.
              </label>
              <div id="err-req-declaration" class="form-error"></div>
            </div>
          </fieldset>

          <div style="display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-4);">
            ${isEdit ? `<a href="#/requests" class="btn btn-secondary">Cancel Edit</a>` : ''}
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Submit Booking Request'}</button>
          </div>
        </form>
      </div>
    `;

    // Dynamic Dependent Dropdown (Building -> Rooms)
    const bldgSelect = document.getElementById('req-bldg');
    const roomSelect = document.getElementById('req-room');
    if (bldgSelect && roomSelect) {
      bldgSelect.addEventListener('change', function(e) {
        roomSelect.innerHTML = getRoomOptionsForBldg(e.target.value, '');
        updateLiveSlotCheck();
      });
    }

    // Requester Role Radio change -> update ID label and slot limit
    const roleRadios = document.querySelectorAll('input[name="req_type"]');
    const idLabel = document.getElementById('lbl-req-id');
    if (roleRadios && idLabel) {
      roleRadios.forEach(function(r) {
        r.addEventListener('change', function(e) {
          if (e.target.value === 'Student') {
            idLabel.textContent = 'Registration Number (8 digits)';
          } else {
            idLabel.textContent = 'Employee ID (4-10 characters)';
          }
          updateLiveSlotCheck();
        });
      });
    }

    // Character counter for purpose
    const purposeInput = document.getElementById('req-purpose');
    const purposeCounter = document.getElementById('purpose-counter');
    const updateCharCounter = function() {
      if (!purposeInput || !purposeCounter) return;
      const len = purposeInput.value.length;
      purposeCounter.textContent = `${len} / 200`;
      purposeCounter.style.color = (len < 10 || len > 200) ? 'var(--color-danger)' : 'var(--text-muted)';
    };
    if (purposeInput) {
      purposeInput.addEventListener('input', updateCharCounter);
      updateCharCounter();
    }

    // Live Slot Conflict Check
    const updateLiveSlotCheck = Utils.debounce(function() {
      const liveBox = document.getElementById('live-slot-check');
      if (!liveBox || !roomSelect) return;

      const roomId = roomSelect.value;
      const dateEl = document.getElementById('req-date');
      const startEl = document.getElementById('req-start-slot');
      const endEl = document.getElementById('req-end-slot');
      if (!dateEl || !startEl || !endEl) return;

      const date = dateEl.value;
      const startSlot = parseInt(startEl.value, 10);
      const endSlot = parseInt(endEl.value, 10);

      if (!roomId || !date) {
        liveBox.innerHTML = 'Select a room and date to check slot availability.';
        return;
      }

      if (endSlot < startSlot) {
        liveBox.innerHTML = '<span style="color: var(--color-danger);">&#10060; End slot cannot be earlier than start slot.</span>';
        return;
      }

      const conflicts = Availability.findConflicts(roomId, date, startSlot, endSlot, editBookingId || '');
      const hard = conflicts.filter(function(c) { return c.type === 'maintenance' || c.type === 'class' || c.type === 'approved'; });
      const soft = conflicts.filter(function(c) { return c.type === 'pending'; });

      if (hard.length > 0) {
        liveBox.innerHTML = `<span style="color: var(--color-danger);">&#10060; <strong>Hard Conflict:</strong> ${Utils.escapeHTML(hard[0].reason)}</span>`;
      } else if (soft.length > 0) {
        liveBox.innerHTML = `<span style="color: var(--color-requested);">&#9888;&#65039; <strong>Notice:</strong> ${soft.length} other pending request(s) exist for this slot. Submission permitted; coordinator will decide.</span>`;
      } else {
        liveBox.innerHTML = `<span style="color: var(--color-free);">&#9989; <strong>Free:</strong> Selected slots are completely available.</span>`;
      }
    }, 200);

    if (roomSelect) roomSelect.addEventListener('change', updateLiveSlotCheck);
    const dateInputEl = document.getElementById('req-date');
    if (dateInputEl) dateInputEl.addEventListener('change', updateLiveSlotCheck);
    const startSlotEl = document.getElementById('req-start-slot');
    if (startSlotEl) startSlotEl.addEventListener('change', updateLiveSlotCheck);
    const endSlotEl = document.getElementById('req-end-slot');
    if (endSlotEl) endSlotEl.addEventListener('change', updateLiveSlotCheck);
    updateLiveSlotCheck();

    // Submit handler
    const form = document.getElementById('booking-request-form');
    if (form) {
      form.addEventListener('submit', function(e) {
      e.preventDefault();

      // Clear previous error messages
      document.querySelectorAll('.form-error').forEach(function(el) { el.textContent = ''; });
      document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(function(el) { el.classList.remove('is-invalid'); });

      const reqType = document.querySelector('input[name="req_type"]:checked').value;
      const checkedRequirements = Array.from(document.querySelectorAll('input[name="booking_requirements"]:checked')).map(function(el) {
        return el.value;
      });

      const payload = {
        requesterType: reqType,
        requesterName: document.getElementById('req-name').value,
        requesterId: document.getElementById('req-id').value,
        email: document.getElementById('req-email').value,
        phone: document.getElementById('req-phone').value,
        roomId: roomSelect.value,
        date: document.getElementById('req-date').value,
        startSlot: parseInt(document.getElementById('req-start-slot').value, 10),
        endSlot: parseInt(document.getElementById('req-end-slot').value, 10),
        purpose: purposeInput.value,
        attendees: parseInt(document.getElementById('req-attendees').value, 10),
        requirements: checkedRequirements,
        declaration: document.getElementById('req-declaration').checked
      };

      const result = isEdit ? Bookings.updatePendingBooking(editBookingId, payload) : Bookings.createBooking(payload);

      if (result.success) {
        if (isEdit) {
          UI.showToast('Request updated successfully.', 'success');
          window.location.hash = '#/requests';
        } else {
          // Show accessible success dialog with copyable reference ID
          const successHtml = `
            <div style="text-align: center; padding: var(--space-4) 0;">
              <div style="font-size: 3rem; margin-bottom: var(--space-2);">&#9989;</div>
              <h3>Booking Request Submitted!</h3>
              <p>Your request has been registered and is pending review by the Room Coordinator.</p>
              <div class="card" style="margin: var(--space-4) auto; max-width: 320px; background-color: var(--bg-subtle);">
                <div style="font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase;">Tracking Reference</div>
                <div style="font-size: var(--text-xl); font-family: var(--font-mono); font-weight: bold; margin-top: 4px;" id="success-ref-val">${Utils.escapeHTML(result.ref)}</div>
              </div>
              <button id="copy-ref-btn" class="btn btn-secondary btn-sm" type="button">&#128203; Copy Reference</button>
            </div>
          `;

          UI.showModal('Submission Successful', successHtml, function() {
            UI.closeModal();
            window.location.hash = '#/requests';
          }, 'Track My Request');

          const copyBtn = document.getElementById('copy-ref-btn');
          if (copyBtn) {
            copyBtn.addEventListener('click', function() {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(result.ref);
                UI.showToast('Reference copied to clipboard.', 'info');
              }
            });
          }
        }
      } else {
        // Highlight first error and render inline messages
        let firstInvalidInput = null;
        Object.keys(result.errors || {}).forEach(function(fieldKey) {
          const errEl = document.getElementById(`err-req-${fieldKey}`);
          if (errEl) errEl.textContent = result.errors[fieldKey];

          const inputEl = document.getElementById(`req-${fieldKey}`);
          if (inputEl) {
            inputEl.classList.add('is-invalid');
            if (!firstInvalidInput) firstInvalidInput = inputEl;
          }
        });

        if (firstInvalidInput) {
          firstInvalidInput.focus();
        }

        UI.showToast((result.errors && result.errors.form) || 'Please fix the errors in the form before submitting.', 'error');
      }
    });
    }
  }
};
