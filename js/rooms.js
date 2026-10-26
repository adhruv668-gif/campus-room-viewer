/**
 * js/rooms.js
 * 
 * Purpose: Room and Building inventory management, Admin management panel tabs,
 *          weekly timetable maintenance, and facility administration.
 * Owner: Dhruv Anand (Reg. No. 12619773) - Room & Timetable Management
 * Depends on: Config (js/config.js), Utils (js/utils.js), Store (js/store.js),
 *             Validators (js/validators.js), UI (js/ui.js)
 * 
 * Functions:
 * - getAll(): object[] - Retrieves all rooms.
 * - getById(id): object|null - Retrieves room by ID.
 * - getByBuilding(buildingId): object[] - Retrieves rooms within a building.
 * - addRoom(roomObj): object - Adds new room with duplicate roomNo validation.
 * - updateRoom(id, patchObj): object - Updates room properties.
 * - deleteRoom(id): object - Deletes room if no bookings reference it.
 * - toggleMaintenance(roomId): object - Toggles maintenance & auto-cancels upcoming bookings.
 * - getAllBuildings(): object[] - Retrieves all campus buildings.
 * - getBuildingById(id): object|null - Retrieves building by ID.
 * - addBuilding(bldgObj): object - Adds building with unique code validation.
 * - updateBuilding(id, patchObj): object - Updates building details.
 * - deleteBuilding(id): object - Deletes building if empty of rooms.
 * - renderAdminPanel(containerEl): void - Renders tabbed admin management interface.
 */

'use strict';

const Rooms = {
  _activeAdminTab: 'rooms',

  /**
   * Retrieves all room records from store.
   * @returns {object[]}
   */
  getAll: function() {
    return Store.get('ROOMS') || [];
  },

  /**
   * Retrieves a single room by its unique ID.
   * @param {string} id
   * @returns {object|null}
   */
  getById: function(id) {
    const list = this.getAll();
    return list.find(function(r) { return r.id === id; }) || null;
  },

  /**
   * Retrieves all rooms belonging to a specific building.
   * @param {string} buildingId
   * @returns {object[]}
   */
  getByBuilding: function(buildingId) {
    const list = this.getAll();
    return list.filter(function(r) { return r.buildingId === buildingId; });
  },

  /**
   * Adds a new room after validating input constraints and uniqueness within building.
   * @param {object} roomData
   * @returns {{ success: boolean, message: string }}
   */
  addRoom: function(roomData) {
    if (typeof App !== 'undefined' && App.getCurrentRole && App.getCurrentRole() !== Config.ROLES.ADMIN) {
      return { success: false, message: 'Unauthorized: Room Coordinator access required.' };
    }

    const rooms = this.getAll();
    const validation = Validators.validateRoomForm(roomData, rooms);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      return { success: false, message: firstError };
    }

    const newRoom = {
      id: Utils.generateId('room'),
      buildingId: roomData.buildingId,
      roomNo: roomData.roomNo.trim().toUpperCase(),
      name: roomData.name.trim(),
      floor: parseInt(roomData.floor, 10),
      type: roomData.type,
      capacity: parseInt(roomData.capacity, 10),
      facilities: Array.isArray(roomData.facilities) ? roomData.facilities : [],
      status: roomData.status || Config.ROOM_STATUS.ACTIVE,
      notes: (roomData.notes || '').trim()
    };

    const saved = Store.addItem('ROOMS', newRoom);
    if (!saved) {
      return { success: false, message: 'Storage write failed. Room could not be saved.' };
    }
    return { success: true, message: `Room ${newRoom.roomNo} successfully created.` };
  },

  /**
   * Updates an existing room record.
   * @param {string} id
   * @param {object} patchObj
   * @returns {{ success: boolean, message: string }}
   */
  updateRoom: function(id, patchObj) {
    if (typeof App !== 'undefined' && App.getCurrentRole && App.getCurrentRole() !== Config.ROLES.ADMIN) {
      return { success: false, message: 'Unauthorized: Room Coordinator access required.' };
    }

    const existing = this.getById(id);
    if (!existing) {
      return { success: false, message: 'Room not found.' };
    }

    const merged = Object.assign({}, existing, patchObj, { id: id });
    const rooms = this.getAll();
    const validation = Validators.validateRoomForm(merged, rooms);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      return { success: false, message: firstError };
    }

    const saved = Store.updateItem('ROOMS', id, merged);
    if (!saved) {
      return { success: false, message: 'Storage write failed. Room could not be updated.' };
    }
    return { success: true, message: `Room ${merged.roomNo} updated successfully.` };
  },

  /**
   * Deletes a room if no bookings (past or present) refer to it.
   * Cleans up associated timetable entries.
   * @param {string} id
   * @returns {{ success: boolean, message: string }}
   */
  deleteRoom: function(id) {
    if (typeof App !== 'undefined' && App.getCurrentRole && App.getCurrentRole() !== Config.ROLES.ADMIN) {
      return { success: false, message: 'Unauthorized: Room Coordinator access required.' };
    }

    const room = this.getById(id);
    if (!room) return { success: false, message: 'Room does not exist.' };

    const bookings = Store.get('BOOKINGS') || [];
    const hasBookings = bookings.some(function(b) { return b.roomId === id; });
    if (hasBookings) {
      return {
        success: false,
        message: `Cannot delete room ${room.roomNo}: It has associated booking records. Set its status to Maintenance instead to preserve audit logs.`
      };
    }

    // Remove associated timetable classes
    const timetable = Store.get('TIMETABLE') || [];
    const prevTimetable = JSON.parse(JSON.stringify(timetable));
    const filteredTt = timetable.filter(function(t) { return t.roomId !== id; });

    const prevRooms = Store.get('ROOMS') || [];
    const rmSaved = Store.removeItem('ROOMS', id);
    if (!rmSaved) {
      return { success: false, message: 'Storage write failed. Room could not be deleted.' };
    }

    const ttSaved = Store.set('TIMETABLE', filteredTt);
    if (!ttSaved) {
      Store.set('ROOMS', prevRooms);
      return { success: false, message: 'Storage write failed. Could not clean timetable entries.' };
    }

    return { success: true, message: `Room ${room.roomNo} and its timetable entries have been removed.` };
  },

  /**
   * Toggles maintenance status. Auto-cancels future Pending and Approved bookings if set to Maintenance.
   * Does NOT cancel bookings whose slot has already ended earlier today.
   * Staged with rollback if room status update fails.
   * @param {string} roomId
   * @returns {{ success: boolean, message: string, affectedBookings: number }}
   */
  toggleMaintenance: function(roomId) {
    if (typeof App !== 'undefined' && App.getCurrentRole && App.getCurrentRole() !== Config.ROLES.ADMIN) {
      return { success: false, message: 'Unauthorized: Room Coordinator access required.', affectedBookings: 0 };
    }

    const room = this.getById(roomId);
    if (!room) return { success: false, message: 'Room not found.', affectedBookings: 0 };

    const newStatus = room.status === Config.ROOM_STATUS.ACTIVE ?
      Config.ROOM_STATUS.MAINTENANCE :
      Config.ROOM_STATUS.ACTIVE;

    let affectedCount = 0;
    const currentBookings = Store.get('BOOKINGS') || [];
    const prevBookingsSnapshot = JSON.parse(JSON.stringify(currentBookings));

    if (newStatus === Config.ROOM_STATUS.MAINTENANCE) {
      const now = Utils.getNow();
      const todayStr = Utils.getLocalDateString(now);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const nowIso = now.toISOString();

      currentBookings.forEach(function(b) {
        if (b.roomId === roomId && b.date >= todayStr && (b.status === Config.BOOKING_STATUS.PENDING || b.status === Config.BOOKING_STATUS.APPROVED)) {
          // If the booking is today, do not cancel if its slot has already ended earlier today
          if (b.date === todayStr) {
            const slotDef = Config.SLOTS.find(function(s) { return s.id === b.endSlot; });
            if (slotDef) {
              const slotEndMinutes = slotDef.endHour * 60 + slotDef.endMin;
              if (nowMinutes >= slotEndMinutes) {
                return; // Slot has already ended; preserve historical booking
              }
            }
          }

          b.status = Config.BOOKING_STATUS.CANCELLED;
          b.adminNote = 'System cancellation: Room marked under maintenance.';
          b.updatedAt = nowIso;
          b.history.push({
            status: Config.BOOKING_STATUS.CANCELLED,
            at: nowIso,
            by: 'System',
            note: 'Room placed under maintenance.'
          });
          affectedCount++;
        }
      });

      if (affectedCount > 0) {
        const bSaved = Store.set('BOOKINGS', currentBookings);
        if (!bSaved) {
          return {
            success: false,
            message: 'Storage write failed. Could not cancel affected bookings.',
            affectedBookings: 0
          };
        }
      }
    }

    const prevRoomStatus = room.status;
    room.status = newStatus;
    const rSaved = Store.updateItem('ROOMS', roomId, room);
    if (!rSaved) {
      if (affectedCount > 0) {
        Store.set('BOOKINGS', prevBookingsSnapshot);
      }
      room.status = prevRoomStatus;
      return {
        success: false,
        message: 'Storage write failed. Could not update room status.',
        affectedBookings: 0
      };
    }

    return {
      success: true,
      message: `Room ${room.roomNo} is now ${newStatus}. ${affectedCount > 0 ? affectedCount + ' future bookings were auto-cancelled.' : ''}`,
      affectedBookings: affectedCount
    };
  },

  /**
   * Retrieves all building records.
   * @returns {object[]}
   */
  getAllBuildings: function() {
    return Store.get('BUILDINGS') || [];
  },

  /**
   * Retrieves single building by ID.
   * @param {string} id
   * @returns {object|null}
   */
  getBuildingById: function(id) {
    const bldgs = this.getAllBuildings();
    return bldgs.find(function(b) { return b.id === id; }) || null;
  },

  /**
   * Adds new campus building.
   * @param {object} bldgData
   * @returns {{ success: boolean, message: string }}
   */
  addBuilding: function(bldgData) {
    if (typeof App !== 'undefined' && App.getCurrentRole && App.getCurrentRole() !== Config.ROLES.ADMIN) {
      return { success: false, message: 'Unauthorized: Room Coordinator access required.' };
    }

    const bldgs = this.getAllBuildings();
    const validation = Validators.validateBuildingForm(bldgData, bldgs);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      return { success: false, message: firstError };
    }

    const newBldg = {
      id: Utils.generateId('bldg'),
      code: bldgData.code.trim().toUpperCase(),
      name: bldgData.name.trim(),
      floors: parseInt(bldgData.floors, 10)
    };

    const saved = Store.addItem('BUILDINGS', newBldg);
    if (!saved) {
      return { success: false, message: 'Storage write failed. Building could not be saved.' };
    }
    return { success: true, message: `Building ${newBldg.code} created.` };
  },

  /**
   * Updates existing building.
   * @param {string} id
   * @param {object} patchObj
   * @returns {{ success: boolean, message: string }}
   */
  updateBuilding: function(id, patchObj) {
    if (typeof App !== 'undefined' && App.getCurrentRole && App.getCurrentRole() !== Config.ROLES.ADMIN) {
      return { success: false, message: 'Unauthorized: Room Coordinator access required.' };
    }

    const existing = this.getBuildingById(id);
    if (!existing) return { success: false, message: 'Building not found.' };

    const merged = Object.assign({}, existing, patchObj, { id: id });
    const bldgs = this.getAllBuildings();
    const validation = Validators.validateBuildingForm(merged, bldgs);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      return { success: false, message: firstError };
    }

    const saved = Store.updateItem('BUILDINGS', id, merged);
    if (!saved) {
      return { success: false, message: 'Storage write failed. Building could not be updated.' };
    }
    return { success: true, message: `Building ${merged.code} updated.` };
  },

  /**
   * Deletes building if it does not contain any rooms.
   * @param {string} id
   * @returns {{ success: boolean, message: string }}
   */
  deleteBuilding: function(id) {
    if (typeof App !== 'undefined' && App.getCurrentRole && App.getCurrentRole() !== Config.ROLES.ADMIN) {
      return { success: false, message: 'Unauthorized: Room Coordinator access required.' };
    }

    const bldg = this.getBuildingById(id);
    if (!bldg) return { success: false, message: 'Building not found.' };

    const rooms = this.getByBuilding(id);
    if (rooms.length > 0) {
      return {
        success: false,
        message: `Cannot delete ${bldg.name}: It currently contains ${rooms.length} room(s). Delete or reassign the rooms first.`
      };
    }

    const saved = Store.removeItem('BUILDINGS', id);
    if (!saved) {
      return { success: false, message: 'Storage write failed. Building could not be deleted.' };
    }
    return { success: true, message: `Building ${bldg.code} deleted.` };
  },

  /**
   * Renders the tabbed admin management interface in #admin-content.
   * @param {HTMLElement} containerEl
   */
  renderAdminPanel: function(containerEl) {
    containerEl.innerHTML = `
      <div class="card" style="margin-bottom: var(--space-4);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2);">
          <div role="tablist" class="tab-list" style="display: flex; gap: var(--space-1); border-bottom: 2px solid var(--border-subtle);">
            <button id="admin-tab-rooms" class="btn btn-subtle ${this._activeAdminTab === 'rooms' ? 'active' : ''}" role="tab" type="button">Rooms</button>
            <button id="admin-tab-bldgs" class="btn btn-subtle ${this._activeAdminTab === 'bldgs' ? 'active' : ''}" role="tab" type="button">Buildings</button>
            <button id="admin-tab-timetable" class="btn btn-subtle ${this._activeAdminTab === 'timetable' ? 'active' : ''}" role="tab" type="button">Weekly Timetable</button>
            <button id="admin-tab-data" class="btn btn-subtle ${this._activeAdminTab === 'data' ? 'active' : ''}" role="tab" type="button">Data &amp; Simulation</button>
          </div>
          <div>
            <span class="badge badge-booked">Admin Access Active</span>
          </div>
        </div>
      </div>
      <div id="admin-tab-pane"></div>
    `;

    // Tab bindings
    const self = this;
    const tabRooms = document.getElementById('admin-tab-rooms');
    const tabBldgs = document.getElementById('admin-tab-bldgs');
    const tabTt = document.getElementById('admin-tab-timetable');
    const tabData = document.getElementById('admin-tab-data');

    const switchTab = function(tabKey) {
      self._activeAdminTab = tabKey;
      [tabRooms, tabBldgs, tabTt, tabData].forEach(function(btn) { btn.classList.remove('active'); });
      if (tabKey === 'rooms') tabRooms.classList.add('active');
      if (tabKey === 'bldgs') tabBldgs.classList.add('active');
      if (tabKey === 'timetable') tabTt.classList.add('active');
      if (tabKey === 'data') tabData.classList.add('active');

      const pane = document.getElementById('admin-tab-pane');
      if (tabKey === 'rooms') self.renderAdminRoomsTable(pane);
      if (tabKey === 'bldgs') self.renderAdminBuildingsTable(pane);
      if (tabKey === 'timetable') self._renderTimetableAdmin(pane);
      if (tabKey === 'data') self._renderDataSettingsAdmin(pane);
    };

    tabRooms.addEventListener('click', function() { switchTab('rooms'); });
    tabBldgs.addEventListener('click', function() { switchTab('bldgs'); });
    tabTt.addEventListener('click', function() { switchTab('timetable'); });
    tabData.addEventListener('click', function() { switchTab('data'); });

    // Initial pane render
    switchTab(this._activeAdminTab);
  },

  /**
   * Renders Rooms Admin Table and Add/Edit Modals.
   * @param {HTMLElement} containerEl
   */
  renderAdminRoomsTable: function(containerEl) {
    const rooms = this.getAll();
    const buildings = this.getAllBuildings();

    let tableRows = '';
    rooms.forEach(function(room) {
      const bldg = buildings.find(function(b) { return b.id === room.buildingId; });
      const bldgCode = bldg ? bldg.code : 'Unknown';
      const isMaint = room.status === Config.ROOM_STATUS.MAINTENANCE;

      tableRows += `
        <tr>
          <td data-label="Building"><strong>${Utils.escapeHTML(bldgCode)}</strong></td>
          <td data-label="Room No">${Utils.escapeHTML(room.roomNo)}</td>
          <td data-label="Name">${Utils.escapeHTML(room.name)}</td>
          <td data-label="Type"><span class="chip">${Utils.escapeHTML(room.type)}</span></td>
          <td data-label="Capacity">${Utils.escapeHTML(String(room.capacity))} seats</td>
          <td data-label="Status">
            <span class="badge ${isMaint ? 'badge-maint' : 'badge-free'}">
              ${isMaint ? '&#128295; Maintenance' : '&#9989; Active'}
            </span>
          </td>
          <td data-label="Actions" style="text-align: right;">
            <div style="display: inline-flex; gap: 4px;">
              <button class="btn btn-sm btn-secondary room-edit-btn" data-id="${Utils.escapeHTML(room.id)}" type="button">Edit</button>
              <button class="btn btn-sm ${isMaint ? 'btn-accent' : 'btn-subtle'} room-maint-btn" data-id="${Utils.escapeHTML(room.id)}" type="button">
                ${isMaint ? 'Activate' : 'Maint.'}
              </button>
              <button class="btn btn-sm btn-danger room-del-btn" data-id="${Utils.escapeHTML(room.id)}" type="button">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });

    containerEl.innerHTML = `
      <div class="card" style="margin-bottom: var(--space-4); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3>Room Inventory (${rooms.length} total)</h3>
          <p class="form-hint" style="margin: 0;">Add, update, or toggle maintenance status on campus classrooms and laboratories.</p>
        </div>
        <button id="admin-add-room-btn" class="btn btn-primary" type="button">+ Add Room</button>
      </div>

      <div class="data-table-container">
        <table class="data-table responsive-table">
          <thead>
            <tr>
              <th>Block</th>
              <th>Room No</th>
              <th>Room Name</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Status</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="7" style="text-align: center;">No rooms registered.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    // Bind Add Room
    const self = this;
    const addBtn = document.getElementById('admin-add-room-btn');
    if (addBtn) {
      addBtn.addEventListener('click', function() {
        self._showRoomFormModal(null);
      });
    }

    // Bind Table Actions (Event delegation)
    containerEl.addEventListener('click', function(e) {
      const editBtn = e.target.closest('.room-edit-btn');
      if (editBtn) {
        const id = editBtn.getAttribute('data-id');
        self._showRoomFormModal(id);
        return;
      }

      const maintBtn = e.target.closest('.room-maint-btn');
      if (maintBtn) {
        const id = maintBtn.getAttribute('data-id');
        const room = self.getById(id);
        if (!room) return;

        if (room.status === Config.ROOM_STATUS.ACTIVE) {
          // Confirm placing under maintenance
          UI.showModal('Confirm Room Maintenance', `<p>Place <strong>Room ${Utils.escapeHTML(room.roomNo)}</strong> (${Utils.escapeHTML(room.name)}) under Maintenance?</p><p class="form-hint">Any upcoming approved or pending booking requests will be automatically cancelled.</p>`, function() {
            const res = self.toggleMaintenance(id);
            UI.closeModal();
            UI.showToast(res.message, res.success ? 'success' : 'error');
            self.renderAdminRoomsTable(containerEl);
          }, 'Confirm Maintenance', true);
        } else {
          const res = self.toggleMaintenance(id);
          UI.showToast(res.message, 'success');
          self.renderAdminRoomsTable(containerEl);
        }
        return;
      }

      const delBtn = e.target.closest('.room-del-btn');
      if (delBtn) {
        const id = delBtn.getAttribute('data-id');
        const room = self.getById(id);
        if (!room) return;

        UI.showModal('Confirm Room Deletion', `<p>Are you sure you want to permanently delete <strong>Room ${Utils.escapeHTML(room.roomNo)}</strong> (${Utils.escapeHTML(room.name)})? This action cannot be undone.</p>`, function() {
          const res = self.deleteRoom(id);
          UI.closeModal();
          UI.showToast(res.message, res.success ? 'success' : 'error');
          self.renderAdminRoomsTable(containerEl);
        }, 'Delete Room', true);
      }
    });
  },

  /**
   * Modal form for Add and Edit room.
   */
  _showRoomFormModal: function(roomId) {
    const isEdit = Boolean(roomId);
    const room = isEdit ? this.getById(roomId) : {
      buildingId: '',
      roomNo: '',
      name: '',
      floor: 1,
      type: Config.ROOM_TYPES[0],
      capacity: 50,
      facilities: [],
      status: Config.ROOM_STATUS.ACTIVE,
      notes: ''
    };

    const buildings = this.getAllBuildings();
    let bldgOptions = '<option value="">-- Select Building --</option>';
    buildings.forEach(function(b) {
      bldgOptions += `<option value="${Utils.escapeHTML(b.id)}" ${b.id === room.buildingId ? 'selected' : ''}>${Utils.escapeHTML(b.name)} (${Utils.escapeHTML(b.code)})</option>`;
    });

    let typeOptions = '';
    Config.ROOM_TYPES.forEach(function(t) {
      typeOptions += `<option value="${t}" ${t === room.type ? 'selected' : ''}>${t}</option>`;
    });

    let facilitiesCheckboxes = '';
    Config.FACILITIES.forEach(function(f) {
      const checked = (room.facilities || []).includes(f) ? 'checked' : '';
      facilitiesCheckboxes += `
        <label class="checkbox-label" style="font-size: var(--text-xs);">
          <input type="checkbox" name="room_facilities" value="${f}" class="checkbox-input" ${checked}> ${f}
        </label>
      `;
    });

    const modalBody = `
      <form id="admin-room-form" class="form-grid" style="display: flex; flex-direction: column; gap: var(--space-3);">
        <div class="form-group">
          <label for="room-f-bldg" class="form-label form-label-required">Campus Building</label>
          <select id="room-f-bldg" class="form-select" required>${bldgOptions}</select>
        </div>
        <div class="grid-2col">
          <div class="form-group">
            <label for="room-f-no" class="form-label form-label-required">Room Number</label>
            <input type="text" id="room-f-no" class="form-input" value="${Utils.escapeHTML(room.roomNo)}" placeholder="e.g. 101" required />
          </div>
          <div class="form-group">
            <label for="room-f-floor" class="form-label form-label-required">Floor (0-20)</label>
            <input type="number" id="room-f-floor" class="form-input" min="0" max="20" value="${Utils.escapeHTML(String(room.floor))}" required />
          </div>
        </div>
        <div class="form-group">
          <label for="room-f-name" class="form-label form-label-required">Display Name</label>
          <input type="text" id="room-f-name" class="form-input" value="${Utils.escapeHTML(room.name)}" placeholder="e.g. Smart Classroom 101" required />
        </div>
        <div class="grid-2col">
          <div class="form-group">
            <label for="room-f-type" class="form-label form-label-required">Classification Type</label>
            <select id="room-f-type" class="form-select">${typeOptions}</select>
          </div>
          <div class="form-group">
            <label for="room-f-capacity" class="form-label form-label-required">Capacity (Seats)</label>
            <input type="number" id="room-f-capacity" class="form-input" min="1" max="500" value="${Utils.escapeHTML(String(room.capacity))}" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Available Facilities</label>
          <div class="checkbox-group">${facilitiesCheckboxes}</div>
        </div>
        <div class="form-group">
          <label for="room-f-status" class="form-label">Operational Status</label>
          <select id="room-f-status" class="form-select">
            <option value="Active" ${room.status === 'Active' ? 'selected' : ''}>Active</option>
            <option value="Maintenance" ${room.status === 'Maintenance' ? 'selected' : ''}>Under Maintenance</option>
          </select>
        </div>
        <div class="form-group">
          <label for="room-f-notes" class="form-label">Notes &amp; Description</label>
          <textarea id="room-f-notes" class="form-textarea" placeholder="Optional remarks on equipment or access">${Utils.escapeHTML(room.notes || '')}</textarea>
        </div>
      </form>
    `;

    const self = this;
    UI.showModal(isEdit ? `Edit Room ${Utils.escapeHTML(room.roomNo)}` : 'Add New Campus Room', modalBody, function() {
      const bldgId = document.getElementById('room-f-bldg').value;
      const roomNo = document.getElementById('room-f-no').value;
      const floor = document.getElementById('room-f-floor').value;
      const name = document.getElementById('room-f-name').value;
      const type = document.getElementById('room-f-type').value;
      const capacity = document.getElementById('room-f-capacity').value;
      const status = document.getElementById('room-f-status').value;
      const notes = document.getElementById('room-f-notes').value;

      const facilityEls = document.querySelectorAll('input[name="room_facilities"]:checked');
      const facilities = Array.from(facilityEls).map(function(el) { return el.value; });

      const roomPayload = {
        buildingId: bldgId,
        roomNo: roomNo,
        floor: floor,
        name: name,
        type: type,
        capacity: capacity,
        facilities: facilities,
        status: status,
        notes: notes
      };

      const result = isEdit ? self.updateRoom(roomId, roomPayload) : self.addRoom(roomPayload);

      if (result.success) {
        UI.closeModal();
        UI.showToast(result.message, 'success');
        const pane = document.getElementById('admin-tab-pane');
        if (pane) self.renderAdminRoomsTable(pane);
      } else {
        UI.showToast(result.message, 'error');
      }
    }, isEdit ? 'Save Changes' : 'Create Room');
  },

  /**
   * Renders Buildings Admin Table and Modals.
   * @param {HTMLElement} containerEl
   */
  renderAdminBuildingsTable: function(containerEl) {
    const buildings = this.getAllBuildings();
    const rooms = this.getAll();

    let tableRows = '';
    buildings.forEach(function(bldg) {
      const bldgRooms = rooms.filter(function(r) { return r.buildingId === bldg.id; });

      tableRows += `
        <tr>
          <td data-label="Code"><strong>${Utils.escapeHTML(bldg.code)}</strong></td>
          <td data-label="Name">${Utils.escapeHTML(bldg.name)}</td>
          <td data-label="Floors">${bldg.floors} floors</td>
          <td data-label="Rooms">${bldgRooms.length} room(s) registered</td>
          <td data-label="Actions" style="text-align: right;">
            <div style="display: inline-flex; gap: 4px;">
              <button class="btn btn-sm btn-secondary bldg-edit-btn" data-id="${bldg.id}" type="button">Edit</button>
              <button class="btn btn-sm btn-danger bldg-del-btn" data-id="${bldg.id}" type="button">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });

    containerEl.innerHTML = `
      <div class="card" style="margin-bottom: var(--space-4); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3>Academic Buildings (${buildings.length} total)</h3>
          <p class="form-hint" style="margin: 0;">Manage campus complex blocks and floor allocations.</p>
        </div>
        <button id="admin-add-bldg-btn" class="btn btn-primary" type="button">+ Add Building</button>
      </div>

      <div class="data-table-container">
        <table class="data-table responsive-table">
          <thead>
            <tr>
              <th>Block Code</th>
              <th>Building Name</th>
              <th>Floors</th>
              <th>Rooms</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="5" style="text-align: center;">No buildings found.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    const self = this;
    const addBtn = document.getElementById('admin-add-bldg-btn');
    if (addBtn) {
      addBtn.addEventListener('click', function() {
        self._showBuildingModal(null);
      });
    }

    containerEl.addEventListener('click', function(e) {
      const editBtn = e.target.closest('.bldg-edit-btn');
      if (editBtn) {
        self._showBuildingModal(editBtn.getAttribute('data-id'));
        return;
      }

      const delBtn = e.target.closest('.bldg-del-btn');
      if (delBtn) {
        const id = delBtn.getAttribute('data-id');
        const b = self.getBuildingById(id);
        if (!b) return;

        UI.showModal('Confirm Building Deletion', `<p>Delete building <strong>${Utils.escapeHTML(b.name)} (${Utils.escapeHTML(b.code)})</strong>?</p>`, function() {
          const res = self.deleteBuilding(id);
          UI.closeModal();
          UI.showToast(res.message, res.success ? 'success' : 'error');
          self.renderAdminBuildingsTable(containerEl);
        }, 'Delete Building', true);
      }
    });
  },

  /**
   * Modal for Add/Edit Building.
   */
  _showBuildingModal: function(bldgId) {
    const isEdit = Boolean(bldgId);
    const bldg = isEdit ? this.getBuildingById(bldgId) : { code: '', name: '', floors: 4 };

    const modalBody = `
      <form id="admin-bldg-form" style="display: flex; flex-direction: column; gap: var(--space-3);">
        <div class="form-group">
          <label for="bldg-f-code" class="form-label form-label-required">Building Code (2-10 Alphanumeric)</label>
          <input type="text" id="bldg-f-code" class="form-input" value="${Utils.escapeHTML(bldg.code)}" placeholder="e.g. B32" required />
        </div>
        <div class="form-group">
          <label for="bldg-f-name" class="form-label form-label-required">Full Building Name</label>
          <input type="text" id="bldg-f-name" class="form-input" value="${Utils.escapeHTML(bldg.name)}" placeholder="e.g. Block 32 - Academic Block" required />
        </div>
        <div class="form-group">
          <label for="bldg-f-floors" class="form-label form-label-required">Total Floors (1-20)</label>
          <input type="number" id="bldg-f-floors" class="form-input" min="1" max="20" value="${Utils.escapeHTML(String(bldg.floors))}" required />
        </div>
      </form>
    `;

    const self = this;
    UI.showModal(isEdit ? `Edit Building ${Utils.escapeHTML(bldg.code)}` : 'Add Campus Building', modalBody, function() {
      const code = document.getElementById('bldg-f-code').value;
      const name = document.getElementById('bldg-f-name').value;
      const floors = document.getElementById('bldg-f-floors').value;

      const payload = { code: code, name: name, floors: floors };
      const res = isEdit ? self.updateBuilding(bldgId, payload) : self.addBuilding(payload);

      if (res.success) {
        UI.closeModal();
        UI.showToast(res.message, 'success');
        const pane = document.getElementById('admin-tab-pane');
        if (pane) self.renderAdminBuildingsTable(pane);
      } else {
        UI.showToast(res.message, 'error');
      }
    }, isEdit ? 'Save Changes' : 'Create Building');
  },

  /**
   * Weekly Timetable Administration (Tab 3).
   */
  _renderTimetableAdmin: function(containerEl) {
    const timetable = Store.get('TIMETABLE') || [];
    const rooms = this.getAll();
    const buildings = this.getAllBuildings();

    let roomOptions = '<option value="">All Rooms</option>';
    rooms.forEach(function(r) {
      roomOptions += `<option value="${r.id}">${Utils.escapeHTML(r.name)} (${Utils.escapeHTML(r.roomNo)})</option>`;
    });

    containerEl.innerHTML = `
      <div class="card" style="margin-bottom: var(--space-4);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2);">
          <div>
            <h3>Academic Class Schedule (${timetable.length} classes scheduled)</h3>
            <p class="form-hint" style="margin: 0;">Add, modify, or remove recurring weekly timetable entries.</p>
          </div>
          <button id="admin-add-tt-btn" class="btn btn-primary" type="button">+ Add Class Entry</button>
        </div>
        <div style="display: flex; gap: var(--space-3); margin-top: var(--space-3); flex-wrap: wrap;">
          <div style="flex: 1; min-width: 200px;">
            <select id="tt-filter-room" class="form-select">${roomOptions}</select>
          </div>
          <div style="width: 180px;">
            <select id="tt-filter-day" class="form-select">
              <option value="">All Days</option>
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
            </select>
          </div>
        </div>
      </div>

      <div id="tt-table-container" class="data-table-container"></div>
    `;

    const renderTable = function() {
      const selectedRoom = document.getElementById('tt-filter-room').value;
      const selectedDay = document.getElementById('tt-filter-day').value;

      let filtered = timetable;
      if (selectedRoom) filtered = filtered.filter(function(t) { return t.roomId === selectedRoom; });
      if (selectedDay) filtered = filtered.filter(function(t) { return t.weekday === parseInt(selectedDay, 10); });

      let rows = '';
      filtered.slice(0, 50).forEach(function(item) {
        const room = rooms.find(function(r) { return r.id === item.roomId; });
        const roomLabel = room ? `${room.name} (${room.roomNo})` : 'Unknown';
        const dayName = (Config.WEEKDAYS.find(function(w) { return w.id === item.weekday; }) || {}).name || item.weekday;
        const slotLabel = Utils.formatSlotTime(item.slot);

        rows += `
          <tr>
            <td data-label="Room"><strong>${Utils.escapeHTML(roomLabel)}</strong></td>
            <td data-label="Day">${dayName}</td>
            <td data-label="Slot">${slotLabel}</td>
            <td data-label="Course">${Utils.escapeHTML(item.course)}</td>
            <td data-label="Faculty">${Utils.escapeHTML(item.faculty)}</td>
            <td data-label="Section"><span class="chip">${Utils.escapeHTML(item.section)}</span></td>
            <td data-label="Actions" style="text-align: right;">
              <button class="btn btn-sm btn-danger tt-del-btn" data-id="${Utils.escapeHTML(item.id)}" type="button">Remove</button>
            </td>
          </tr>
        `;
      });

      const tableEl = document.getElementById('tt-table-container');
      if (tableEl) {
        tableEl.innerHTML = `
          <table class="data-table responsive-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Weekday</th>
                <th>Slot Time</th>
                <th>Course</th>
                <th>Faculty</th>
                <th>Section</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="7" style="text-align: center;">No timetable entries match filter.</td></tr>'}
            </tbody>
          </table>
          ${filtered.length > 50 ? `<p class="form-hint" style="padding: var(--space-2); text-align: center;">Showing first 50 of ${filtered.length} entries. Use filters to narrow results.</p>` : ''}
        `;
      }
    };

    renderTable();

    document.getElementById('tt-filter-room').addEventListener('change', renderTable);
    document.getElementById('tt-filter-day').addEventListener('change', renderTable);

    // Delete class binding
    const tableEl = document.getElementById('tt-table-container');
    tableEl.addEventListener('click', function(e) {
      const delBtn = e.target.closest('.tt-del-btn');
      if (delBtn) {
        const id = delBtn.getAttribute('data-id');
        UI.showModal('Confirm Class Removal', '<p>Remove this recurring class entry from the weekly timetable?</p>', function() {
          const ttList = Store.get('TIMETABLE') || [];
          const updated = ttList.filter(function(t) { return t.id !== id; });
          const saved = Store.set('TIMETABLE', updated);
          UI.closeModal();
          if (saved) {
            UI.showToast('Class entry removed.', 'success');
            Rooms._renderTimetableAdmin(containerEl);
          } else {
            UI.showToast('Storage write failed. Class could not be removed.', 'error');
          }
        }, 'Remove Class', true);
      }
    });

    // Add class binding
    const addBtn = document.getElementById('admin-add-tt-btn');
    if (addBtn) {
      addBtn.addEventListener('click', function() {
        let rOpts = '';
        rooms.forEach(function(r) {
          rOpts += `<option value="${Utils.escapeHTML(r.id)}">${Utils.escapeHTML(r.name)} (${Utils.escapeHTML(r.roomNo)})</option>`;
        });

        const modalBody = `
          <form id="add-tt-form" style="display: flex; flex-direction: column; gap: var(--space-3);">
            <div class="form-group">
              <label for="tt-add-room" class="form-label form-label-required">Room</label>
              <select id="tt-add-room" class="form-select" required>${rOpts}</select>
            </div>
            <div class="grid-2col">
              <div class="form-group">
                <label for="tt-add-day" class="form-label form-label-required">Weekday</label>
                <select id="tt-add-day" class="form-select">
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </div>
              <div class="form-group">
                <label for="tt-add-slot" class="form-label form-label-required">Slot</label>
                <select id="tt-add-slot" class="form-select">
                  ${Config.SLOTS.map(function(s) { return `<option value="${s.id}">${s.label} (${s.start}-${s.end})</option>`; }).join('')}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label for="tt-add-course" class="form-label form-label-required">Course Code &amp; Title</label>
              <input type="text" id="tt-add-course" class="form-input" placeholder="e.g. CAP782 Advanced Cloud Computing" required />
            </div>
            <div class="grid-2col">
              <div class="form-group">
                <label for="tt-add-faculty" class="form-label form-label-required">Faculty Name</label>
                <input type="text" id="tt-add-faculty" class="form-input" placeholder="e.g. Dr. Rajesh Kumar" required />
              </div>
              <div class="form-group">
                <label for="tt-add-section" class="form-label form-label-required">Section</label>
                <input type="text" id="tt-add-section" class="form-input" placeholder="e.g. K23AB" required />
              </div>
            </div>
          </form>
        `;

        UI.showModal('Schedule New Weekly Class', modalBody, function() {
          const roomId = document.getElementById('tt-add-room').value;
          const weekday = parseInt(document.getElementById('tt-add-day').value, 10);
          const slot = parseInt(document.getElementById('tt-add-slot').value, 10);
          const course = document.getElementById('tt-add-course').value.trim();
          const faculty = document.getElementById('tt-add-faculty').value.trim();
          const section = document.getElementById('tt-add-section').value.trim();

          if (!course || !faculty || !section) {
            UI.showToast('All fields are required.', 'error');
            return;
          }

          const ttList = Store.get('TIMETABLE') || [];
          const duplicate = ttList.find(function(t) {
            return t.roomId === roomId && t.weekday === weekday && t.slot === slot;
          });

          if (duplicate) {
            UI.showToast(`Conflict: Slot ${slot} already has class ${duplicate.course}.`, 'error');
            return;
          }

          // Check if upcoming approved bookings clash
          const bookings = Store.get('BOOKINGS') || [];
          const clashes = bookings.filter(function(b) {
            if (b.roomId !== roomId || b.status !== Config.BOOKING_STATUS.APPROVED) return false;
            const bWeekday = Utils.getWeekday(b.date);
            return bWeekday === weekday && slot >= b.startSlot && slot <= b.endSlot;
          });

          if (clashes.length > 0) {
            UI.showToast(`Cannot schedule: Clashes with approved booking ${clashes[0].ref} on this weekday.`, 'error');
            return;
          }

          const newEntry = {
            id: Utils.generateId('tt'),
            roomId: roomId,
            weekday: weekday,
            slot: slot,
            course: course,
            faculty: faculty,
            section: section
          };

          const saved = Store.addItem('TIMETABLE', newEntry);
          UI.closeModal();
          if (saved) {
            UI.showToast('Class scheduled successfully.', 'success');
            Rooms._renderTimetableAdmin(containerEl);
          } else {
            UI.showToast('Storage write failed. Class could not be scheduled.', 'error');
          }
        }, 'Schedule Class');
      });
    }
  },

  /**
   * Data Backup, JSON Import/Export, and Simulation Clock (Tab 4).
   */
  _renderDataSettingsAdmin: function(containerEl) {
    const settings = Store.get('SETTINGS') || {};

    containerEl.innerHTML = `
      <div class="grid-2col">
        <!-- Panel 1: Schedule Preview Clock Control -->
        <div class="card">
          <h3>Schedule Preview Clock</h3>
          <p class="form-hint">Preview future or off-peak campus time to inspect slot transitions, operational readiness, and after-hours availability.</p>
          <div class="form-group" style="margin-top: var(--space-3);">
            <label for="sim-date-input" class="form-label">Preview Date &amp; Time:</label>
            <input type="datetime-local" id="sim-date-input" class="form-input" value="${settings.simulatedNow || ''}" />
          </div>
          <div style="display: flex; gap: var(--space-2); margin-top: var(--space-3);">
            <button id="sim-set-btn" class="btn btn-primary" type="button">Set Preview Clock</button>
            <button id="sim-reset-btn" class="btn btn-secondary" type="button">Reset to Real Time</button>
          </div>
        </div>

        <!-- Panel 2: Security & Admin PIN -->
        <div class="card">
          <h3>Coordinator PIN Management</h3>
          <p class="form-hint">Set the 4-digit PIN required to unlock Room Coordinator administrative powers.</p>
          <div class="form-group" style="margin-top: var(--space-3);">
            <label for="admin-pin-new" class="form-label">New 4-Digit PIN:</label>
            <input type="password" id="admin-pin-new" class="form-input" maxlength="4" placeholder="1234" value="${settings.adminPin || Config.DEFAULT_PIN}" />
          </div>
          <button id="admin-save-pin-btn" class="btn btn-primary" style="margin-top: var(--space-3);" type="button">Update PIN</button>
        </div>
      </div>

      <div class="grid-2col" style="margin-top: var(--space-4);">
        <!-- Panel 3: Export Backup -->
        <div class="card">
          <h3>Data Export (JSON Backup)</h3>
          <p class="form-hint">Export the complete state (buildings, rooms, timetables, bookings, and settings) as a portable JSON file.</p>
          <button id="data-export-btn" class="btn btn-secondary" style="margin-top: var(--space-3);" type="button">&#128190; Download JSON Backup</button>
        </div>

        <!-- Panel 4: Import Backup -->
        <div class="card">
          <h3>Data Restore (Import JSON)</h3>
          <p class="form-hint">Restore application data from a previously downloaded JSON backup.</p>
          <div style="margin-top: var(--space-3);">
            <input type="file" id="data-import-input" accept=".json,application/json" class="form-input" />
          </div>
        </div>
      </div>
    `;

    // Simulated Time Set
    document.getElementById('sim-set-btn').addEventListener('click', function() {
      const val = document.getElementById('sim-date-input').value;
      if (!val) {
        UI.showToast('Please pick a date and time to simulate.', 'warning');
        return;
      }
      UI.setSimulatedTime(val);
    });

    // Simulated Time Reset
    document.getElementById('sim-reset-btn').addEventListener('click', function() {
      UI.clearSimulatedTime();
      document.getElementById('sim-date-input').value = '';
    });

    // Save Admin PIN
    document.getElementById('admin-save-pin-btn').addEventListener('click', function() {
      const pin = document.getElementById('admin-pin-new').value.trim();
      const check = Validators.validatePin(pin);
      if (!check.valid) {
        UI.showToast(check.error, 'error');
        return;
      }
      const s = Store.get('SETTINGS') || {};
      s.adminPin = pin;
      const saved = Store.set('SETTINGS', s);
      if (saved) {
        UI.showToast('Admin PIN updated successfully.', 'success');
      } else {
        UI.showToast('Storage write failed. Admin PIN updated in memory for this session only.', 'warning');
      }
    });

    // Export Backup
    document.getElementById('data-export-btn').addEventListener('click', function() {
      const dateStr = Utils.getLocalDateString(Utils.getNow());
      const backupJson = JSON.parse(Store.exportBackup());
      Utils.downloadJSON(`campus-room-backup-${dateStr}.json`, backupJson);
      UI.showToast('JSON backup generated and downloaded.', 'success');
    });

    // Import Backup
    document.getElementById('data-import-input').addEventListener('change', function(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        const text = evt.target.result;
        UI.showModal('Confirm Backup Restore', '<p>Restoring will overwrite current campus buildings, rooms, timetables, and bookings. Are you sure you wish to proceed?</p>', function() {
          const res = Store.importBackup(text);
          UI.closeModal();
          if (res.success) {
            UI.showToast(res.message, 'success');
            App.navigate('#/admin');
          } else {
            UI.showToast(res.message, 'error');
          }
        }, 'Overwrite & Restore', true);
      };
      reader.readAsText(file);
    });
  },

  /**
   * Opens detailed room specifications dialog.
   * @param {string} roomId
   */
  showRoomSpecModal: function(roomId) {
    const room = this.getById(roomId);
    if (!room) return;
    const bldg = this.getBuildingById(room.buildingId);
    const todayStr = Utils.getLocalDateString(Utils.getNow());
    const dur = Availability.getFreeDuration(roomId, todayStr);
    const summary = Availability.getRoomDailySummary(roomId, todayStr);

    let scheduleRows = '';
    summary.slots.forEach(function(s) {
      const sDef = Config.SLOTS.find(function(item) { return item.id === s.slot; });
      scheduleRows += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-color); font-size: var(--text-xs);">
          <span><strong>Slot ${s.slot}</strong> (${sDef ? `${sDef.start} - ${sDef.end}` : ''})</span>
          <span class="badge badge-${s.status.toLowerCase()}">${s.status}</span>
        </div>
      `;
    });

    const bodyHtml = `
      <div class="room-spec-modal-body">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-3);">
          <div>
            <h3 style="margin: 0; font-size: 1.25rem;">Room ${Utils.escapeHTML(room.roomNo)}</h3>
            <p style="margin: 0; color: var(--text-muted);">${Utils.escapeHTML(bldg ? bldg.name : '')} &bull; ${Utils.escapeHTML(room.name)}</p>
          </div>
          <span class="badge ${room.status === 'Active' ? 'badge-free' : 'badge-maint'}">${Utils.escapeHTML(room.status)}</span>
        </div>

        <div class="grid-2col" style="gap: var(--space-3); margin-bottom: var(--space-4);">
          <div class="card" style="padding: var(--space-3);">
            <div style="font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase;">Room Specs</div>
            <div style="margin-top: var(--space-2); font-size: var(--text-sm);">
              <div><strong>Type:</strong> ${Utils.escapeHTML(room.type)}</div>
              <div><strong>Capacity:</strong> ${Utils.escapeHTML(String(room.capacity))} seats</div>
              <div><strong>Floor:</strong> Level ${Utils.escapeHTML(String(room.floor))}</div>
            </div>
          </div>
          <div class="card" style="padding: var(--space-3);">
            <div style="font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase;">Live Availability</div>
            <div style="margin-top: var(--space-2); font-size: var(--text-sm);">
              <div><strong>Status:</strong> ${dur.isFreeNow ? '<span class="text-green">&#9989; Free Now</span>' : '<span class="text-orange">&#128218; In Use</span>'}</div>
              <div><strong>Duration:</strong> ${Utils.escapeHTML(dur.countdownText)}</div>
              <div><strong>Occupancy Today:</strong> ${summary.percentOccupied}%</div>
            </div>
          </div>
        </div>

        <div style="margin-bottom: var(--space-3);">
          <h4 style="font-size: var(--text-sm); margin-bottom: var(--space-2);">Equipment &amp; Facilities</h4>
          <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
            ${(room.facilities && room.facilities.length > 0) ? room.facilities.map(function(f) { return `<span class="chip">&#10003; ${Utils.escapeHTML(f)}</span>`; }).join('') : '<span class="form-hint">Standard Room Configuration</span>'}
          </div>
        </div>

        <div>
          <h4 style="font-size: var(--text-sm); margin-bottom: var(--space-2);">Today's Schedule Breakdown</h4>
          <div style="max-height: 180px; overflow-y: auto; background: var(--bg-subtle); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            ${scheduleRows}
          </div>
        </div>

        <div style="margin-top: var(--space-4); display: flex; justify-content: space-between; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary" id="spec-open-kiosk-btn">&#128682; Open Digital Door Sign</button>
          <button type="button" class="btn btn-primary" id="spec-book-room-btn">&#9889; Book This Room</button>
        </div>
      </div>
    `;

    UI.showModal(`Room Specifications &bull; Room ${room.roomNo}`, bodyHtml);

    const kioskBtn = document.getElementById('spec-open-kiosk-btn');
    if (kioskBtn) {
      kioskBtn.addEventListener('click', function() {
        UI.closeModal();
        Rooms.showDoorKiosk(roomId);
      });
    }

    const bookBtn = document.getElementById('spec-book-room-btn');
    if (bookBtn) {
      bookBtn.addEventListener('click', function() {
        UI.closeModal();
        if (typeof Bookings !== 'undefined' && Bookings.openBookingDrawer) {
          Bookings.openBookingDrawer(roomId, todayStr, Utils.getCurrentSlot() || 1, Utils.getCurrentSlot() || 1);
        } else {
          window.location.hash = `#/request?roomId=${encodeURIComponent(roomId)}&date=${encodeURIComponent(todayStr)}`;
        }
      });
    }
  },

  /**
   * Opens fullscreen digital door sign preview overlay.
   * @param {string} roomId
   */
  showDoorKiosk: function(roomId) {
    const room = this.getById(roomId);
    if (!room) return;
    const bldg = this.getBuildingById(room.buildingId);
    const todayStr = Utils.getLocalDateString(Utils.getNow());
    const dur = Availability.getFreeDuration(roomId, todayStr);
    const summary = Availability.getRoomDailySummary(roomId, todayStr);
    const currentSlot = Utils.getCurrentSlot() || 1;

    const backdropEl = document.getElementById('door-kiosk-backdrop');
    const containerEl = document.getElementById('door-kiosk-container');
    if (!backdropEl || !containerEl) return;

    // Timeline bar
    let timelinePills = '';
    summary.slots.forEach(function(s) {
      const sDef = Config.SLOTS.find(function(item) { return item.id === s.slot; });
      const isCur = (s.slot === currentSlot);
      let bg = 'var(--color-free-bg)';
      let border = 'var(--color-free-border)';
      let text = 'Free';
      if (s.status === 'Class') {
        bg = 'var(--color-class-bg)';
        border = 'var(--color-class-border)';
        text = s.details ? s.details.course.split(' ')[0] : 'Class';
      } else if (s.status === 'Booked') {
        bg = 'var(--color-booked-bg)';
        border = 'var(--color-booked-border)';
        text = 'Reserved';
      } else if (s.status === 'Maintenance') {
        bg = 'var(--color-maint-bg)';
        border = 'var(--color-maint-border)';
        text = 'Maint';
      }
      timelinePills += `
        <div class="kiosk-timeline-slot ${isCur ? 'kiosk-slot-active' : ''}" style="background: ${bg}; border: 1px solid ${border};">
          <div class="kiosk-slot-time">${sDef ? sDef.start : `S${s.slot}`}</div>
          <div class="kiosk-slot-status">${Utils.escapeHTML(text)}</div>
        </div>
      `;
    });

    const isAvailable = dur.isFreeNow;
    const bannerClass = isAvailable ? 'kiosk-banner-available' : 'kiosk-banner-inuse';

    containerEl.innerHTML = `
      <div class="kiosk-tablet-frame">
        <div class="kiosk-header">
          <div>
            <div class="kiosk-bldg-title">${Utils.escapeHTML(bldg ? bldg.name : 'Campus Building')} &bull; Floor ${Utils.escapeHTML(String(room.floor))}</div>
            <h1 class="kiosk-room-title">Room ${Utils.escapeHTML(room.roomNo)}</h1>
            <div class="kiosk-room-subtitle">${Utils.escapeHTML(room.name)} &bull; ${Utils.escapeHTML(room.type)} &bull; ${Utils.escapeHTML(String(room.capacity))} Seats</div>
          </div>
          <div class="kiosk-clock-section">
            <div id="kiosk-live-clock" class="kiosk-clock-display">--:--:--</div>
            <div class="kiosk-date-display">${Utils.formatDate(todayStr)}</div>
            <button id="kiosk-close-btn" class="btn btn-sm btn-subtle kiosk-close-btn" type="button" aria-label="Close Door Sign Display">&#10005; Exit Display</button>
          </div>
        </div>

        <div class="kiosk-banner ${bannerClass}">
          <div class="kiosk-status-icon">${isAvailable ? '&#9989;' : '&#128218;'}</div>
          <div>
            <div class="kiosk-status-heading">${isAvailable ? 'ROOM AVAILABLE NOW' : 'ROOM IN USE'}</div>
            <div class="kiosk-status-detail">${Utils.escapeHTML(dur.countdownText)}</div>
          </div>
        </div>

        <div class="kiosk-timeline-section">
          <div class="kiosk-section-title">Today's Schedule &bull; 09:00 - 18:00</div>
          <div class="kiosk-timeline-bar">
            ${timelinePills}
          </div>
        </div>

        <div class="kiosk-footer">
          <div class="kiosk-facilities-strip">
            ${(room.facilities || []).map(function(f) { return `<span class="chip">&#10003; ${Utils.escapeHTML(f)}</span>`; }).join(' ') || '<span class="chip">Standard Classroom</span>'}
          </div>
          <div class="kiosk-actions">
            ${isAvailable ? `
              <button id="kiosk-quick-book-btn" class="btn btn-lg btn-primary kiosk-cta-btn" type="button">&#9889; Quick Reserve 1-Hour Now</button>
            ` : `
              <button id="kiosk-prebook-btn" class="btn btn-lg btn-secondary kiosk-cta-btn" type="button">Reserve Future Slot</button>
            `}
          </div>
        </div>
      </div>
    `;

    backdropEl.classList.remove('hidden');
    backdropEl.setAttribute('aria-hidden', 'false');

    // Live clock updater inside kiosk
    const updateKioskClock = function() {
      const clockEl = document.getElementById('kiosk-live-clock');
      if (clockEl) {
        clockEl.textContent = Utils.formatTime(Utils.getNow());
      }
    };
    updateKioskClock();
    const kioskClockInterval = setInterval(updateKioskClock, 1000);

    const closeKiosk = function() {
      clearInterval(kioskClockInterval);
      backdropEl.classList.add('hidden');
      backdropEl.setAttribute('aria-hidden', 'true');
      document.removeEventListener('keydown', handleEsc);
    };

    const handleEsc = function(e) {
      if (e.key === 'Escape') closeKiosk();
    };
    document.addEventListener('keydown', handleEsc);

    document.getElementById('kiosk-close-btn').addEventListener('click', closeKiosk);

    const quickBookBtn = document.getElementById('kiosk-quick-book-btn');
    if (quickBookBtn) {
      quickBookBtn.addEventListener('click', function() {
        closeKiosk();
        if (typeof Bookings !== 'undefined' && Bookings.openBookingDrawer) {
          Bookings.openBookingDrawer(roomId, todayStr, currentSlot, currentSlot);
        } else {
          window.location.hash = `#/request?roomId=${encodeURIComponent(roomId)}&date=${encodeURIComponent(todayStr)}&startSlot=${currentSlot}&endSlot=${currentSlot}`;
        }
      });
    }

    const prebookBtn = document.getElementById('kiosk-prebook-btn');
    if (prebookBtn) {
      prebookBtn.addEventListener('click', function() {
        closeKiosk();
        const nextSlot = dur.nextFreeSlot || 1;
        if (typeof Bookings !== 'undefined' && Bookings.openBookingDrawer) {
          Bookings.openBookingDrawer(roomId, todayStr, nextSlot, nextSlot);
        } else {
          window.location.hash = `#/request?roomId=${encodeURIComponent(roomId)}&date=${encodeURIComponent(todayStr)}&startSlot=${nextSlot}&endSlot=${nextSlot}`;
        }
      });
    }
  }
};
