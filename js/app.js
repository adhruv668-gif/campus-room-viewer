/**
 * js/app.js
 * 
 * Purpose: Application bootstrapping, client hash router, role switcher,
 *          access control guards, and global event delegation.
 * Owner: Dhruv Anand (Reg. No. 12619773) - Hash Router, Route Guards & Bootstrap
 * Depends on: All modules (Config, Utils, Store, Seed, Validators, UI,
 *             Rooms, Availability, Bookings, Dashboard)
 * 
 * Functions:
 * - init(): void - Initializes application, storage, clock, and event bindings.
 * - navigate(routeHash): void - Directs user to specified screen and executes view renderer.
 * - setRole(newRole, pinAttempt): boolean - Switches user persona with admin PIN check.
 * - getCurrentRole(): string - Returns active user role.
 * - getActiveRoute(): string - Returns current active route string.
 * - renderHelpView(containerEl): void - Renders campus guidelines, estate directory, and FAQs.
 */

'use strict';

const App = {
  _activeRoute: 'dashboard',
  _clockInterval: null,
  _umsUserMemory: null,
  state: {
    filters: {
      grid: {},
      finder: {}
    }
  },

  /**
   * Main bootstrap entry point called when DOM is ready.
   */
  init: function() {
    // 1. Initialize persistent storage layer
    Store.init();

    // 2. Initialize accessible dialog modal controller
    UI.initModal();

    // 3. Initialize and apply user theme
    const settings = Store.get('SETTINGS') || {};
    UI.applyTheme(settings.theme || 'system');

    // 4. Initialize header clock & interval
    UI.updateClock();
    if (this._clockInterval) clearInterval(this._clockInterval);
    this._clockInterval = setInterval(function() {
      UI.updateClock();
    }, 1000);

    // 5. Initialize Role Switcher
    const roleSelect = document.getElementById('role-select');
    if (roleSelect) {
      roleSelect.value = settings.role || Config.ROLES.STUDENT;
      roleSelect.addEventListener('change', function(e) {
        const targetRole = e.target.value;
        const currentRole = App.getCurrentRole();

        if (targetRole === Config.ROLES.ADMIN) {
          // Prompt for Admin PIN in accessible modal
          const pinModalHtml = `
            <div class="form-group">
              <label for="admin-pin-input" class="form-label">Enter 4-Digit Coordinator PIN:</label>
              <input type="password" id="admin-pin-input" class="form-input" maxlength="4" placeholder="Enter 4-digit PIN (Demo: 1234)" autocomplete="off" />
              <div style="margin-top: var(--space-2); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                <p class="form-hint" style="margin: 0;">Default demo PIN: <strong>1234</strong> (Runs client-side for demonstration).</p>
                <button type="button" id="quick-fill-pin-btn" class="btn btn-secondary btn-sm" style="font-size: var(--text-xs); padding: 4px 8px;">Fill Demo PIN (1234)</button>
              </div>
            </div>
          `;

          UI.showModal('Admin Authentication Required', pinModalHtml, function() {
            const input = document.getElementById('admin-pin-input');
            const enteredPin = input ? input.value.trim() : '';
            const success = App.setRole(Config.ROLES.ADMIN, enteredPin);
            if (!success) {
              roleSelect.value = currentRole;
            }
          }, 'Unlock Admin Access');

          const quickFillBtn = document.getElementById('quick-fill-pin-btn');
          if (quickFillBtn) {
            quickFillBtn.addEventListener('click', function() {
              const input = document.getElementById('admin-pin-input');
              if (input) {
                input.value = '1234';
                input.focus();
              }
            });
          }
        } else {
          App.setRole(targetRole);
        }
      });
    }

    // 5b. Initialize UMS Profile Pill
    this.updateUmsNavbarPill();
    const umsPill = document.getElementById('ums-profile-pill');
    if (umsPill) {
      umsPill.addEventListener('click', function() {
        if (typeof UI !== 'undefined' && UI.showUmsLoginModal) {
          UI.showUmsLoginModal();
        }
      });
      umsPill.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (typeof UI !== 'undefined' && UI.showUmsLoginModal) {
            UI.showUmsLoginModal();
          }
        }
      });
    }

    // 5c. Initialize Command Palette Trigger
    const cmdBtn = document.getElementById('cmd-palette-btn');
    if (cmdBtn) {
      cmdBtn.addEventListener('click', function() {
        if (typeof UI !== 'undefined' && UI.showCommandPalette) {
          UI.showCommandPalette();
        }
      });
    }

    // 5d. Global Keyboard Shortcuts (Ctrl+K, Cmd+K, '/')
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
          e.preventDefault();
          if (typeof UI !== 'undefined' && UI.showCommandPalette) {
            UI.showCommandPalette();
          }
          return;
        }
        if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const activeEl = document.activeElement;
          const tag = (activeEl && activeEl.tagName) ? activeEl.tagName.toUpperCase() : '';
          const isInput = activeEl && (activeEl.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');
          if (!isInput) {
            e.preventDefault();
            if (typeof UI !== 'undefined' && UI.showCommandPalette) {
              UI.showCommandPalette();
            }
          }
        }
      });
    }

    // 6. Theme Toggle Button
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', function() {
        UI.toggleTheme();
      });
    }

    // 6. Mobile Navigation Drawer Toggle
    const navToggle = document.getElementById('nav-toggle-btn');
    const siteNav = document.getElementById('site-nav');
    if (navToggle && siteNav) {
      navToggle.addEventListener('click', function() {
        const isOpen = siteNav.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', String(isOpen));
      });
    }

    // 7. Clear Simulated Time Banner Button
    const clearSimBtn = document.getElementById('sim-banner-clear-btn');
    if (clearSimBtn) {
      clearSimBtn.addEventListener('click', function() {
        UI.clearSimulatedTime();
        App.navigate(window.location.hash || '#/dashboard');
      });
    }

    // 8. Footer Sample Data Reset Button
    const footerResetBtn = document.getElementById('footer-reset-btn');
    if (footerResetBtn) {
      footerResetBtn.addEventListener('click', function() {
        UI.showModal('Confirm Sample Data Reset', '<p>Are you sure you want to reset all campus buildings, rooms, timetables, and requests back to default sample data? This will clear your custom edits.</p>', function() {
          const success = Store.resetToSample();
          UI.closeModal();
          if (success) {
            UI.showToast('Sample dataset restored successfully.', 'success');
          } else {
            UI.showToast('Reset restored in-memory only (storage unavailable).', 'warning');
          }
          App.navigate(window.location.hash || '#/dashboard');
        }, 'Reset Database', true);
      });
    }

    // 9. Hash Routing Event Listener
    window.addEventListener('hashchange', function() {
      App.navigate(window.location.hash);
      // Close mobile drawer on route transition
      if (siteNav) {
        siteNav.classList.remove('open');
        if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
      }
    });

    // 10. Cross-Tab State Synchronization
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('storage', function(e) {
        const appKeys = Object.values(Config.STORAGE_KEYS);
        if (e.key && appKeys.includes(e.key)) {
          if (Store && Store._memoryCache) {
            try {
              Store._memoryCache[e.key] = e.newValue ? JSON.parse(e.newValue) : null;
            } catch (err) {}
          }
          if (typeof UI !== 'undefined' && UI.closeModal) {
            UI.closeModal();
          }
          App.navigate(window.location.hash || '#/dashboard');
        }
      });
    }

    // 11. Load Initial Route
    const initialHash = window.location.hash || '#/dashboard';
    this.navigate(initialHash);
  },

  /**
   * Switches user persona and saves to settings.
   * @param {string} newRole
   * @param {string} [pinAttempt=""]
   * @returns {boolean}
   */
  setRole: function(newRole, pinAttempt) {
    const settings = Store.get('SETTINGS') || {};

    if (newRole === Config.ROLES.ADMIN) {
      const expectedPin = settings.adminPin || Config.DEFAULT_PIN;
      if (pinAttempt !== expectedPin) {
        UI.showToast('Incorrect Admin PIN. Access denied.', 'error');
        return false;
      }
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('CAMPUS_ADMIN_SESSION', 'true');
        }
      } catch (e) {}
    } else {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('CAMPUS_ADMIN_SESSION');
        }
      } catch (e) {}
    }

    settings.role = newRole;
    const persisted = Store.set('SETTINGS', settings);

    const roleSelect = document.getElementById('role-select');
    if (roleSelect) roleSelect.value = newRole;

    UI.closeModal();
    if (persisted) {
      UI.showToast(`Active role switched to ${newRole}.`, 'success');
    } else {
      UI.showToast(`Active role switched to ${newRole} (session only, storage unavailable).`, 'warning');
    }
    UI.renderNavbar();

    // Re-render active screen under new persona permissions
    const currentHash = (typeof window !== 'undefined' && window.location && window.location.hash) ? window.location.hash : '#/dashboard';
    this.navigate(currentHash);
    return true;
  },

  /**
   * Retrieves active user role.
   * Bound to sessionStorage for elevated admin access to prevent tampering across sessions.
   * @returns {string}
   */
  getCurrentRole: function() {
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('CAMPUS_ADMIN_SESSION') === 'true') {
        return Config.ROLES.ADMIN;
      }
    } catch (e) {}

    const settings = Store.get('SETTINGS') || {};
    // If settings had Admin from previous sessions without active sessionStorage flag, fallback to Student
    if (settings.role === Config.ROLES.ADMIN) {
      return Config.ROLES.STUDENT;
    }
    return settings.role || Config.ROLES.STUDENT;
  },

  /**
   * Retrieves active route key.
   * @returns {string}
   */
  getActiveRoute: function() {
    return this._activeRoute;
  },

  /**
   * Retrieves active UMS user session profile.
   * @returns {{ id: string, name: string, role: string, department?: string, email?: string, phone?: string } | null}
   */
  getUmsUser: function() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const raw = sessionStorage.getItem('CAMPUS_UMS_USER');
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {}
    return this._umsUserMemory || null;
  },

  /**
   * Sets active UMS user profile and synchronizes navbar pill.
   * @param {object|null} userObj
   * @returns {object|null}
   */
  setUmsUser: function(userObj) {
    this._umsUserMemory = userObj;
    try {
      if (typeof sessionStorage !== 'undefined') {
        if (userObj) {
          sessionStorage.setItem('CAMPUS_UMS_USER', JSON.stringify(userObj));
        } else {
          sessionStorage.removeItem('CAMPUS_UMS_USER');
        }
      }
    } catch (e) {}
    this.updateUmsNavbarPill();
    return userObj;
  },

  /**
   * Clears active UMS user session.
   */
  clearUmsUser: function() {
    this.setUmsUser(null);
  },

  /**
   * Synchronizes header UMS profile pill display with current session.
   */
  updateUmsNavbarPill: function() {
    if (typeof document === 'undefined') return;
    const pill = document.getElementById('ums-profile-pill');
    if (!pill) return;
    const user = this.getUmsUser();
    const nameEl = document.getElementById('ums-user-name');
    const subEl = document.getElementById('ums-user-sub');

    if (user) {
      pill.classList.add('signed-in');
      if (nameEl) nameEl.textContent = user.name;
      if (subEl) subEl.textContent = `${user.id} • ${user.role}`;
      pill.setAttribute('title', `Signed in as ${user.name} (${user.id} • ${user.role}) - Click to switch profile`);
    } else {
      pill.classList.remove('signed-in');
      if (nameEl) nameEl.textContent = 'UMS Sign In';
      if (subEl) subEl.textContent = 'Click to switch';
      pill.setAttribute('title', 'LPU UMS Account Profile - Click to sign in');
    }
  },

  /**
   * Client-side hash routing dispatcher.
   * @param {string} routeHash
   */
  navigate: function(routeHash) {
    const cleanHash = (routeHash || '#/dashboard').replace(/^#\/?/, '');
    const parts = cleanHash.split('?');
    const route = parts[0] || 'dashboard';
    const queryParams = new URLSearchParams(parts[1] || '');

    this._activeRoute = route;

    // Route Guard for Admin Panel
    if (route === 'admin' && this.getCurrentRole() !== Config.ROLES.ADMIN) {
      this._renderAdminGuard();
      return;
    }

    // Hide all view sections
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(function(sec) {
      sec.hidden = true;
    });

    const targetSection = document.getElementById(`view-${route}`);
    if (!targetSection) {
      // Fall back to dashboard if route unknown and not already attempting dashboard
      if (route !== 'dashboard') {
        this.navigate('#/dashboard');
      }
      return;
    }

    targetSection.hidden = false;

    // Update document title and accessibility focus
    const titleMap = {
      dashboard: 'Dashboard',
      availability: 'Availability Explorer',
      find: 'Find a Free Room',
      request: 'Request a Room',
      requests: 'Booking Requests',
      admin: 'Admin Portal',
      help: 'Campus Booking Guidelines & Support'
    };

    document.title = `${titleMap[route] || 'Viewer'} | ${Config.APP_NAME}`;

    const heading = targetSection.querySelector('h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }

    // Synchronize navigation bar links
    UI.renderNavbar();

    // Execute corresponding view renderer
    const contentEl = document.getElementById(`${route}-content`);
    if (!contentEl) return;

    if (route === 'dashboard') {
      if (typeof Dashboard !== 'undefined' && Dashboard.renderView) {
        Dashboard.renderView(contentEl);
      }
    } else if (route === 'availability') {
      if (typeof Availability !== 'undefined' && Availability.renderGrid) {
        const dateParam = queryParams.get('date');
        const buildingParam = queryParams.get('building');
        const roomParam = queryParams.get('room');
        Availability.renderGrid(contentEl, { date: dateParam, buildingId: buildingParam, searchQuery: roomParam });
      }
    } else if (route === 'find') {
      if (typeof Availability !== 'undefined' && Availability.renderFinder) {
        Availability.renderFinder(contentEl);
      }
    } else if (route === 'request') {
      if (typeof Bookings !== 'undefined' && Bookings.renderRequestForm) {
        const editId = queryParams.get('edit');
        const prefill = {
          roomId: queryParams.get('roomId') || '',
          date: queryParams.get('date') || '',
          startSlot: queryParams.get('startSlot') ? parseInt(queryParams.get('startSlot'), 10) : null,
          endSlot: queryParams.get('endSlot') ? parseInt(queryParams.get('endSlot'), 10) : null
        };
        Bookings.renderRequestForm(contentEl, editId, prefill);
      }
    } else if (route === 'requests') {
      if (typeof Bookings !== 'undefined' && Bookings.renderRequestsList) {
        Bookings.renderRequestsList(contentEl, { search: queryParams.get('q') || '' });
      }
    } else if (route === 'admin') {
      if (typeof Rooms !== 'undefined' && Rooms.renderAdminPanel) {
        Rooms.renderAdminPanel(contentEl);
      }
    } else if (route === 'help') {
      this.renderHelpView(contentEl);
    }
  },

  /**
   * Renders Admin Guard notice when non-admin accesses #/admin.
   */
  _renderAdminGuard: function() {
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(function(sec) { sec.hidden = true; });

    const adminSection = document.getElementById('view-admin');
    if (!adminSection) return;

    adminSection.hidden = false;
    const contentEl = document.getElementById('admin-content');
    if (!contentEl) return;

    contentEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">&#128274;</div>
        <h2 class="empty-title">Room Coordinator Access Required</h2>
        <p class="empty-desc">The Admin Management Portal is restricted to authorized Room Coordinators. Please authenticate with the Admin PIN to manage campus records.</p>
        <button id="guard-login-btn" class="btn btn-primary" type="button">Enter Admin PIN (Demo: 1234)</button>
      </div>
    `;

    const loginBtn = document.getElementById('guard-login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', function() {
        const roleSelect = document.getElementById('role-select');
        if (roleSelect) {
          roleSelect.value = Config.ROLES.ADMIN;
          roleSelect.dispatchEvent(new Event('change'));
        }
      });
    }
  },

  /**
   * Renders Campus Guidelines, Helpdesk Directory, FAQs, and Platform Credits.
   * @param {HTMLElement} containerEl
   */
  renderHelpView: function(containerEl) {
    containerEl.innerHTML = `
      <div class="card" style="margin-bottom: var(--space-6);">
        <h2>How to Use This Portal (5-Step Guide)</h2>
        <ol style="margin-left: var(--space-6); margin-top: var(--space-3); line-height: 1.8;">
          <li><strong>Check Live Availability:</strong> Navigate to the <em>Availability</em> tab to view the 9-slot timetable grid across campus blocks.</li>
          <li><strong>Find Free Rooms:</strong> Use the <em>Find a Room</em> tool to specify your required date, slot span, and attendee count.</li>
          <li><strong>Submit a Request:</strong> Select any green "Free" slot or fill out the <em>Request a Room</em> form with instant conflict checking.</li>
          <li><strong>Track Your Bookings:</strong> View approval statuses, history logs, or cancel requests under <em>My Requests</em>.</li>
          <li><strong>Admin Management:</strong> Switch role to <em>Admin</em> (PIN: <code>1234</code>) to approve/reject bookings or manage rooms.</li>
        </ol>
      </div>

      <div class="grid-2col" style="margin-bottom: var(--space-6);">
        <div class="card">
          <h2>Slot Status &amp; Legend</h2>
          <p class="form-hint" style="margin-bottom: var(--space-3);">Each cell displays an icon, clear text, and high-contrast styling (>= 4.5:1 ratio):</p>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: var(--space-2);">
            <li><span class="badge badge-free">&#9989; Free</span> - Available for reservation requests.</li>
            <li><span class="badge badge-class">&#128218; Class</span> - Scheduled university lecture or lab session.</li>
            <li><span class="badge badge-booked">&#128100; Booked</span> - Approved reservation for faculty or student club.</li>
            <li><span class="badge badge-requested">&#9203; Requested</span> - Pending booking awaiting coordinator review.</li>
            <li><span class="badge badge-maint">&#128295; Maint.</span> - Under repair; reservations blocked.</li>
          </ul>
        </div>

        <div class="card">
          <h2>System Business Rules (from Config)</h2>
          <table class="data-table" style="font-size: var(--text-xs); margin-top: var(--space-2);">
            <tbody>
              <tr><th>Teaching Hours</th><td>09:00 - 18:00 (9 One-Hour Slots, Mon-Sat)</td></tr>
              <tr><th>Max Consecutive Slots</th><td>Student: ${Config.LIMITS.STUDENT_MAX_CONSECUTIVE_SLOTS} slots | Faculty: ${Config.LIMITS.FACULTY_MAX_CONSECUTIVE_SLOTS} slots</td></tr>
              <tr><th>Max Active Upcoming Requests</th><td>Student: ${Config.LIMITS.STUDENT_MAX_ACTIVE_REQUESTS} | Faculty: ${Config.LIMITS.FACULTY_MAX_ACTIVE_REQUESTS}</td></tr>
              <tr><th>Advance Booking Horizon</th><td>Up to ${Config.LIMITS.MAX_DAYS_AHEAD} days ahead</td></tr>
              <tr><th>Conflict Protection</th><td>Auto-rejects competing requests upon approval</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="margin-bottom: var(--space-6);">
        <h2>LPU Block Estates &amp; Technical Helpdesk Directory</h2>
        <p class="form-hint" style="margin-bottom: var(--space-3);">For immediate classroom assistance, smart-board troubleshooting, or key dispatch, contact your designated block estate coordinator:</p>
        <div style="overflow-x: auto;">
          <table class="data-table" style="font-size: var(--text-xs);">
            <thead>
              <tr>
                <th>Campus Block</th>
                <th>Academic School / Focus</th>
                <th>Coordinator Ext.</th>
                <th>Helpdesk Location</th>
                <th>Operating Hours</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Block 32</strong></td>
                <td>Academic Complex &amp; Lecture Theatres</td>
                <td><code>Ext: 3201 / 3204</code></td>
                <td>Room 32-101 Ground Floor Desk</td>
                <td>09:00 - 18:00 IST (Mon-Sat)</td>
              </tr>
              <tr>
                <td><strong>Block 33</strong></td>
                <td>School of Computer Applications</td>
                <td><code>Ext: 3301 / 3305</code></td>
                <td>Room 33-104 Coordinator Wing</td>
                <td>09:00 - 18:00 IST (Mon-Sat)</td>
              </tr>
              <tr>
                <td><strong>Block 34</strong></td>
                <td>School of CSE &amp; AI Research Labs</td>
                <td><code>Ext: 3402 / 3408</code></td>
                <td>Room 34-201 Systems Lab Desk</td>
                <td>09:00 - 18:00 IST (Mon-Sat)</td>
              </tr>
              <tr>
                <td><strong>Lab Complex</strong></td>
                <td>Central Engineering &amp; Robotics Labs</td>
                <td><code>Ext: 3810 / 3812</code></td>
                <td>Room BLAB-01 Central Dispatch</td>
                <td>09:00 - 18:00 IST (Mon-Sat)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="form-hint" style="margin-top: var(--space-3);"><strong>Central Emergency Escalation:</strong> For urgent audio-visual, HVAC, or power emergencies during live class sessions, contact Central Estate Control: <code>01824-510000</code> or <code>estate.support@lpu.in</code>.</p>
      </div>

      <div class="card" style="margin-bottom: var(--space-6);">
        <h2>Frequently Asked Reservation Questions (FAQ)</h2>
        <details style="margin-top: var(--space-3); padding: var(--space-2) 0; border-bottom: 1px solid var(--border-color);">
          <summary style="font-weight: var(--font-semibold); cursor: pointer;">How does the pending conflict queue and administrative approval work?</summary>
          <p style="margin-top: var(--space-2); font-size: var(--text-sm); line-height: 1.6; color: var(--text-secondary);">Multiple users can submit pending requests for the same room and slot (soft conflict). When the Room Coordinator approves one reservation, all competing pending requests are automatically updated to Rejected with an audit remark citing the approved reference ID.</p>
        </details>
        <details style="padding: var(--space-2) 0; border-bottom: 1px solid var(--border-color);">
          <summary style="font-weight: var(--font-semibold); cursor: pointer;">What occurs when a room enters Maintenance Mode?</summary>
          <p style="margin-top: var(--space-2); font-size: var(--text-sm); line-height: 1.6; color: var(--text-secondary);">Any upcoming reservations in that room are automatically cancelled, and affected requesters receive administrative notices. Completed historical records from earlier today remain intact for auditing purposes.</p>
        </details>
        <details style="padding: var(--space-2) 0; border-bottom: 1px solid var(--border-color);">
          <summary style="font-weight: var(--font-semibold); cursor: pointer;">How do I export room reservations to my personal calendar?</summary>
          <p style="margin-top: var(--space-2); font-size: var(--text-sm); line-height: 1.6; color: var(--text-secondary);">Click the <strong>📅 Add to Calendar (.ics)</strong> button on any booking card or in the booking details modal to download an RFC 5545 <code>.ics</code> file compatible with Google Calendar, Microsoft Outlook, and Apple Calendar.</p>
        </details>
        <details style="padding: var(--space-2) 0; border-bottom: 1px solid var(--border-color);">
          <summary style="font-weight: var(--font-semibold); cursor: pointer;">Can I print an official room reservation pass or door timetable?</summary>
          <p style="margin-top: var(--space-2); font-size: var(--text-sm); line-height: 1.6; color: var(--text-secondary);">Yes! Use the <strong>🖨️ Print Reservation Pass</strong> button inside the booking details modal or <strong>🖨️ Print Schedule</strong> on the Availability Matrix. The portal automatically formats clean, professional single-page printouts with verification metadata.</p>
        </details>
        <details style="padding: var(--space-2) 0;">
          <summary style="font-weight: var(--font-semibold); cursor: pointer;">What are the role-based reservation limits?</summary>
          <p style="margin-top: var(--space-2); font-size: var(--text-sm); line-height: 1.6; color: var(--text-secondary);">Students may book up to 2 consecutive slots and maintain at most 3 active upcoming requests. Faculty members may reserve up to 4 consecutive slots with a quota of 6 active requests. Bookings from earlier today whose slots have ended do not count against your quota.</p>
        </details>
      </div>

      <div class="card">
        <h2>Platform Engineering &amp; Operations (Team SOUL)</h2>
        <p style="font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-2);">Division of Academic Affairs &amp; Estate Operations &bull; Lovely Professional University, Punjab</p>
        <p style="font-weight: var(--font-semibold); font-size: var(--text-sm); margin-bottom: var(--space-2);">Core Engineering Team:</p>
        <ul style="margin-left: var(--space-6); line-height: 1.8; font-size: var(--text-sm);">
          <li><strong>Angel Seth</strong> (Registration No: <code>12611041</code>) &mdash; Systems UI/UX &amp; State Persistence</li>
          <li><strong>Kartik</strong> (Registration No: <code>12612598</code>) &mdash; Availability Engine &amp; Conflict Algorithms</li>
          <li><strong>Dhruv Anand</strong> (Registration No: <code>12619773</code>) &mdash; Dashboard Analytics &amp; Architecture</li>
        </ul>
      </div>
    `;
  }
};

// Bootstrap application when document DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      App.init();
    });
  } else if (typeof window !== 'undefined' && typeof window.addEventListener === 'function' && document.getElementById('main-content')) {
    App.init();
  }
}
