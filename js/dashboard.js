/**
 * js/dashboard.js
 * 
 * Purpose: Campus real-time overview, KPI cards, visual CSS charts for
 *          occupancy and slot utilization, quick-reserve list, and activity feed.
 * Owner: Shared (Team SOUL - Angel Seth, Kartik, Dhruv Anand)
 * Depends on: Config, Utils, Store, Rooms, Availability, Bookings
 * 
 * Functions:
 * - getMetrics(): object - Computes summary statistics, building occupancy, and slot loads.
 * - renderView(containerEl): void - Main screen renderer for the #/dashboard route.
 * - _renderRightNowBanner(metrics): string - Generates status banner for current teaching slot.
 * - _renderKPIs(metrics, role): string - Generates 6 interactive summary cards.
 * - _renderBuildingOccupancy(metrics): string - Generates pure CSS bar chart by building.
 * - _renderSlotUtilization(metrics): string - Generates pure CSS bar chart across slots 1-9.
 * - _renderStatusDistribution(metrics): string - Generates CSS conic-gradient donut chart.
 * - _renderRoomsByType(metrics): string - Generates room inventory breakdown bars.
 * - _renderFreeNowList(metrics): string - Displays rooms available right now with quick-book links.
 * - _renderUpcomingBookings(metrics): string - Displays confirmed bookings for the next 7 days.
 * - _renderRecentActivity(metrics): string - Generates audit trail feed from booking histories.
 */

'use strict';

const Dashboard = {
  /**
   * Computes campus-wide metrics, occupancy rates, and slot loads for today.
   * @returns {object}
   */
  getMetrics: function() {
    const allRooms = Rooms.getAll();
    const allBuildings = Rooms.getAllBuildings();
    const allBookings = Bookings.getAll();
    const settings = Store.get('SETTINGS') || {};
    const lastRequester = settings.lastRequester || {};

    const todayDate = Utils.getLocalDateString(Utils.getNow());
    const currentSlot = Utils.getCurrentSlot();
    const dayOfWeek = Utils.getNow().getDay(); // 0 = Sunday

    // 1. Basic Room Counts
    const totalRooms = allRooms.length;
    let maintenanceRooms = 0;
    const activeRooms = [];

    allRooms.forEach(function(room) {
      if (room.status === Config.ROOM_STATUS.MAINTENANCE) {
        maintenanceRooms++;
      } else {
        activeRooms.push(room);
      }
    });

    // 2. Real-time Status (Current Slot)
    let freeNow = 0;
    let occupiedNow = 0;
    const freeRoomsNow = [];

    if (currentSlot !== null) {
      activeRooms.forEach(function(room) {
        const slotInfo = Availability.getSlotStatus(room.id, todayDate, currentSlot);
        if (slotInfo.status === 'Free' && !slotInfo.isPast) {
          freeNow++;
          freeRoomsNow.push(room);
        } else if (slotInfo.status === 'Class' || slotInfo.status === 'Booked') {
          occupiedNow++;
        }
      });
    }

    // 3. Request Status Counts
    const statusCounts = {
      Pending: 0,
      Approved: 0,
      Rejected: 0,
      Cancelled: 0,
      Completed: 0,
      total: allBookings.length
    };

    allBookings.forEach(function(b) {
      const computed = Bookings.getComputedStatus(b);
      if (statusCounts[computed] !== undefined) {
        statusCounts[computed]++;
      }
    });

    // 4. User's Active Requests
    let myActiveRequests = 0;
    if (lastRequester.id) {
      const userRef = lastRequester.id.toUpperCase();
      allBookings.forEach(function(b) {
        if (b.requesterId.toUpperCase() === userRef && b.date >= todayDate) {
          const comp = Bookings.getComputedStatus(b);
          if (comp === Config.BOOKING_STATUS.PENDING || comp === Config.BOOKING_STATUS.APPROVED) {
            myActiveRequests++;
          }
        }
      });
    }

    // 5. Building Occupancy Today (Aggregate across slots 1 to 9)
    const buildingOccupancy = allBuildings.map(function(bldg) {
      const bldgRooms = activeRooms.filter(function(r) { return r.buildingId === bldg.id; });
      const totalPossibleSlots = bldgRooms.length * 9;
      let occupiedSlots = 0;

      if (totalPossibleSlots > 0 && dayOfWeek !== 0) {
        bldgRooms.forEach(function(room) {
          for (let s = 1; s <= 9; s++) {
            const st = Availability.getSlotStatus(room.id, todayDate, s).status;
            if (st === 'Class' || st === 'Booked') {
              occupiedSlots++;
            }
          }
        });
      }

      const rate = totalPossibleSlots > 0 ? Math.round((occupiedSlots / totalPossibleSlots) * 100) : 0;
      return {
        id: bldg.id,
        name: bldg.name,
        code: bldg.code,
        roomCount: bldgRooms.length,
        totalSlots: totalPossibleSlots,
        occupiedSlots: occupiedSlots,
        percent: rate
      };
    });

    // 6. Time Slot Utilization Today (Slots 1 to 9)
    const slotUtilization = Config.SLOTS.map(function(slotDef) {
      let occupiedCount = 0;
      if (dayOfWeek !== 0 && activeRooms.length > 0) {
        activeRooms.forEach(function(room) {
          const st = Availability.getSlotStatus(room.id, todayDate, slotDef.id).status;
          if (st === 'Class' || st === 'Booked') {
            occupiedCount++;
          }
        });
      }

      const rate = activeRooms.length > 0 ? Math.round((occupiedCount / activeRooms.length) * 100) : 0;
      return {
        slot: slotDef.id,
        label: `Slot ${slotDef.id} (${slotDef.start})`,
        occupiedCount: occupiedCount,
        totalRooms: activeRooms.length,
        percent: rate
      };
    });

    // 7. Room Count by Type
    const roomsByType = {};
    Config.ROOM_TYPES.forEach(function(type) { roomsByType[type] = 0; });
    allRooms.forEach(function(r) {
      if (roomsByType[r.type] !== undefined) {
        roomsByType[r.type]++;
      }
    });

    return {
      todayDate: todayDate,
      currentSlot: currentSlot,
      dayOfWeek: dayOfWeek,
      totalRooms: totalRooms,
      activeRoomsCount: activeRooms.length,
      maintenanceRooms: maintenanceRooms,
      freeNow: freeNow,
      occupiedNow: occupiedNow,
      freeRoomsNow: freeRoomsNow,
      statusCounts: statusCounts,
      myActiveRequests: myActiveRequests,
      buildingOccupancy: buildingOccupancy,
      slotUtilization: slotUtilization,
      roomsByType: roomsByType,
      allBookings: allBookings
    };
  },

  /**
   * Main view renderer for the Dashboard route (#/dashboard).
   * @param {HTMLElement} containerEl
   */
  renderView: function(containerEl) {
    if (!containerEl) return;
    const metrics = this.getMetrics();
    const currentRole = (typeof App !== 'undefined' && App.getCurrentRole) ? App.getCurrentRole() : Config.ROLES.STUDENT;

    let html = `
      <!-- 1. Real-time Status Banner -->
      ${this._renderRightNowBanner(metrics)}

      <!-- 2. KPI Summary Cards Grid -->
      ${this._renderKPIs(metrics, currentRole)}

      <!-- 3. Occupancy & Utilization Visual Charts (2 Columns) -->
      <div class="grid-2col" style="margin-bottom: var(--space-6);">
        ${this._renderBuildingOccupancy(metrics)}
        ${this._renderSlotUtilization(metrics)}
      </div>

      <!-- 4. Request Status & Inventory Distribution (2 Columns) -->
      <div class="grid-2col" style="margin-bottom: var(--space-6);">
        ${this._renderStatusDistribution(metrics)}
        ${this._renderRoomsByType(metrics)}
      </div>

      <!-- 5. Free Right Now Quick Booking Section -->
      ${this._renderFreeNowList(metrics)}

      <!-- 6. Upcoming Bookings & Audit Trail Grid -->
      <div class="grid-2col" style="margin-bottom: var(--space-6);">
        ${this._renderUpcomingBookings(metrics)}
        ${this._renderRecentActivity(metrics)}
      </div>
    `;

    containerEl.innerHTML = html;

    // Attach click events for booking inspection modals
    const inspectionTriggers = containerEl.querySelectorAll('.btn-inspect-booking');
    inspectionTriggers.forEach(function(btn) {
      btn.addEventListener('click', function() {
        const id = btn.getAttribute('data-booking-id');
        if (id && typeof Bookings !== 'undefined' && Bookings.renderBookingDetails) {
          Bookings.renderBookingDetails(id);
        }
      });
    });
  },

  /**
   * Generates the "Right Now" banner indicating current teaching slot.
   * @private
   * @param {object} metrics
   * @returns {string}
   */
  _renderRightNowBanner: function(metrics) {
    const formattedDate = Utils.formatDate(metrics.todayDate);
    const nowTime = Utils.formatTime(Utils.getNow());

    let slotBadge = '';
    let slotMessage = '';

    if (metrics.dayOfWeek === 0) {
      slotBadge = '<span class="badge badge-maint">Sunday Off</span>';
      slotMessage = 'Campus is closed for regular teaching sessions. Online booking requests remain open.';
    } else if (metrics.currentSlot !== null) {
      const slotDef = Config.SLOTS.find(function(s) { return s.id === metrics.currentSlot; });
      slotBadge = `<span class="badge badge-booked">Live: Slot ${metrics.currentSlot} (${slotDef.start} - ${slotDef.end})</span>`;
      slotMessage = `Teaching block in progress. <strong>${metrics.freeNow}</strong> rooms currently free, <strong>${metrics.occupiedNow}</strong> in session.`;
    } else {
      slotBadge = '<span class="badge badge-free">Outside Teaching Hours</span>';
      slotMessage = 'Campus teaching slots operate Monday to Saturday from 09:00 to 18:00 (Slots 1 to 9).';
    }

    return `
      <div class="card" style="margin-bottom: var(--space-5); border-left: 4px solid var(--color-primary); background-color: var(--bg-surface);">
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3);">
          <div>
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1);">
              <h2 style="font-size: var(--text-lg); margin: 0; font-weight: var(--font-bold);">&#9200; Campus Live Clock: ${nowTime}</h2>
              ${slotBadge}
            </div>
            <p style="margin: 0; font-size: var(--text-sm); color: var(--text-secondary);">${formattedDate} &bull; ${slotMessage}</p>
          </div>
          <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
            <a href="#/availability" class="btn btn-sm btn-subtle">&#128197; Timetable</a>
            <a href="#/find" class="btn btn-sm btn-subtle">&#128269; Find Room</a>
            <a href="#/request" class="btn btn-sm btn-primary">&#9997; New Request</a>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Generates 6 interactive KPI cards.
   * @private
   * @param {object} metrics
   * @param {string} role
   * @returns {string}
   */
  _renderKPIs: function(metrics, role) {
    const isAdmin = (role === Config.ROLES.ADMIN);
    const pendingLabel = isAdmin ? 'Needs Action' : 'Awaiting Review';
    const pendingSubtext = isAdmin ? 'Click to review & approve' : 'Submitted requests';

    return `
      <div class="kpi-grid">
        <!-- 1. Total Rooms -->
        <a href="#/availability" class="kpi-card" aria-label="Total Campus Rooms">
          <div class="kpi-header">
            <span class="kpi-title">Campus Rooms</span>
            <span class="kpi-icon" aria-hidden="true">&#127979;</span>
          </div>
          <div class="kpi-value">${metrics.totalRooms}</div>
          <div class="kpi-subtext">Across 4 academic blocks</div>
        </a>

        <!-- 2. Free Now -->
        <a href="#/availability" class="kpi-card" aria-label="Free Rooms Right Now">
          <div class="kpi-header">
            <span class="kpi-title">Free Right Now</span>
            <span class="kpi-icon" aria-hidden="true">&#9989;</span>
          </div>
          <div class="kpi-value" style="color: var(--color-free);">${metrics.currentSlot ? metrics.freeNow : '--'}</div>
          <div class="kpi-subtext">${metrics.currentSlot ? `In Slot ${metrics.currentSlot}` : 'Outside teaching hours'}</div>
        </a>

        <!-- 3. Occupied Now -->
        <a href="#/availability" class="kpi-card" aria-label="Occupied Rooms Right Now">
          <div class="kpi-header">
            <span class="kpi-title">Occupied Now</span>
            <span class="kpi-icon" aria-hidden="true">&#128100;</span>
          </div>
          <div class="kpi-value" style="color: var(--color-booked);">${metrics.currentSlot ? metrics.occupiedNow : '--'}</div>
          <div class="kpi-subtext">${metrics.currentSlot ? 'Lectures & bookings' : 'No active sessions'}</div>
        </a>

        <!-- 4. Under Maintenance -->
        <a href="#/availability" class="kpi-card" aria-label="Rooms Under Maintenance">
          <div class="kpi-header">
            <span class="kpi-title">Maintenance</span>
            <span class="kpi-icon" aria-hidden="true">&#128295;</span>
          </div>
          <div class="kpi-value" style="color: var(--color-maint);">${metrics.maintenanceRooms}</div>
          <div class="kpi-subtext">Unavailable for booking</div>
        </a>

        <!-- 5. Pending Requests -->
        <a href="#/requests" class="kpi-card" aria-label="Pending Booking Requests">
          <div class="kpi-header">
            <span class="kpi-title">Pending (${pendingLabel})</span>
            <span class="kpi-icon" aria-hidden="true">&#9203;</span>
          </div>
          <div class="kpi-value" style="color: var(--color-requested);">${metrics.statusCounts.Pending}</div>
          <div class="kpi-subtext">${pendingSubtext}</div>
        </a>

        <!-- 6. User's Active Requests -->
        <a href="#/requests" class="kpi-card" aria-label="My Active Requests">
          <div class="kpi-header">
            <span class="kpi-title">My Upcoming</span>
            <span class="kpi-icon" aria-hidden="true">&#128221;</span>
          </div>
          <div class="kpi-value" style="color: var(--color-primary);">${metrics.myActiveRequests}</div>
          <div class="kpi-subtext">Active bookings saved</div>
        </a>
      </div>
    `;
  },

  /**
   * Generates pure CSS building occupancy bar chart.
   * @private
   * @param {object} metrics
   * @returns {string}
   */
  _renderBuildingOccupancy: function(metrics) {
    let rowsHtml = '';

    metrics.buildingOccupancy.forEach(function(b) {
      rowsHtml += `
        <div class="bar-row">
          <div class="bar-label" title="${Utils.escapeHTML(b.name)}">${Utils.escapeHTML(b.code)}</div>
          <div class="bar-track" role="progressbar" aria-valuenow="${b.percent}" aria-valuemin="0" aria-valuemax="100" aria-label="${Utils.escapeHTML(b.name)} occupancy">
            <div class="bar-fill" style="width: ${b.percent}%; background-color: var(--color-booked);"></div>
          </div>
          <div class="bar-value">${b.percent}%</div>
        </div>
      `;
    });

    return `
      <div class="card">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
          <h3 style="font-size: var(--text-sm); font-weight: var(--font-bold); margin: 0;">Building Occupancy Today</h3>
          <span class="chip">${metrics.todayDate}</span>
        </header>
        <p style="font-size: var(--text-xs); color: var(--text-secondary); margin-bottom: var(--space-4);">
          Percentage of teaching room-slots occupied by regular classes and approved bookings.
        </p>
        <div class="bar-chart">
          ${rowsHtml}
        </div>
      </div>
    `;
  },

  /**
   * Generates pure CSS time slot utilization bar chart.
   * @private
   * @param {object} metrics
   * @returns {string}
   */
  _renderSlotUtilization: function(metrics) {
    let rowsHtml = '';

    metrics.slotUtilization.forEach(function(s) {
      const isCurrent = (metrics.currentSlot === s.slot);
      const activeColor = isCurrent ? 'var(--color-primary)' : 'var(--color-primary-light)';
      const labelPrefix = isCurrent ? '&#9654; ' : '';

      rowsHtml += `
        <div class="bar-row">
          <div class="bar-label" style="font-weight: ${isCurrent ? 'bold' : 'normal'}; color: ${isCurrent ? 'var(--color-primary)' : 'inherit'};">
            ${labelPrefix}Slot ${s.slot}
          </div>
          <div class="bar-track" role="progressbar" aria-valuenow="${s.percent}" aria-valuemin="0" aria-valuemax="100" aria-label="Slot ${s.slot} utilization">
            <div class="bar-fill" style="width: ${s.percent}%; background-color: ${activeColor};"></div>
          </div>
          <div class="bar-value">${s.percent}%</div>
        </div>
      `;
    });

    return `
      <div class="card">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
          <h3 style="font-size: var(--text-sm); font-weight: var(--font-bold); margin: 0;">Hourly Slot Load (Slots 1 to 9)</h3>
          <span class="chip">Mon - Sat</span>
        </header>
        <p style="font-size: var(--text-xs); color: var(--text-secondary); margin-bottom: var(--space-4);">
          Campus-wide room utilization percentage throughout the 9 teaching hours.
        </p>
        <div class="bar-chart">
          ${rowsHtml}
        </div>
      </div>
    `;
  },

  /**
   * Generates CSS conic-gradient donut chart for request statuses.
   * @private
   * @param {object} metrics
   * @returns {string}
   */
  _renderStatusDistribution: function(metrics) {
    const sc = metrics.statusCounts;
    const total = sc.total;

    let conicGradient = 'conic-gradient(var(--bg-subtle) 0deg 360deg)';

    if (total > 0) {
      // Calculate angular segments for conic-gradient
      const degPending = (sc.Pending / total) * 360;
      const degApproved = (sc.Approved / total) * 360;
      const degRejected = (sc.Rejected / total) * 360;
      const degCancelled = (sc.Cancelled / total) * 360;

      const p1 = degPending;
      const p2 = p1 + degApproved;
      const p3 = p2 + degRejected;
      const p4 = p3 + degCancelled;

      conicGradient = `conic-gradient(
        var(--color-requested) 0deg ${p1}deg,
        var(--color-free) ${p1}deg ${p2}deg,
        var(--color-danger) ${p2}deg ${p3}deg,
        var(--color-maint) ${p3}deg ${p4}deg,
        var(--bg-subtle) ${p4}deg 360deg
      )`;
    }

    return `
      <div class="card">
        <header style="margin-bottom: var(--space-3);">
          <h3 style="font-size: var(--text-sm); font-weight: var(--font-bold); margin: 0;">Request Status Breakdown</h3>
        </header>
        <div class="donut-chart-container" style="margin: var(--space-3) 0;">
          <div class="donut-chart" style="background: ${conicGradient};" role="img" aria-label="Donut chart representing request statuses">
            <div class="donut-hole">
              <span style="font-size: var(--text-2xl); font-weight: var(--font-bold);">${total}</span>
              <span style="font-size: var(--text-xs); color: var(--text-muted); font-weight: normal;">Total</span>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--text-xs);">
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              <span style="width: 10px; height: 10px; border-radius: 2px; background-color: var(--color-requested);"></span>
              <span>Pending: <strong>${sc.Pending}</strong></span>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              <span style="width: 10px; height: 10px; border-radius: 2px; background-color: var(--color-free);"></span>
              <span>Approved: <strong>${sc.Approved}</strong></span>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              <span style="width: 10px; height: 10px; border-radius: 2px; background-color: var(--color-danger);"></span>
              <span>Rejected: <strong>${sc.Rejected}</strong></span>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              <span style="width: 10px; height: 10px; border-radius: 2px; background-color: var(--color-maint);"></span>
              <span>Cancelled: <strong>${sc.Cancelled}</strong></span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Generates room inventory breakdown by category.
   * @private
   * @param {object} metrics
   * @returns {string}
   */
  _renderRoomsByType: function(metrics) {
    let rowsHtml = '';
    const total = metrics.totalRooms || 1;

    Object.keys(metrics.roomsByType).forEach(function(type) {
      const count = metrics.roomsByType[type];
      const pct = Math.round((count / total) * 100);

      rowsHtml += `
        <div class="bar-row">
          <div class="bar-label" title="${type}">${type}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${pct}%; background-color: var(--color-primary-light);"></div>
          </div>
          <div class="bar-value">${count}</div>
        </div>
      `;
    });

    return `
      <div class="card">
        <header style="margin-bottom: var(--space-3);">
          <h3 style="font-size: var(--text-sm); font-weight: var(--font-bold); margin: 0;">Room Inventory by Type</h3>
        </header>
        <p style="font-size: var(--text-xs); color: var(--text-secondary); margin-bottom: var(--space-4);">
          Distribution of specialized learning spaces across campus buildings.
        </p>
        <div class="bar-chart">
          ${rowsHtml}
        </div>
      </div>
    `;
  },

  /**
   * Renders the "Free Right Now" quick reservation panel.
   * @private
   * @param {object} metrics
   * @returns {string}
   */
  _renderFreeNowList: function(metrics) {
    if (!metrics.currentSlot) {
      return `
        <div class="card" style="margin-bottom: var(--space-6);">
          <header style="margin-bottom: var(--space-2);">
            <h3 style="font-size: var(--text-base); font-weight: var(--font-bold); margin: 0;">&#9889; Free Rooms Right Now</h3>
          </header>
          <p style="font-size: var(--text-sm); color: var(--text-secondary);">
            Teaching hours are 09:00 to 18:00 (Slots 1 to 9). Use the <a href="#/find">Find a Room</a> tool or explore the <a href="#/availability">Timetable</a> to book rooms for upcoming slots.
          </p>
        </div>
      `;
    }

    const freeRooms = metrics.freeRoomsNow.slice(0, 6);
    let cardsHtml = '';

    if (freeRooms.length === 0) {
      cardsHtml = '<p class="empty-state">No free rooms available at this moment. All active rooms are occupied or in maintenance.</p>';
    } else {
      cardsHtml = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--space-3);">';
      freeRooms.forEach(function(room) {
        const bldg = Rooms.getBuildingById(room.buildingId);
        const bldgCode = bldg ? bldg.code : 'Campus';
        const facilitiesBadges = (room.facilities || []).slice(0, 3).map(function(f) {
          return `<span class="chip">${Utils.escapeHTML(f)}</span>`;
        }).join('');

        cardsHtml += `
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border: 1px solid var(--border-subtle);">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-1);">
                <h4 style="margin: 0; font-size: var(--text-sm); font-weight: var(--font-bold);">${Utils.escapeHTML(room.name)}</h4>
                <span class="badge badge-free">Free Slot ${metrics.currentSlot}</span>
              </div>
              <p style="font-size: var(--text-xs); color: var(--text-secondary); margin-bottom: var(--space-2);">
                ${bldgCode} &bull; Room ${Utils.escapeHTML(room.roomNo)} &bull; Cap: ${room.capacity}
              </p>
              <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: var(--space-3);">
                ${facilitiesBadges}
              </div>
            </div>
            <a href="#/request?roomId=${room.id}&date=${metrics.todayDate}&startSlot=${metrics.currentSlot}&endSlot=${metrics.currentSlot}" class="btn btn-sm btn-primary" style="width: 100%; text-align: center;">
              &#9997; Quick Reserve
            </a>
          </div>
        `;
      });
      cardsHtml += '</div>';
    }

    return `
      <div class="card" style="margin-bottom: var(--space-6);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
          <div>
            <h3 style="font-size: var(--text-base); font-weight: var(--font-bold); margin: 0;">&#9889; Free Rooms Right Now</h3>
            <p style="font-size: var(--text-xs); color: var(--text-secondary); margin: 0;">Instantly book an open room for the current active slot (${metrics.freeNow} free across campus).</p>
          </div>
          <a href="#/availability" class="btn btn-sm btn-subtle">View All Availability</a>
        </div>
        ${cardsHtml}
      </div>
    `;
  },

  /**
   * Generates upcoming confirmed bookings table (next 7 days).
   * @private
   * @param {object} metrics
   * @returns {string}
   */
  _renderUpcomingBookings: function(metrics) {
    const todayStr = metrics.todayDate;
    const futureLimit = new Date(Utils.getNow().getTime() + 7 * 24 * 60 * 60 * 1000);
    const limitStr = Utils.getLocalDateString(futureLimit);

    const upcoming = metrics.allBookings.filter(function(b) {
      const comp = Bookings.getComputedStatus(b);
      return (comp === Config.BOOKING_STATUS.APPROVED) && (b.date >= todayStr && b.date <= limitStr);
    }).slice(0, 6);

    let rowsHtml = '';
    if (upcoming.length === 0) {
      rowsHtml = '<tr><td colspan="4" class="empty-state" style="padding: var(--space-4); text-align: center;">No approved bookings scheduled in the next 7 days.</td></tr>';
    } else {
      upcoming.forEach(function(b) {
        const room = Rooms.getById(b.roomId);
        const roomName = room ? `${room.roomNo} (${room.name})` : 'Room';
        const slotText = b.startSlot === b.endSlot ? `Slot ${b.startSlot}` : `Slots ${b.startSlot}-${b.endSlot}`;

        rowsHtml += `
          <tr>
            <td>
              <button class="btn btn-subtle btn-inspect-booking" data-booking-id="${b.id}" style="font-family: var(--font-mono); font-weight: bold; padding: 2px 6px; font-size: var(--text-xs);">
                ${b.ref}
              </button>
            </td>
            <td>
              <div style="font-weight: var(--font-medium);">${Utils.escapeHTML(roomName)}</div>
              <div style="font-size: var(--text-xs); color: var(--text-secondary);">${Utils.escapeHTML(b.purpose)}</div>
            </td>
            <td>
              <div>${Utils.formatDate(b.date)}</div>
              <div style="font-size: var(--text-xs); color: var(--text-muted);">${slotText}</div>
            </td>
            <td><span class="badge badge-booked">Approved</span></td>
          </tr>
        `;
      });
    }

    return `
      <div class="card">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
          <h3 style="font-size: var(--text-sm); font-weight: var(--font-bold); margin: 0;">Upcoming Confirmed Bookings</h3>
          <span class="chip">Next 7 Days</span>
        </header>
        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Room &amp; Purpose</th>
                <th>Date &amp; Slot</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  /**
   * Generates recent audit trail feed from booking history entries.
   * @private
   * @param {object} metrics
   * @returns {string}
   */
  _renderRecentActivity: function(metrics) {
    const feed = [];

    // Extract history events across all bookings
    metrics.allBookings.forEach(function(b) {
      if (Array.isArray(b.history)) {
        b.history.forEach(function(h) {
          feed.push({
            bookingId: b.id,
            ref: b.ref,
            status: h.status,
            at: h.at,
            by: h.by || 'System',
            note: h.note || ''
          });
        });
      }
    });

    // Sort descending by timestamp
    feed.sort(function(a, b) {
      return new Date(b.at).getTime() - new Date(a.at).getTime();
    });

    const top8 = feed.slice(0, 6);
    let itemsHtml = '';

    if (top8.length === 0) {
      itemsHtml = '<p class="empty-state" style="padding: var(--space-4); text-align: center;">No activity recorded yet.</p>';
    } else {
      itemsHtml = '<ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-3);">';
      top8.forEach(function(item) {
        const timeAgo = Utils.formatDate(item.at) + ' ' + Utils.formatTime(item.at);
        const badgeClass = item.status === 'Approved' ? 'badge-free' :
                           item.status === 'Pending' ? 'badge-requested' :
                           item.status === 'Rejected' ? 'badge-danger' : 'badge-maint';

        itemsHtml += `
          <li style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); padding-bottom: var(--space-2); border-bottom: 1px solid var(--border-subtle); font-size: var(--text-xs);">
            <div>
              <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: 2px;">
                <button class="btn btn-subtle btn-inspect-booking" data-booking-id="${item.bookingId}" style="padding: 1px 4px; font-family: var(--font-mono); font-size: 0.75rem;">
                  ${item.ref}
                </button>
                <span class="badge ${badgeClass}" style="font-size: 0.7rem;">${item.status}</span>
                <span style="color: var(--text-muted);">&bull; by ${Utils.escapeHTML(item.by)}</span>
              </div>
              <div style="color: var(--text-secondary);">${Utils.escapeHTML(item.note || 'Status updated')}</div>
            </div>
            <div style="font-size: 0.7rem; color: var(--text-muted); white-space: nowrap;">${timeAgo}</div>
          </li>
        `;
      });
      itemsHtml += '</ul>';
    }

    return `
      <div class="card">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
          <h3 style="font-size: var(--text-sm); font-weight: var(--font-bold); margin: 0;">Recent Activity Trail</h3>
          <span class="chip">Live Feed</span>
        </header>
        ${itemsHtml}
      </div>
    `;
  }
};
