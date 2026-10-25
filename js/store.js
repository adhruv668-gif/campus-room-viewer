/**
 * js/store.js
 * 
 * Purpose: LocalStorage persistence layer with schema versioning, fail-safe try/catch,
 *          in-memory fallback, and full JSON backup/restore capabilities.
 * Owner: Dhruv Anand (Reg. No. 12619773) - LocalStorage Persistence Layer & Schema Versioning
 * Depends on: Config (js/config.js), Seed (js/seed.js)
 * 
 * Functions:
 * - init(): void - Validates schema version and loads sample seed if storage is empty.
 * - get(key): Array|Object - Retrieves collection from storage or in-memory cache.
 * - set(key, data): boolean - Persists collection to storage and updates in-memory cache.
 * - addItem(key, item): boolean - Appends item to array collection.
 * - updateItem(key, id, patchObj): boolean - Merges patch into item with matching ID.
 * - removeItem(key, id): boolean - Removes item with matching ID from array collection.
 * - resetToSample(): void - Resets all collections back to deterministic sample data.
 * - exportBackup(): string - Serializes all collections into a JSON string.
 * - importBackup(jsonString): object - Validates and restores JSON backup.
 */

'use strict';

const Store = {
  // In-memory fallback cache when localStorage is blocked or throws QuotaExceededError
  _memoryCache: {},
  _isStorageAvailable: true,

  /**
   * Initializes storage layer. Verifies schema version and populates seed data if empty.
   */
  init: function() {
    this._checkStorageAvailability();

    try {
      const storedVersion = this.get('SCHEMA_VERSION');
      const hasBuildings = this.get('BUILDINGS') && this.get('BUILDINGS').length > 0;

      // Initialize with sample data if first load or schema version upgrade
      if (!storedVersion || storedVersion !== Config.SCHEMA_VERSION || !hasBuildings) {
        this.resetToSample();
      }
    } catch (err) {
      this.resetToSample();
    }
  },

  /**
   * Tests if localStorage is accessible in the current browser environment.
   */
  _checkStorageAvailability: function() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      this._isStorageAvailable = true;
    } catch (e) {
      this._isStorageAvailable = false;
    }
  },

  /**
   * Resolves storage key name from Config.STORAGE_KEYS or returns raw key.
   * @param {string} keyName
   * @returns {string}
   */
  _resolveKey: function(keyName) {
    if (Config.STORAGE_KEYS && Config.STORAGE_KEYS[keyName.toUpperCase()]) {
      return Config.STORAGE_KEYS[keyName.toUpperCase()];
    }
    return keyName;
  },

  /**
   * Retrieves collection from localStorage or in-memory fallback.
   * @param {string} keyName - Collection identifier (e.g. 'ROOMS', 'BOOKINGS')
   * @returns {Array|Object}
   */
  get: function(keyName) {
    const storageKey = this._resolveKey(keyName);

    if (this._isStorageAvailable) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          this._memoryCache[storageKey] = parsed;
          return parsed;
        }
      } catch (e) {
        // Switch storage availability to false if read fails
        this._isStorageAvailable = false;
      }
    }

    if (this._memoryCache[storageKey] !== undefined) {
      return this._memoryCache[storageKey];
    }
    return (keyName === 'SETTINGS' ? {} : []);
  },

  /**
   * Persists collection into localStorage and memory cache.
   * If localStorage write throws, updates memory cache, marks storage as unavailable,
   * and returns false so callers know persistent storage failed.
   * @param {string} keyName - Collection identifier
   * @param {Array|Object} data - Value to persist
   * @returns {boolean} - True if persisted to localStorage, false if write failed.
   */
  set: function(keyName, data) {
    const storageKey = this._resolveKey(keyName);
    this._memoryCache[storageKey] = data;

    if (this._isStorageAvailable) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
        return true;
      } catch (err) {
        // localStorage write threw (e.g. QuotaExceededError or storage blocked).
        // Switch storage availability to false so subsequent get() calls read from
        // the in-memory fallback cache rather than stale data from localStorage.
        this._isStorageAvailable = false;
        return false;
      }
    }
    return false;
  },

  /**
   * Appends an item to an array collection.
   * @param {string} keyName
   * @param {object} item
   * @returns {boolean}
   */
  addItem: function(keyName, item) {
    const list = this.get(keyName);
    if (!Array.isArray(list)) return false;
    list.push(item);
    return this.set(keyName, list);
  },

  /**
   * Updates an item in an array collection matching the provided ID.
   * @param {string} keyName
   * @param {string} id
   * @param {object} patchObj
   * @returns {boolean}
   */
  updateItem: function(keyName, id, patchObj) {
    const list = this.get(keyName);
    if (!Array.isArray(list)) return false;

    let found = false;
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        list[i] = Object.assign({}, list[i], patchObj);
        found = true;
        break;
      }
    }

    if (found) {
      return this.set(keyName, list);
    }
    return false;
  },

  /**
   * Removes an item from an array collection matching the provided ID.
   * @param {string} keyName
   * @param {string} id
   * @returns {boolean}
   */
  removeItem: function(keyName, id) {
    const list = this.get(keyName);
    if (!Array.isArray(list)) return false;

    const filtered = list.filter(function(item) {
      return item.id !== id;
    });

    return this.set(keyName, filtered);
  },

  /**
   * Returns whether persistent localStorage is currently available.
   * @returns {boolean}
   */
  isStorageAvailable: function() {
    return this._isStorageAvailable;
  },

  /**
   * Resets all collections back to the deterministic sample data from Seed.
   * @returns {boolean} - True if persisted to storage, false if in-memory fallback.
   */
  resetToSample: function() {
    if (typeof Seed === 'undefined' || !Seed.generateSampleData) {
      return false;
    }

    const sample = Seed.generateSampleData();
    const w1 = this.set('BUILDINGS', sample.buildings);
    const w2 = this.set('ROOMS', sample.rooms);
    const w3 = this.set('TIMETABLE', sample.timetable);
    const w4 = this.set('BOOKINGS', sample.bookings);
    const w5 = this.set('SETTINGS', sample.settings);
    const w6 = this.set('SCHEMA_VERSION', Config.SCHEMA_VERSION);

    return Boolean(w1 && w2 && w3 && w4 && w5 && w6);
  },

  /**
   * Serializes all application collections into a backup JSON string.
   * @returns {string}
   */
  exportBackup: function() {
    const backupData = {
      version: Config.SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      buildings: this.get('BUILDINGS'),
      rooms: this.get('ROOMS'),
      timetable: this.get('TIMETABLE'),
      bookings: this.get('BOOKINGS'),
      settings: this.get('SETTINGS')
    };
    return JSON.stringify(backupData, null, 2);
  },

  /**
   * Validates and restores collections from an imported JSON backup string.
   * Performs staged commit with atomic rollback on validation or write failure.
   * @param {string} jsonString
   * @returns {{ success: boolean, message: string }}
   */
  importBackup: function(jsonString) {
    let data;
    try {
      data = JSON.parse(jsonString);
    } catch (e) {
      return { success: false, message: 'Corrupted JSON: ' + e.message };
    }

    if (!data || typeof data !== 'object') {
      return { success: false, message: 'Invalid backup file: Root must be a JSON object.' };
    }

    // 1. Comprehensive Schema Validation before modifying existing state
    if (!Array.isArray(data.buildings) || !Array.isArray(data.rooms) ||
        !Array.isArray(data.timetable) || !Array.isArray(data.bookings)) {
      return { success: false, message: 'Invalid backup schema: Missing required collections.' };
    }

    // Normalize legacy single-slot bookings (b.slot -> b.startSlot, b.endSlot)
    data.bookings.forEach(function(b) {
      if (b && typeof b === 'object' && typeof b.slot === 'number' && b.startSlot === undefined) {
        b.startSlot = b.slot;
        b.endSlot = (typeof b.endSlot === 'number') ? b.endSlot : b.slot;
      }
      if (b && typeof b === 'object' && !Array.isArray(b.history)) {
        b.history = [];
      }
    });

    const invalidBldg = data.buildings.some(function(b) {
      return !b || typeof b !== 'object' ||
             typeof b.id !== 'string' || !b.id.trim() ||
             typeof b.code !== 'string' || !b.code.trim() ||
             typeof b.name !== 'string' || !b.name.trim();
    });
    if (invalidBldg) {
      return { success: false, message: 'Invalid backup schema: Corrupted building records (missing id, code, or name).' };
    }

    const invalidRoom = data.rooms.some(function(r) {
      return !r || typeof r !== 'object' ||
             typeof r.id !== 'string' || !r.id.trim() ||
             typeof r.buildingId !== 'string' || !r.buildingId.trim() ||
             typeof r.roomNo !== 'string' || !r.roomNo.trim() ||
             typeof r.name !== 'string' || !r.name.trim() ||
             typeof r.type !== 'string' || !r.type.trim() ||
             typeof r.capacity !== 'number' || !Number.isFinite(r.capacity) || r.capacity <= 0 ||
             typeof r.status !== 'string' || !r.status.trim();
    });
    if (invalidRoom) {
      return { success: false, message: 'Invalid backup schema: Corrupted room records (missing id, buildingId, roomNo, valid capacity, type, or status).' };
    }

    const invalidTimetable = data.timetable.some(function(t) {
      return !t || typeof t !== 'object' ||
             typeof t.id !== 'string' || !t.id.trim() ||
             typeof t.roomId !== 'string' || !t.roomId.trim() ||
             typeof t.weekday !== 'number' || t.weekday < 1 || t.weekday > 6 ||
             typeof t.slot !== 'number' || t.slot < 1 || t.slot > 9 ||
             typeof t.course !== 'string' || !t.course.trim();
    });
    if (invalidTimetable) {
      return { success: false, message: 'Invalid backup schema: Corrupted timetable entries (missing id, roomId, course, or valid weekday/slot).' };
    }

    const invalidBooking = data.bookings.some(function(b) {
      return !b || typeof b !== 'object' ||
             typeof b.id !== 'string' || !b.id.trim() ||
             typeof b.ref !== 'string' || !b.ref.trim() ||
             typeof b.roomId !== 'string' || !b.roomId.trim() ||
             typeof b.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.date) ||
             typeof b.status !== 'string' || !b.status.trim() ||
             typeof b.startSlot !== 'number' || b.startSlot < 1 || b.startSlot > 9 ||
             typeof b.endSlot !== 'number' || b.endSlot < 1 || b.endSlot > 9 || b.endSlot < b.startSlot;
    });
    if (invalidBooking) {
      return { success: false, message: 'Invalid backup schema: Corrupted booking records (missing id, ref, roomId, date, valid slots, or status).' };
    }

    // 2. Snapshot current state for rollback protection
    const snapshot = {
      BUILDINGS: this.get('BUILDINGS'),
      ROOMS: this.get('ROOMS'),
      TIMETABLE: this.get('TIMETABLE'),
      BOOKINGS: this.get('BOOKINGS'),
      SETTINGS: this.get('SETTINGS'),
      SCHEMA_VERSION: this.get('SCHEMA_VERSION')
    };

    // 3. Staged commit
    const wBldgs = this.set('BUILDINGS', data.buildings);
    const wRooms = this.set('ROOMS', data.rooms);
    const wTimetable = this.set('TIMETABLE', data.timetable);
    const wBookings = this.set('BOOKINGS', data.bookings);
    let wSettings = true;
    if (data.settings && typeof data.settings === 'object') {
      wSettings = this.set('SETTINGS', data.settings);
    }
    const wVersion = this.set('SCHEMA_VERSION', Config.SCHEMA_VERSION);

    // 4. Verify all writes succeeded; rollback if any failed
    if (!wBldgs || !wRooms || !wTimetable || !wBookings || !wSettings || !wVersion) {
      this.set('BUILDINGS', snapshot.BUILDINGS);
      this.set('ROOMS', snapshot.ROOMS);
      this.set('TIMETABLE', snapshot.TIMETABLE);
      this.set('BOOKINGS', snapshot.BOOKINGS);
      this.set('SETTINGS', snapshot.SETTINGS);
      this.set('SCHEMA_VERSION', snapshot.SCHEMA_VERSION);
      return {
        success: false,
        message: 'Storage write failed during restore. Restored previous application state.'
      };
    }

    return { success: true, message: 'Backup successfully restored.' };
  },

  /**
   * Alias for importBackup to support both naming conventions.
   * @param {string} jsonString
   * @returns {{ success: boolean, message: string }}
   */
  importData: function(jsonString) {
    return this.importBackup(jsonString);
  }
};
