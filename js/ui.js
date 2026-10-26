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
    const currentRoute = (typeof App !== 'undefined' && App.getActiveRoute) ? App.getActiveRoute() : 'dashboard';
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(function(link) {
      if (link.getAttribute('data-route') === currentRoute) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
      }
    });
  },

  /**
   * Opens LPU UMS SSO authentication modal with quick-switch profile cards.
   */
  showUmsLoginModal: function() {
    const activeUser = (typeof App !== 'undefined' && App.getUmsUser) ? App.getUmsUser() : null;

    const quickProfiles = [
      {
        id: '12611041',
        name: 'Angel Seth',
        role: 'Student',
        dept: 'B.Tech CSE (First Year)',
        email: 'angel.12611041@lpu.in',
        phone: '9876543210',
        badge: 'Student'
      },
      {
        id: '12612598',
        name: 'Kartik',
        role: 'Student',
        dept: 'B.Tech CSE (First Year)',
        email: 'kartik.12612598@lpu.in',
        phone: '9876543211',
        badge: 'Student'
      },
      {
        id: '12619773',
        name: 'Dhruv Anand',
        role: 'Student',
        dept: 'B.Tech CSE (First Year)',
        email: 'dhruv.12619773@lpu.in',
        phone: '9876543212',
        badge: 'Student'
      },
      {
        id: 'FAC1024',
        name: 'Dr. Rajesh Sharma',
        role: 'Faculty',
        dept: 'School of CSE & Artificial Intelligence',
        email: 'rajesh.fac1024@lpu.co.in',
        phone: '9812345678',
        badge: 'Faculty'
      },
      {
        id: 'ADMIN',
        name: 'Estate Administrator',
        role: 'Admin',
        dept: 'Campus Estates & Operations Control',
        email: 'estates@lpu.in',
        phone: '01824-510000',
        badge: 'Admin'
      }
    ];

    let profilesHtml = '';
    quickProfiles.forEach(function(p) {
      const isCurrent = activeUser && activeUser.id === p.id;
      profilesHtml += `
        <div class="ums-profile-card ${isCurrent ? 'is-active' : ''}" data-profile-id="${Utils.escapeHTML(p.id)}" role="button" tabindex="0">
          <div class="ums-card-header">
            <span class="ums-card-avatar">${p.role === 'Admin' ? '&#128272;' : (p.role === 'Faculty' ? '&#127891;' : '&#128100;')}</span>
            <div class="ums-card-details">
              <div class="ums-card-name">${Utils.escapeHTML(p.name)}</div>
              <div class="ums-card-id">${Utils.escapeHTML(p.id)} &bull; ${Utils.escapeHTML(p.dept)}</div>
            </div>
            <span class="badge ${p.role === 'Admin' ? 'badge-danger' : (p.role === 'Faculty' ? 'badge-primary' : 'badge-free')}">${Utils.escapeHTML(p.badge)}</span>
          </div>
          ${isCurrent ? '<div class="ums-active-badge">&#10003; Active Session</div>' : '<div class="ums-switch-hint">Click to switch &rarr;</div>'}
        </div>
      `;
    });

    const activeUserBanner = activeUser ? `
      <div class="ums-session-banner" style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-subtle); padding: var(--space-3); border-radius: var(--radius-md); margin-bottom: var(--space-4); border: 1px solid var(--border-subtle);">
        <div>
          <span style="font-size: var(--text-xs); color: var(--text-secondary); text-transform: uppercase; font-weight: bold;">Signed in as</span>
          <div style="font-weight: bold; font-size: var(--text-sm);">${Utils.escapeHTML(activeUser.name)} (${Utils.escapeHTML(activeUser.id)} &bull; ${Utils.escapeHTML(activeUser.role)})</div>
        </div>
        <button id="ums-signout-btn" class="btn btn-sm btn-subtle" type="button" style="color: var(--color-danger);">Sign Out</button>
      </div>
    ` : '';

    const bodyHtml = `
      <div class="ums-modal-content">
        <div class="ums-branding-banner" style="margin-bottom: var(--space-4); text-align: center;">
          <h3 style="margin: 0; color: var(--color-primary); font-size: var(--text-base);">University Management System (UMS) SSO</h3>
          <p style="margin: var(--space-1) 0 0 0; font-size: var(--text-xs); color: var(--text-secondary);">Lovely Professional University &bull; Division of Academic Affairs</p>
        </div>

        ${activeUserBanner}

        <div style="margin-bottom: var(--space-3);">
          <label class="form-label" style="font-weight: var(--font-semibold);">1-Click Fast Switch Profiles</label>
          <div class="ums-profiles-grid" style="display: grid; gap: var(--space-2); margin-top: var(--space-2);">
            ${profilesHtml}
          </div>
        </div>

        <div class="ums-divider" style="text-align: center; margin: var(--space-4) 0; position: relative;">
          <span style="background: var(--bg-surface); padding: 0 var(--space-3); font-size: var(--text-xs); color: var(--text-muted); position: relative; z-index: 1;">Or Sign In with University Credentials</span>
          <div style="position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: var(--border-subtle);"></div>
        </div>

        <form id="ums-manual-form" style="display: grid; gap: var(--space-3);">
          <div class="form-group" style="margin: 0;">
            <label for="ums-uid-input" class="form-label">University ID / UID</label>
            <input type="text" id="ums-uid-input" class="form-input" placeholder="e.g. 12611041 (Student), FAC1024 (Faculty), ADMIN" required />
            <span class="form-hint">Student (8 digits: 126xxxxx), Faculty (FACxxxx), or ADMIN</span>
          </div>
          <div class="form-group" style="margin: 0;">
            <label for="ums-pass-input" class="form-label">Password / PIN</label>
            <input type="password" id="ums-pass-input" class="form-input" placeholder="••••••••" required />
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: var(--space-1);">Authenticate &amp; Sign In</button>
        </form>
      </div>
    `;

    this.showModal('LPU UMS Single Sign-On', bodyHtml, null, 'Close');

    const modalEl = document.getElementById('app-modal');
    if (!modalEl) return;

    // Sign out handler
    const signOutBtn = modalEl.querySelector('#ums-signout-btn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', function() {
        if (typeof App !== 'undefined' && App.clearUmsUser) {
          App.clearUmsUser();
          UI.closeModal();
          UI.showToast('Signed out of LPU UMS.', 'info');
        }
      });
    }

    // Quick profile selection handlers
    const cardEls = modalEl.querySelectorAll('.ums-profile-card');
    cardEls.forEach(function(card) {
      const pid = card.getAttribute('data-profile-id');
      const profile = quickProfiles.find(function(p) { return p.id === pid; });
      if (!profile) return;

      const selectProfile = function() {
        if (profile.role === 'Admin') {
          const success = (typeof App !== 'undefined' && App.setRole) ? App.setRole(Config.ROLES.ADMIN, '1234') : false;
          if (success) {
            App.setUmsUser(profile);
            UI.closeModal();
            UI.showToast(`Elevated session verified. Welcome, ${profile.name}!`, 'success');
          }
        } else {
          if (typeof App !== 'undefined') {
            App.setRole(profile.role === 'Faculty' ? Config.ROLES.FACULTY : Config.ROLES.STUDENT);
            App.setUmsUser(profile);
          }
          UI.closeModal();
          UI.showToast(`Welcome back, ${profile.name}! Signed in via LPU UMS.`, 'success');
        }
      };

      card.addEventListener('click', selectProfile);
      card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectProfile();
        }
      });
    });

    // Manual form submit
    const manualForm = modalEl.querySelector('#ums-manual-form');
    if (manualForm) {
      manualForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const uid = (modalEl.querySelector('#ums-uid-input').value || '').trim();
        const pass = (modalEl.querySelector('#ums-pass-input').value || '').trim();

        if (!uid) {
          UI.showToast('Please enter your University ID / UID.', 'error');
          return;
        }

        if (uid.toUpperCase() === 'ADMIN') {
          const success = (typeof App !== 'undefined' && App.setRole) ? App.setRole(Config.ROLES.ADMIN, pass) : false;
          if (success) {
            App.setUmsUser({
              id: 'ADMIN',
              name: 'Estate Administrator',
              role: 'Admin',
              dept: 'Campus Estates & Operations Control',
              email: 'estates@lpu.in',
              phone: '01824-510000'
            });
            UI.closeModal();
            UI.showToast('Admin session verified. Welcome, Administrator!', 'success');
          }
          return;
        }

        const facultyCheck = Validators.validateFacultyId ? Validators.validateFacultyId(uid) : { valid: false };
        const studentCheck = Validators.validateStudentId ? Validators.validateStudentId(uid) : { valid: false };

        if (facultyCheck.valid) {
          const prof = {
            id: uid.toUpperCase(),
            name: `Faculty Member (${uid.toUpperCase()})`,
            role: 'Faculty',
            dept: 'Division of Academic Affairs',
            email: `${uid.toLowerCase()}@lpu.co.in`,
            phone: ''
          };
          App.setRole(Config.ROLES.FACULTY);
          App.setUmsUser(prof);
          UI.closeModal();
          UI.showToast(`Authenticated as Faculty (${uid.toUpperCase()}).`, 'success');
        } else if (studentCheck.valid) {
          const prof = {
            id: uid,
            name: `Student (${uid})`,
            role: 'Student',
            dept: 'School of Computer Science & Engineering',
            email: `${uid}@lpu.in`,
            phone: ''
          };
          App.setRole(Config.ROLES.STUDENT);
          App.setUmsUser(prof);
          UI.closeModal();
          UI.showToast(`Authenticated as Student (${uid}).`, 'success');
        } else {
          UI.showToast('Invalid UID format. Expected 8-digit Student ID (126xxxxx), Faculty ID (FACxxxx), or ADMIN.', 'error');
        }
      });
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
      title: 'LPU Guidelines & Helpdesk Directory',
      subtitle: 'Block coordinator extensions, operating hours, and FAQ',
      tags: 'help guidelines directory contact support phone faq rules',
      action: function() { window.location.hash = '#/help'; }
    });
    items.push({
      type: 'action',
      category: 'Quick Actions',
      icon: '&#128100;',
      title: 'Sign in with LPU UMS',
      subtitle: 'Switch identity or sign in as Student, Faculty, or Admin',
      tags: 'ums login sso account user profile switch angel kartik dhruv rajesh',
      action: function() { self.showUmsLoginModal(); }
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
          <kbd class="cmd-kbd-esc">ESC</kbd>
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
