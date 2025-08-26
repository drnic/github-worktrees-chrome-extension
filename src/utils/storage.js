/**
 * Chrome storage utilities with caching support
 */
export class StorageCache {
  constructor(defaultTTL = 1000 * 60 * 60 * 24 * 30) { // 30 days default
    this.defaultTTL = defaultTTL;
  }

  async get(key) {
    try {
      const result = await chrome.storage.local.get([key]);
      const cached = result[key];
      
      if (cached) {
        // Check if cache entry has expired
        const age = Date.now() - cached.timestamp;
        if (age < this.defaultTTL) {
          return cached.value;
        } else {
          // Remove expired entry
          await chrome.storage.local.remove([key]);
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to read from cache:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      await chrome.storage.local.set({
        [key]: {
          value,
          timestamp: Date.now(),
          ttl
        }
      });
      return true;
    } catch (error) {
      console.error('Failed to cache value:', error);
      return false;
    }
  }

  async remove(key) {
    try {
      await chrome.storage.local.remove([key]);
      return true;
    } catch (error) {
      console.error('Failed to remove from cache:', error);
      return false;
    }
  }

  async clear() {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }
}