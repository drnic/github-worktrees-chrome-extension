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

  error(...args) {
    if (this.enabled) {
      console.error(...args);
    }
  }
}

const debugLogger = new DebugLogger();

// Semaphore for limiting concurrent operations
class Semaphore {
  constructor(maxConcurrency) {
    this.maxConcurrency = maxConcurrency;
    this.currentConcurrency = 0;
    this.queue = [];
  }

  async acquire() {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        if (this.currentConcurrency < this.maxConcurrency) {
          this.currentConcurrency++;
          resolve(() => this.release());
        } else {
          this.queue.push(tryAcquire);
        }
      };
      tryAcquire();
    });
  }

  release() {
    this.currentConcurrency--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    }
  }
}

class GitHubWorktrees {
  constructor() {
    this.observer = null;
    this.processedPRs = new Set();
    this.CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days (PR->branch mapping is immutable)
    debugLogger.log('🌳 GitHub Worktrees: Extension initialized');
    this.init();
  }

  init() {
    debugLogger.log('🌳 Checking if on PR list page...');
    debugLogger.log('🌳 Current URL:', window.location.href);
    
    if (this.isOnPRListPage()) {
      debugLogger.log('🌳 On PR list page - starting injection');
      this.injectBranchNames();
      this.setupObserver();
    } else {
      debugLogger.log('🌳 Not on PR list page');
    }
  }

  isOnPRListPage() {
    const isOnPulls = window.location.pathname.includes('/pulls');
    // Use alternative selectors since GitHub changed their structure
    const hasPRElements = document.querySelector('.js-issue-row') || 
                         document.querySelector('[data-hovercard-type="pull_request"]') ||
                         document.querySelector('.Box-row');
    
    debugLogger.log('🌳 URL includes /pulls:', isOnPulls);
    debugLogger.log('🌳 Found PR elements:', !!hasPRElements);
    
    return isOnPulls && hasPRElements;
  }

  async injectBranchNames() {
    // Try multiple selectors for PR rows
    let prRows = document.querySelectorAll('.js-issue-row');
    if (!prRows.length) {
      prRows = document.querySelectorAll('.Box-row');
    }
    
    debugLogger.log('🌳 Found PR rows:', prRows.length);
    
    // Process all PRs in parallel with concurrency limit
    await this.processAllPRsInParallel(Array.from(prRows));
  }

  async processAllPRsInParallel(rows, maxConcurrency = 3) {
    const startTime = performance.now();
    debugLogger.log('🌳 Starting parallel processing with max concurrency:', maxConcurrency);
    
    const semaphore = new Semaphore(maxConcurrency);
    const promises = rows.map((row, index) => semaphore.acquire().then(async (release) => {
      try {
        const prStart = performance.now();
        await this.processPRRow(row);
        const prTime = performance.now() - prStart;
        debugLogger.log(`🌳 PR ${index + 1} processed in ${prTime.toFixed(0)}ms`);
      } finally {
        release();
      }
    }));
    
    await Promise.all(promises);
    const totalTime = performance.now() - startTime;
    debugLogger.log(`🌳 Completed parallel processing of ${rows.length} PRs in ${totalTime.toFixed(0)}ms`);
  }

  async processPRRow(row) {
    const prLink = row.querySelector('a[data-hovercard-type="pull_request"]');
    if (!prLink || this.processedPRs.has(prLink.href)) {
      debugLogger.log('🌳 Skipping row - no PR link or already processed');
      return;
    }
    
    debugLogger.log('🌳 Processing PR:', prLink.href);
    this.processedPRs.add(prLink.href);
    
    const prNumber = this.extractPRNumber(prLink.href);
    if (!prNumber) {
      debugLogger.log('🌳 No PR number found');
      return;
    }

    debugLogger.log('🌳 Fetching branch name for PR:', prNumber);
    const branchName = await this.getBranchName(prNumber);
    if (!branchName) {
      debugLogger.log('🌳 No branch name returned');
      return;
    }

    debugLogger.log('🌳 Adding branch name to row:', branchName);
    this.addBranchNameToRow(row, branchName);
  }

  extractPRNumber(href) {
    const match = href.match(/\/pull\/(\d+)/);
    return match ? match[1] : null;
  }

  async getBranchName(prNumber) {
    const repoPath = window.location.pathname.split('/').slice(1, 3).join('/');
    const cacheKey = `branch_${repoPath}#${prNumber}`;
    
    // Check browser storage cache first
    const cached = await this.getCachedBranchName(cacheKey);
    if (cached) {
      debugLogger.log('🌳 Using cached branch name for:', cacheKey, '→', cached);
      return cached;
    }

    // First try to extract from DOM by visiting the PR page briefly
    const branchFromDOM = await this.getBranchNameFromDOM(prNumber);
    if (branchFromDOM) {
      debugLogger.log('🌳 Got branch name from DOM:', branchFromDOM);
      await this.cacheBranchName(cacheKey, branchFromDOM);
      return branchFromDOM;
    }

    // Fallback to API (may fail for private repos)
    const branchFromAPI = await this.getBranchNameFromAPI(prNumber);
    if (branchFromAPI) {
      await this.cacheBranchName(cacheKey, branchFromAPI);
    }
    return branchFromAPI;
  }

  async getCachedBranchName(cacheKey) {
    try {
      const result = await chrome.storage.local.get([cacheKey]);
      const cached = result[cacheKey];
      
      if (cached) {
        // Check if cache entry has expired
        const age = Date.now() - cached.timestamp;
        if (age < this.CACHE_TTL) {
          return cached.branchName;
        } else {
          // Remove expired entry
          await chrome.storage.local.remove([cacheKey]);
        }
      }
      return null;
    } catch (error) {
      debugLogger.error('Failed to read from cache:', error);
      return null;
    }
  }

  async cacheBranchName(cacheKey, branchName) {
    try {
      await chrome.storage.local.set({
        [cacheKey]: {
          branchName,
          timestamp: Date.now()
        }
      });
      debugLogger.log('🌳 Cached branch name:', cacheKey, '→', branchName);
    } catch (error) {
      debugLogger.error('Failed to cache branch name:', error);
    }
  }

  async getBranchNameFromDOM(prNumber) {
    try {
      const repoPath = window.location.pathname.split('/').slice(1, 3).join('/');
      const prUrl = `https://github.com/${repoPath}/pull/${prNumber}`;
      
      debugLogger.log('🌳 Fetching PR page for DOM extraction:', prUrl);
      
      const response = await fetch(prUrl);
      if (!response.ok) throw new Error('Failed to fetch PR page');
      
      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      
      // Try multiple selectors for branch name
      const branchSelectors = [
        '[data-hovercard-type="commit"] .commit-ref',
        '.head-ref .css-truncate-target',
        '[title*="branch"] .css-truncate-target',
        '.branch-name',
        '.head-ref'
      ];
      
      for (const selector of branchSelectors) {
        const element = doc.querySelector(selector);
        if (element) {
          const branchName = element.textContent.trim();
          if (branchName && !branchName.includes('/')) {
            debugLogger.log('🌳 Found branch name with selector', selector, ':', branchName);
            return branchName;
          }
        }
      }
      
      // Try to find branch name in the page title or meta tags
      const title = doc.querySelector('title')?.textContent || '';
      const branchMatch = title.match(/from ([^·]+)/);
      if (branchMatch) {
        return branchMatch[1].trim();
      }
      
      return null;
    } catch (error) {
      debugLogger.error('Failed to extract branch from DOM:', error);
      return null;
    }
  }

  async getBranchNameFromAPI(prNumber) {
    const repoPath = window.location.pathname.split('/').slice(1, 3).join('/');
    
    try {
      debugLogger.log('🌳 Trying API fallback for PR:', prNumber);
      const response = await fetch(`https://api.github.com/repos/${repoPath}/pulls/${prNumber}`);
      if (!response.ok) throw new Error('API request failed');
      
      const prData = await response.json();
      return prData.head.ref;
    } catch (error) {
      debugLogger.error('Failed to fetch branch name from API:', error);
      return null;
    }
  }

  addBranchNameToRow(row, branchName) {
    // Try different selectors for the metadata line
    let metaLine = row.querySelector('.opened-by');
    if (!metaLine) {
      metaLine = row.querySelector('relative-time')?.parentElement;
    }
    if (!metaLine) {
      metaLine = row.querySelector('[class*="opened"]');
    }
    
    if (!metaLine) {
      debugLogger.log('🌳 No metadata line found in row');
      return;
    }

    // Check if we already added branch info
    if (metaLine.querySelector('.github-worktrees-branch')) {
      debugLogger.log('🌳 Branch info already exists');
      return;
    }

    const branchContainer = document.createElement('span');
    branchContainer.className = 'github-worktrees-branch';
    
    const separator = document.createElement('span');
    separator.textContent = ' • ';
    separator.className = 'text-gray';
    
    const branchSpan = document.createElement('span');
    branchSpan.textContent = branchName;
    branchSpan.className = 'text-gray-dark';
    
    const copyButton = this.createCopyButton(branchName);
    
    branchContainer.appendChild(separator);
    branchContainer.appendChild(branchSpan);
    branchContainer.appendChild(copyButton);
    
    metaLine.appendChild(branchContainer);
    debugLogger.log('🌳 Successfully added branch name to row');
  }

  createCopyButton(branchName) {
    const button = document.createElement('button');
    button.className = 'github-worktrees-copy-btn btn-link';
    button.setAttribute('aria-label', 'Copy branch name');
    button.title = 'Copy branch name';
    
    button.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" class="octicon">
        <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>
        <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>
      </svg>
    `;
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.copyToClipboard(branchName, button);
    });
    
    return button;
  }

  async copyToClipboard(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      this.showCopyConfirmation(button);
    } catch (error) {
      debugLogger.error('Failed to copy to clipboard:', error);
    }
  }

  showCopyConfirmation(button) {
    const originalTitle = button.title;
    button.title = 'Copied!';
    button.style.color = '#22863a';
    
    setTimeout(() => {
      button.title = originalTitle;
      button.style.color = '';
    }, 1500);
  }

  setupObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches('[data-testid="issue-results"] .Box-row') ||
                node.querySelector('[data-testid="issue-results"] .Box-row')) {
              shouldProcess = true;
            }
          }
        });
      });

      if (shouldProcess) {
        setTimeout(() => this.injectBranchNames(), 100);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new GitHubWorktrees());
} else {
  new GitHubWorktrees();
}