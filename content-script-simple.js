// Debug utility
class DebugLogger {
  constructor() {
    this.enabled = false;
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
      console.log(...args);
    }
  }
}

const debugLogger = new DebugLogger();

// Simple test version - just adds "TEST BRANCH" text to verify extension works
debugLogger.log('🌳 Simple test version loaded');

function addTestText() {
  const prRows = document.querySelectorAll('a[data-hovercard-type="pull_request"]');
  debugLogger.log('🌳 Found PR links:', prRows.length);
  
  prRows.forEach((link, index) => {
    const parent = link.closest('.Box-row') || link.closest('[class*="issue"]');
    if (parent && !parent.querySelector('.test-branch')) {
      const testSpan = document.createElement('span');
      testSpan.className = 'test-branch';
      testSpan.textContent = ` • TEST-BRANCH-${index + 1}`;
      testSpan.style.color = '#666';
      
      const metaLine = parent.querySelector('[class*="opened"]') || parent.querySelector('relative-time');
      if (metaLine) {
        metaLine.appendChild(testSpan);
        debugLogger.log('🌳 Added test text to PR', index + 1);
      }
    }
  });
}

// Run immediately and on DOM changes
addTestText();
setTimeout(addTestText, 2000);

new MutationObserver(() => {
  setTimeout(addTestText, 500);
}).observe(document.body, { childList: true, subtree: true });