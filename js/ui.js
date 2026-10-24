/**
 * js/ui.js
 * 
 * Purpose: Global UI controllers for toast notifications, accessible dialog modals,
 *          theme switching, live campus clock, and role-based navbar states.
 * Owner: Shared (Team SOUL)
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

    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) {
      closeBtn.onclick = function() {
        UI.closeModal();
      };
    }

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
    Store.set('SETTINGS', settings);
    this.applyTheme(newTheme);
    this.showToast(`Switched to ${newTheme} theme`, 'info');
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
   * Updates the live clock in the application header and simulation banner.
   */
  updateClock: function() {
    const clockDate = document.getElementById('clock-date');
    const clockTime = document.getElementById('clock-time');
    const simBanner = document.getElementById('sim-banner');
    const simText = document.getElementById('sim-banner-text');

    const now = Utils.getNow();

    if (clockDate) clockDate.textContent = Utils.formatDate(now);
    if (clockTime) clockTime.textContent = Utils.formatTime(now);

    const settings = Store.get('SETTINGS') || {};
    if (settings.simulatedNow) {
      if (simBanner) simBanner.classList.remove('hidden');
      if (simText) {
        simText.textContent = `Simulation Clock Active: Frozen at ${Utils.formatDate(now)} ${Utils.formatTime(now)}.`;
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
    Store.set('SETTINGS', settings);
    this.updateClock();
    this.showToast('Simulated campus clock set successfully.', 'info');
  },

  /**
   * Clears simulated time and returns to real system clock.
   */
  clearSimulatedTime: function() {
    const settings = Store.get('SETTINGS') || {};
    settings.simulatedNow = null;
    Store.set('SETTINGS', settings);
    this.updateClock();
    this.showToast('Simulated time cleared. Real campus clock restored.', 'success');
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
        link.removeAttribute('aria-current');
      }
    });
  }
};
