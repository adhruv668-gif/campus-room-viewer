/**
 * js/utils.js
 * 
 * Purpose: Pure utility helper functions for local date/time manipulation,
 *          string escaping, debouncing, reference generation, and file exports.
 * Owner: Kartik (Reg. No. 12612598) - Timezone-Safe Date Math & Security Helpers
 * Depends on: Config (js/config.js)
 * 
 * Functions:
 * - getNow(): Date - Returns simulated date/time or current client date.
 * - getLocalDateString(dateObj): string - Formats Date into YYYY-MM-DD using local timezone.
 * - getWeekday(dateString): number - Returns day of week (0=Sun, 1=Mon... 6=Sat).
 * - formatDate(dateOrStr): string - Formats date into readable string (e.g. "24 Oct 2026").
 * - formatTime(dateOrStr): string - Formats time into 24h format (e.g. "14:30").
 * - formatSlotTime(slotNumber): string - Returns slot interval (e.g. "09:00 - 10:00").
 * - getCurrentSlot(): number|null - Returns slot 1-9 active at current time or null.
 * - escapeHTML(str): string - Sanitizes raw text against Cross-Site Scripting (XSS).
 * - debounce(fn, delayMs): function - Limits execution rate for live search inputs.
 * - generateId(prefix): string - Generates a timestamped unique element identifier.
 * - generateRef(dateString): string - Creates booking reference string (e.g. RB-20261024-001).
 * - exportToCSV(filename, headers, rows): void - Generates UTF-8 CSV with Excel BOM.
 * - downloadJSON(filename, dataObj): void - Triggers download of JSON backup.
 */

'use strict';

const Utils = {
  /**
   * Returns current effective Date object (simulated if set in settings, else real client time).
   * @returns {Date}
   */
  getNow: function() {
    try {
      const rawSettings = localStorage.getItem(Config.STORAGE_KEYS.SETTINGS);
      if (rawSettings) {
        const settings = JSON.parse(rawSettings);
        if (settings && settings.simulatedNow) {
          const simDate = new Date(settings.simulatedNow);
          if (!isNaN(simDate.getTime())) {
            return simDate;
          }
        }
      }
    } catch (e) {
      // Storage unavailable or corrupted; fall through to real date
    }
    return new Date();
  },

  /**
   * Builds "YYYY-MM-DD" strictly from LOCAL calendar parts.
   * Prevents UTC day-shifting errors in Indian Standard Time (IST / UTC+05:30).
   * @param {Date} dateObj
   * @returns {string}
   */
  getLocalDateString: function(dateObj) {
    if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      dateObj = this.getNow();
    }
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Parses "YYYY-MM-DD" string into local midnight Date object safely.
   * @param {string} dateString
   * @returns {Date}
   */
  parseLocalDate: function(dateString) {
    if (!dateString || typeof dateString !== 'string') return this.getNow();
    const parts = dateString.split('-');
    if (parts.length !== 3) return this.getNow();
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  },

  /**
   * Returns weekday number (0 = Sunday, 1 = Monday, ..., 6 = Saturday).
   * @param {string} dateString - "YYYY-MM-DD"
   * @returns {number}
   */
  getWeekday: function(dateString) {
    const localDate = this.parseLocalDate(dateString);
    return localDate.getDay();
  },

  /**
   * Formats date string or object into friendly format (e.g. "24 Oct 2026").
   * @param {string|Date} dateOrStr
   * @returns {string}
   */
  formatDate: function(dateOrStr) {
    if (!dateOrStr) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let d = typeof dateOrStr === 'string' ? this.parseLocalDate(dateOrStr) : dateOrStr;
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  },

  /**
   * Formats time string or object into 24-hour format (e.g. "14:30").
   * @param {string|Date} dateOrStr
   * @returns {string}
   */
  formatTime: function(dateOrStr) {
    if (!dateOrStr) return '';
    let d = typeof dateOrStr === 'string' ? new Date(dateOrStr) : dateOrStr;
    if (isNaN(d.getTime())) return '';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  /**
   * Formats slot timing from slot number (1-9).
   * @param {number} slotNumber
   * @returns {string}
   */
  formatSlotTime: function(slotNumber) {
    const slot = Config.SLOTS.find(function(s) { return s.id === slotNumber; });
    return slot ? `${slot.start} - ${slot.end}` : `Slot ${slotNumber}`;
  },

  /**
   * Identifies which slot (1-9) is currently active based on current time.
   * Returns null if outside 09:00-18:00 or on Sunday.
   * @returns {number|null}
   */
  getCurrentSlot: function() {
    const now = this.getNow();
    // Sunday has no active teaching slots
    if (now.getDay() === 0) return null;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (let i = 0; i < Config.SLOTS.length; i++) {
      const slot = Config.SLOTS[i];
      const startMin = slot.startHour * 60 + slot.startMin;
      const endMin = slot.endHour * 60 + slot.endMin;
      if (currentMinutes >= startMin && currentMinutes < endMin) {
        return slot.id;
      }
    }
    return null;
  },

  /**
   * Escapes dangerous characters to prevent HTML injection (XSS).
   * @param {string} str
   * @returns {string}
   */
  escapeHTML: function(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Creates a debounced function that postpones invocation until delayMs has elapsed.
   * @param {Function} fn
   * @param {number} delayMs
   * @returns {Function}
   */
  debounce: function(fn, delayMs) {
    let timer = null;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function() {
        fn.apply(context, args);
      }, delayMs);
    };
  },

  /**
   * Generates a collision-resistant unique ID with an optional prefix.
   * @param {string} prefix
   * @returns {string}
   */
  generateId: function(prefix) {
    const p = prefix || 'id';
    const timestamp = Date.now().toString(36);
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${p}-${timestamp}-${randomSuffix}`;
  },

  /**
   * Generates a human-friendly booking reference: RB-YYYYMMDD-XXX
   * @param {string} dateString - "YYYY-MM-DD"
   * @returns {string}
   */
  generateRef: function(dateString) {
    const cleanDate = (dateString || this.getLocalDateString(this.getNow())).replace(/-/g, '');
    const randomSeq = String(Math.floor(100 + Math.random() * 900));
    return `RB-${cleanDate}-${randomSeq}`;
  },

  /**
   * Exports tabular data into CSV format with UTF-8 BOM for Microsoft Excel.
   * @param {string} filename
   * @param {string[]} headers
   * @param {Array<Array<string|number>>} rows
   */
  exportToCSV: function(filename, headers, rows) {
    const escapeCsvCell = function(cell) {
      if (cell === null || cell === undefined) return '""';
      const cellStr = String(cell).replace(/"/g, '""');
      return `"${cellStr}"`;
    };

    const headerLine = headers.map(escapeCsvCell).join(',');
    const dataLines = rows.map(function(row) {
      return row.map(escapeCsvCell).join(',');
    });

    // \uFEFF is the UTF-8 Byte Order Mark (BOM) ensuring Excel displays unicode properly
    const csvContent = '\uFEFF' + [headerLine].concat(dataLines).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Triggers client-side download of a JavaScript object as a formatted JSON file.
   * @param {string} filename
   * @param {object} dataObj
   */
  downloadJSON: function(filename, dataObj) {
    const jsonStr = JSON.stringify(dataObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.json') ? filename : `${filename}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
