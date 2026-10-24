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
   * Resets all collections back to the deterministic sample data from Seed.
   */
  resetToSample: function() {
    if (typeof Seed === 'undefined' || !Seed.generateSampleData) {
      return;
    }

    const sample = Seed.generateSampleData();
    this.set('BUILDINGS', sample.buildings);
    this.set('ROOMS', sample.rooms);
    this.set('TIMETABLE', sample.timetable);
    this.set('BOOKINGS', sample.bookings);
    this.set('SETTINGS', sample.settings);
    this.set('SCHEMA_VERSION', Config.SCHEMA_VERSION);
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
   * @param {string} jsonString
   * @returns {{ success: boolean, message: string }}
   */
  importBackup: function(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      if (!data || typeof data !== 'object') {
        return { success: false, message: 'Invalid backup file: Not a valid JSON object.' };
      }

      if (!Array.isArray(data.buildings) || !Array.isArray(data.rooms) || !Array.isArray(data.timetable) || !Array.isArray(data.bookings)) {
        return { success: false, message: 'Invalid backup schema: Missing required collections.' };
      }

      this.set('BUILDINGS', data.buildings);
      this.set('ROOMS', data.rooms);
      this.set('TIMETABLE', data.timetable);
      this.set('BOOKINGS', data.bookings);
      if (data.settings && typeof data.settings === 'object') {
        this.set('SETTINGS', data.settings);
      }
      this.set('SCHEMA_VERSION', Config.SCHEMA_VERSION);

      return { success: true, message: 'Backup successfully restored.' };
    } catch (e) {
      return { success: false, message: 'Corrupted JSON: ' + e.message };
    }
  }
};
