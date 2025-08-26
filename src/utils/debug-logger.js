/**
 * Debug utility for Chrome extensions with persistent settings
 */
export class DebugLogger {
  constructor(prefix = '') {
    this.enabled = false;
    this.prefix = prefix;
    this.init();
  }

  async init() {
    const { debugLogging = false } = await chrome.storage.sync.get('debugLogging');
    this.enabled = debugLogging;
    
    // Listen for debug setting changes
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'DEBUG_SETTING_CHANGED') {
        this.enabled = message.enabled;
      }
    });
  }

  log(...args) {
    if (this.enabled) {
      console.log(this.prefix, ...args);
    }
  }

  error(...args) {
    if (this.enabled) {
      console.error(this.prefix, ...args);
    }
  }

  warn(...args) {
    if (this.enabled) {
      console.warn(this.prefix, ...args);
    }
  }

  info(...args) {
    if (this.enabled) {
      console.info(this.prefix, ...args);
    }
  }
}