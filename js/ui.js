/**
 * js/ui.js
 * 
 * Purpose: Global UI controllers for toast notifications, accessible dialog modals,
 *          theme switching, live campus clock, and role-based navbar states.
 * Owner: Angel Seth (Reg. No. 12611041) - Accessible UI Controls, Theme & Clock
 * Depends on: Config (js/config.js), Utils (js/utils.js), Store (js/store.js)
 * 
 * Functions:
 * - showToast(message, type): void - Renders transient alert with ARIA live feedback.
 * - showModal(title, bodyHtml, onConfirm, confirmText, isDanger): void - Opens <dialog>.
 * - closeModal(): void - Closes active <dialog> modal.
 * - toggleTheme(): void - Toggles light/dark/system CSS themes.
 * - applyTheme(theme): void - Sets HTML data-theme attribute.
 * - updateClock(): void - Refreshes header clock and checks simulated time banner.
 * - setSimulatedTime(dateTimeStr): void - Activates virtual campus clock.
 * - clearSimulatedTime(): void - Deactivates virtual clock and returns to real time.
 * - renderNavbar(): void - Synchronizes navigation links, labels, and role visibility.
 */

'use strict';

const UI = {
  _activeModalTrigger: null,
  _modalInitialized: false,

  /**
   * Registers persistent event listeners on the modal dialog once.
   * Handles backdrop clicks, Escape/cancel, and header close button.
   */
  initModal: function() {
    const dialog = document.getElementById('app-modal');
    if (!dialog || this._modalInitialized) return;
    this._modalInitialized = true;

    // Dismiss when clicking directly on dialog backdrop
    dialog.addEventListener('click', function(e) {
      if (e.target === dialog) {
        UI.closeModal();
      }
    });

    // Handle native Esc key cancel event safely
    dialog.addEventListener('cancel', function(e) {
      e.preventDefault();
      UI.closeModal();
    });

    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        UI.closeModal();
      });
    }
  },

  /**
   * Displays an accessible toast notification that automatically dismisses.
   * @param {string} message - User message
   * @param {"success"|"error"|"warning"|"info"} [type="info"]
   */
  showToast: function(message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toastType = type || 'info';
    const toast = document.createElement('div');
    toast.className = `toast toast-${toastType}`;
    toast.setAttribute('role', 'alert');

    const icons = {
      success: '&#9989;',
      error: '&#10060;',
      warning: '&#9888;&#65039;',
      info: '&#8505;&#65039;'
    };

    toast.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${icons[toastType] || icons.info}</span>
      <div class="toast-message">${Utils.escapeHTML(message)}</div>
      <button class="btn-close" type="button" aria-label="Dismiss notification">&times;</button>
    `;

    // Manual close button
    const closeBtn = toast.querySelector('.btn-close');
    closeBtn.addEventListener('click', function() {
      if (toast.parentNode) {
        container.removeChild(toast);
      }
    });

    container.appendChild(toast);

    // Auto dismiss after 4 seconds
    setTimeout(function() {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 200ms ease';
        setTimeout(function() {
          if (toast.parentNode) {
            container.removeChild(toast);
          }
        }, 200);
      }
    }, 4000);
  },

  /**
   * Opens the shared accessible <dialog> modal.
   * @param {string} title
   * @param {string|HTMLElement} bodyContent
   * @param {Function} [onConfirm=null]
   * @param {string} [confirmText="Confirm"]
   * @param {boolean} [isDanger=false]
   */
  showModal: function(title, bodyContent, onConfirm, confirmText, isDanger) {
    const dialog = document.getElementById('app-modal');
    if (!dialog) return;

    this._activeModalTrigger = document.activeElement;

    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const footerEl = document.getElementById('modal-footer');

    titleEl.textContent = title;

    if (typeof bodyContent === 'string') {
      bodyEl.innerHTML = bodyContent;
    } else if (bodyContent instanceof HTMLElement) {
      bodyEl.innerHTML = '';
      bodyEl.appendChild(bodyContent);
    }

    // Configure footer buttons
    footerEl.innerHTML = '';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = onConfirm ? 'Cancel' : 'Close';
    cancelBtn.addEventListener('click', function() {
      UI.closeModal();
    });
    footerEl.appendChild(cancelBtn);

    if (onConfirm && typeof onConfirm === 'function') {
      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';
      confirmBtn.textContent = confirmText || 'Confirm';
      confirmBtn.addEventListener('click', function() {
        onConfirm();
      });
      footerEl.appendChild(confirmBtn);
    }

    this.initModal();

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }

    // Focus first actionable element inside modal
    const focusable = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  },

  /**
   * Closes the active modal and restores focus.
   */
  closeModal: function() {
    const dialog = document.getElementById('app-modal');
    if (!dialog) return;

    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }

    if (this._activeModalTrigger && typeof this._activeModalTrigger.focus === 'function') {
      this._activeModalTrigger.focus();
    }
  },

  /**
   * Toggles theme between Light and Dark mode.
   */
  toggleTheme: function() {
    const settings = Store.get('SETTINGS') || {};
    const currentTheme = settings.theme || 'system';
    let newTheme = 'light';

    if (currentTheme === 'light') {
      newTheme = 'dark';
    } else if (currentTheme === 'dark') {
      newTheme = 'light';
    } else {
      // System default check
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      newTheme = prefersDark ? 'light' : 'dark';
    }

    settings.theme = newTheme;
    const persisted = Store.set('SETTINGS', settings);
    this.applyTheme(newTheme);
    this.showToast(`Switched to ${newTheme} theme`, 'info');
    if (!persisted) {
      this.showToast('Warning: Theme setting saved in-memory only (storage unavailable).', 'warning');
    }
  },

  /**
   * Applies the theme attribute to the document element.
   * @param {string} theme - 'light' | 'dark' | 'system'
   */
  applyTheme: function(theme) {
    const root = document.documentElement;
    const themeIcon = document.getElementById('theme-icon');

    if (theme === 'system') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      if (themeIcon) themeIcon.innerHTML = '&#9681;';
    } else {
      root.setAttribute('data-theme', theme);
      if (themeIcon) themeIcon.innerHTML = theme === 'dark' ? '&#9789;' : '&#9788;';
    }
  },

  /**
   * Checks whether localStorage is working and toggles storage warning banner.
   */
  updateStorageBanner: function() {
    const storageBanner = document.getElementById('storage-banner');
    if (!storageBanner) return;
    if (typeof Store !== 'undefined' && typeof Store.isStorageAvailable === 'function' && !Store.isStorageAvailable()) {
      storageBanner.classList.remove('hidden');
    } else {
      storageBanner.classList.add('hidden');
    }
  },

  /**
   * Updates the live clock in the application header and simulation banner.
   */
  updateClock: function() {
    const clockDate = document.getElementById('clock-date');
    const clockTime = document.getElementById('clock-time');
    const simBanner = document.getElementById('sim-banner');
    const simText = document.getElementById('sim-banner-text');

    this.updateStorageBanner();

    const now = Utils.getNow();

    if (clockDate) clockDate.textContent = Utils.formatDate(now);
    if (clockTime) clockTime.textContent = Utils.formatTime(now);

    const settings = Store.get('SETTINGS') || {};
    if (settings.simulatedNow) {
      if (simBanner) simBanner.classList.remove('hidden');
      if (simText) {
        simText.textContent = `Schedule Preview Clock Active: ${Utils.formatDate(now)} ${Utils.formatTime(now)} (Preview Mode).`;
      }
    } else {
      if (simBanner) simBanner.classList.add('hidden');
    }
  },

  /**
   * Sets simulated campus time in settings and refreshes UI.
   * @param {string} dateTimeStr - "YYYY-MM-DDTHH:MM"
   */
  setSimulatedTime: function(dateTimeStr) {
    const settings = Store.get('SETTINGS') || {};
    settings.simulatedNow = dateTimeStr;
    const persisted = Store.set('SETTINGS', settings);
    this.updateClock();
    this.showToast('Schedule Preview Clock set successfully.', 'info');
    if (!persisted) {
      this.showToast('Warning: Preview time saved in-memory only (storage unavailable).', 'warning');
    }
  },

  /**
   * Clears simulated time and returns to real system clock.
   */
  clearSimulatedTime: function() {
    const settings = Store.get('SETTINGS') || {};
    settings.simulatedNow = null;
    const persisted = Store.set('SETTINGS', settings);
    this.updateClock();
    this.showToast('Schedule preview cleared. Real campus clock restored.', 'success');
    if (!persisted) {
      this.showToast('Warning: Setting cleared in-memory only (storage unavailable).', 'warning');
    }
  },

  /**
   * Displays interactive schedule preview / campus time machine dialog.
   */
  showClockTravelModal: function() {
    const settings = Store.get('SETTINGS') || {};
    const now = Utils.getNow();
    const todayStr = Utils.getLocalDateString(now);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const curVal = settings.simulatedNow || `${todayStr}T${timeStr}`;

    const modalHtml = `
      <div class="time-travel-modal">
        <p class="form-hint" style="margin-bottom: var(--space-3);">
          Preview the campus timetable, room transitions, and live booking states at any past or future time point.
        </p>

        <div class="form-group">
          <label for="travel-time-input" class="form-label">Virtual Campus Date &amp; Time:</label>
          <input type="datetime-local" id="travel-time-input" class="form-input" value="${curVal}" />
        </div>

        <div style="margin-top: var(--space-3);">
          <div style="font-size: var(--text-xs); color: var(--text-muted); margin-bottom: 6px; font-weight: var(--font-bold);">QUICK PRESETS:</div>
          <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-subtle time-preset-btn" data-time="${todayStr}T09:15">Slot 1 (09:15)</button>
            <button type="button" class="btn btn-sm btn-subtle time-preset-btn" data-time="${todayStr}T11:30">Slot 3 (11:30)</button>
            <button type="button" class="btn btn-sm btn-subtle time-preset-btn" data-time="${todayStr}T14:15">Slot 6 (14:15)</button>
            <button type="button" class="btn btn-sm btn-subtle time-preset-btn" data-time="${todayStr}T17:30">Slot 9 (17:30)</button>
            <button type="button" class="btn btn-sm btn-subtle time-preset-btn" data-time="${todayStr}T19:00">Evening / Closed</button>
          </div>
        </div>

        <div style="margin-top: var(--space-4); display: flex; justify-content: space-between; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
          <button type="button" id="travel-reset-btn" class="btn btn-secondary">Restore Real Time</button>
          <button type="button" id="travel-apply-btn" class="btn btn-primary">Apply Preview Time</button>
        </div>
      </div>
    `;

    UI.showModal('Campus Time Machine • Schedule Preview', modalHtml);

    const input = document.getElementById('travel-time-input');
    const presets = document.querySelectorAll('.time-preset-btn');
    presets.forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (input) input.value = btn.getAttribute('data-time');
      });
    });

    const resetBtn = document.getElementById('travel-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        UI.closeModal();
        UI.clearSimulatedTime();
        if (typeof App !== 'undefined' && App.navigate) {
          App.navigate(window.location.hash || '#/availability');
        }
      });
    }

    const applyBtn = document.getElementById('travel-apply-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', function() {
        if (!input || !input.value) return;
        UI.closeModal();
        UI.setSimulatedTime(input.value);
        if (typeof App !== 'undefined' && App.navigate) {
          App.navigate(window.location.hash || '#/availability');
        }
      });
    }
  },

  /**
   * Synchronizes navigation bar role item visibility and active highlights.
   */
  renderNavbar: function() {
    const role = (typeof App !== 'undefined' && App.getCurrentRole) ? App.getCurrentRole() : Config.ROLES.STUDENT;
    const adminNav = document.getElementById('nav-admin-item');
    const requestsNavText = document.getElementById('nav-requests-text');

    if (adminNav) {
      if (role === Config.ROLES.ADMIN) {
        adminNav.classList.remove('hidden');
      } else {
        adminNav.classList.add('hidden');
      }
    }

    if (requestsNavText) {
      requestsNavText.textContent = role === Config.ROLES.ADMIN ? 'All Requests' : 'My Requests';
    }

    // Update active class on nav links
    const currentRoute = (typeof App !== 'undefined' && App.getActiveRoute) ? App.getActiveRoute() : 'availability';
    const isFreeNowHash = (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('mode=freenow'));
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(function(link) {
      const linkRoute = link.getAttribute('data-route');
      let isMatch = false;

      if (isFreeNowHash) {
        isMatch = (linkRoute === 'freenow');
      } else if (currentRoute === 'availability') {
        isMatch = (linkRoute === 'availability');
      } else {
        isMatch = (linkRoute === currentRoute);
      }

      if (isMatch) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
      }
    });
  },

  /**
   * Helper to focus the role switcher in the header for fast persona switching.
   */
  showRoleSwitcher: function() {
    const sel = document.getElementById('role-select');
    if (sel) {
      sel.focus();
      if (sel.showPicker) {
        try { sel.showPicker(); } catch (e) {}
      }
    }
  },



  /**
   * Command Palette State and Controller.
   */
  _paletteState: {
    selectedIndex: 0,
    filteredItems: []
  },

  closeCommandPalette: function() {
    const backdrop = document.getElementById('cmd-palette-backdrop');
    if (backdrop) {
      backdrop.remove();
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = '';
      }
    }
  },

  showCommandPalette: function() {
    this.closeCommandPalette();

    const self = this;
    const rooms = (typeof Rooms !== 'undefined' && Rooms.getAll) ? Rooms.getAll() : [];
    const buildings = (typeof Rooms !== 'undefined' && Rooms.getAllBuildings) ? Rooms.getAllBuildings() : [];
    const bookings = (typeof Bookings !== 'undefined' && Bookings.getAll) ? Bookings.getAll() : [];

    // Build index items
    const items = [];

    // 1. Navigation Actions
    items.push({
      type: 'action',
      category: 'Navigation',
      icon: '&#127968;',
      title: 'Dashboard Overview',
      subtitle: 'Real-time KPI metrics, campus map, and free room radar',
      tags: 'home dashboard kpi overview metrics',
      action: function() { window.location.hash = '#/dashboard'; }
    });
    items.push({
      type: 'action',
      category: 'Navigation',
      icon: '&#128197;',
      title: 'Availability Matrix',
      subtitle: 'Interactive 9-slot grid grouped by campus blocks',
      tags: 'availability grid matrix slots schedule timetable',
      action: function() { window.location.hash = '#/availability'; }
    });
    items.push({
      type: 'action',
      category: 'Navigation',
      icon: '&#128269;',
      title: 'Find a Free Room',
      subtitle: 'Instant search by slot span, capacity, and equipment',
      tags: 'find search free available room empty filter',
      action: function() { window.location.hash = '#/find'; }
    });
    items.push({
      type: 'action',
      category: 'Navigation',
      icon: '&#9997;',
      title: 'Request a Room',
      subtitle: 'Submit new booking request with real-time conflict checking',
      tags: 'request book new reservation slot form',
      action: function() { window.location.hash = '#/request'; }
    });
    items.push({
      type: 'action',
      category: 'Navigation',
      icon: '&#128203;',
      title: 'Booking Requests & History',
      subtitle: 'Review approvals, track progress, or export reservation data',
      tags: 'bookings requests my history tracker approval cancel',
      action: function() { window.location.hash = '#/bookings'; }
    });
    items.push({
      type: 'action',
      category: 'Navigation',
      icon: '&#128272;',
      title: 'Admin Management Portal',
      subtitle: 'Manage room inventory, timetable schedules, and approvals (PIN: 1234)',
      tags: 'admin coordinator rooms manage delete maintenance',
      action: function() { window.location.hash = '#/admin'; }
    });
    items.push({
      type: 'action',
      category: 'Navigation',
      icon: '&#9881;',
      title: 'Campus Guidelines & Helpdesk Directory',
      subtitle: 'Block coordinator extensions, operating hours, and FAQ',
      tags: 'help guidelines directory contact support phone faq rules',
      action: function() { window.location.hash = '#/help'; }
    });
    items.push({
      type: 'action',
      category: 'Quick Actions',
      icon: '&#128100;',
      title: 'Switch Role (Student / Faculty / Admin)',
      subtitle: 'Switch between Student, Faculty, and Admin personas',
      tags: 'role switch user student faculty admin coordinator persona',
      action: function() { self.showRoleSwitcher(); }
    });
    items.push({
      type: 'action',
      category: 'Quick Actions',
      icon: '&#127767;',
      title: 'Toggle Dark / Light Theme',
      subtitle: 'Switch portal interface appearance',
      tags: 'theme dark light mode color style appearance',
      action: function() { self.toggleTheme(); }
    });
    items.push({
      type: 'action',
      category: 'Quick Actions',
      icon: '&#128229;',
      title: 'Export Bookings to CSV',
      subtitle: 'Download complete reservation history log as a spreadsheet',
      tags: 'csv export download excel table data',
      action: function() {
        if (typeof Utils !== 'undefined' && Utils.exportToCSV && typeof Bookings !== 'undefined') {
          const allB = Bookings.getAll();
          const headers = ['Reference', 'Room', 'Date', 'Start Slot', 'End Slot', 'Requester Name', 'ID', 'Type', 'Email', 'Purpose', 'Status'];
          const rows = allB.map(function(b) {
            const r = (typeof Rooms !== 'undefined') ? Rooms.getById(b.roomId) : null;
            return [b.ref, r ? r.roomNo : b.roomId, b.date, b.startSlot, b.endSlot, b.requesterName, b.requesterId, b.requesterType, b.email, b.purpose, b.status];
          });
          Utils.exportToCSV(`campus-bookings-${Utils.getLocalDateString(Utils.getNow())}.csv`, headers, rows);
          self.showToast('Bookings CSV exported successfully.', 'success');
        }
      }
    });

    // 2. Rooms Index (All 28 rooms)
    rooms.forEach(function(r) {
      const bldg = buildings.find(function(b) { return b.id === r.buildingId; });
      const bldgName = bldg ? bldg.name : r.buildingId;
      items.push({
        type: 'room',
        category: 'Campus Rooms',
        icon: '&#127979;',
        title: `Room ${r.roomNo} - ${r.name}`,
        subtitle: `${bldgName} • Floor ${r.floor} • ${r.type} (${r.capacity} seats)`,
        tags: `${r.roomNo} ${r.name} ${r.type} ${bldgName} floor${r.floor} ${(r.facilities || []).join(' ')}`,
        action: function() {
          window.location.hash = `#/availability?room=${encodeURIComponent(r.roomNo)}`;
        }
      });
    });

    // 3. Active Bookings Index
    bookings.forEach(function(b) {
      const r = rooms.find(function(rm) { return rm.id === b.roomId; });
      const roomNo = r ? `Room ${r.roomNo}` : b.roomId;
      items.push({
        type: 'booking',
        category: 'Reservations',
        icon: '&#128221;',
        title: `${b.ref} - ${b.purpose}`,
        subtitle: `${roomNo} • ${Utils.formatDate(b.date)} • ${b.requesterName} (${b.status})`,
        tags: `${b.ref} ${b.purpose} ${b.requesterName} ${b.requesterId} ${roomNo} ${b.date} ${b.status}`,
        action: function() {
          if (typeof Bookings !== 'undefined' && Bookings.renderBookingDetails) {
            Bookings.renderBookingDetails(b.id);
          }
        }
      });
    });

    // Create DOM structure
    const backdrop = document.createElement('div');
    backdrop.id = 'cmd-palette-backdrop';
    backdrop.className = 'cmd-palette-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Global Command Palette');

    backdrop.innerHTML = `
      <div id="cmd-palette-container" class="cmd-palette-container">
        <div class="cmd-palette-header">
          <span class="cmd-search-icon" aria-hidden="true">&#128269;</span>
          <input type="text" id="cmd-palette-input" class="cmd-palette-input" placeholder="Type a room (34-101), booking ref, or action..." autocomplete="off" spellcheck="false" />
          <button type="button" id="cmd-esc-close-btn" class="cmd-esc-btn cmd-kbd-esc" title="Close (Esc)">ESC</button>
        </div>
        <div id="cmd-palette-results" class="cmd-palette-results" role="listbox"></div>
        <div class="cmd-palette-footer">
          <span><kbd>&uarr;</kbd> <kbd>&darr;</kbd> to navigate</span>
          <span><kbd>&crarr;</kbd> to select</span>
          <span><kbd>ESC</kbd> to close</span>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';

    const inputEl = backdrop.querySelector('#cmd-palette-input');
    const resultsEl = backdrop.querySelector('#cmd-palette-results');
    inputEl.focus();

    self._paletteState.selectedIndex = 0;

    const renderResults = function(query) {
      const q = (query || '').trim().toLowerCase();
      let matched = items;
      if (q) {
        matched = items.filter(function(it) {
          return it.title.toLowerCase().includes(q) ||
                 it.subtitle.toLowerCase().includes(q) ||
                 it.tags.toLowerCase().includes(q) ||
                 it.category.toLowerCase().includes(q);
        });
      }

      self._paletteState.filteredItems = matched;
      if (self._paletteState.selectedIndex >= matched.length) {
        self._paletteState.selectedIndex = 0;
      }

      if (matched.length === 0) {
        resultsEl.innerHTML = `
          <div class="cmd-palette-empty">
            <p>No matching rooms, bookings, or commands found for "<strong>${Utils.escapeHTML(query)}</strong>"</p>
          </div>
        `;
        return;
      }

      let html = '';
      let currentCategory = '';
      matched.forEach(function(item, idx) {
        if (item.category !== currentCategory) {
          currentCategory = item.category;
          html += `<div class="cmd-group-title">${Utils.escapeHTML(currentCategory)}</div>`;
        }
        const isSelected = idx === self._paletteState.selectedIndex;
        html += `
          <div class="cmd-result-item ${isSelected ? 'selected' : ''}" data-index="${idx}" role="option" aria-selected="${isSelected}">
            <span class="cmd-item-icon" aria-hidden="true">${item.icon}</span>
            <div class="cmd-item-text">
              <div class="cmd-item-title">${Utils.escapeHTML(item.title)}</div>
              <div class="cmd-item-sub">${Utils.escapeHTML(item.subtitle)}</div>
            </div>
            <span class="cmd-item-badge">${Utils.escapeHTML(item.category)}</span>
          </div>
        `;
      });

      resultsEl.innerHTML = html;

      // Ensure active item is visible
      const selectedEl = resultsEl.querySelector('.cmd-result-item.selected');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    };

    renderResults('');

    inputEl.addEventListener('input', function(e) {
      self._paletteState.selectedIndex = 0;
      renderResults(e.target.value);
    });

    const executeItem = function(idx) {
      const item = self._paletteState.filteredItems[idx];
      if (item && typeof item.action === 'function') {
        self.closeCommandPalette();
        item.action();
      }
    };

    resultsEl.addEventListener('click', function(e) {
      const row = e.target.closest('.cmd-result-item');
      if (row) {
        const idx = parseInt(row.getAttribute('data-index'), 10);
        executeItem(idx);
      }
    });

    const escCloseBtn = backdrop.querySelector('#cmd-esc-close-btn');
    if (escCloseBtn) {
      escCloseBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        self.closeCommandPalette();
      });
    }

    backdrop.addEventListener('click', function(e) {
      if (e.target === backdrop) {
        self.closeCommandPalette();
      }
    });

    inputEl.addEventListener('keydown', function(e) {
      const count = self._paletteState.filteredItems.length;
      if (count === 0 && e.key !== 'Escape') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        self._paletteState.selectedIndex = (self._paletteState.selectedIndex + 1) % count;
        renderResults(inputEl.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        self._paletteState.selectedIndex = (self._paletteState.selectedIndex - 1 + count) % count;
        renderResults(inputEl.value);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeItem(self._paletteState.selectedIndex);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        self.closeCommandPalette();
      }
    });
  }
};
